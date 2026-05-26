# Prompt: Importar exámenes oficiales ITA/IA a Supabase

## Contexto del proyecto

Este es un quiz app (React + Supabase) para preparación de oposiciones. Tiene una arquitectura
`academias → temas → preguntas` con roles admin/profesor/alumno. El Supabase MCP está activo
en esta sesión — úsalo para leer el schema real antes de escribir cualquier SQL.

Proyecto Supabase: `https://pakyheklnfpwibyahmcg.supabase.co`

---

## Qué hay que hacer

Importar **1.075 preguntas** de exámenes oficiales de oposición (11 convocatorias del estado)
a Supabase, con trazabilidad completa y la capacidad de combinarlas en el futuro con las
preguntas de otras academias.

---

## Datos fuente (leer estos archivos)

**JSONs de preguntas** — en `C:\Users\MARIO\Documents\Academia Yeray\extracted\`:

| Archivo | Preguntas | Cuerpo |
|---|---|---|
| 1_ITA_2016.json | 95 | ITA (A2) |
| 1_ITA_2020.json | 95 | ITA (A2) |
| 1_ITA_2022.json | 95 | ITA (A2) |
| 1_ITA_2024.json | 95 | ITA (A2) |
| 1_IA_2016.json | 105 | IA (A1) |
| 1_IA_2018.json | 105 | IA (A1) |
| 1_IA_2020.json | 105 | IA (A1) |
| 1_IA_2022.json | 105 | IA (A1) |
| 1_IA_2022_Interna.json | 85 | IA (A1) |
| 1_IA_2024.json | 105 | IA (A1) |
| 1_IA_2024_Interna.json | 85 | IA (A1) |

**Taxonomía de temas** — `C:\Users\MARIO\Documents\Academia Yeray\data\temas_taxonomia.json`:
65 temas con id, bloque (comun/especifico), numero, titulo, resumen, keywords[].

### Schema de cada JSON de examen (nivel raíz)

```json
{
  "exam_id": "1_ITA_2024",
  "cuerpo": "Cuerpo Tecnico de Administracion de la Junta de Comunidades de Castilla-La Mancha",
  "especialidad": "Ingenieria Tecnica Agricola",
  "convocatoria": "Libre",
  "oep": "2024",
  "fecha_examen": "2025-09-28",
  "total_preguntas": 95,
  "preguntas_regulares": 90,
  "preguntas_reserva": 5,
  "preguntas_anuladas": [16, 22, 49, 74],
  "reservas_activadas": {"91": 16, "92": 22, "93": 49, "94": 74},
  "plantilla_tipo": "definitiva",
  "plantilla_nota": "...",
  "questions": [...]
}
```

### Schema de cada pregunta dentro del JSON

```json
{
  "question_id": "1_ITA_2024_Q001",
  "exam_id": "1_ITA_2024",
  "numero": 1,
  "enunciado": "¿Qué órgano es el elegido de forma directa...",
  "opcion_a": "Consejo europeo",
  "opcion_b": "Comisión europea",
  "opcion_c": "Parlamento",
  "opcion_d": "Consejo de la UE",
  "respuesta_correcta": "c",
  "anulada": false,
  "reserva": false,
  "sustituye_a": null,
  "nota": null,
  "tema_id": "comun_1"
}
```

**Notas importantes sobre los datos:**
- `respuesta_correcta` es `null` cuando la pregunta está anulada o es reserva no activada
- `sustituye_a` contiene el número de pregunta anulada que esta reserva reemplaza (o null)
- `tema_id` es el id del tema en temas_taxonomia.json (ej: "comun_1", "especifico_13")
- Todas las preguntas tienen las 4 opciones (opcion_a/b/c/d siempre presentes)

---

## Diseño de la solución

### Principios

1. **Trazabilidad completa**: cada pregunta debe saber de qué convocatoria oficial viene
2. **Etiquetado como oficial**: flag `es_oficial=true` para filtrar/combinar en el futuro
3. **Compatible con el banco existente**: las preguntas oficiales aparecen en el Banco y los
   profesores pueden clonarlas a sus academias (ya existe `clonar_pregunta` RPC)
4. **Idempotente**: si el import se ejecuta dos veces, no crea duplicados
5. **Sin romper nada**: todas las adiciones son `ADD COLUMN IF NOT EXISTS` y tablas nuevas

### Decisión de estructura

**2 academias biblioteca** (es_biblioteca=true, propietario_id=null):
- `"ITA — Exámenes Oficiales (A2)"` → contiene los 4 exámenes ITA
- `"IA — Exámenes Oficiales (A1)"` → contiene los 7 exámenes IA

**65 temas por academia** (130 filas total en `temas`):
Los temas de temas_taxonomia.json se crean como temas de cada academia.
El campo `parte` de cada pregunta almacena el bloque: `'comun'` o `'especifico'`.

**Nueva tabla `convocatorias`**:
Modela cada convocatoria oficial del estado (los 11 JSON files). Una pregunta tiene FK a su
convocatoria. Esto permite queries como "muéstrame solo preguntas del examen 2022".

**Extensiones a `preguntas`** (columnas añadidas):
- `es_oficial BOOLEAN DEFAULT false` — el tag clave para distinguir preguntas oficiales
- `convocatoria_id UUID` → FK a convocatorias
- `numero_pregunta INTEGER` — número de la pregunta dentro de su convocatoria (1..95/105)
- `anulada BOOLEAN DEFAULT false`
- `reserva BOOLEAN DEFAULT false`
- `sustituye_a INTEGER` — número de pregunta anulada que sustituye (para reservas)
- `question_id_origen TEXT UNIQUE` — "1_ITA_2016_Q001", clave de idempotencia

**Extensiones a `temas`** (columnas añadidas):
- `bloque TEXT` — 'comun' | 'especifico'
- `numero INTEGER` — posición dentro del bloque
- `resumen TEXT` — descripción del tema
- `tema_id_origen TEXT` — "comun_1", "especifico_11" (referencia al JSON original)

**`verificada = true`** para todas las preguntas oficiales (ya verificadas por el estado).
**`solucion_letra`**: para preguntas anuladas con respuesta_correcta=null, usar `'anulada'`.

---

## Pasos de implementación

### Paso 1 — Leer el schema actual

Usa el MCP de Supabase para ver las tablas actuales, RLS policies y constraints antes de
escribir el SQL. En particular verifica:
- Si `temas` ya tiene columnas `bloque`, `numero`, etc. (no añadir si existen)
- Si `preguntas` ya tiene `es_oficial`, `convocatoria_id`, etc.
- Si existe la tabla `convocatorias`
- El constraint exacto de `solucion_letra` (NOT NULL o nullable)

### Paso 2 — Crear el archivo de migración SQL

Crea el archivo en `supabase/migrations/` con timestamp actual.
Nombre sugerido: `YYYYMMDDHHMMSS_examenes_oficiales.sql`

El SQL debe:

```sql
-- 1. Nueva tabla convocatorias
CREATE TABLE IF NOT EXISTS public.convocatorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id TEXT UNIQUE NOT NULL,
  academia_id UUID REFERENCES public.academias(id) ON DELETE CASCADE,
  cuerpo TEXT NOT NULL,           -- 'ITA' | 'IA'
  grupo TEXT NOT NULL,            -- 'A2' | 'A1'
  convocatoria TEXT NOT NULL DEFAULT 'Libre',  -- 'Libre' | 'Interna'
  oep TEXT,
  fecha_examen DATE,
  total_preguntas INTEGER,
  preguntas_regulares INTEGER,
  preguntas_reserva INTEGER,
  preguntas_anuladas_numeros INTEGER[] DEFAULT '{}',
  plantilla_tipo TEXT,
  plantilla_nota TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.convocatorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "convocatorias_select" ON public.convocatorias FOR SELECT USING (true);
