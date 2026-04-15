/**
 * Script para generar explicaciones de preguntas usando OpenRouter (Grok-4-fast)
 *
 * Uso:
 *   node scripts/generate-explanations.mjs [LIMIT] [--force]
 *
 *   --force  Sobreescribe explicaciones existentes (útil para re-generar con prompt mejorado)
 *
 * Variables de entorno requeridas:
 *   SUPABASE_SERVICE_ROLE_KEY  - Service role key de Supabase (no la anon key)
 *   OPENROUTER_API_KEY         - API key de OpenRouter
 *
 * Ejemplos:
 *   # Generar 10 nuevas
 *   SUPABASE_SERVICE_ROLE_KEY="eyJ..." OPENROUTER_API_KEY="sk-or-v1-..." node scripts/generate-explanations.mjs 10
 *
 *   # Re-generar las primeras 10 (sobreescribir existentes)
 *   SUPABASE_SERVICE_ROLE_KEY="eyJ..." OPENROUTER_API_KEY="sk-or-v1-..." node scripts/generate-explanations.mjs 10 --force
 */

import { createClient } from '@supabase/supabase-js';

// ── Config ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://pakyheklnfpwibyahmcg.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = 'x-ai/grok-4-fast';
const LIMIT = parseInt(process.argv[2] || '10', 10);
const FORCE = process.argv.includes('--force');
const DELAY_MS = 1500;

// ── Validación ──────────────────────────────────────────────────────────────
if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Falta SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!OPENROUTER_API_KEY) {
  console.error('❌ Falta OPENROUTER_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── Prompts ─────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Eres un Ingeniero Agrónomo experto en la preparación de oposiciones al Cuerpo Superior de Ingeniería Agronómica de Castilla-La Mancha. Tu misión es generar "Píldoras de Estudio" para preguntas tipo test.

REGLAS:
1. TONO: Profesional, didáctico y directo. Ayuda al alumno a memorizar y diferenciar conceptos clave.
2. ESTRUCTURA (sin encabezados, todo seguido):
   - Primero justifica por qué la respuesta correcta es correcta: explica el "porqué" técnico o legal. Si hay una ley, real decreto u orden implicados, cítalos con nombre y número.
   - Después analiza los distractores: esta es la parte MÁS IMPORTANTE. Explica qué SON las opciones incorrectas o por qué no aplican. El análisis de distractores debe ocupar al menos la mitad del texto total. Si son plagas, máquinas, leyes o conceptos reales pero que no corresponden aquí, defínelos brevemente para que el alumno pueda diferenciarlos en el futuro.
   - Si la pregunta es técnica (plagas, cultivos, riego, maquinaria, suelos), añade un dato de contexto agronómico que ayude a fijar el concepto.
   - Si la pregunta trata sobre datos estadísticos o porcentajes, explica qué es la fuente de datos citada y da contexto que ayude a recordar el número correcto (por qué ese valor tiene sentido, qué representa en la realidad agraria).
3. EXTENSIÓN: Entre 500 y 800 caracteres. NUNCA escribas menos de 500 caracteres. Denso en información, fácil de leer.
4. ESTILO: Sin encabezados, sin repetir la pregunta, sin bullet points. Empieza directamente con la justificación.
5. Responde ÚNICAMENTE con la píldora de estudio, nada más.`;

function buildUserPrompt(q) {
  const opciones = [`A) ${q.opcion_a}`, `B) ${q.opcion_b}`];
  if (q.opcion_c) opciones.push(`C) ${q.opcion_c}`);
  if (q.opcion_d) opciones.push(`D) ${q.opcion_d}`);

  const respuestaMap = { A: q.opcion_a, B: q.opcion_b, C: q.opcion_c, D: q.opcion_d };
  const respuestaTexto = respuestaMap[q.solucion_letra.trim()] || '';

  return `Genera una píldora de estudio (500-800 caracteres) para esta pregunta de oposiciones al Cuerpo Superior de Ingenieros Agrónomos de Castilla-La Mancha:

Tema: ${q.temas?.nombre || 'N/A'}
Parte del examen: ${q.parte || 'N/A'}

