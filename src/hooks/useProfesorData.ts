import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProfesorStats {
  total_academias: number;
  total_temas: number;
  total_preguntas: number;
  preguntas_verificadas: number;
  preguntas_pendientes: number;
  total_estudiantes: number;
}

export interface ProfesorAcademia {
  academia_id: string;
  academia_nombre: string;
  total_temas: number;
  total_preguntas: number;
  preguntas_verificadas: number;
  preguntas_pendientes: number;
  assigned_at: string;
}

export function useProfesorData(profesorId: string | undefined) {
  const [stats, setStats] = useState<ProfesorStats | null>(null);
  const [academias, setAcademias] = useState<ProfesorAcademia[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profesorId) return;
    setLoading(true);
    try {
      const [statsRes, acadRes] = await Promise.all([
        supabase.rpc('get_profesor_stats' as any, { p_profesor_id: profesorId }),
        supabase.rpc('get_profesor_academias' as any, { p_profesor_id: profesorId }),
      ]);

      if (statsRes.data && Array.isArray(statsRes.data) && statsRes.data.length > 0) {
        setStats(statsRes.data[0] as ProfesorStats);
      }
      if (acadRes.data) {
        setAcademias(acadRes.data as ProfesorAcademia[]);
      }
    } catch (err) {
      console.error('useProfesorData:', err);
    } finally {
      setLoading(false);
    }
  }, [profesorId]);

  useEffect(() => {
    load();
  }, [load]);

  return { stats, academias, loading, refresh: load };
}
