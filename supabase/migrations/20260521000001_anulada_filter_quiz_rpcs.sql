-- Migration: anulada_filter_quiz_rpcs
-- Adds AND (p.anulada IS NOT TRUE) to the WHERE clauses of get_smart_preguntas
-- and get_random_preguntas so anulada questions are never served in student quizzes,
-- even if they end up in a non-biblioteca academia (e.g. via clonar_pregunta).
-- Depends on: 20260521000000_examenes_oficiales.sql (adds preguntas.anulada column).

CREATE OR REPLACE FUNCTION public.get_random_preguntas(
  p_academia_id uuid,
  p_tema_id     uuid,
  p_limit       integer DEFAULT 10
)
RETURNS TABLE(
  id uuid, pregunta_texto text, opcion_a text, opcion_b text, opcion_c text, opcion_d text,
  solucion_letra character, parte text, tema_id uuid, academia_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    p.id, p.pregunta_texto, p.opcion_a, p.opcion_b, p.opcion_c, p.opcion_d,
    p.solucion_letra, p.parte, p.tema_id, p.academia_id
  FROM preguntas p
  WHERE p.academia_id = p_academia_id
    AND p.tema_id = p_tema_id
    AND p.anulada IS NOT TRUE
  ORDER BY RANDOM()
  LIMIT p_limit;
END;
$function$;


CREATE OR REPLACE FUNCTION public.get_smart_preguntas(
  p_user_id          uuid,
  p_academia_id      uuid,
  p_tema_id          uuid,
  p_limit            integer DEFAULT 10,
  p_days_threshold   integer DEFAULT 30,
  p_include_failed   boolean DEFAULT true
)
RETURNS TABLE(
  id uuid, academia_id uuid, tema_id uuid, parte text, pregunta_texto text,
  opcion_a text, opcion_b text, opcion_c text, opcion_d text, solucion_letra character,
  created_at timestamp with time zone, priority_level integer,
  days_since_correct integer, times_answered integer
)
LANGUAGE plpgsql
AS $function$
DECLARE
    failed_count INTEGER := 0;
    never_answered_count INTEGER := 0;
    old_correct_count INTEGER := 0;
    questions_needed INTEGER := p_limit;
BEGIN
    CREATE TEMP TABLE temp_smart_questions (
        id UUID,
        academia_id UUID,
        tema_id UUID,
        parte TEXT,
        pregunta_texto TEXT,
        opcion_a TEXT, opcion_b TEXT, opcion_c TEXT, opcion_d TEXT,
        solucion_letra CHAR,
        created_at TIMESTAMP WITH TIME ZONE,
        priority_level INTEGER,
        days_since_correct INTEGER,
        times_answered INTEGER
    );

    -- PRIORIDAD 1: nunca respondidas
    IF questions_needed > 0 THEN
        INSERT INTO temp_smart_questions
        SELECT
            p.id, p.academia_id, p.tema_id, p.parte, p.pregunta_texto,
            p.opcion_a, p.opcion_b, p.opcion_c, p.opcion_d, p.solucion_letra,
            p.created_at, 1, 999, 0
        FROM preguntas p
        WHERE p.academia_id = p_academia_id
          AND p.tema_id = p_tema_id
          AND p.anulada IS NOT TRUE
          AND NOT EXISTS (
              SELECT 1 FROM user_answers ua
              WHERE ua.user_id = p_user_id AND ua.pregunta_id = p.id
          )
        ORDER BY RANDOM()
        LIMIT questions_needed;

        GET DIAGNOSTICS never_answered_count = ROW_COUNT;
        questions_needed := questions_needed - never_answered_count;
    END IF;

    -- PRIORIDAD 2: falladas
    IF p_include_failed AND questions_needed > 0 THEN
        INSERT INTO temp_smart_questions
        SELECT
            p.id, p.academia_id, p.tema_id, p.parte, p.pregunta_texto,
            p.opcion_a, p.opcion_b, p.opcion_c, p.opcion_d, p.solucion_letra,
            p.created_at, 2,
            COALESCE(
                EXTRACT(DAY FROM NOW() - (
                    SELECT MAX(ua.answered_at)
                    FROM user_answers ua
                    WHERE ua.user_id = p_user_id AND ua.pregunta_id = p.id AND ua.is_correct = true
                )), 999
            )::INTEGER,
            COALESCE(
                (SELECT COUNT(*) FROM user_answers ua WHERE ua.user_id = p_user_id AND ua.pregunta_id = p.id), 0
            )::INTEGER
        FROM preguntas p
        INNER JOIN preguntas_falladas pf ON p.id = pf.pregunta_id
        WHERE pf.user_id = p_user_id
          AND p.academia_id = p_academia_id
          AND p.tema_id = p_tema_id
          AND p.anulada IS NOT TRUE
          AND NOT EXISTS (SELECT 1 FROM temp_smart_questions tsq WHERE tsq.id = p.id)
        ORDER BY RANDOM()
        LIMIT questions_needed;

        GET DIAGNOSTICS failed_count = ROW_COUNT;
        questions_needed := questions_needed - failed_count;
    END IF;

    -- PRIORIDAD 3: correctas antiguas
    IF questions_needed > 0 THEN
        INSERT INTO temp_smart_questions
        SELECT
            p.id, p.academia_id, p.tema_id, p.parte, p.pregunta_texto,
            p.opcion_a, p.opcion_b, p.opcion_c, p.opcion_d, p.solucion_letra,
            p.created_at, 3,
            EXTRACT(DAY FROM NOW() - MAX(ua.answered_at))::INTEGER,
            COUNT(ua.id)::INTEGER
        FROM preguntas p
        INNER JOIN user_answers ua ON p.id = ua.pregunta_id
        WHERE ua.user_id = p_user_id
          AND p.academia_id = p_academia_id
          AND p.tema_id = p_tema_id
          AND p.anulada IS NOT TRUE
          AND ua.is_correct = true
          AND ua.answered_at < NOW() - INTERVAL '1 day' * p_days_threshold
          AND NOT EXISTS (SELECT 1 FROM temp_smart_questions tsq WHERE tsq.id = p.id)
        GROUP BY p.id, p.academia_id, p.tema_id, p.parte, p.pregunta_texto,
                 p.opcion_a, p.opcion_b, p.opcion_c, p.opcion_d, p.solucion_letra, p.created_at
        ORDER BY MAX(ua.answered_at) ASC, RANDOM()
        LIMIT questions_needed;

        GET DIAGNOSTICS old_correct_count = ROW_COUNT;
    END IF;

    RAISE NOTICE 'Smart questions selection: Never=%, Failed=%, Old=%, Total=%',
        never_answered_count, failed_count, old_correct_count,
        (never_answered_count + failed_count + old_correct_count);

    RETURN QUERY
    SELECT
        tsq.id, tsq.academia_id, tsq.tema_id, tsq.parte, tsq.pregunta_texto,
        tsq.opcion_a, tsq.opcion_b, tsq.opcion_c, tsq.opcion_d, tsq.solucion_letra,
        tsq.created_at, tsq.priority_level, tsq.days_since_correct, tsq.times_answered
    FROM temp_smart_questions tsq
    ORDER BY tsq.priority_level, RANDOM();

    DROP TABLE temp_smart_questions;
END;
$function$;
