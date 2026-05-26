-- Migration: examenes_oficiales
-- Adds support for official ITA/IA JCCM exam questions with full traceability.
-- New table: convocatorias
-- Extended: temas (bloque, numero, resumen, tema_id_origen)
-- Extended: preguntas (es_oficial, convocatoria_id, numero_pregunta, anulada, reserva, sustituye_a, question_id_origen)
-- solucion_letra is made nullable to support anulada questions (respuesta_correcta = null in source JSON).

-- ─── 1. Make solucion_letra nullable ─────────────────────────────────────────
-- Anulada questions have no correct answer. Existing rows are unaffected (all A/B/C/D).
ALTER TABLE public.preguntas
  ALTER COLUMN solucion_letra DROP NOT NULL;

ALTER TABLE public.preguntas
  DROP CONSTRAINT IF EXISTS preguntas_solucion_letra_check;

ALTER TABLE public.preguntas
  ADD CONSTRAINT preguntas_solucion_letra_check
  CHECK (solucion_letra IS NULL OR solucion_letra = ANY (ARRAY['A'::bpchar, 'B'::bpchar, 'C'::bpchar, 'D'::bpchar]));

-- ─── 2. Table: convocatorias ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.convocatorias (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id                   TEXT        UNIQUE NOT NULL,
  academia_id               UUID        REFERENCES public.academias(id) ON DELETE CASCADE,
  cuerpo                    TEXT        NOT NULL,
  grupo                     TEXT        NOT NULL,
  convocatoria              TEXT        NOT NULL DEFAULT 'Libre',
  oep                       TEXT,
  fecha_examen              DATE,
  total_preguntas           INTEGER,
  preguntas_regulares       INTEGER,
  preguntas_reserva         INTEGER,
  preguntas_anuladas_numeros INTEGER[]  DEFAULT '{}',
  plantilla_tipo            TEXT,
  plantilla_nota            TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.convocatorias ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'convocatorias' AND policyname = 'convocatorias_select') THEN
    EXECUTE 'CREATE POLICY "convocatorias_select" ON public.convocatorias FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'convocatorias' AND policyname = 'convocatorias_admin') THEN
    EXECUTE 'CREATE POLICY "convocatorias_admin" ON public.convocatorias FOR ALL USING (public.is_user_admin(auth.uid()))';
  END IF;
END $$;

-- ─── 3. Extend temas ──────────────────────────────────────────────────────────
ALTER TABLE public.temas
  ADD COLUMN IF NOT EXISTS bloque         TEXT,
  ADD COLUMN IF NOT EXISTS numero         INTEGER,
  ADD COLUMN IF NOT EXISTS resumen        TEXT,
  ADD COLUMN IF NOT EXISTS tema_id_origen TEXT;

-- Unique constraint needed for idempotent upsert in the import script.
-- NULL values in tema_id_origen (existing temas) are treated as distinct by Postgres UNIQUE, so no conflicts.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'temas_academia_tema_id_origen_unique'
    AND conrelid = 'public.temas'::regclass
  ) THEN
    ALTER TABLE public.temas
      ADD CONSTRAINT temas_academia_tema_id_origen_unique UNIQUE (academia_id, tema_id_origen);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS temas_tema_id_origen_idx ON public.temas(tema_id_origen) WHERE tema_id_origen IS NOT NULL;

-- ─── 4. Extend preguntas ──────────────────────────────────────────────────────
ALTER TABLE public.preguntas
  ADD COLUMN IF NOT EXISTS es_oficial        BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS convocatoria_id   UUID        REFERENCES public.convocatorias(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS numero_pregunta   INTEGER,
  ADD COLUMN IF NOT EXISTS anulada           BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reserva           BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sustituye_a       INTEGER,
  ADD COLUMN IF NOT EXISTS question_id_origen TEXT;

-- Unique constraint for idempotent import (ON CONFLICT DO NOTHING in Python script).
-- NULL values (non-official questions) are treated as distinct, so no conflicts with existing rows.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'preguntas_question_id_origen_unique'
    AND conrelid = 'public.preguntas'::regclass
  ) THEN
    ALTER TABLE public.preguntas
      ADD CONSTRAINT preguntas_question_id_origen_unique UNIQUE (question_id_origen);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS preguntas_es_oficial_idx  ON public.preguntas(es_oficial) WHERE es_oficial = true;
CREATE INDEX IF NOT EXISTS preguntas_convocatoria_idx ON public.preguntas(convocatoria_id) WHERE convocatoria_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS preguntas_anulada_idx      ON public.preguntas(anulada) WHERE anulada = true;