Pregunta: ${q.pregunta_texto}
A) ${q.opcion_a}
B) ${q.opcion_b}
${q.opcion_c ? `C) ${q.opcion_c}` : ''}
${q.opcion_d ? `D) ${q.opcion_d}` : ''}

Respuesta correcta: ${q.solucion_letra.trim()}) ${respuestaTexto}

Si las opciones incorrectas son plagas, máquinas, leyes o conceptos reales pero que no aplican aquí, defínelos brevemente para que el alumno pueda diferenciarlos en el futuro.`;
}

// ── OpenRouter API ──────────────────────────────────────────────────────────
async function callOpenRouter(messages) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://academy-quiz.app',
      'X-Title': 'Academy Quiz - Explanation Generator',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.4,
      max_tokens: 600,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${err}`);
  }

  const data = await res.json();

  if (!data.choices?.[0]?.message?.content) {
    throw new Error(`Respuesta vacía de OpenRouter: ${JSON.stringify(data)}`);
  }

  return data.choices[0].message.content.trim();
}

// ── Utilidades ──────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Paso 1: Asegurar que la columna existe ──────────────────────────────────
async function ensureColumn() {
  const { error } = await supabase
    .from('preguntas')
    .select('explicacion')
    .limit(1);

  if (error?.message?.includes('explicacion')) {
    console.error('⚠️  La columna "explicacion" no existe en la tabla preguntas.');
    console.error('   Ejecuta esto en el SQL Editor de Supabase Dashboard:');
    console.error('');
    console.error('   ALTER TABLE preguntas ADD COLUMN explicacion text DEFAULT NULL;');
    console.error('');
    process.exit(1);
  }

  if (error) {
    throw new Error(`Error al verificar columna: ${error.message}`);
  }

  console.log('✅ Columna "explicacion" verificada.');
}

// ── Paso 2: Obtener preguntas ───────────────────────────────────────────────
async function fetchQuestions(limit, force) {
  let query = supabase
    .from('preguntas')
    .select(
      'id, pregunta_texto, opcion_a, opcion_b, opcion_c, opcion_d, solucion_letra, parte, temas(nombre), academias(nombre)',
    )
    .limit(limit);

  if (!force) {
    query = query.is('explicacion', null);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Error al obtener preguntas: ${error.message}`);
  }

  return data || [];
}

// ── Paso 3: Generar y guardar explicación ───────────────────────────────────
async function generateAndSave(question) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildUserPrompt(question) },
  ];

  const explicacion = await callOpenRouter(messages);

  const { error } = await supabase
    .from('preguntas')
    .update({ explicacion })
    .eq('id', question.id);

  if (error) {
    throw new Error(`Error al guardar explicación para ${question.id}: ${error.message}`);
  }

  return explicacion;
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🚀 Generador de explicaciones — Modelo: ${MODEL}`);
  console.log(`   Límite: ${LIMIT} preguntas | Modo: ${FORCE ? 'FORCE (sobreescribe)' : 'solo sin explicación'}\n`);

  await ensureColumn();

  const questions = await fetchQuestions(LIMIT, FORCE);

  if (questions.length === 0) {
    console.log('ℹ️  No hay preguntas pendientes. Usa --force para sobreescribir existentes.');
    return;
  }

  console.log(`📝 ${questions.length} preguntas a procesar:\n`);

  let success = 0;
  let failures = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const prefix = `[${i + 1}/${questions.length}]`;

    try {
      const explicacion = await generateAndSave(q);
      success++;
      console.log(`${prefix} ✅ ${q.pregunta_texto.substring(0, 70)}...`);
      console.log(`       → ${explicacion.substring(0, 130)}...\n`);
    } catch (err) {
      failures++;
      console.error(`${prefix} ❌ Error: ${err.message}\n`);
    }

    if (i < questions.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`\n📊 Resultado: ${success} exitosas, ${failures} fallidas de ${questions.length} total.`);
}

main().catch((err) => {
  console.error('💥 Error fatal:', err);
  process.exit(1);
});
