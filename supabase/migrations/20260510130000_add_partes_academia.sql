-- partes_academia: almacena los nombres de partes registrados por academia
CREATE TABLE IF NOT EXISTS partes_academia (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  academia_id uuid NOT NULL REFERENCES academias(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(academia_id, nombre),
  CONSTRAINT partes_academia_nombre_nonempty CHECK (trim(nombre) <> '')
);

ALTER TABLE partes_academia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partes_academia_select" ON partes_academia
  FOR SELECT TO authenticated
  USING (
    academia_id IN (SELECT academia_id FROM profesor_academias WHERE profesor_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "partes_academia_insert" ON partes_academia
  FOR INSERT TO authenticated
  WITH CHECK (
    academia_id IN (SELECT academia_id FROM profesor_academias WHERE profesor_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "partes_academia_update" ON partes_academia
  FOR UPDATE TO authenticated
  USING (
    academia_id IN (SELECT academia_id FROM profesor_academias WHERE profesor_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "partes_academia_delete" ON partes_academia
  FOR DELETE TO authenticated
  USING (
    academia_id IN (SELECT academia_id FROM profesor_academias WHERE profesor_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- RPC: renombra la parte en todas las preguntas de una academia
CREATE OR REPLACE FUNCTION renombrar_parte_preguntas(
  p_profesor_id uuid,
  p_academia_id uuid,
  p_nombre_actual text,
  p_nombre_nuevo text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    EXISTS (SELECT 1 FROM profesor_academias WHERE profesor_id = p_profesor_id AND academia_id = p_academia_id)
    OR EXISTS (SELECT 1 FROM profiles WHERE id = p_profesor_id AND role = 'admin')
  ) THEN
    RAISE EXCEPTION 'Sin permisos para esta academia';
  END IF;

  UPDATE preguntas
  SET parte = p_nombre_nuevo
  WHERE academia_id = p_academia_id AND parte = p_nombre_actual;
END;
$$;

-- RPC: pone parte = NULL en todas las preguntas de una academia con ese nombre de parte
CREATE OR REPLACE FUNCTION eliminar_parte_preguntas(
  p_profesor_id uuid,
  p_academia_id uuid,
  p_nombre text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT (
    EXISTS (SELECT 1 FROM profesor_academias WHERE profesor_id = p_profesor_id AND academia_id = p_academia_id)
    OR EXISTS (SELECT 1 FROM profiles WHERE id = p_profesor_id AND role = 'admin')
  ) THEN
    RAISE EXCEPTION 'Sin permisos para esta academia';
  END IF;

  UPDATE preguntas
  SET parte = NULL
  WHERE academia_id = p_academia_id AND parte = p_nombre;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