CREATE POLICY "convocatorias_admin" ON public.convocatorias FOR ALL
  USING (public.is_user_admin(auth.uid()));

-- 2. Extender temas
ALTER TABLE public.temas
  ADD COLUMN IF NOT EXISTS bloque TEXT,
  ADD COLUMN IF NOT EXISTS numero INTEGER,
  ADD COLUMN IF NOT EXISTS resumen TEXT,
  ADD COLUMN IF NOT EXISTS tema_id_origen TEXT;

-- 3. Extender preguntas
ALTER TABLE public.preguntas
  ADD COLUMN IF NOT EXISTS es_oficial BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS convocatoria_id UUID REFERENCES public.convocatorias(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS numero_pregunta INTEGER,
  ADD COLUMN IF NOT EXISTS anulada BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reserva BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sustituye_a INTEGER,
  ADD COLUMN IF NOT EXISTS question_id_origen TEXT;

-- Unique constraint para idempotencia
ALTER TABLE public.preguntas
  ADD CONSTRAINT preguntas_question_id_origen_unique UNIQUE (question_id_origen);

-- Índices
CREATE INDEX IF NOT EXISTS preguntas_es_oficial_idx ON public.preguntas(es_oficial);
CREATE INDEX IF NOT EXISTS preguntas_convocatoria_idx ON public.preguntas(convocatoria_id);
CREATE INDEX IF NOT EXISTS temas_tema_id_origen_idx ON public.temas(tema_id_origen);
```

Aplica la migración via MCP de Supabase (usa la herramienta execute SQL o apply migration).

### Paso 3 — Script de importación Python

Crea `scripts/import_examenes_oficiales.py`. Debe:

1. Leer `C:\Users\MARIO\Documents\Academia Yeray\data\temas_taxonomia.json`
2. Leer las credenciales Supabase del `.env` del proyecto (usa la SERVICE ROLE key, no la anon)
3. Crear las 2 academias biblioteca (con `ON CONFLICT DO NOTHING` por idempotencia)
4. Crear los 65 temas en cada academia, usando `upsert` con `tema_id_origen` como clave
5. Para cada uno de los 11 JSON files:
   a. Crear/upsert la fila en `convocatorias` (clave: `exam_id`)
   b. Para cada pregunta: insertar en `preguntas` con `ON CONFLICT (question_id_origen) DO NOTHING`
6. Al final: imprimir conteos para verificar

**Mapeo de campos JSON → preguntas:**
```
question_id       → question_id_origen
enunciado         → pregunta_texto
opcion_a/b/c/d    → opcion_a/b/c/d
respuesta_correcta → solucion_letra  (null → 'anulada')
anulada           → anulada
reserva           → reserva
sustituye_a       → sustituye_a
tema_id (comun_1) → tema_id (UUID del tema creado en paso 4)
numero            → numero_pregunta
bloque del tema   → parte  ('comun' | 'especifico')
```

**Valores fijos para todas las preguntas oficiales:**
```python
es_oficial = True
verificada = True      # certificadas por el estado
rechazada = False
modificada_por_ia = False
creada_por = None      # no las creó un profesor del sistema
```

### Paso 4 — Ejecutar y verificar

Ejecutar el script Python y verificar con queries MCP:
```sql
-- Verificar conteos
SELECT a.nombre, COUNT(p.id) as preguntas, COUNT(DISTINCT t.id) as temas
FROM academias a
LEFT JOIN preguntas p ON p.academia_id = a.id
LEFT JOIN temas t ON t.academia_id = a.id
WHERE a.es_biblioteca = true
GROUP BY a.nombre;

-- Verificar convocatorias
SELECT exam_id, cuerpo, total_preguntas,
       COUNT(p.id) as importadas
FROM convocatorias c
JOIN preguntas p ON p.convocatoria_id = c.id
GROUP BY c.id ORDER BY exam_id;

-- Spot check una pregunta
SELECT question_id_origen, pregunta_texto, solucion_letra,
       anulada, reserva, es_oficial, verificada
FROM preguntas WHERE question_id_origen = '1_ITA_2024_Q001';
```

---

## Resultado esperado

```
ITA — Exámenes Oficiales (A2):  380 preguntas, 65 temas
IA  — Exámenes Oficiales (A1):  695 preguntas, 65 temas

convocatorias:
  1_ITA_2016: 95 preguntas
  1_ITA_2020: 95 preguntas
  1_ITA_2022: 95 preguntas
  1_ITA_2024: 95 preguntas
  1_IA_2016:  105 preguntas
  1_IA_2018:  105 preguntas
  1_IA_2020:  105 preguntas
  1_IA_2022:  105 preguntas
  1_IA_2022_Interna: 85 preguntas
  1_IA_2024:  105 preguntas
  1_IA_2024_Interna: 85 preguntas
  TOTAL: 1.075 preguntas
```

---

## Notas finales

- **No toques** las academias existentes (JCLM, LICEO, LINCE) ni sus preguntas.
- **Las nuevas columnas** son todas nullable o tienen DEFAULT — no rompen la app actual.
- **El script Python** debe usar `python-dotenv` para leer `.env` y `supabase-py` para insertar.
- Si `supabase-py` no está instalado: `pip install supabase python-dotenv`
- Usa la **SERVICE ROLE KEY** (no la anon key) para bypasear RLS en el import masivo.
- Tras importar, el Banco de preguntas en la app mostrará automáticamente las oficiales
  porque usa `WHERE es_biblioteca = true` — no se necesita cambio de código en el frontend.
