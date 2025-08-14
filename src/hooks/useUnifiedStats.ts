import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useUnifiedStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      // 1. Usar el mismo RPC que en Index.tsx para datos básicos
      const { data: basicStats, error: rpcError } = await supabase
        .rpc("get_user_stats", { p_user_id: user.id });

      if (rpcError) throw rpcError;

      // 2. Obtener sesiones detalladas para gráficos
      const { data: sessions, error: sessionsError } = await supabase
        .from("user_sessions")
        .select(`
          *,
          temas(nombre),
          academias(nombre)
        `)
        .eq("user_id", user.id)
        .eq("is_completed", true) // 👈 Solo sesiones completadas
        .order("created_at", { ascending: false })
        .limit(50);

      if (sessionsError) throw sessionsError;

      // 3. Combinar datos del RPC con datos detallados
      const combinedStats = {
        // Datos del RPC (más confiables)
        completedSessions: basicStats.completed_sessions,
        totalQuestions: basicStats.total_questions_answered,
        overallAccuracy: Math.round(basicStats.overall_accuracy_percentage),
        failedQuestions: basicStats.current_failed_questions,
        points: basicStats.points,
        lastActivityDate: basicStats.last_activity,
        
        // Datos procesados para gráficos
        recentSessions: (sessions || []).map(s => ({
          id: s.id,
          date: new Date(s.created_at).toLocaleDateString('es-ES'),
          scorePercentage: s.score_percentage || 0,
          totalQuestions: s.total_questions,
          tema: s.temas?.nombre || 'Sin tema'
        })).reverse(),
        
        // Actividad semanal simple
        weeklyActivity: processWeeklyActivity(sessions || []),
        
        // Racha (calculada desde el RPC)
        streakDays: calculateSimpleStreak(sessions || [])
      };

      setStats(combinedStats);

    } catch (error) {
      console.error("Error loading unified stats:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const processWeeklyActivity = (sessions) => {
    const activity = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const daySessions = sessions.filter(s => {
        const sessionDate = new Date(s.created_at);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === date.getTime();
      });
      
      activity.push({
        date: date.toISOString(),
        sessions: daySessions.length,
        accuracy: daySessions.length > 0
          ? Math.round(daySessions.reduce((sum, s) => sum + (s.score_percentage || 0), 0) / daySessions.length)
          : 0
      });
    }
    
    return activity;
  };

  const calculateSimpleStreak = (sessions) => {
    if (!sessions || sessions.length === 0) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let streak = 0;
    let currentDate = new Date(today);
    
    for (let i = 0; i < 7; i++) { // Máximo 7 días
      const sessionOnDate = sessions.find(s => {
        const sessionDate = new Date(s.created_at);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === currentDate.getTime();
      });
      
      if (sessionOnDate) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    return streak;
  };

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    loading,
    refresh: loadStats
  };
}