-- Normaliza los valores de parte en LICEO para que coincidan con los presets correctos:
-- 'Común', 'EXAMEN', 'Específica'

UPDATE preguntas
SET parte = 'Común'
WHERE academia_id IN (SELECT id FROM academias WHERE es_biblioteca = true AND nombre = 'LICEO')
  AND parte = 'Comun';

UPDATE preguntas
SET parte = 'Específica'
WHERE academia_id IN (SELECT id FROM academias WHERE es_biblioteca = true AND nombre = 'LICEO')
  AND parte IN ('Especifica', 'Especifico');
