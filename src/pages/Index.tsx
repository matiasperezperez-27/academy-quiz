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
  RefreshCw
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserStats } from "@/hooks/useQuiz";

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
  const { stats, loading: loadingStats, refreshStats } = useUserStats();

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
      <div className="max-w-4xl mx-auto space-y-6">
        
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

          {/* Quick Stats */}
          {!loadingStats && stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-600" />
                  <div>
                    <div className="text-2xl font-bold">{stats.completed_sessions}</div>
                    <div className="text-xs text-muted-foreground">Tests</div>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold">{Math.round(stats.overall_accuracy_percentage)}%</div>
                    <div className="text-xs text-muted-foreground">Precisión</div>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold">{stats.total_correct_answers}</div>
                    <div className="text-xs text-muted-foreground">Correctas</div>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-red-600" />
                  <div>
                    <div className="text-2xl font-bold">{stats.current_failed_questions}</div>
                    <div className="text-xs text-muted-foreground">Falladas</div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Loading stats */}
          {loadingStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 bg-muted rounded animate-pulse" />
                    <div>
                      <div className="h-6 w-8 bg-muted rounded animate-pulse mb-1" />
                      <div className="h-3 w-12 bg-muted rounded animate-pulse" />
                    </div>
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
          <Card className={`hover:shadow-lg transition-shadow ${stats && stats.current_failed_questions > 0 ? 'cursor-pointer' : ''}`} 
                onClick={() => stats && stats.current_failed_questions > 0 && navigate("/practice")}>
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
                {stats && stats.current_failed_questions > 0 ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Preguntas pendientes:</span>
                      <Badge variant="destructive" className="text-xs">
                        {stats.current_failed_questions}
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

        {/* Recent Activity / Tips Section */}
        <div className="grid gap-6 md:grid-cols-2">
          
          {/* Progress Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5" />
                Tu Progreso
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats && stats.total_questions_answered > 0 ? (
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>Precisión General</span>
                    <span className="font-medium">{Math.round(stats.overall_accuracy_percentage)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all" 
                      style={{ width: `${Math.round(stats.overall_accuracy_percentage)}%` }}
                    ></div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total de preguntas:</span>
                      <span className="font-medium">{stats.total_questions_answered}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Respuestas correctas:</span>
                      <span className="font-medium text-green-600">{stats.total_correct_answers}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tests completados:</span>
                      <span className="font-medium">{stats.completed_sessions}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Puntos totales:</span>
                      <span className="font-medium text-primary">{stats.points}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Mejor puntuación:</span>
                      <span className="font-medium text-yellow-600">{Math.round(stats.best_session_score_percentage)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Última actividad:</span>
                      <span className="font-medium">{formatLastActivity(stats.last_activity)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">
                    Aún no has completado ningún test.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate("/test-setup")}
                  >
                    Comenzar Primer Test
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tips Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                Consejos de Estudio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-muted-foreground">
                    Practica regularmente para mejorar la retención de conocimientos.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-muted-foreground">
                    Revisa tus preguntas falladas para identificar áreas de mejora.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-muted-foreground">
                    Tómate descansos entre sesiones de estudio para optimizar el aprendizaje.
                  </p>
                </div>
                {stats && stats.current_failed_questions > 0 && (
                  <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-800">
                      💡 Tienes {stats.current_failed_questions} pregunta{stats.current_failed_questions !== 1 ? 's' : ''} pendiente{stats.current_failed_questions !== 1 ? 's' : ''} de revisar.
                    </p>
                  </div>
                )}
                {stats && stats.points > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      🏆 Has acumulado {stats.points} puntos. ¡Sigue así para llegar a tu próximo hito!
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
          <p>¡Sigue practicando para alcanzar tus objetivos de aprendizaje! 🎯</p>
        </div>
      </div>
    </main>
  );
};

export default Index;
