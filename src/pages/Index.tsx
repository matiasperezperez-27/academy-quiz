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
  Shield, // 1. Ícono importado
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin"; // 2. Hook de admin importado
import { supabase } from "@/integrations/supabase/client";

// Dashboard súper simple que SÍ funciona
export default function SimpleDashboard() {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin(); // 3. Hook en uso
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Función súper simple para cargar solo lo básico
  const loadBasicStats = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      console.log("Intentando cargar stats para usuario:", user.id);

      // Solo usar la función RPC que sabemos que funciona
      const { data: basicStats, error: rpcError } = await supabase
        .rpc("get_user_stats", { p_user_id: user.id });

      console.log("Resultado de RPC:", { basicStats, rpcError });

      if (rpcError) {
        throw new Error(`Error RPC: ${rpcError.message}`);
      }

      // Guardar datos raw sin procesar
      setRawData(basicStats);
    } catch (err) {
      console.error("Error cargando stats:", err);
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

  const StatsCard = ({ title, value, subtitle, icon, color = "text-primary" }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`h-4 w-4 ${color}`}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-6">
            <p>Cargando usuario...</p>
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
    <main className="min-h-screen p-4 bg-background">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        // En src/pages/Index.tsx, modificar el header:
{/* Header - SIMPLIFICADO */}
<div className="flex items-center justify-between">
  <div className="space-y-1">
    <h1 className="text-2xl sm:text-3xl font-bold">
      {getGreeting()}, {getUserDisplayName()}! 👋
    </h1>
    <p className="text-muted-foreground">
      ¿Listo para tu próximo desafío de aprendizaje?
    </p>
  </div>
  <Button
    variant="ghost"
    size="sm"
    onClick={loadBasicStats}
    disabled={loading}
    className="flex items-center gap-2"
  >
    <RefreshCw
      className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
    />
    <span className="hidden sm:inline">Actualizar</span>
  </Button>
</div>

        {/* Error Display */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <p className="text-red-800">⚠️ Error: {error}</p>
              <Button onClick={loadBasicStats} className="mt-2" size="sm">
                Reintentar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="p-4">
                <div className="space-y-3">
                  <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                  <div className="h-8 w-16 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Stats Cards - SÚPER SEGURAS */}
        {!loading && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Tests Completados"
              value={completedSessions}
              icon={<Trophy className="h-4 w-4" />}
              color="text-yellow-600"
              subtitle="sesiones finalizadas"
            />

            <StatsCard
              title="Precisión General"
              value={`${accuracy}%`}
              icon={<Target className="h-4 w-4" />}
              color="text-blue-600"
              subtitle={`${correctAnswers}/${totalAnswers} correctas`}
            />

            <StatsCard
              title="Preguntas Falladas"
              value={failedQuestions}
              icon={<BookOpen className="h-4 w-4" />}
              color="text-orange-600"
              subtitle="para practicar"
            />

            <StatsCard
              title={`Nivel ${levelInfo.level}`}
              value={levelInfo.title}
              icon={<Star className="h-4 w-4" />}
              color="text-purple-600"
              subtitle={`${points} puntos`}
            />
          </div>
        )}

{/* Main Action Cards */}
        <div className="grid gap-6 md:grid-cols-3"> {/* 👈 CAMBIAR de md:grid-cols-2 a md:grid-cols-3 */}
          {/* New Test Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Play className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="text-xl">Nuevo Test</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Elige tema y pon a prueba tus conocimientos
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Duración: 5-10 minutos
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Target className="h-4 w-4" />
                  10 preguntas aleatorias
                </div>
                <Button
                  className="w-full"
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
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <BookOpen className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <div className="text-xl">Modo Práctica</div>
                  <div className="text-sm text-muted-foreground font-normal">
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
                      <span className="text-sm text-muted-foreground">
                        Preguntas pendientes:
                      </span>
                      <Badge variant="destructive" className="text-xs">
                        {failedQuestions}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <TrendingUp className="h-4 w-4" />
                      Mejora tu puntuación
                    </div>
                    <Button
                      className="w-full"
                      variant="secondary"
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
                      <p className="text-sm text-muted-foreground">
                        ¡Excelente! No tienes preguntas falladas para
                        practicar.
                      </p>
                    </div>
                    <Button
                      className="w-full"
                      variant="secondary"
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

          {/* 👈 NUEVA CARD DE ANÁLISIS POR TEMAS */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <div className="text-xl">Análisis por Temas</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Ve tu progreso detallado por tema
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Target className="h-4 w-4" />
                  Identifica tus puntos fuertes
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  Enfócate en lo que necesitas
                </div>
                <Button
                  className="w-full"
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

        {/* Simple Progress Section */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Level Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Star className="h-5 w-5 text-yellow-600" />
                Tu Nivel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-100 rounded-full">
                    <Star className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-xl font-bold">
                      Nivel {levelInfo.level}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {levelInfo.title}
                    </div>
                  </div>
                  <div className="ml-auto">
                    <div className="text-2xl font-bold text-primary">
                      {points}
                    </div>
                    <div className="text-xs text-muted-foreground">puntos</div>
                  </div>
                </div>

                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    {points < 100
                      ? `Te faltan ${100 - points} puntos para Nivel 2`
                      : "¡Sigue así para seguir subiendo de nivel!"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5" />
                Estadísticas Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Total de sesiones:
                  </span>
                  <span className="font-medium">{totalSessions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Sesiones completadas:
                  </span>
                  <span className="font-medium">{completedSessions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Preguntas respondidas:
                  </span>
                  <span className="font-medium">{totalAnswers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Mejor puntuación:
                  </span>
                  <span className="font-medium">{bestScore}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Última actividad:
                  </span>
                  <span className="font-medium">
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
        <Card>
          <CardContent className="p-6 text-center">
            <div className="space-y-3">
              {failedQuestions > 0 ? (
                <>
                  <div className="text-lg font-semibold">
                    💪 ¡Tienes {failedQuestions} preguntas esperándote!
                  </div>
                  <p className="text-muted-foreground">
                    Cada pregunta que practiques te acerca más a la perfección.
                    ¡Es hora de brillar! ✨
                  </p>
                  <Button
                    onClick={() => (window.location.href = "/practice")}
                    className="mt-3"
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
                  <p className="text-muted-foreground">
                    Cada experto fue una vez un principiante. ¡Haz tu primer
                    test hoy!
                  </p>
                  <Button
                    onClick={() => (window.location.href = "/test-setup")}
                    className="mt-3"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Mi Primer Test
                  </Button>
                </>
              ) : (
                <>
                  <div className="text-lg font-semibold">🎯 ¡Sigue así!</div>
                  <p className="text-muted-foreground">
                    Has completado {completedSessions} sesiones. ¡Tu dedicación
                    está dando frutos!
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Debug Info (temporal) */}
        <Card className="border-dashed border-2 border-gray-300">
          <CardHeader>
            <CardTitle className="text-sm text-gray-500">
              🔧 Info de Debug (temporal)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs">
              <div>
                <strong>Loading:</strong> {loading.toString()}
              </div>
              <div>
                <strong>Error:</strong> {error || "ninguno"}
              </div>
              <div>
                <strong>RawData type:</strong> {typeof rawData}
              </div>
              <div>
                <strong>RawData is null:</strong> {(rawData === null).toString()}
              </div>
              <div>
                <strong>User ID:</strong> {user?.id || "no-user"}
              </div>
              <div>
                <strong>Processed values:</strong>
              </div>
              <div className="ml-4">
                <div>• completedSessions: {completedSessions}</div>
                <div>• failedQuestions: {failedQuestions}</div>
                <div>• points: {points}</div>
                <div>• accuracy: {accuracy}%</div>
              </div>
            </div>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto mt-2 max-h-48">
              {JSON.stringify(rawData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

