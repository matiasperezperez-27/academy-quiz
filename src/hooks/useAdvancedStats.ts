// ========================================
// 1. HOOK AVANZADO PARA ESTADÍSTICAS
// ========================================

// src/hooks/useAdvancedStats.ts
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

      // 1. Estadísticas básicas
      const { data: basicStats } = await supabase.rpc("get_user_stats", {
        p_user_id: user.id
      });

      if (!basicStats) {
        setStats(null);
        return;
      }

      // Cast explícito para TypeScript
      const statsData = basicStats as Record<string, any>;

      // 2. Estadísticas de sesiones detalladas
      const { data: sessions } = await supabase
        .from("user_sessions")
        .select(`
          id, created_at, duration_seconds, score_percentage, 
          total_questions, correct_answers, is_completed,
          temas!inner(nombre),
          academias!inner(nombre)
        `)
        .eq("user_id", user.id)
        .eq("is_completed", true)
        .order("created_at", { ascending: false });

      // 3. Actividad reciente (últimos 30 días)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: recentActivity } = await supabase
        .from("user_sessions")
        .select("created_at, score_percentage, total_questions")
        .eq("user_id", user.id)
        .eq("is_completed", true)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: true });

      // 4. Performance por tema
      const { data: topicPerformance } = await supabase
        .from("user_sessions")
        .select(`
          correct_answers, total_questions,
          temas!inner(nombre)
        `)
        .eq("user_id", user.id)
        .eq("is_completed", true);

      // Procesar datos
      const completedSessions = sessions || [];
      const recentSessions = recentActivity || [];
      const topicData = topicPerformance || [];

      // Calcular estadísticas avanzadas
      const averageSessionTime = completedSessions.length > 0
        ? Math.round(completedSessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / completedSessions.length)
        : 0;

      const questionsPerDay = recentSessions.length > 0
        ? Math.round(recentSessions.reduce((sum, s) => sum + s.total_questions, 0) / 30)
        : 0;

      // Calcular racha de días
      const streakDays = calculateStreakDays(completedSessions);

      // Calcular tendencia de mejora
      const improvementTrend = calculateImprovementTrend(recentSessions);

      // Procesar performance por temas
      const topicStats = processTopicPerformance(topicData);

      // Actividad semanal
      const weeklyActivity = processWeeklyActivity(recentSessions);

      // Progreso mensual
      const monthlyProgress = processMonthlyProgress(completedSessions);

      // Calcular nivel
      const { level, nextLevelThreshold } = calculateLevel(statsData.points || 0);

      const advancedStats: AdvancedUserStats = {
        // Básicas
        totalSessions: statsData.total_sessions || 0,
        completedSessions: statsData.completed_sessions || 0,
        totalQuestionsAnswered: statsData.total_questions_answered || 0,
        totalCorrectAnswers: statsData.total_correct_answers || 0,
        overallAccuracyPercentage: Math.round(statsData.overall_accuracy_percentage || 0),
        currentFailedQuestions: statsData.current_failed_questions || 0,
        bestSessionScorePercentage: Math.round(statsData.best_session_score_percentage || 0),
        lastActivity: statsData.last_activity || null,
        points: statsData.points || 0,

        // Avanzadas
        averageSessionTime,
        questionsPerDay,
        streakDays,
        improvementTrend,
        currentLevel: level,
        experienceToNextLevel: Math.max(0, nextLevelThreshold - (statsData.points || 0)),

        // Por tema
        bestTopics: topicStats.best,
        worstTopics: topicStats.worst,
        recentPerformance: processRecentPerformance(recentSessions),

        // Temporal
        weeklyActivity,
        monthlyProgress,
      };

      setStats(advancedStats);

    } catch (error: any) {
      console.error("Error loading advanced stats:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las estadísticas avanzadas.",
        variant: "destructive"
      });
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

// Funciones auxiliares
function calculateStreakDays(sessions: any[]): number {
  if (sessions.length === 0) return 0;

  const today = new Date();
  const dates = sessions
    .map(s => new Date(s.created_at).toDateString())
    .filter((date, index, arr) => arr.indexOf(date) === index)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  let streak = 0;
  let currentDate = new Date(today);

  for (const dateStr of dates) {
    const sessionDate = new Date(dateStr);
    const diffDays = Math.floor((currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === streak) {
      streak++;
      currentDate = sessionDate;
    } else if (diffDays === streak + 1) {
      streak++;
      currentDate = sessionDate;
    } else {
      break;
    }
  }

  return streak;
}

function calculateImprovementTrend(sessions: any[]): number {
  if (sessions.length < 5) return 0;

  const recent = sessions.slice(-5);
  const older = sessions.slice(0, 5);

  const recentAvg = recent.reduce((sum, s) => sum + s.score_percentage, 0) / recent.length;
  const olderAvg = older.reduce((sum, s) => sum + s.score_percentage, 0) / older.length;

  return Math.round(recentAvg - olderAvg);
}

function processTopicPerformance(data: any[]) {
  const topicMap = new Map();

  data.forEach(session => {
    const topicName = session.temas.nombre;
    if (!topicMap.has(topicName)) {
      topicMap.set(topicName, { correct: 0, total: 0 });
    }
    const topic = topicMap.get(topicName);
    topic.correct += session.correct_answers;
    topic.total += session.total_questions;
  });

  const topics = Array.from(topicMap.entries()).map(([name, stats]) => ({
    name,
    accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
    questionsAnswered: stats.total
  })).filter(t => t.questionsAnswered >= 5); // Solo temas con al menos 5 preguntas

  return {
    best: topics.sort((a, b) => b.accuracy - a.accuracy).slice(0, 3),
    worst: topics.sort((a, b) => a.accuracy - b.accuracy).slice(0, 3)
  };
}

function processRecentPerformance(sessions: any[]) {
  return sessions.slice(-7).map(session => ({
    date: new Date(session.created_at).toLocaleDateString('es-ES', { 
      month: 'short', 
      day: 'numeric' 
    }),
    accuracy: Math.round(session.score_percentage),
    questionsAnswered: session.total_questions
  }));
}

function processWeeklyActivity(sessions: any[]) {
  const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const weekData = weekDays.map(day => ({ day, sessions: 0, accuracy: 0 }));

  sessions.forEach(session => {
    const dayIndex = new Date(session.created_at).getDay();
    weekData[dayIndex].sessions++;
    weekData[dayIndex].accuracy += session.score_percentage;
  });

  return weekData.map(day => ({
    ...day,
    accuracy: day.sessions > 0 ? Math.round(day.accuracy / day.sessions) : 0
  }));
}

function processMonthlyProgress(sessions: any[]) {
  const monthMap = new Map();

  sessions.forEach(session => {
    const monthKey = new Date(session.created_at).toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'short' 
    });
    
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, { totalQuestions: 0, totalCorrect: 0, sessions: 0 });
    }
    
    const month = monthMap.get(monthKey);
    month.totalQuestions += session.total_questions;
    month.totalCorrect += session.correct_answers;
    month.sessions++;
  });

  return Array.from(monthMap.entries())
    .map(([month, stats]) => ({
      month,
      totalQuestions: stats.totalQuestions,
      accuracy: stats.totalQuestions > 0 ? Math.round((stats.totalCorrect / stats.totalQuestions) * 100) : 0
    }))
    .slice(-6); // Últimos 6 meses
}