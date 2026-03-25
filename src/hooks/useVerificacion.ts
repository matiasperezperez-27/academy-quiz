import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PreguntaParaVerificar {
  id: string;
  pregunta_texto: string;
  opcion_a: string;
  opcion_b: string;
  opcion_c: string | null;
  opcion_d: string | null;
  solucion_letra: string;
  parte: string | null;
  academia_id: string;
  academia_nombre: string;
  tema_id: string;
  tema_nombre: string;
  verificada: boolean;
  rechazada: boolean;
  verificacion_notas: string | null;
  verificada_at: string | null;
  total_count: number;
}

export interface VerificacionFiltros {
  academia_id?: string;
  tema_id?: string;
  estado?: string;
  limit?: number;
  offset?: number;
}

export function useVerificacion(profesorId: string) {
  const [preguntas, setPreguntas] = useState<PreguntaParaVerificar[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const cargar = useCallback(async (filtros: VerificacionFiltros) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_preguntas_para_verificar' as any, {
        p_profesor_id: profesorId,
        p_academia_id: filtros.academia_id || null,
        p_tema_id: filtros.tema_id || null,
        p_estado: filtros.estado || 'pendiente',
        p_limit: filtros.limit || 10,
        p_offset: filtros.offset || 0,
      });
      if (error) throw error;
      if (Array.isArray(data)) {
        setPreguntas(data as PreguntaParaVerificar[]);
        setTotal(data.length > 0 ? (data[0] as PreguntaParaVerificar).total_count ?? data.length : 0);
      } else {
        setPreguntas([]);
        setTotal(0);
      }
    } catch (err) {
      console.error('useVerificacion.cargar:', err);
      toast.error('Error cargando preguntas');
    } finally {
      setLoading(false);
    }
  }, [profesorId]);

  const verificar = useCallback(async (
    preguntaId: string,
    accion: 'verificar' | 'rechazar',
    notas?: string
  ) => {
    try {
      const { error } = await supabase.rpc('verificar_pregunta' as any, {
        p_profesor_id: profesorId,
        p_pregunta_id: preguntaId,
        p_accion: accion,
        p_notas: notas || null,
      });
      if (error) throw error;
      toast.success(accion === 'verificar' ? 'Pregunta verificada' : 'Pregunta rechazada');
      return true;
    } catch (err) {
      console.error('useVerificacion.verificar:', err);
      toast.error('Error al procesar la pregunta');
      return false;
    }
  }, [profesorId]);

  return { preguntas, loading, total, cargar, verificar };
}
