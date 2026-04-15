/**
 * Genera explicaciones individuales por opción usando OpenRouter (Grok-4-fast)
 *
 * Devuelve JSON con una explicación por cada opción A/B/C/D:
 *   - Opciones INCORRECTAS: 1-2 frases breves (~100-150 caracteres) explicando
 *     qué concepto real es ese distractor y por qué no aplica aquí.
 *   - Opción CORRECTA: 3-5 frases (~400-500 caracteres) con justificación
 *     técnica/legal completa.
 *
 * Uso:
 *   node scripts/generate-explanations-per-option.mjs [LIMIT] [--force]
 *
 * Variables de entorno requeridas:
 *   SUPABASE_SERVICE_ROLE_KEY
 *   OPENROUTER_API_KEY
 *
 * Requisito previo — ejecutar en Supabase SQL Editor:
 *   ALTER TABLE preguntas
 *     ADD COLUMN IF NOT EXISTS explicacion_a text DEFAULT NULL,
 *     ADD COLUMN IF NOT EXISTS explicacion_b text DEFAULT NULL,
 *     ADD COLUMN IF NOT EXISTS explicacion_c text DEFAULT NULL,
 *     ADD COLUMN IF NOT EXISTS explicacion_d text DEFAULT NULL;
 */

import { createClient } from '@supabase/supabase-js';

// ── Config ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://pakyheklnfpwibyahmcg.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = 'x-ai/grok-4.1-fast';
const LIMIT = parseInt(process.argv[2] || '10', 10);
const FORCE = process.argv.includes('--force');
const DELAY_MS = 1500;

// ── Validación ──────────────────────────────────────────────────────────────
if (!SUPABASE_SERVICE_KEY) { console.error('❌ Falta SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
if (!OPENROUTER_API_KEY)   { console.error('❌ Falta OPENROUTER_API_KEY');         process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── Prompts ─────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Eres un Ingeniero Agrónomo experto en oposiciones al Cuerpo Superior de Ingeniería Agronómica de Castilla-La Mancha.

Tu tarea es generar explicaciones individuales para CADA opción de una pregunta tipo test y devolverlas en JSON.

REGLAS PARA OPCIONES INCORRECTAS (máximo 100 caracteres cada una):
- Si la opción es un concepto REAL (comunidad autónoma, organismo, ley, especie, lugar): di en 1 frase qué es y por qué no aplica aquí. Ejemplo: "Galicia lidera en vacuno de leche, no en carne."
- Si la opción es un número o fecha DISTRACTOR sin entidad propia: explica brevemente en qué se confunde o qué diferencia tiene con la correcta. Ejemplo: "Fecha de publicación, no de aplicación del reglamento."
- Si es claramente inventada o absurda: di simplemente por qué es incorrecta en 1 frase corta.
- NO uses frases genéricas como "esta opción es incorrecta porque no aplica". Siempre aporta algo concreto.

REGLAS PARA LA OPCIÓN CORRECTA (entre 300 y 400 caracteres):
- Justifica técnica y legalmente por qué es la respuesta válida.
- Cita la ley, real decreto u orden si existe, con nombre y número.
- Aporta un dato de contexto agronómico que ayude a fijar el concepto en la memoria.

REGLAS GENERALES:
- Responde ÚNICAMENTE con un objeto JSON válido. Sin texto antes ni después.
- Si una opción no existe (C o D son null), omite esa clave del JSON.

FORMATO DE SALIDA:
{
  "A": "...",
  "B": "...",
  "C": "...",
  "D": "..."
}`;

function buildUserPrompt(q) {
  const opciones = { A: q.opcion_a, B: q.opcion_b };
  if (q.opcion_c) opciones.C = q.opcion_c;
  if (q.opcion_d) opciones.D = q.opcion_d;

  const opcionesTexto = Object.entries(opciones)
    .map(([letra, texto]) => `  "${letra}": "${texto}"`)
    .join(',\n');

  return `Genera explicaciones individuales para cada opción de esta pregunta de oposición al Cuerpo Superior de Ingenieros Agrónomos de Castilla-La Mancha.

Tema: ${q.temas?.nombre || 'N/A'}
Parte: ${q.parte || 'N/A'}

Pregunta: ${q.pregunta_texto}

Opciones:
${Object.entries(opciones).map(([l, t]) => `${l}) ${t}`).join('\n')}

Respuesta correcta: ${q.solucion_letra.trim()}

Recuerda:
- Opciones INCORRECTAS: máx. 100 caracteres. Si la opción es un concepto real (lugar, organismo, ley, especie), di brevemente qué ES y por qué no aplica aquí. Si es un número o fecha distractor, explica en qué difiere o con qué se confunde.
- Opción CORRECTA (${q.solucion_letra.trim()}): 300-400 caracteres. Justificación técnica/legal completa con normativa y contexto agronómico.
- Devuelve SOLO el JSON, sin texto adicional.`;
}

// ── OpenRouter API ──────────────────────────────────────────────────────────
async function callOpenRouter(messages) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://academy-quiz.app',
      'X-Title': 'Academy Quiz - Per-Option Explanation Generator',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.3,
      max_tokens: 700,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${err}`);
  }

  const data = await res.json();
  if (!data.choices?.[0]?.message?.content) {
    throw new Error(`Respuesta vacía: ${JSON.stringify(data)}`);
  }

  return data.choices[0].message.content.trim();
}

