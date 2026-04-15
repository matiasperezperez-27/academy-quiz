/**
 * Batch runner para generar explicaciones por opción en las 9.150 preguntas
 * Modelo: qwen/qwen3.6-plus:free (coste $0)
 *
 * Uso:
 *   node scripts/generate-explanations-batch.mjs [CONCURRENCY]
 *
 *   CONCURRENCY  Peticiones en paralelo (default: 3, max recomendado: 5)
 *
 * Variables de entorno:
 *   SUPABASE_SERVICE_ROLE_KEY
 *   OPENROUTER_API_KEY
 *
 * El script es resumible: salta preguntas que ya tienen explicacion_a.
 * Si se interrumpe, vuelve a lanzar y continúa donde lo dejó.
 */

import { createClient } from '@supabase/supabase-js';

// ── Config ──────────────────────────────────────────────────────────────────
const SUPABASE_URL     = 'https://pakyheklnfpwibyahmcg.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENROUTER_API_KEY   = process.env.OPENROUTER_API_KEY;
const MODEL       = 'x-ai/grok-4.1-fast';
const CONCURRENCY = parseInt(process.argv[2] || '3', 10);
const PAGE_SIZE   = 50;   // preguntas por lote de DB
const RETRY_MAX   = 3;    // reintentos por pregunta
const RETRY_DELAY = 5000; // ms entre reintentos

// ── Validación ──────────────────────────────────────────────────────────────
if (!SUPABASE_SERVICE_KEY) { console.error('❌ Falta SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
if (!OPENROUTER_API_KEY)   { console.error('❌ Falta OPENROUTER_API_KEY');         process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── Prompts ─────────────────────────────────────────────────────────────────
// /no_think al inicio del user prompt desactiva el chain-of-thought de Qwen3
// Ahorra ~200 tokens extra por petición y acelera significativamente.

const SYSTEM_PROMPT = `Eres un Ingeniero Agrónomo experto en oposiciones al Cuerpo Superior de Ingeniería Agronómica de Castilla-La Mancha.

Tu tarea es generar explicaciones individuales para CADA opción de una pregunta tipo test y devolverlas en JSON.

REGLAS PARA OPCIONES INCORRECTAS (máximo 100 caracteres cada una):
- Si la opción es un concepto REAL (comunidad autónoma, organismo, ley, especie, lugar): di en 1 frase qué es y por qué no aplica aquí. Ejemplo: "Galicia lidera en vacuno de leche, no en carne."
- Si la opción es un número o fecha DISTRACTOR: explica en qué se confunde o qué diferencia tiene con la correcta. Ejemplo: "Fecha de publicación, no de aplicación del reglamento."
- Si es claramente absurda: di simplemente por qué es incorrecta en 1 frase corta.
- NO uses frases genéricas como "esta opción es incorrecta porque no aplica". Aporta algo concreto.

REGLAS PARA LA OPCIÓN CORRECTA (entre 300 y 400 caracteres):
- Justifica técnica y legalmente por qué es la respuesta válida.
- Cita la ley, real decreto u orden si existe, con nombre y número.
- Aporta un dato de contexto agronómico que ayude a fijar el concepto.

REGLAS GENERALES:
- Responde ÚNICAMENTE con un objeto JSON válido. Sin texto antes ni después.
- Si una opción no existe (C o D son null), omite esa clave del JSON.

FORMATO:
{"A":"...","B":"...","C":"...","D":"..."}`;

function buildUserPrompt(q) {
  const opciones = { A: q.opcion_a, B: q.opcion_b };
  if (q.opcion_c) opciones.C = q.opcion_c;
  if (q.opcion_d) opciones.D = q.opcion_d;
  const letra = q.solucion_letra.trim();

  return `/no_think
Genera explicaciones por opción para esta pregunta de oposición al Cuerpo Superior de Ingenieros Agrónomos de Castilla-La Mancha.

Tema: ${q.temas?.nombre || 'N/A'}
Parte: ${q.parte || 'N/A'}

Pregunta: ${q.pregunta_texto}
${Object.entries(opciones).map(([l, t]) => `${l}) ${t}`).join('\n')}

Respuesta correcta: ${letra}

Incorrectas: máx. 100 chars — di qué ES el concepto real y por qué no aplica, o en qué difiere si es un número.
Correcta (${letra}): 300-400 chars — justificación técnica/legal + normativa + contexto agronómico.
Devuelve SOLO el JSON.`;
}

// ── OpenRouter ───────────────────────────────────────────────────────────────
async function callOpenRouter(messages) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://academy-quiz.app',
      'X-Title': 'Academy Quiz - Batch Explanations',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.3,
      max_tokens: 700,
      response_format: { type: 'json_object' },
    }),
  });

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('retry-after') || '10', 10);
    throw new RateLimitError(`Rate limit — esperar ${retryAfter}s`, retryAfter * 1000);
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${err.substring(0, 200)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error(`Respuesta vacía del modelo`);
  return content.trim();
}

class RateLimitError extends Error {
  constructor(msg, waitMs) { super(msg); this.waitMs = waitMs; }
}

