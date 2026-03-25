import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface StudentStat {
  user_id: string;
  username: string | null;
  email: string | null;
  total_sessions: number;
  total_answered: number;
  correct_answers: number;
  accuracy: number;
  puntos: number;
  last_session_at: string | null;
}

export interface TopicStat {
  tema_id: string;
  tema_nombre: string;
  academia_nombre: string;
  total_sesiones: number;
  total_estudiantes: number;
  avg_accuracy: number;
  total_preguntas_contestadas: number;
}

export function useProfesorStudentStats(profesorId: string) {
  const [studentStats, setStudentStats] = useState<StudentStat[]>([]);
  const [topicStats, setTopicStats] = useState<TopicStat[]>([]);
  const [loading, setLoading] = useState(false);

  const cargar = useCallback(async (academiaId?: string) => {
    setLoading(true);
    try {
      const [studRes, topicRes] = await Promise.all([
        supabase.rpc('get_profesor_student_stats' as any, {
          p_profesor_id: profesorId,
          p_academia_id: academiaId || null,
        }),
        supabase.rpc('get_profesor_topic_stats' as any, {
          p_profesor_id: profesorId,
          p_academia_id: academiaId || null,
        }),
      ]);

      if (studRes.error) throw studRes.error;
      if (topicRes.error) throw topicRes.error;

      setStudentStats((studRes.data as StudentStat[]) || []);
      setTopicStats((topicRes.data as TopicStat[]) || []);
    } catch (err) {
      console.error('useProfesorStudentStats:', err);
      toast.error('Error cargando estadísticas');
    } finally {
      setLoading(false);
    }
  }, [profesorId]);

  return { studentStats, topicStats, loading, cargar };
}
