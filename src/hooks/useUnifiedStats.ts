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

      // 2. Obtener TODAS las sesiones para cálculos completos
      const { data: allSessions, error: allSessionsError } = await supabase
        .from("user_sessions")
        .select(`
          *,
          temas(nombre),
          academias(nombre)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (allSessionsError) throw allSessionsError;

      // 3. Obtener solo sesiones completadas para gráficos
      const completedSessions = (allSessions || []).filter(s => s.is_completed && s.total_questions > 0);

      // 4. Obtener respuestas para análisis por temas
      const { data: answers, error: answersError } = await supabase
        .from("user_answers")
        .select(`
          *,
          preguntas(
            tema_id,
            academia_id,
            temas(nombre),
            academias(nombre)
          )
        `)
        .eq("user_id", user.id)
        .order("answered_at", { ascending: false })
        .limit(500);

      if (answersError) throw answersError;

      // 5. Procesar datos
      const weeklyActivity = processWeeklyActivity(completedSessions);
      const monthlyActivity = processMonthlyActivity(allSessions || []);
      const topicPerformance = processTopicPerformance(answers || []);
      const weakTopics = topicPerformance.filter(t => t.accuracy < 60).map(t => t.topicName).slice(0, 3);
      const strongTopics = topicPerformance.filter(t => t.accuracy >= 80).map(t => t.topicName).slice(0, 3);

      // 6. Combinar datos del RPC con datos detallados
      const combinedStats = {
        // Datos del RPC (más confiables)
        completedSessions: basicStats.completed_sessions,
        totalSessions: allSessions?.length || 0, // TODAS las sesiones
        totalQuestions: basicStats.total_questions_answered,
        overallAccuracy: Math.round(basicStats.overall_accuracy_percentage),
        failedQuestions: basicStats.current_failed_questions,
        points: basicStats.points,
        lastActivityDate: basicStats.last_activity,
        
        // Datos procesados para gráficos
        recentSessions: completedSessions.slice(0, 15).map(s => ({
          id: s.id,
          date: new Date(s.created_at).toLocaleDateString('es-ES'),
          scorePercentage: Math.round(Number(s.score_percentage) || 0),
          totalQuestions: s.total_questions,
          tema: s.temas?.nombre || 'Sin tema'
        })), // 👈 SIN .reverse()
        
        // Actividades
        weeklyActivity,
        monthlyActivity,
        
        // Análisis por temas
        topicPerformance,
        weakTopics,
        strongTopics,
        
        // Racha
        streakDays: calculateSimpleStreak(completedSessions)
      };

      setStats(combinedStats);

    } catch (error) {
      console.error("Error loading unified stats:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Función auxiliar: Procesar actividad semanal
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
      
      const accuracy = daySessions.length > 0
        ? Math.round(
            daySessions.reduce((sum, s) => sum + (s.score_percentage || 0), 0) / 
            daySessions.length
          )
        : 0;
      
      activity.push({
        date: date.toISOString(),
        sessions: daySessions.length,
        accuracy
      });
    }
    
    return activity;
  };

  // Función auxiliar: Procesar actividad mensual
  const processMonthlyActivity = (sessions) => {
    const monthlyData = new Map();
    
    sessions.forEach(session => {
      const date = new Date(session.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          sessions: 0,
          totalQuestions: 0,
          totalCorrect: 0
        });
      }
      
      const data = monthlyData.get(monthKey);
      data.sessions++;
      data.totalQuestions += session.total_questions || 0;
      data.totalCorrect += session.correct_answers || 0;
    });
    
    return Array.from(monthlyData.entries())
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('es-ES', { 
          month: 'short', 
          year: 'numeric' 
        }),
        sessions: data.sessions,
        questionsAnswered: data.totalQuestions,
        averageAccuracy: data.totalQuestions > 0 
          ? Math.round((data.totalCorrect / data.totalQuestions) * 100)
          : 0
      }))
      .slice(-6) // Últimos 6 meses
      .reverse();
  };

  // Función auxiliar: Procesar rendimiento por temas
  const processTopicPerformance = (answers) => {
    const topicMap = new Map();
    
    answers.forEach(answer => {
      if (!answer.preguntas?.tema_id) return;
      
      const topicId = answer.preguntas.tema_id;
      const topicName = answer.preguntas.temas?.nombre || 'Sin nombre';
      const academyName = answer.preguntas.academias?.nombre || 'Sin academia';
      
      if (!topicMap.has(topicId)) {
        topicMap.set(topicId, {
          topicId,
          topicName,
          academyName,
          correct: 0,
          total: 0,
          recentAccuracy: []
        });
      }
      
      const topic = topicMap.get(topicId);
      topic.total++;
      if (answer.is_correct) topic.correct++;
      
      // Guardar las últimas 10 respuestas para calcular tendencia
      topic.recentAccuracy.push(answer.is_correct ? 1 : 0);
      if (topic.recentAccuracy.length > 10) {
        topic.recentAccuracy.shift();
      }
    });
    
    return Array.from(topicMap.values()).map(topic => {
      const accuracy = topic.total > 0 
        ? Math.round((topic.correct / topic.total) * 100)
        : 0;
      
      // Calcular tendencia
      let trend = 'stable';
      if (topic.recentAccuracy.length >= 5) {
        const firstHalf = topic.recentAccuracy.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
        const secondHalf = topic.recentAccuracy.slice(-5).reduce((a, b) => a + b, 0) / 5;
        
        if (secondHalf > firstHalf + 0.1) trend = 'up';
        else if (secondHalf < firstHalf - 0.1) trend = 'down';
      }
      
      return {
        topicId: topic.topicId,
        topicName: topic.topicName,
        academyName: topic.academyName,
        accuracy,
        totalQuestions: topic.total,
        trend
      };
    })
    .sort((a, b) => b.totalQuestions - a.totalQuestions)
    .slice(0, 10); // Top 10 temas más practicados
  };

  // Calcular racha
  const calculateSimpleStreak = (sessions) => {
    if (!sessions || sessions.length === 0) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let streak = 0;
    let currentDate = new Date(today);
    
    for (let i = 0; i < 30; i++) { // Máximo 30 días como el original
      const sessionOnDate = sessions.find(s => {
        const sessionDate = new Date(s.created_at);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === currentDate.getTime();
      });
      
      if (sessionOnDate) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (i === 0) {
        // Si hoy no hay sesión, verificar ayer
        currentDate.setDate(currentDate.getDate() - 1);
        const sessionYesterday = sessions.find(s => {
          const sessionDate = new Date(s.created_at);
          sessionDate.setHours(0, 0, 0, 0);
          return sessionDate.getTime() === currentDate.getTime();
        });
        
        if (sessionYesterday) {
          streak++;
        } else {
          break;
        }
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