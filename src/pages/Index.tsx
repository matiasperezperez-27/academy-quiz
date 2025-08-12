import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  Calendar,
  Star,
  BarChart3,
  Flame
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAdvancedStats } from "@/hooks/useAdvancedStats";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { LevelProgress } from "@/components/dashboard/LevelProgress";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { TopicPerformance } from "@/components/dashboard/TopicPerformance";
import { ActivityHeatmap } from "@/components/dashboard/ActivityHeatmap";

function setSEO(title: string, description: string) {
  document.title = title;
  const meta = document.querySelector('meta[name="description"]') || document.createElement("meta");
  meta.setAttribute("name", "description");
  meta.setAttribute("content", description);
  document.head.appendChild(meta);
}

const Index = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { stats, loading: loadingStats, refreshStats } = useAdvancedStats();

  useEffect(() => {
    setSEO("Dashboard | Academy Quiz", "Tu panel de control para tests y práctica personalizada.");
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 18) return "Buenas tardes";
    return "Buenas noches";
  };

  const getUserDisplayName = () => {
    if (user?.user_metadata?.username) return user.user_metadata.username;
    if (user?.email) return user.email.split('@')[0];
    return "Usuario";
  };

  const formatLastActivity = (lastActivity: string | null) => {
    if (!lastActivity) return "Nunca";
    
    const date = new Date(lastActivity);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return "Hoy";
    if (diffDays === 2) return "Ayer";
    if (diffDays <= 7) return `Hace ${diffDays} días`;
    
    return date.toLocaleDateString('es-ES');
  };

  return (
    <main className="min-h-screen p-4 bg-background">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="space-y-4">
          {/* Welcome Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold">
                {getGreeting()}, {getUserDisplayName()}! 👋
              </h1>
              <p className="text-muted-foreground">
                ¿Listo para tu próximo desafío de aprendizaje?
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshStats}
                disabled={loadingStats}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loadingStats ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Actualizar</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </Button>
            </div>
          </div>

          {/* Enhanced Quick Stats */}
          {!loadingStats && stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                title="Tests Completados"
                value={stats.completedSessions}
                icon={<Trophy className="h-4 w-4" />}
                color="text-yellow-600"
                subtitle="sesiones finalizadas"
              />
              
              <StatsCard
                title="Precisión General"
                value={`${stats.overallAccuracyPercentage}%`}
                icon={<Target className="h-4 w-4" />}
                color="text-blue-600"
                trend={stats.improvementTrend !== 0 ? {
                  value: Math.abs(stats.improvementTrend),
                  label: "vs anterior",
                  isPositive: stats.improvementTrend > 0
                } : undefined}
              />
              
              <StatsCard
                title="Racha Actual"
                value={`${stats.streakDays} días`}
                icon={<Flame className="h-4 w-4" />}
                color="text-orange-600"
                subtitle="consecutivos estudiando"
              />
              
              <StatsCard
                title="Nivel Actual"
                value={`Nivel ${stats.currentLevel}`}
                icon={<Star className="h-4 w-4" />}
                color="text-purple-600"
                progress={stats.experienceToNextLevel > 0 ? {
                  value: stats.points,
                  max: stats.points + stats.experienceToNextLevel,
                  label: "Progreso al siguiente nivel"
                } : undefined}
              />
            </div>
          )}

          {/* Loading stats - Updated */}
          {loadingStats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                      <div className="h-4 w-4 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="h-8 w-16 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Main Action Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          
          {/* New Test Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/test-setup")}>
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
                <Button className="w-full" size="lg">
                  <Play className="mr-2 h-4 w-4" />
                  Comenzar Test
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Practice Card */}
          <Card className={`hover:shadow-lg transition-shadow ${stats && stats.currentFailedQuestions > 0 ? 'cursor-pointer' : ''}`} 
                onClick={() => stats && stats.currentFailedQuestions > 0 && navigate("/practice")}>
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
                {stats && stats.currentFailedQuestions > 0 ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Preguntas pendientes:</span>
                      <Badge variant="destructive" className="text-xs">
                        {stats.currentFailedQuestions}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <TrendingUp className="h-4 w-4" />
                      Mejora tu puntuación
                    </div>
                    <Button className="w-full" variant="secondary" size="lg">
                      <BookOpen className="mr-2 h-4 w-4" />
                      Practicar Ahora
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="text-center py-4">
                      <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        ¡Excelente! No tienes preguntas falladas para practicar.
                      </p>
                    </div>
                    <Button className="w-full" variant="secondary" size="lg" disabled>
                      <BookOpen className="mr-2 h-4 w-4" />
                      Sin Preguntas Pendientes
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Analytics Section */}
        {!loadingStats && stats && (
          <div className="space-y-6">
            {/* Level Progress */}
            <LevelProgress 
              currentLevel={stats.currentLevel}
              points={stats.points}
              experienceToNextLevel={stats.experienceToNextLevel}
            />

            {/* Charts Row */}
            <div className="grid gap-6 lg:grid-cols-2">
              <PerformanceChart 
                data={stats.recentPerformance}
                title="Rendimiento Últimos 7 Días"
                type="line"
              />
              <ActivityHeatmap weeklyActivity={stats.weeklyActivity} />
            </div>

            {/* Topic Performance */}
            <TopicPerformance 
              bestTopics={stats.bestTopics}
              worstTopics={stats.worstTopics}
            />

            {/* Additional Stats Row */}
            <div className="grid gap-4 md:grid-cols-3">
              <StatsCard
                title="Tiempo Promedio por Sesión"
                value={`${Math.floor(stats.averageSessionTime / 60)}:${(stats.averageSessionTime % 60).toString().padStart(2, '0')}`}
                icon={<Clock className="h-4 w-4" />}
                color="text-indigo-600"
                subtitle="minutos por test"
              />
              
              <StatsCard
                title="Preguntas por Día"
                value={stats.questionsPerDay}
                icon={<BarChart3 className="h-4 w-4" />}
                color="text-green-600"
                subtitle="promedio últimos 30 días"
              />
              
              <StatsCard
                title="Mejor Puntuación"
                value={`${stats.bestSessionScorePercentage}%`}
                icon={<Zap className="h-4 w-4" />}
                color="text-amber-600"
                subtitle="record personal"
              />
            </div>
          </div>
        )}

        {/* Recent Activity / Tips Section - Simplified */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="h-5 w-5" />
                Acciones Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate("/test-setup")}
              >
                <Target className="mr-2 h-4 w-4" />
                Test por Tema Específico
              </Button>
              
              {stats && stats.currentFailedQuestions > 0 && (
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate("/practice")}
                >
                  <BookOpen className="mr-2 h-4 w-4" />
                  Repasar {stats.currentFailedQuestions} Preguntas Falladas
                </Button>
              )}
              
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={refreshStats}
                disabled={loadingStats}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loadingStats ? 'animate-spin' : ''}`} />
                Actualizar Estadísticas
              </Button>
            </CardContent>
          </Card>

          {/* Tips Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                Consejos y Motivación
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-muted-foreground">
                    {stats && stats.streakDays > 0 
                      ? `¡Vas ${stats.streakDays} días seguidos! Mantén el ritmo.`
                      : "Establece una rutina diaria de estudio para mejores resultados."
                    }
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-muted-foreground">
                    {stats && stats.improvementTrend > 0
                      ? `Tu precisión ha mejorado ${stats.improvementTrend}% recientemente. ¡Excelente!`
                      : "Revisa tus preguntas falladas para identificar áreas de mejora."
                    }
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-muted-foreground">
                    {stats && stats.questionsPerDay > 5
                      ? "Estás manteniendo un buen ritmo de práctica diaria."
                      : "Intenta responder al menos 10 preguntas por día para mantener el progreso."
                    }
                  </p>
                </div>
                
                {/* Dynamic motivational messages */}
                {stats && stats.currentFailedQuestions > 0 && (
                  <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-800">
                      💡 Tienes {stats.currentFailedQuestions} pregunta{stats.currentFailedQuestions !== 1 ? 's' : ''} pendiente{stats.currentFailedQuestions !== 1 ? 's' : ''} de revisar.
                    </p>
                  </div>
                )}
                
                {stats && stats.currentLevel >= 5 && (
                  <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-sm text-purple-800">
                      🏆 ¡Nivel {stats.currentLevel} alcanzado! Eres un estudiante avanzado.
                    </p>
                  </div>
                )}
                
                {stats && stats.streakDays >= 7 && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      🔥 ¡{stats.streakDays} días de racha! Tu constancia es admirable.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Features Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">🚀 Próximamente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="space-y-2">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Trophy className="h-6 w-6 text-blue-600 mx-auto" />
                </div>
                <h4 className="text-sm font-medium">Rankings</h4>
                <p className="text-xs text-muted-foreground">Compite con otros usuarios</p>
              </div>
              <div className="space-y-2">
                <div className="p-3 bg-green-50 rounded-lg">
                  <Target className="h-6 w-6 text-green-600 mx-auto" />
                </div>
                <h4 className="text-sm font-medium">Objetivos</h4>
                <p className="text-xs text-muted-foreground">Establece metas personales</p>
              </div>
              <div className="space-y-2">
                <div className="p-3 bg-purple-50 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600 mx-auto" />
                </div>
                <h4 className="text-sm font-medium">Estadísticas</h4>
                <p className="text-xs text-muted-foreground">Análisis detallado de progreso</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground py-4">
          {stats && stats.streakDays > 0 ? (
            <p>🔥 ¡Llevas {stats.streakDays} días de racha! Sigue así para dominar tus objetivos 🎯</p>
          ) : stats && stats.completedSessions > 0 ? (
            <p>📈 Has completado {stats.completedSessions} tests. ¡Cada sesión te acerca más a la excelencia! 🏆</p>
          ) : (
            <p>¡Comienza tu viaje de aprendizaje hoy! Cada experto fue una vez un principiante 🌟</p>
          )}
        </div>
      </div>
    </main>
  );
};

export default Index;

