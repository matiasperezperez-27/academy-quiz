-- Migration: academia_yeray_banco_preguntas
-- Añade soporte para academias "biblioteca" y tracking de preguntas clonadas.

-- 1. Columnas nuevas en academias
ALTER TABLE public.academias
  ADD COLUMN IF NOT EXISTS es_biblioteca BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS propietario_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Backfill: las 3 academias existentes son el banco interno
UPDATE public.academias
SET es_biblioteca = true
WHERE nombre IN ('JCLM', 'LICEO', 'LINCE');

-- 3. Columnas nuevas en preguntas
ALTER TABLE public.preguntas
  ADD COLUMN IF NOT EXISTS pregunta_origen_id UUID REFERENCES public.preguntas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS modificada_por_ia BOOLEAN NOT NULL DEFAULT false;

-- 4. Índice para lookup rápido de clones
CREATE INDEX IF NOT EXISTS preguntas_origen_idx ON public.preguntas(pregunta_origen_id);

-- 5. RPC: crear academia propia y asignarla al profesor (solo admins)
CREATE OR REPLACE FUNCTION public.crear_academia_propietario(
  p_admin_id UUID,
  p_nombre TEXT,
  p_propietario_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_academia_id UUID;
BEGIN
  -- Solo admins
  IF NOT (SELECT is_user_admin(p_admin_id)) THEN
    RAISE EXCEPTION 'Solo administradores pueden crear academias';
  END IF;

  INSERT INTO public.academias (nombre, es_biblioteca, propietario_id)
  VALUES (p_nombre, false, p_propietario_id)
  RETURNING id INTO v_academia_id;

  -- Asignar academia al profesor
  INSERT INTO public.profesor_academias (profesor_id, academia_id, assigned_by)
  VALUES (p_propietario_id, v_academia_id, p_admin_id);

  RETURN v_academia_id;
END;
$$;

-- 6. RPC: clonar una pregunta del banco a la academia del profesor
CREATE OR REPLACE FUNCTION public.clonar_pregunta(
  p_profesor_id UUID,
  p_pregunta_origen_id UUID,
  p_destino_academia_id UUID,
  p_destino_tema_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_origen preguntas%ROWTYPE;
  v_nueva_id UUID;
BEGIN
  -- Validar que el profesor está asignado a la academia destino
  IF NOT EXISTS (
    SELECT 1 FROM public.profesor_academias
    WHERE profesor_id = p_profesor_id AND academia_id = p_destino_academia_id
  ) THEN
    RAISE EXCEPTION 'El profesor no tiene acceso a la academia destino';
  END IF;

  -- Validar que el tema pertenece a la academia destino
  IF NOT EXISTS (
    SELECT 1 FROM public.temas
    WHERE id = p_destino_tema_id AND academia_id = p_destino_academia_id
  ) THEN
    RAISE EXCEPTION 'El tema no pertenece a la academia destino';
  END IF;

  -- Leer pregunta origen
  SELECT * INTO v_origen FROM public.preguntas WHERE id = p_pregunta_origen_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pregunta origen no encontrada';
  END IF;

  -- Insertar clon
  INSERT INTO public.preguntas (
    academia_id, tema_id, creada_por,
    pregunta_texto, opcion_a, opcion_b, opcion_c, opcion_d, solucion_letra, parte,
    explicacion_a, explicacion_b, explicacion_c, explicacion_d,
    pregunta_origen_id, modificada_por_ia,
    verificada, rechazada
  ) VALUES (
    p_destino_academia_id, p_destino_tema_id, p_profesor_id,
    v_origen.pregunta_texto, v_origen.opcion_a, v_origen.opcion_b,
    v_origen.opcion_c, v_origen.opcion_d, v_origen.solucion_letra, v_origen.parte,
    v_origen.explicacion_a, v_origen.explicacion_b, v_origen.explicacion_c, v_origen.explicacion_d,
    p_pregunta_origen_id, false,
    false, false
  )
  RETURNING id INTO v_nueva_id;

  RETURN v_nueva_id;
END;
$$;

-- 7. RPC: listar preguntas del banco con marca "ya importada"
CREATE OR REPLACE FUNCTION public.get_preguntas_banco(
  p_profesor_id UUID,
  p_academia_id UUID DEFAULT NULL,
  p_tema_id UUID DEFAULT NULL,
  p_solo_no_importadas BOOLEAN DEFAULT true,
  p_limit INT DEFAULT 10,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  pregunta_texto TEXT,
  opcion_a TEXT,
  opcion_b TEXT,
  opcion_c TEXT,
  opcion_d TEXT,
  solucion_letra TEXT,
  parte TEXT,
  academia_id UUID,
  academia_nombre TEXT,
  tema_id UUID,
  tema_nombre TEXT,
  ya_importada BOOLEAN,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH academias_profesor AS (
    SELECT pa.academia_id FROM public.profesor_academias pa WHERE pa.profesor_id = p_profesor_id
  ),
  banco AS (
    SELECT
      p.id,
      p.pregunta_texto,
      p.opcion_a,
      p.opcion_b,
      p.opcion_c,
      p.opcion_d,
      p.solucion_letra::TEXT,
      p.parte,
      p.academia_id,
      a.nombre AS academia_nombre,
      p.tema_id,
      t.nombre AS tema_nombre,
      EXISTS (
        SELECT 1 FROM public.preguntas clon
        WHERE clon.pregunta_origen_id = p.id
          AND clon.academia_id IN (SELECT ap.academia_id FROM academias_profesor ap)
      ) AS ya_importada
    FROM public.preguntas p
    JOIN public.academias a ON a.id = p.academia_id
    JOIN public.temas t ON t.id = p.tema_id
    WHERE a.es_biblioteca = true
      AND (p_academia_id IS NULL OR p.academia_id = p_academia_id)
      AND (p_tema_id IS NULL OR p.tema_id = p_tema_id)
  )
  SELECT
    b.id, b.pregunta_texto, b.opcion_a, b.opcion_b, b.opcion_c, b.opcion_d,
    b.solucion_letra, b.parte, b.academia_id, b.academia_nombre,
    b.tema_id, b.tema_nombre, b.ya_importada,
    COUNT(*) OVER() AS total_count
  FROM banco b
  WHERE (NOT p_solo_no_importadas OR NOT b.ya_importada)
  ORDER BY b.academia_nombre, b.tema_nombre, b.pregunta_texto
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 8. Modificar get_preguntas_para_verificar para incluir info de origen
-- (se recrea completa para añadir pregunta_origen_id, modificada_por_ia, academia_origen_nombre)
CREATE OR REPLACE FUNCTION public.get_preguntas_para_verificar(
  p_profesor_id UUID,
  p_academia_id UUID DEFAULT NULL,
  p_tema_id UUID DEFAULT NULL,
  p_estado TEXT DEFAULT 'pendiente',
  p_limit INT DEFAULT 10,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  pregunta_texto TEXT,
  opcion_a TEXT,
  opcion_b TEXT,
  opcion_c TEXT,
  opcion_d TEXT,
  solucion_letra TEXT,
  parte TEXT,
  academia_id UUID,
  academia_nombre TEXT,
  tema_id UUID,
  tema_nombre TEXT,
  verificada BOOLEAN,
  rechazada BOOLEAN,
  verificacion_notas TEXT,
  verificada_at TIMESTAMPTZ,
  explicacion_a TEXT,
  explicacion_b TEXT,
  explicacion_c TEXT,
  explicacion_d TEXT,
  pregunta_origen_id UUID,
  modificada_por_ia BOOLEAN,
  academia_origen_nombre TEXT,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.pregunta_texto,
    p.opcion_a,
    p.opcion_b,
    p.opcion_c,
    p.opcion_d,
    p.solucion_letra::TEXT,
    p.parte,
    p.academia_id,
    a.nombre AS academia_nombre,
    p.tema_id,
    t.nombre AS tema_nombre,
    p.verificada,
    p.rechazada,
    p.verificacion_notas,
    p.verificada_at,
    p.explicacion_a,
    p.explicacion_b,
    p.explicacion_c,
    p.explicacion_d,
    p.pregunta_origen_id,
    p.modificada_por_ia,
    a_origen.nombre AS academia_origen_nombre,
    COUNT(*) OVER() AS total_count
  FROM public.preguntas p
  JOIN public.academias a ON a.id = p.academia_id
  JOIN public.temas t ON t.id = p.tema_id
  LEFT JOIN public.preguntas p_origen ON p_origen.id = p.pregunta_origen_id
  LEFT JOIN public.academias a_origen ON a_origen.id = p_origen.academia_id
  WHERE
    p.academia_id IN (
      SELECT pa.academia_id FROM public.profesor_academias pa WHERE pa.profesor_id = p_profesor_id
    )
    AND (p_academia_id IS NULL OR p.academia_id = p_academia_id)
    AND (p_tema_id IS NULL OR p.tema_id = p_tema_id)
    AND (
      CASE p_estado
        WHEN 'pendiente'   THEN NOT p.verificada AND NOT p.rechazada
        WHEN 'verificada'  THEN p.verificada
        WHEN 'rechazada'   THEN p.rechazada
        ELSE true
      END
    )
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 9. Modificar upsert_pregunta para aceptar pregunta_origen_id y modificada_por_ia
CREATE OR REPLACE FUNCTION public.upsert_pregunta(
  p_profesor_id UUID,
  p_academia_id UUID DEFAULT NULL,
  p_tema_id UUID DEFAULT NULL,
  p_pregunta_id UUID DEFAULT NULL,
  p_pregunta_texto TEXT DEFAULT NULL,
  p_opcion_a TEXT DEFAULT NULL,
  p_opcion_b TEXT DEFAULT NULL,
  p_opcion_c TEXT DEFAULT NULL,
  p_opcion_d TEXT DEFAULT NULL,
  p_solucion_letra TEXT DEFAULT NULL,
  p_parte TEXT DEFAULT NULL,
  p_pregunta_origen_id UUID DEFAULT NULL,
  p_modificada_por_ia BOOLEAN DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_academia_id UUID;
BEGIN
  IF p_pregunta_id IS NOT NULL THEN
    -- UPDATE: validar que el profesor tiene acceso a la academia de la pregunta
    SELECT academia_id INTO v_academia_id FROM public.preguntas WHERE id = p_pregunta_id;
    IF NOT EXISTS (
      SELECT 1 FROM public.profesor_academias
      WHERE profesor_id = p_profesor_id AND academia_id = v_academia_id
    ) THEN
      RAISE EXCEPTION 'Sin acceso a esta pregunta';
    END IF;

    UPDATE public.preguntas SET
      pregunta_texto  = COALESCE(p_pregunta_texto, pregunta_texto),
      opcion_a        = COALESCE(p_opcion_a, opcion_a),
      opcion_b        = COALESCE(p_opcion_b, opcion_b),
      opcion_c        = COALESCE(p_opcion_c, opcion_c),
      opcion_d        = COALESCE(p_opcion_d, opcion_d),
      solucion_letra  = COALESCE(p_solucion_letra, solucion_letra),
      parte           = COALESCE(p_parte, parte),
      -- Editar resetea verificación
      verificada      = false,
      rechazada       = false,
      verificada_por  = NULL,
      verificada_at   = NULL,
      verificacion_notas = NULL,
      -- Marcar IA si se indica
      modificada_por_ia = CASE
        WHEN p_modificada_por_ia = true THEN true
        ELSE modificada_por_ia
      END
    WHERE id = p_pregunta_id
    RETURNING id INTO v_id;
  ELSE
    -- INSERT: validar academia
    IF NOT EXISTS (
      SELECT 1 FROM public.profesor_academias
      WHERE profesor_id = p_profesor_id AND academia_id = p_academia_id
    ) THEN
      RAISE EXCEPTION 'Sin acceso a esta academia';
    END IF;

    -- Validar que el tema pertenece a la academia
    IF NOT EXISTS (
      SELECT 1 FROM public.temas
      WHERE id = p_tema_id AND academia_id = p_academia_id
    ) THEN
      RAISE EXCEPTION 'El tema no pertenece a la academia';
    END IF;

    INSERT INTO public.preguntas (
      academia_id, tema_id, creada_por,
      pregunta_texto, opcion_a, opcion_b, opcion_c, opcion_d,
      solucion_letra, parte,
      pregunta_origen_id, modificada_por_ia,
      verificada, rechazada
    ) VALUES (
      p_academia_id, p_tema_id, p_profesor_id,
      p_pregunta_texto, p_opcion_a, p_opcion_b, p_opcion_c, p_opcion_d,
      p_solucion_letra, p_parte,
      p_pregunta_origen_id, COALESCE(p_modificada_por_ia, false),
      false, false
    )
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;