// ── Parsear y validar JSON ───────────────────────────────────────────────────
function parseExplanations(raw, question) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Intentar extraer JSON si el modelo añadió texto extra
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error(`No se encontró JSON en la respuesta: ${raw.substring(0, 200)}`);
    parsed = JSON.parse(match[0]);
  }

  const letra = question.solucion_letra.trim();
  const opciones = ['A', 'B', 'C', 'D'].filter(
    l => question[`opcion_${l.toLowerCase()}`],
  );

  // Verificar que el JSON tiene todas las opciones presentes
  for (const l of opciones) {
    if (!parsed[l] || typeof parsed[l] !== 'string') {
      throw new Error(`Falta la explicación para la opción ${l} en el JSON`);
    }
  }

  return parsed;
}

// ── Utilidades ──────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Paso 1: Verificar columnas ───────────────────────────────────────────────
async function ensureColumns() {
  const { error } = await supabase
    .from('preguntas')
    .select('explicacion_a, explicacion_b, explicacion_c, explicacion_d')
    .limit(1);

  if (error?.message?.includes('explicacion_a')) {
    console.error('⚠️  Las columnas por opción no existen aún.');
    console.error('   Ejecuta en el SQL Editor de Supabase:');
    console.error('');
    console.error('   ALTER TABLE preguntas');
    console.error('     ADD COLUMN IF NOT EXISTS explicacion_a text DEFAULT NULL,');
    console.error('     ADD COLUMN IF NOT EXISTS explicacion_b text DEFAULT NULL,');
    console.error('     ADD COLUMN IF NOT EXISTS explicacion_c text DEFAULT NULL,');
    console.error('     ADD COLUMN IF NOT EXISTS explicacion_d text DEFAULT NULL;');
    console.error('');
    process.exit(1);
  }

  if (error) throw new Error(`Error al verificar columnas: ${error.message}`);
  console.log('✅ Columnas por opción verificadas.');
}

// ── Paso 2: Obtener preguntas ────────────────────────────────────────────────
async function fetchQuestions(limit, force) {
  let query = supabase
    .from('preguntas')
    .select(
      'id, pregunta_texto, opcion_a, opcion_b, opcion_c, opcion_d, solucion_letra, parte, temas(nombre)',
    )
    .limit(limit);

  if (!force) {
    query = query.is('explicacion_a', null);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Error al obtener preguntas: ${error.message}`);
  return data || [];
}

// ── Paso 3: Generar y guardar explicaciones ──────────────────────────────────
async function generateAndSave(question) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildUserPrompt(question) },
  ];

  const raw = await callOpenRouter(messages);
  const explanations = parseExplanations(raw, question);

  const update = {};
  for (const letra of ['A', 'B', 'C', 'D']) {
    if (explanations[letra]) {
      update[`explicacion_${letra.toLowerCase()}`] = explanations[letra];
    }
  }

  const { error } = await supabase
    .from('preguntas')
    .update(update)
    .eq('id', question.id);

  if (error) throw new Error(`Error al guardar para ${question.id}: ${error.message}`);

  return explanations;
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🚀 Generador por opción — Modelo: ${MODEL}`);
  console.log(`   Límite: ${LIMIT} | Modo: ${FORCE ? 'FORCE' : 'solo sin explicación'}\n`);

  await ensureColumns();

  const questions = await fetchQuestions(LIMIT, FORCE);

  if (questions.length === 0) {
    console.log('ℹ️  No hay preguntas pendientes. Usa --force para regenerar.');
    return;
  }

  console.log(`📝 ${questions.length} preguntas a procesar:\n`);

  let success = 0;
  let failures = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const prefix = `[${i + 1}/${questions.length}]`;

    try {
      const exp = await generateAndSave(q);
      success++;

      const correcta = q.solucion_letra.trim();
      const incorrectas = ['A', 'B', 'C', 'D']
        .filter(l => l !== correcta && q[`opcion_${l.toLowerCase()}`])
        .map(l => `  ${l}✗ ${exp[l]?.substring(0, 80)}...`)
        .join('\n');

      console.log(`${prefix} ✅ ${q.pregunta_texto.substring(0, 65)}...`);
      console.log(`  ${correcta}✓ ${exp[correcta]?.substring(0, 100)}...`);
      console.log(incorrectas);
      console.log('');
    } catch (err) {
      failures++;
      console.error(`${prefix} ❌ ${err.message}\n`);
    }

    if (i < questions.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\n📊 Resultado: ${success} exitosas, ${failures} fallidas de ${questions.length} total.`);
}

main().catch((err) => {
  console.error('💥 Error fatal:', err);
  process.exit(1);
});
