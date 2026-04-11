import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type ExamenRow = Tables<'examenes'>;
type ExamenInsert = TablesInsert<'examenes'>;
type ExamenPreguntaInsert = TablesInsert<'examen_preguntas'>;

export interface Examen {
  id: string;
  nombre: string;
  descripcion: string | null;
  academia_id: string;
  creado_por: string;
  duracion_minutos: number | null;
  activo: boolean;
  created_at: string;
  total_preguntas?: number;
}

export interface ExamenForm {
  nombre: string;
  descripcion?: string;
  academia_id: string;
  duracion_minutos?: number;
  pregunta_ids: string[];
}

export function useExamenes(profesorId: string) {
  const [examenes, setExamenes] = useState<Examen[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async (academiaId?: string) => {
    setLoading(true);
    try {
      const query = supabase
        .from('examenes')
        .select('id, nombre, descripcion, academia_id, creado_por, duracion_minutos, activo, created_at, updated_at')
        .eq('creado_por', profesorId)
        .order('created_at', { ascending: false });

      const { data, error } = await (academiaId ? query.eq('academia_id', academiaId) : query);

      if (error) throw error;
      setExamenes((data ?? []) as ExamenRow[]);
    } catch (err) {
      console.error('useExamenes.cargar:', err);
      toast.error('Error cargando exámenes');
    } finally {
      setLoading(false);
    }
  }, [profesorId]);

  const crear = useCallback(async (form: ExamenForm) => {
    setSaving(true);
    try {
      const examenPayload: ExamenInsert = {
        nombre: form.nombre,
        descripcion: form.descripcion || null,
        academia_id: form.academia_id,
        creado_por: profesorId,
        duracion_minutos: form.duracion_minutos || null,
        activo: true,
      };

      const { data: examen, error: examenError } = await supabase
        .from('examenes')
        .insert(examenPayload)
        .select('id, nombre, descripcion, academia_id, creado_por, duracion_minutos, activo, created_at, updated_at')
        .single();

      if (examenError) throw examenError;
      if (!examen) throw new Error('No se pudo recuperar el examen creado');

      if (form.pregunta_ids.length > 0) {
        const rows: ExamenPreguntaInsert[] = form.pregunta_ids.map((pid, idx) => ({
          examen_id: examen.id,
          pregunta_id: pid,
          orden: idx,
        }));

        const { error: pError } = await supabase.from('examen_preguntas').insert(rows);
        if (pError) throw pError;
      }

      toast.success('Examen creado correctamente');
      return examen.id;
    } catch (err) {
      console.error('useExamenes.crear:', err);
      toast.error('Error al crear el examen');
      return null;
    } finally {
      setSaving(false);
    }
  }, [profesorId]);

  const toggleActivo = useCallback(async (examenId: string, activo: boolean) => {
    try {
      const { error } = await supabase
        .from('examenes')
        .update({ activo })
        .eq('id', examenId);
      if (error) throw error;
      setExamenes(prev => prev.map(e => e.id === examenId ? { ...e, activo } : e));
      toast.success(activo ? 'Examen activado' : 'Examen desactivado');
    } catch (err) {
      console.error('useExamenes.toggleActivo:', err);
      toast.error('Error actualizando examen');
    }
  }, []);

  return { examenes, loading, saving, cargar, crear, toggleActivo };
}
