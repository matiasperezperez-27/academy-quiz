import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { pregunta_texto, opcion_a, opcion_b, opcion_c, opcion_d, solucion_letra, parte, tema_nombre } = await req.json();

    if (!pregunta_texto || !opcion_a || !opcion_b || !solucion_letra) {
      return new Response(JSON.stringify({ error: 'Faltan campos obligatorios' }), { status: 400, headers: corsHeaders });
    }

    const openrouterKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!openrouterKey) {
      return new Response(JSON.stringify({ error: 'Servicio de IA no configurado' }), { status: 500, headers: corsHeaders });
    }

    const model = Deno.env.get('OPENROUTER_MODEL') ?? 'anthropic/claude-3.5-sonnet';

    const opcionesTexto = [
      `A) ${opcion_a}`,
      `B) ${opcion_b}`,
      opcion_c ? `C) ${opcion_c}` : null,
      opcion_d ? `D) ${opcion_d}` : null,
    ].filter(Boolean).join('\n');

    const prompt = `Eres un experto en redacción de preguntas de examen. Tu tarea es reescribir la siguiente pregunta de opción múltiple manteniendo EXACTAMENTE el mismo significado, dificultad, materia y respuesta correcta, pero con redacción completamente diferente para evitar similitud textual con el original.

REGLAS ESTRICTAS:
1. La letra de la respuesta correcta DEBE ser "${solucion_letra}" en la versión reescrita.
2. Cada opción debe mantener el mismo significado conceptual aunque con palabras distintas.
3. Devuelve ÚNICAMENTE JSON válido, sin texto adicional ni bloques de código.
${parte ? `Bloque del examen: ${parte}` : ''}${tema_nombre ? `\nTema: ${tema_nombre}` : ''}

PREGUNTA ORIGINAL:
${pregunta_texto}

OPCIONES:
${opcionesTexto}

Respuesta correcta: ${solucion_letra}

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
        max_tokens: 1200,
      }),
    });

    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: 'Límite de peticiones alcanzado, espera unos segundos' }),
        { status: 429, headers: corsHeaders },
      );
    }
    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'Error en el servicio de IA' }), { status: 502, headers: corsHeaders });
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    if (!content) {
      return new Response(JSON.stringify({ error: 'Respuesta vacía del servicio de IA' }), { status: 502, headers: corsHeaders });
    }

    let rewritten: Record<string, unknown>;
    try {
      // Try direct JSON parse first
      rewritten = JSON.parse(content.trim());
    } catch {
      // Try extracting from markdown code block
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

    // Safety: ensure solucion_letra is never changed
    rewritten.solucion_letra = solucion_letra;

    // Validate required fields
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
