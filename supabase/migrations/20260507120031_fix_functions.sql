-- Fix: DROP funciones existentes antes de recrearlas con nuevos tipos/parámetros

-- get_preguntas_para_verificar: tipo de retorno cambia (añade 3 columnas nuevas)
DROP FUNCTION IF EXISTS public.get_preguntas_para_verificar(uuid,uuid,uuid,text,integer,integer);

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
        WHEN 'pendiente'  THEN NOT p.verificada AND NOT p.rechazada
        WHEN 'verificada' THEN p.verificada
        WHEN 'rechazada'  THEN p.rechazada
        ELSE true
      END
    )
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- upsert_pregunta: firma cambia (parámetros nuevos), DROP la versión anterior
DROP FUNCTION IF EXISTS public.upsert_pregunta(uuid,uuid,uuid,uuid,text,text,text,text,text,text,text);

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
    SELECT academia_id INTO v_academia_id FROM public.preguntas WHERE id = p_pregunta_id;
    IF NOT EXISTS (
      SELECT 1 FROM public.profesor_academias
      WHERE profesor_id = p_profesor_id AND academia_id = v_academia_id
    ) THEN
      RAISE EXCEPTION 'Sin acceso a esta pregunta';
    END IF;

    UPDATE public.preguntas SET
      pregunta_texto     = COALESCE(p_pregunta_texto, pregunta_texto),
      opcion_a           = COALESCE(p_opcion_a, opcion_a),
      opcion_b           = COALESCE(p_opcion_b, opcion_b),
      opcion_c           = COALESCE(p_opcion_c, opcion_c),
      opcion_d           = COALESCE(p_opcion_d, opcion_d),
      solucion_letra     = COALESCE(p_solucion_letra, solucion_letra),
      parte              = COALESCE(p_parte, parte),
      verificada         = false,
      rechazada          = false,
      verificada_por     = NULL,
      verificada_at      = NULL,
      verificacion_notas = NULL,
      modificada_por_ia  = CASE WHEN p_modificada_por_ia = true THEN true ELSE modificada_por_ia END
    WHERE id = p_pregunta_id
    RETURNING id INTO v_id;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM public.profesor_academias
      WHERE profesor_id = p_profesor_id AND academia_id = p_academia_id
    ) THEN
      RAISE EXCEPTION 'Sin acceso a esta academia';
    END IF;

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