// ── Parsear JSON ─────────────────────────────────────────────────────────────
function parseJSON(raw, q) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error(`JSON no encontrado en: ${raw.substring(0, 150)}`);
    parsed = JSON.parse(match[0]);
  }

  const opciones = ['A', 'B', 'C', 'D'].filter(l => q[`opcion_${l.toLowerCase()}`]);
  for (const l of opciones) {
    if (!parsed[l] || typeof parsed[l] !== 'string') {
      throw new Error(`Falta clave "${l}" en el JSON`);
    }
  }
  return parsed;
}

// ── Procesar una pregunta (con reintentos) ───────────────────────────────────
async function processQuestion(q) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user',   content: buildUserPrompt(q) },
  ];

  let lastError;
  for (let attempt = 1; attempt <= RETRY_MAX; attempt++) {
    try {
      const raw = await callOpenRouter(messages);
      const exp = parseJSON(raw, q);

      const update = { explicacion_modelo: MODEL };
      for (const l of ['A', 'B', 'C', 'D']) {
        if (exp[l]) update[`explicacion_${l.toLowerCase()}`] = exp[l];
      }

      const { error } = await supabase.from('preguntas').update(update).eq('id', q.id);
      if (error) throw new Error(`Supabase: ${error.message}`);

      return exp;
    } catch (err) {
      lastError = err;
      if (err instanceof RateLimitError) {
        await sleep(err.waitMs);
      } else if (attempt < RETRY_MAX) {
        await sleep(RETRY_DELAY);
      }
    }
  }
  throw lastError;
}

// ── Utilidades ───────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function formatTime(ms) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s/60)}m ${s%60}s`;
  return `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`;
}

// Pool de concurrencia simple
async function runWithConcurrency(tasks, concurrency) {
  const results = [];
  let i = 0;

  async function worker() {
    while (i < tasks.length) {
      const idx = i++;
      results[idx] = await tasks[idx]();
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

// ── Obtener total pendiente ──────────────────────────────────────────────────
async function countPending() {
  const { count, error } = await supabase
    .from('preguntas')
    .select('id', { count: 'exact', head: true })
    .is('explicacion_a', null);
  if (error) throw new Error(error.message);
  return count;
}

// ── Obtener página de preguntas ──────────────────────────────────────────────
async function fetchPage(offset) {
  const { data, error } = await supabase
    .from('preguntas')
    .select('id, pregunta_texto, opcion_a, opcion_b, opcion_c, opcion_d, solucion_letra, parte, temas(nombre)')
    .is('explicacion_a', null)
    .range(offset, offset + PAGE_SIZE - 1);
  if (error) throw new Error(error.message);
  return data || [];
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🚀 Batch de explicaciones por opción`);
  console.log(`   Modelo:      ${MODEL}`);
  console.log(`   Concurrencia: ${CONCURRENCY} paralelas`);
  console.log(`   Thinking:    desactivado (/no_think)\n`);

  // Verificar columnas
  const { error: colCheck } = await supabase.from('preguntas').select('explicacion_a').limit(1);
  if (colCheck?.message?.includes('explicacion_a')) {
    console.error('❌ Columnas no existen. Ejecuta el ALTER TABLE primero.');
    process.exit(1);
  }

  const total = await countPending();
  if (total === 0) {
    console.log('✅ Todas las preguntas ya tienen explicaciones por opción.');
    return;
  }

  console.log(`📊 Pendientes: ${total} preguntas`);
  console.log(`   Estimación: ~${formatTime(total / CONCURRENCY * 3500)} a ${CONCURRENCY} paralelas\n`);

  let processed = 0;
  let failures  = 0;
  const startTime = Date.now();

  // Procesar en páginas para no saturar memoria
  let page = await fetchPage(0);

  while (page.length > 0) {
    const tasks = page.map(q => async () => {
      try {
        await processQuestion(q);
        processed++;
        const elapsed   = Date.now() - startTime;
        const rate      = processed / (elapsed / 1000); // preguntas/s
        const remaining = Math.round((total - processed - failures) / rate * 1000);

        process.stdout.write(
          `\r  ✅ ${processed}/${total} | ❌ ${failures} | ` +
          `${((processed / total) * 100).toFixed(1)}% | ` +
          `restante: ~${formatTime(remaining)}   `
        );
      } catch (err) {
        failures++;
        const short = q.pregunta_texto.substring(0, 50);
        console.error(`\n  ❌ [${q.id.substring(0,8)}] ${short}... → ${err.message}`);
      }
    });

    await runWithConcurrency(tasks, CONCURRENCY);

    // Siguiente página (solo preguntas aún sin explicación)
    page = await fetchPage(0); // siempre offset 0 porque ya se guardaron las procesadas
  }

  const totalTime = Date.now() - startTime;
  console.log(`\n\n📊 Finalizado en ${formatTime(totalTime)}`);
  console.log(`   ✅ Exitosas: ${processed}`);
  console.log(`   ❌ Fallidas: ${failures}`);
  if (failures > 0) {
    console.log(`   ↩️  Vuelve a lanzar el script para reintentar las fallidas.`);
  }
}

main().catch(err => {
  console.error('\n💥 Error fatal:', err);
  process.exit(1);
});
