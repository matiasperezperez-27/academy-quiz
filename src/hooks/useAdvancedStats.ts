// ========================================
// HOOK AVANZADO PARA ESTADÍSTICAS - VERSIÓN FINAL CORREGIDA
// ========================================

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface AdvancedUserStats {
  // Estadísticas básicas
  totalSessions: number;
  completedSessions: number;
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
  overallAccuracyPercentage: number;
  currentFailedQuestions: number;
  bestSessionScorePercentage: number;
  lastActivity: string | null;
  points: number;

  // Estadísticas avanzadas
  averageSessionTime: number;
  questionsPerDay: number;
  streakDays: number;
  improvementTrend: number;
  currentLevel: number;
  experienceToNextLevel: number;
  
  // Por tema/academia
  bestTopics: Array<{name: string; accuracy: number; questionsAnswered: number}>;
  worstTopics: Array<{name: string; accuracy: number; questionsAnswered: number}>;
  recentPerformance: Array<{date: string; accuracy: number; questionsAnswered: number}>;
  
  // Actividad temporal
  weeklyActivity: Array<{day: string; sessions: number; accuracy: number}>;
  monthlyProgress: Array<{month: string; totalQuestions: number; accuracy: number}>;
}

export function useAdvancedStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdvancedUserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const calculateLevel = (points: number): {level: number; nextLevelThreshold: number} => {
    const levels = [
      { level: 1, threshold: 0, title: "Principiante" },
      { level: 2, threshold: 100, title: "Aprendiz" },
      { level: 3, threshold: 300, title: "Estudiante" },
      { level: 4, threshold: 600, title: "Conocedor" },
      { level: 5, threshold: 1000, title: "Avanzado" },
      { level: 6, threshold: 1500, title: "Experto" },
      { level: 7, threshold: 2500, title: "Maestro" },
      { level: 8, threshold: 4000, title: "Leyenda" }
    ];

    let currentLevel = 1;
    let nextThreshold = 100;

    for (const level of levels) {
      if (points >= level.threshold) {
        currentLevel = level.level;
        const nextLevelData = levels.find(l => l.level === currentLevel + 1);
        nextThreshold = nextLevelData ? nextLevelData.threshold : level.threshold;
      }
    }

    return { level: currentLevel, nextLevelThreshold: nextThreshold };
  };

  const loadAdvancedStats = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      // 1. Usar la función RPC que ya sabemos que funciona
      const { data: basicStats, error: rpcError } = await supabase
        .rpc("get_user_stats", { p_user_id: user.id });

      if (rpcError) {
        console.error("Error en RPC:", rpcError);
        throw rpcError;
      }

      // 2. Obtener sesiones detalladas para estadísticas avanzadas
      const { data: sessions, error: sessionsError } = await supabase
        .from("user_sessions")
        .select(`
          id, created_at, duration_seconds, score_percentage, 
          total_questions, correct_answers, is_completed,
          temas!inner(nombre),
          academias!inner(nombre)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (sessionsError) {
        console.warn("Error obteniendo sesiones:", sessionsError);
        // Continuar sin sesiones detalladas
      }

      // 3. Procesar datos básicos de la RPC
      const basicData = basicStats || {
        total_sessions: 0,
        completed_sessions: 0,
        total_questions_answered: 0,
        total_correct_answers: 0,
        overall_accuracy_percentage: 0,
        current_failed_questions: 0,
        best_session_score_percentage: 0,
        last_activity: null,
        points: 0
      };

      // 4. Procesar sesiones para estadísticas avanzadas
      const allSessions = sessions || [];
      const completedSessions = allSessions.filter(s => s.is_completed);
      
      // 5. Calcular estadísticas avanzadas
      const averageSessionTime = completedSessions.length > 0
        ? Math.round(completedSessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / completedSessions.length)
        : 0;

      // Actividad reciente (últimos 30 días)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentSessions = completedSessions.filter(s => 
        new Date(s.created_at) >= thirtyDaysAgo
      );

      const questionsPerDay = recentSessions.length > 0
        ? Math.round(recentSessions.reduce((sum, s) => sum + (s.total_questions || 0), 0) / 30)
        : 0;

      // Calcular racha de días (simplificado)
      const streakDays = calculateStreakDays(completedSessions);

      // Calcular tendencia de mejora
      const improvementTrend = calculateImprovementTrend(recentSessions);

      // Procesar performance por temas
      const topicStats = processTopicPerformance(completedSessions);

      // Actividad semanal
      const weeklyActivity = processWeeklyActivity(recentSessions);

      // Progreso mensual
      const monthlyProgress = processMonthlyProgress(completedSessions);

      // Calcular nivel
      const { level, nextLevelThreshold } = calculateLevel((basicData as any).points || 0);

      const advancedStats: AdvancedUserStats = {
        // Básicas (de la RPC)
        totalSessions: (basicData as any).total_sessions || 0,
        completedSessions: (basicData as any).completed_sessions || 0,
        totalQuestionsAnswered: (basicData as any).total_questions_answered || 0,
        totalCorrectAnswers: (basicData as any).total_correct_answers || 0,
        overallAccuracyPercentage: Math.round((basicData as any).overall_accuracy_percentage || 0),
        currentFailedQuestions: (basicData as any).current_failed_questions || 0,
        bestSessionScorePercentage: Math.round((basicData as any).best_session_score_percentage || 0),
        lastActivity: (basicData as any).last_activity,
        points: (basicData as any).points || 0,

        // Avanzadas (calculadas)
        averageSessionTime,
        questionsPerDay,
        streakDays,
        improvementTrend,
        currentLevel: level,
        experienceToNextLevel: Math.max(0, nextLevelThreshold - ((basicData as any).points || 0)),

        // Por tema
        bestTopics: topicStats.best,
        worstTopics: topicStats.worst,
        recentPerformance: processRecentPerformance(recentSessions),

        // Temporal
        weeklyActivity,
        monthlyProgress,
      };

      console.log("Estadísticas cargadas:", advancedStats);
      setStats(advancedStats);

    } catch (error: any) {
      console.error("Error loading advanced stats:", error);
      
      // En lugar de mostrar toast de error, crear estadísticas básicas
      // usando solo los datos que sabemos que funcionan
      try {
        const { data: fallbackStats } = await supabase
          .rpc("get_user_stats", { p_user_id: user.id });

        if (fallbackStats) {
          const { level, nextLevelThreshold } = calculateLevel((fallbackStats as any).points || 0);
          
          const fallbackAdvancedStats: AdvancedUserStats = {
            totalSessions: (fallbackStats as any).total_sessions || 0,
            completedSessions: (fallbackStats as any).completed_sessions || 0,
            totalQuestionsAnswered: (fallbackStats as any).total_questions_answered || 0,
            totalCorrectAnswers: (fallbackStats as any).total_correct_answers || 0,
            overallAccuracyPercentage: Math.round((fallbackStats as any).overall_accuracy_percentage || 0),
            currentFailedQuestions: (fallbackStats as any).current_failed_questions || 0,
            bestSessionScorePercentage: Math.round((fallbackStats as any).best_session_score_percentage || 0),
            lastActivity: (fallbackStats as any).last_activity,
            points: (fallbackStats as any).points || 0,
            // Valores por defecto para estadísticas avanzadas
            averageSessionTime: 0,
            questionsPerDay: 0,
            streakDays: 0,
            improvementTrend: 0,
            currentLevel: level,
            experienceToNextLevel: Math.max(0, nextLevelThreshold - ((fallbackStats as any).points || 0)),
            bestTopics: [],
            worstTopics: [],
            recentPerformance: [],
            weeklyActivity: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => ({ day, sessions: 0, accuracy: 0 })),
            monthlyProgress: [],
          };
          
          console.log("Usando estadísticas de fallback:", fallbackAdvancedStats);
          setStats(fallbackAdvancedStats);
        }
      } catch (fallbackError) {
        console.error("Error en fallback:", fallbackError);
        toast({
          title: "Error",
          description: "No se pudieron cargar las estadísticas.",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadAdvancedStats();
  }, [loadAdvancedStats]);

  return {
    stats,
    loading,
    refreshStats: loadAdvancedStats,
  };
}

// Funciones auxiliares (simplificadas para evitar errores)
function calculateStreakDays(sessions: any[]): number {
  if (sessions.length === 0) return 0;

  const today = new Date();
  const dates = sessions
    .map(s => {
      try {
        return new Date(s.created_at).toDateString();
      } catch {
        return null;
      }
    })
    .filter(date => date !== null)
    .filter((date, index, arr) => arr.indexOf(date) === index)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  let streak = 0;
  let currentDate = new Date(today);

  for (const dateStr of dates) {
    try {
      const sessionDate = new Date(dateStr);
      const diffDays = Math.floor((currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === streak || diffDays === streak + 1) {
        streak++;
        currentDate = sessionDate;
      } else {
        break;
      }
    } catch {
      break;
    }
  }

  return streak;
}

function calculateImprovementTrend(sessions: any[]): number {
  if (sessions.length < 5) return 0;

  try {
    const recent = sessions.slice(-5);
    const older = sessions.slice(0, Math.min(5, sessions.length - 5));

    if (older.length === 0) return 0;

    const recentAvg = recent.reduce((sum, s) => sum + (s.score_percentage || 0), 0) / recent.length;
    const olderAvg = older.reduce((sum, s) => sum + (s.score_percentage || 0), 0) / older.length;

    return Math.round(recentAvg - olderAvg);
  } catch {
    return 0;
  }
}

function processTopicPerformance(sessions: any[]) {
  const topicMap = new Map();

  try {
    sessions.forEach(session => {
      if (!session.temas?.nombre) return;
      
      const topicName = session.temas.nombre;
      if (!topicMap.has(topicName)) {
        topicMap.set(topicName, { correct: 0, total: 0 });
      }
      const topic = topicMap.get(topicName);
      topic.correct += session.correct_answers || 0;
      topic.total += session.total_questions || 0;
    });

    const topics = Array.from(topicMap.entries()).map(([name, stats]) => ({
      name,
      accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      questionsAnswered: stats.total
    })).filter(t => t.questionsAnswered >= 5);

    return {
      best: topics.sort((a, b) => b.accuracy - a.accuracy).slice(0, 3),
      worst: topics.sort((a, b) => a.accuracy - b.accuracy).slice(0, 3)
    };
  } catch {
    return { best: [], worst: [] };
  }
}

function processRecentPerformance(sessions: any[]) {
  try {
    return sessions.slice(-7).map(session => ({
      date: new Date(session.created_at).toLocaleDateString('es-ES', { 
        month: 'short', 
        day: 'numeric' 
      }),
      accuracy: Math.round(session.score_percentage || 0),
      questionsAnswered: session.total_questions || 0
    }));
  } catch {
    return [];
  }
}

function processWeeklyActivity(sessions: any[]) {
  const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const weekData = weekDays.map(day => ({ day, sessions: 0, accuracy: 0 }));

  try {
    sessions.forEach(session => {
      const dayIndex = new Date(session.created_at).getDay();
      weekData[dayIndex].sessions++;
      weekData[dayIndex].accuracy += session.score_percentage || 0;
    });

    return weekData.map(day => ({
      ...day,
      accuracy: day.sessions > 0 ? Math.round(day.accuracy / day.sessions) : 0
    }));
  } catch {
    return weekData;
  }
}

function processMonthlyProgress(sessions: any[]) {
  const monthMap = new Map();

  try {
    sessions.forEach(session => {
      const monthKey = new Date(session.created_at).toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'short' 
      });
      
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { totalQuestions: 0, totalCorrect: 0, sessions: 0 });
      }
      
      const month = monthMap.get(monthKey);
      month.totalQuestions += session.total_questions || 0;
      month.totalCorrect += session.correct_answers || 0;
      month.sessions++;
    });

    return Array.from(monthMap.entries())
      .map(([month, stats]) => ({
        month,
        totalQuestions: stats.totalQuestions,
        accuracy: stats.totalQuestions > 0 ? Math.round((stats.totalCorrect / stats.totalQuestions) * 100) : 0
      }))
      .slice(-6);
  } catch {
    return [];
  }
}