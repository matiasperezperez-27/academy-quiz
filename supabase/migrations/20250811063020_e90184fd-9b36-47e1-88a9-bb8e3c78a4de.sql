-- Fix linter warnings: set immutable search_path on function and enable RLS on profiles with sane policies

-- Recreate function with search_path set
CREATE OR REPLACE FUNCTION public.get_random_preguntas(
  p_academia_id uuid,
  p_tema_id uuid,
  p_limit int DEFAULT 10
)
RETURNS SETOF public.preguntas
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT *
  FROM public.preguntas
  WHERE academia_id = p_academia_id
    AND tema_id = p_tema_id
  ORDER BY random()
  LIMIT p_limit;
$$;

-- Enable RLS on profiles and add basic policies
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing to avoid duplicates
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles'
  ) THEN
    DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
    DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
  END IF;
END $$;

-- Viewable by everyone
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  TO public
  USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);