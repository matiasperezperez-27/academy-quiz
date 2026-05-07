import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PreguntaBanco {
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
  ya_importada: boolean;
  total_count: number;
}

export interface BancoFiltros {
  academia_id?: string;
  tema_id?: string;
  solo_no_importadas?: boolean;
  limit?: number;
  offset?: number;
}

export function useBancoPreguntas(profesorId: string) {
  const [preguntas, setPreguntas] = useState<PreguntaBanco[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [cloning, setCloning] = useState<string | null>(null);

  const cargar = useCallback(async (filtros: BancoFiltros) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_preguntas_banco' as any, {
        p_profesor_id: profesorId,
        p_academia_id: filtros.academia_id || null,
        p_tema_id: filtros.tema_id || null,
        p_solo_no_importadas: filtros.solo_no_importadas ?? true,
        p_limit: filtros.limit ?? 10,
        p_offset: filtros.offset ?? 0,
      });
      if (error) throw error;
      const rows = (data as PreguntaBanco[]) || [];
      setPreguntas(rows);
      setTotal(rows[0]?.total_count ?? 0);
    } catch (err) {
      console.error('useBancoPreguntas.cargar:', err);
      toast.error('Error cargando el banco de preguntas');
    } finally {
      setLoading(false);
    }
  }, [profesorId]);

  const clonar = useCallback(async (
    preguntaOrigenId: string,
    destinoAcademiaId: string,
    destinoTemaId: string,
  ): Promise<string | null> => {
    setCloning(preguntaOrigenId);
    try {
      const { data, error } = await supabase.rpc('clonar_pregunta' as any, {
        p_profesor_id: profesorId,
        p_pregunta_origen_id: preguntaOrigenId,
        p_destino_academia_id: destinoAcademiaId,
        p_destino_tema_id: destinoTemaId,
      });
      if (error) throw error;
      return data as string;
    } catch (err: any) {
      console.error('useBancoPreguntas.clonar:', err);
      toast.error(err.message || 'Error al importar la pregunta');
      return null;
    } finally {
      setCloning(null);
    }
  }, [profesorId]);

  return { preguntas, loading, total, cloning, cargar, clonar };
}
