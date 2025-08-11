-- Enable RLS on public tables and add necessary policies
-- Academias, Temas, Preguntas are reference data; allow read to all
ALTER TABLE IF EXISTS public.academias ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.temas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.preguntas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.preguntas_falladas ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid duplicates (safe guards)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='academias'
  ) THEN
    DROP POLICY IF EXISTS "Read academias" ON public.academias;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='temas'
  ) THEN
    DROP POLICY IF EXISTS "Read temas" ON public.temas;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='preguntas'
  ) THEN
    DROP POLICY IF EXISTS "Read preguntas" ON public.preguntas;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='preguntas_falladas'
  ) THEN
    DROP POLICY IF EXISTS "Select own falladas" ON public.preguntas_falladas;
    DROP POLICY IF EXISTS "Insert own falladas" ON public.preguntas_falladas;
    DROP POLICY IF EXISTS "Delete own falladas" ON public.preguntas_falladas;
  END IF;
END $$;

-- Create read policies
CREATE POLICY "Read academias"
  ON public.academias
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Read temas"
  ON public.temas
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Read preguntas"
  ON public.preguntas
  FOR SELECT
  TO public
  USING (true);

-- Create user-scoped policies for preguntas_falladas
CREATE POLICY "Select own falladas"
  ON public.preguntas_falladas
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Insert own falladas"
  ON public.preguntas_falladas
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Delete own falladas"
  ON public.preguntas_falladas
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Ensure uniqueness to prevent duplicates
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND c.relname = 'uq_preguntas_falladas_user_pregunta'
      AND n.nspname = 'public'
  ) THEN
    CREATE UNIQUE INDEX uq_preguntas_falladas_user_pregunta
      ON public.preguntas_falladas (user_id, pregunta_id);
  END IF;
END $$;

-- RPC: get random preguntas by academia and tema
CREATE OR REPLACE FUNCTION public.get_random_preguntas(
  p_academia_id uuid,
  p_tema_id uuid,
  p_limit int DEFAULT 10
)
RETURNS SETOF public.preguntas
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM public.preguntas
  WHERE academia_id = p_academia_id
    AND tema_id = p_tema_id
  ORDER BY random()
  LIMIT p_limit;
$$;