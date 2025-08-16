import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  BookOpen,
  LogOut,
  Trophy,
  Target,
  TrendingUp,
  User,
  Clock,
  CheckCircle2,
  RefreshCw,
  Zap,
  Flame,
  Star,
  BarChart3,
  Shield,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";

export default function SimpleDashboard() {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Función súper simple para cargar solo lo básico
  const loadBasicStats = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Solo usar la función RPC que sabemos que funciona
      const { data: basicStats, error: rpcError } = await supabase
        .rpc("get_user_stats", { p_user_id: user.id });

      if (rpcError) {
        throw new Error(`Error RPC: ${rpcError.message}`);
      }

      // Guardar datos raw sin procesar
      setRawData(basicStats);
    } catch (err) {
      setError(err.message);

      // Si falla todo, poner datos vacíos
      setRawData({
        total_sessions: 0,
        completed_sessions: 0,
        total_questions_answered: 0,
        total_correct_answers: 0,
        overall_accuracy_percentage: 0,
        current_failed_questions: 0,
        best_session_score_percentage: 0,
        last_activity: null,
        points: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBasicStats();
  }, [user]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 18) return "Buenas tardes";
    return "Buenas noches";
  };

  const getUserDisplayName = () => {
    if (user?.user_metadata?.username) return user.user_metadata.username;
    if (user?.email) return user.email.split("@")[0];
    return "Usuario";
  };

  const getLevel = (points) => {
    const pts = Number(points) || 0;
    if (pts >= 4000) return { level: 8, title: "Leyenda" };
    if (pts >= 2500) return { level: 7, title: "Maestro" };
    if (pts >= 1500) return { level: 6, title: "Experto" };
    if (pts >= 1000) return { level: 5, title: "Avanzado" };
    if (pts >= 600) return { level: 4, title: "Conocedor" };
    if (pts >= 300) return { level: 3, title: "Estudiante" };
    if (pts >= 100) return { level: 2, title: "Aprendiz" };
    return { level: 1, title: "Principiante" };
  };

  // Función súper segura para obtener valores
  const safeGet = (obj, key, defaultValue = 0) => {
    if (!obj || typeof obj !== "object") return defaultValue;
    const value = obj[key];
    return value !== null && value !== undefined ? value : defaultValue;
  };

  // Componentes UI puros
  const MobileHeader = () => (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
            {getGreeting()}, {getUserDisplayName()}! 👋
          </h1>
          <p className="text-muted-foreground dark:text-gray-300 text-sm sm:text-base">
            ¿Listo para tu próximo desafío de aprendizaje?
          </p>
        </div>
        <LevelBadge points={safeGet(rawData, "points", 0)} />
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={loadBasicStats}
        disabled={loading}
        className="flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-gray-700 transition-all duration-200"
      >
        <RefreshCw
          className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
        />
        <span className="hidden sm:inline">Actualizar</span>
      </Button>
    </div>
  );

  const LevelBadge = ({ points }) => {
    const levelInfo = getLevel(points);
    return (
      <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-800/30 dark:to-blue-800/30 rounded-full border dark:border-gray-600">
        <Star className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        <span className="text-sm font-medium dark:text-gray-200">
          Nivel {levelInfo.level} · {points} pts
        </span>
      </div>
    );
  };

  const StatsCard = ({ title, value, subtitle, icon, color = "text-primary", gradient = "from-blue-50 to-indigo-50" }) => (
    <Card className={`hover:shadow-lg transition-all duration-300 hover:scale-105 backdrop-blur-sm bg-gradient-to-br ${gradient} dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-700 border-0 shadow-sm dark:shadow-gray-900/20`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
        <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</CardTitle>
        <div className={`h-6 w-6 sm:h-8 sm:w-8 ${color} p-1 bg-white/80 dark:bg-gray-800/80 rounded-lg`}>
          {React.cloneElement(icon, { className: "h-full w-full" })}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
        {subtitle && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );

  const QuickActions = () => {
    const failedQuestions = safeGet(rawData, "current_failed_questions", 0);
    const totalAnswers = safeGet(rawData, "total_questions_answered", 0);

    return (
      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {/* Nuevo Test Card */}
        <Card className="hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 dark:bg-gray-800 border-0 dark:border-gray-600">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3">
              <div className="p-3 bg-blue-600 rounded-xl shadow-lg">
                <Play className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900 dark:text-gray-100">Nuevo Test</div>
                <div className="text-sm text-gray-600 dark:text-gray-300 font-normal">
                  Elige tema y pon a prueba tus conocimientos
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <Clock className="h-4 w-4" />
                Duración: 5-10 minutos
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <Target className="h-4 w-4" />
                10 preguntas aleatorias
              </div>
              <Button
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white shadow-md hover:shadow-lg transition-all duration-200"
                size="lg"
                onClick={() => (window.location.href = "/test-setup")}
              >
                <Play className="mr-2 h-4 w-4" />
                Comenzar Test
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Practice Card */}
        <Card className="hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-br from-orange-50 to-red-100 dark:from-orange-900/20 dark:to-red-900/20 dark:bg-gray-800 border-0 dark:border-gray-600">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3">
              <div className="p-3 bg-orange-600 rounded-xl shadow-lg">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900 dark:text-gray-100">Modo Práctica</div>
                <div className="text-sm text-gray-600 dark:text-gray-300 font-normal">
                  Repasa tus preguntas falladas
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {failedQuestions > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Preguntas pendientes:
                    </span>
                    <Badge variant="destructive" className="text-xs bg-red-500">
                      {failedQuestions}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <TrendingUp className="h-4 w-4" />
                    Mejora tu puntuación
                  </div>
                  <Button
                    className="w-full h-12 bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white shadow-md hover:shadow-lg transition-all duration-200"
                    size="lg"
                    onClick={() => (window.location.href = "/practice")}
                  >
                    <BookOpen className="mr-2 h-4 w-4" />
                    Practicar Ahora
                  </Button>
                </>
              ) : (
                <>
                  <div className="text-center py-4">
                    <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      ¡Excelente! No tienes preguntas falladas para practicar.
                    </p>
                  </div>
                  <Button
                    className="w-full h-12 bg-gray-400 dark:bg-gray-600 text-white cursor-not-allowed"
                    size="lg"
                    disabled
                  >
                    <BookOpen className="mr-2 h-4 w-4" />
                    Sin Preguntas Pendientes
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Análisis por Temas Card */}
        <Card className="hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 dark:bg-gray-800 border-0 dark:border-gray-600">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3">
              <div className="p-3 bg-purple-600 rounded-xl shadow-lg">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900 dark:text-gray-100">Análisis por Temas</div>
                <div className="text-sm text-gray-600 dark:text-gray-300 font-normal">
                  Ve tu progreso detallado por tema
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <Target className="h-4 w-4" />
                Identifica tus puntos fuertes
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <TrendingUp className="h-4 w-4" />
                Enfócate en lo que necesitas
              </div>
              <Button
                className="w-full h-12 border-2 border-purple-600 dark:border-purple-400 text-purple-600 dark:text-purple-400 hover:bg-purple-600 hover:text-white dark:hover:bg-purple-500 dark:hover:text-white shadow-md hover:shadow-lg transition-all duration-200"
                variant="outline"
                size="lg"
                onClick={() => (window.location.href = "/analisis-temas")}
                disabled={totalAnswers === 0}
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                {totalAnswers > 0 ? "Ver Análisis" : "Sin Datos Aún"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
        <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 shadow-xl">
          <CardContent className="p-6">
            <p className="text-lg dark:text-gray-200">Cargando usuario...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Variables súper seguras
  const completedSessions = safeGet(rawData, "completed_sessions", 0);
  const totalSessions = safeGet(rawData, "total_sessions", 0);
  const accuracy = Math.round(
    safeGet(rawData, "overall_accuracy_percentage", 0)
  );
  const correctAnswers = safeGet(rawData, "total_correct_answers", 0);
  const totalAnswers = safeGet(rawData, "total_questions_answered", 0);
  const failedQuestions = safeGet(rawData, "current_failed_questions", 0);
  const points = safeGet(rawData, "points", 0);
  const bestScore = Math.round(
    safeGet(rawData, "best_session_score_percentage", 0)
  );
  const lastActivity = safeGet(rawData, "last_activity", null);

  const levelInfo = getLevel(points);

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8">
        
        {/* Mobile-First Header */}
        <MobileHeader />

        {/* Error Display */}
        {error && (
          <Card className="border-red-200 dark:border-red-800 bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm">
            <CardContent className="p-4">
              <p className="text-red-800 dark:text-red-400">⚠️ Error: {error}</p>
              <Button onClick={loadBasicStats} className="mt-2" size="sm">
                Reintentar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="p-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
                <div className="space-y-3">
                  <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                  <div className="h-8 w-16 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Essential Stats - Mobile: 2 cols, Desktop: 4 cols */}
        {!loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <StatsCard
              title="Tests Completados"
              value={completedSessions}
              icon={<Trophy />}
              color="text-yellow-600"
              gradient="from-yellow-50 to-orange-100"
              subtitle="sesiones finalizadas"
            />

            <StatsCard
              title="Precisión General"
              value={`${accuracy}%`}
              icon={<Target />}
              color="text-blue-600"
              gradient="from-blue-50 to-cyan-100"
              subtitle={`${correctAnswers}/${totalAnswers} correctas`}
            />

            <StatsCard
              title="Preguntas Falladas"
              value={failedQuestions}
              icon={<BookOpen />}
              color="text-orange-600"
              gradient="from-orange-50 to-red-100"
              subtitle="para practicar"
            />

            <StatsCard
              title={`Nivel ${levelInfo.level}`}
              value={levelInfo.title}
              icon={<Star />}
              color="text-purple-600"
              gradient="from-purple-50 to-pink-100"
              subtitle={`${points} puntos`}
            />
          </div>
        )}

        {/* Quick Action Buttons */}
        <QuickActions />

        {/* Collapsible Stats for Mobile */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Level Info */}
          <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Star className="h-5 w-5 text-yellow-600" />
                Tu Nivel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-800/50 dark:to-purple-700/50 rounded-full">
                    <Star className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <div className="text-xl font-bold">
                      Nivel {levelInfo.level}
                    </div>
                    <div className="text-sm text-muted-foreground dark:text-gray-400">
                      {levelInfo.title}
                    </div>
                  </div>
                  <div className="ml-auto">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {points}
                    </div>
                    <div className="text-xs text-muted-foreground dark:text-gray-400">puntos</div>
                  </div>
                </div>

                <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border dark:border-gray-600">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {points < 100
                      ? `Te faltan ${100 - points} puntos para Nivel 2`
                      : "¡Sigue así para seguir subiendo de nivel!"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5" />
                Estadísticas Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground dark:text-gray-400">
                    Total de sesiones:
                  </span>
                  <span className="font-medium dark:text-gray-200">{totalSessions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground dark:text-gray-400">
                    Sesiones completadas:
                  </span>
                  <span className="font-medium dark:text-gray-200">{completedSessions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground dark:text-gray-400">
                    Preguntas respondidas:
                  </span>
                  <span className="font-medium dark:text-gray-200">{totalAnswers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground dark:text-gray-400">
                    Mejor puntuación:
                  </span>
                  <span className="font-medium dark:text-gray-200">{bestScore}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground dark:text-gray-400">
                    Última actividad:
                  </span>
                  <span className="font-medium dark:text-gray-200">
                    {lastActivity
                      ? new Date(lastActivity).toLocaleDateString("es-ES")
                      : "Nunca"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Motivational Message */}
        <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 shadow-lg">
          <CardContent className="p-6 text-center">
            <div className="space-y-3">
              {failedQuestions > 0 ? (
                <>
                  <div className="text-lg font-semibold">
                    💪 ¡Tienes {failedQuestions} preguntas esperándote!
                  </div>
                  <p className="text-muted-foreground dark:text-gray-300">
                    Cada pregunta que practiques te acerca más a la perfección.
                    ¡Es hora de brillar! ✨
                  </p>
                  <Button
                    onClick={() => (window.location.href = "/practice")}
                    className="mt-3 bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 h-12 px-6"
                  >
                    <BookOpen className="mr-2 h-4 w-4" />
                    Empezar a Practicar
                  </Button>
                </>
              ) : completedSessions === 0 ? (
                <>
                  <div className="text-lg font-semibold">
                    🌟 ¡Comienza tu viaje de aprendizaje!
                  </div>
                  <p className="text-muted-foreground dark:text-gray-300">
                    Cada experto fue una vez un principiante. ¡Haz tu primer
                    test hoy!
                  </p>
                  <Button
                    onClick={() => (window.location.href = "/test-setup")}
                    className="mt-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 h-12 px-6"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Mi Primer Test
                  </Button>
                </>
              ) : (
                <>
                  <div className="text-lg font-semibold">🎯 ¡Sigue así!</div>
                  <p className="text-muted-foreground dark:text-gray-300">
                    Has completado {completedSessions} sesiones. ¡Tu dedicación
                    está dando frutos!
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </main>
  );
}

