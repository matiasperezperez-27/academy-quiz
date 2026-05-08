import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SHORT = 50;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: corsHeaders });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: corsHeaders });
    }

    const { data: isProfesor } = await supabaseClient.rpc('is_user_profesor', { p_user_id: user.id });
    if (!isProfesor) {
      return new Response(JSON.stringify({ error: 'Acceso denegado: se requiere rol de profesor' }), { status: 403, headers: corsHeaders });
    }

    const {
      pregunta_texto, opcion_a, opcion_b, opcion_c, opcion_d,
      solucion_letra, parte, tema_nombre,
      explicacion_a, explicacion_b, explicacion_c, explicacion_d,
    } = await req.json();

    if (!pregunta_texto || !opcion_a || !opcion_b || !solucion_letra) {
      return new Response(JSON.stringify({ error: 'Faltan campos obligatorios' }), { status: 400, headers: corsHeaders });
    }

    const openrouterKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!openrouterKey) {
      return new Response(JSON.stringify({ error: 'Servicio de IA no configurado' }), { status: 500, headers: corsHeaders });
    }

    const model = Deno.env.get('OPENROUTER_MODEL') ?? 'deepseek/deepseek-chat';

    // Tag each option: short ones must be kept exactly, long ones get rewritten
    const opciones = [
      { letra: 'A', texto: opcion_a },
      { letra: 'B', texto: opcion_b },
      opcion_c ? { letra: 'C', texto: opcion_c } : null,
      opcion_d ? { letra: 'D', texto: opcion_d } : null,
    ].filter(Boolean) as { letra: string; texto: string }[];

    const explicaciones: Record<string, string | null> = {
      A: explicacion_a || null,
      B: explicacion_b || null,
      C: explicacion_c || null,
      D: explicacion_d || null,
    };

    const opcionesTexto = opciones
      .map(o => {
        if (o.texto.length <= SHORT) {
          return `${o.letra}) ${o.texto}  [MANTENER EXACTA]`;
        }
        const exp = explicaciones[o.letra];
        const expLine = exp && exp.length > SHORT ? `\n   → Explicación de referencia: ${exp}` : '';
        return `${o.letra}) ${o.texto}  [REESCRIBIR]${expLine}`;
      })
      .join('\n');

    const prompt = `Eres un experto en redacción de preguntas de examen. Transforma la siguiente pregunta siguiendo estas reglas al pie de la letra.

REGLAS:
1. Reescribe el enunciado de la pregunta con redacción completamente diferente, manteniendo el mismo significado y dificultad.
2. La respuesta correcta es la letra "${solucion_letra}" y debe seguir siéndolo.
3. Opciones marcadas [MANTENER EXACTA]: cópialas tal cual, sin cambiar ni una letra.
4. Opciones marcadas [REESCRIBIR]: reescríbelas con otras palabras. Si tienen una "Explicación de referencia", úsala como guía del significado exacto que debe mantener la opción reescrita.
5. NO devuelvas las explicaciones en la respuesta. Solo devuelve el enunciado y las opciones.
6. Devuelve ÚNICAMENTE JSON válido, sin texto adicional ni bloques de código.
${parte ? `Bloque: ${parte}` : ''}${tema_nombre ? `\nTema: ${tema_nombre}` : ''}

ENUNCIADO ORIGINAL:
${pregunta_texto}

OPCIONES:
${opcionesTexto}

Formato de respuesta (JSON estricto):
{
  "pregunta_texto": "...",
  "opcion_a": "...",
  "opcion_b": "...",
  "opcion_c": ${opcion_c ? '"..."' : 'null'},
  "opcion_d": ${opcion_d ? '"..."' : 'null'},
  "solucion_letra": "${solucion_letra}"
}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://academy-quiz.lovable.app',
        'X-Title': 'Academy Quiz',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1800,
      }),
    });

    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: 'Límite de peticiones alcanzado, espera unos segundos' }),
        { status: 429, headers: corsHeaders },
      );
    }
    if (!response.ok) {
      const errBody = await response.text();
      console.error('OpenRouter error', response.status, errBody);
      return new Response(
        JSON.stringify({ error: `Error OpenRouter ${response.status}: ${errBody}` }),
        { status: 502, headers: corsHeaders },
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    if (!content) {
      return new Response(JSON.stringify({ error: 'Respuesta vacía del servicio de IA' }), { status: 502, headers: corsHeaders });
    }

    let rewritten: Record<string, unknown>;
    try {
      rewritten = JSON.parse(content.trim());
    } catch {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        rewritten = JSON.parse(jsonMatch[1].trim());
      } else {
        return new Response(
          JSON.stringify({ error: 'El servicio de IA no devolvió JSON válido' }),
          { status: 502, headers: corsHeaders },
        );
      }
    }

    // Safety: solucion_letra nunca cambia
    rewritten.solucion_letra = solucion_letra;

    // Safety: short options are never changed regardless of what the AI returned
    for (const o of opciones) {
      if (o.texto.length <= SHORT) {
        rewritten[`opcion_${o.letra.toLowerCase()}`] = o.texto;
      }
    }

    if (!rewritten.pregunta_texto || !rewritten.opcion_a || !rewritten.opcion_b) {
      return new Response(
        JSON.stringify({ error: 'Respuesta incompleta del servicio de IA' }),
        { status: 502, headers: corsHeaders },
      );
    }

    return new Response(JSON.stringify(rewritten), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message ?? 'Error interno' }),
      { status: 500, headers: corsHeaders },
    );
  }
});
