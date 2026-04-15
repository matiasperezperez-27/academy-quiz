import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PreguntaForm {
  id?: string;
  academia_id: string;
  tema_id: string;
  parte?: string;
  pregunta_texto: string;
  opcion_a: string;
  opcion_b: string;
  opcion_c?: string;
  opcion_d?: string;
  solucion_letra: string;
  explicacion_a?: string | null;
  explicacion_b?: string | null;
  explicacion_c?: string | null;
  explicacion_d?: string | null;
}

export interface PreguntaListItem {
  id: string;
  pregunta_texto: string;
  solucion_letra: string;
  parte: string | null;
  tema_id: string;
  academia_id: string;
  verificada: boolean;
  rechazada: boolean;
  created_at: string;
}

export function useGestionPreguntas(profesorId: string) {
  const [preguntas, setPreguntas] = useState<PreguntaListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async (academiaId: string, temaId?: string) => {
    if (!academiaId) return;
    setLoading(true);
    try {
      let query = supabase
        .from('preguntas')
        .select('id, pregunta_texto, solucion_letra, parte, tema_id, academia_id, verificada, rechazada, created_at')
        .eq('academia_id', academiaId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (temaId) query = query.eq('tema_id', temaId);

      const { data, error } = await query;
      if (error) throw error;
      setPreguntas((data as PreguntaListItem[]) || []);
    } catch (err) {
      console.error('useGestionPreguntas.cargar:', err);
      toast.error('Error cargando preguntas');
    } finally {
      setLoading(false);
    }
  }, []);

  const guardar = useCallback(async (form: PreguntaForm) => {
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('upsert_pregunta' as any, {
        p_profesor_id: profesorId,
        p_pregunta_id: form.id || null,
        p_academia_id: form.academia_id,
        p_tema_id: form.tema_id,
        p_parte: form.parte || null,
        p_pregunta_texto: form.pregunta_texto,
        p_opcion_a: form.opcion_a,
        p_opcion_b: form.opcion_b,
        p_opcion_c: form.opcion_c || null,
        p_opcion_d: form.opcion_d || null,
        p_solucion_letra: form.solucion_letra,
      });
      if (error) throw error;
      const questionId = data as string;

      // Guardar explicaciones si las hay (requiere RPC update_explicaciones_pregunta)
      const hasExplanations = form.explicacion_a || form.explicacion_b || form.explicacion_c || form.explicacion_d;
      if (hasExplanations && questionId) {
        const { error: expError } = await supabase.rpc('update_explicaciones_pregunta' as any, {
          p_profesor_id: profesorId,
          p_pregunta_id: questionId,
          p_explicacion_a: form.explicacion_a || null,
          p_explicacion_b: form.explicacion_b || null,
          p_explicacion_c: form.explicacion_c || null,
          p_explicacion_d: form.explicacion_d || null,
        });
        if (expError) {
          console.warn('Could not save explanations:', expError);
          toast.warning('Pregunta guardada. Las explicaciones no se guardaron — ejecuta la migración SQL en el panel de Supabase.');
        }
      }

      toast.success(form.id ? 'Pregunta actualizada' : 'Pregunta creada');
      return questionId;
    } catch (err) {
      console.error('useGestionPreguntas.guardar:', err);
      toast.error('Error al guardar la pregunta');
      return null;
    } finally {
      setSaving(false);
    }
  }, [profesorId]);

  return { preguntas, loading, saving, cargar, guardar };
}
