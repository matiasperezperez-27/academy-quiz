import { useEffect, useState } from "react";
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
  CheckCircle2
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

function setSEO(title: string, description: string) {
  document.title = title;
  const meta = document.querySelector('meta[name="description"]') || document.createElement("meta");
  meta.setAttribute("name", "description");
  meta.setAttribute("content", description);
  document.head.appendChild(meta);
}

interface UserStats {
  totalTests: number;
  totalCorrect: number;
  totalQuestions: number;
  failedQuestions: number;
  lastActivity: string | null;
}

const Index = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<UserStats>({
    totalTests: 0,
    totalCorrect: 0,
    totalQuestions: 0,
    failedQuestions: 0,
    lastActivity: null,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    setSEO("Dashboard | Academy Quiz", "Tu panel de control para tests y práctica personalizada.");
  }, []);

  // Load user statistics
  useEffect(() => {
    const loadUserStats = async () => {
      if (!user) return;
      
      try {
        setLoadingStats(true);
        
        // Get failed questions count
        const { count: failedCount } = await supabase
          .from("preguntas_falladas")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        // For now, we'll set basic stats
        // In a full implementation, you'd have a user_sessions table to track these
        setStats({
          totalTests: 0, // Would come from user_sessions table
          totalCorrect: 0, // Would come from user_sessions table  
          totalQuestions: 0, // Would come from user_sessions table
          failedQuestions: failedCount || 0,
          lastActivity: null, // Would come from user_sessions table
        });
      } catch (error) {
        console.error("Error loading user stats:", error);
      } finally {
        setLoadingStats(false);
      }
    };

    loadUserStats();
  }, [user]);

  const accuracy = stats.totalQuestions > 0 
    ? Math.round((stats.totalCorrect / stats.totalQuestions) * 100) 
    : 0;

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

          {/* Quick Stats */}
          {!loadingStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-600" />
                  <div>
                    <div className="text-2xl font-bold">{stats.totalTests}</div>
                    <div className="text-xs text-muted-foreground">Tests</div>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold">{accuracy}%</div>
                    <div className="text-xs text-muted-foreground">Precisión</div>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold">{stats.totalCorrect}</div>
                    <div className="text-xs text-muted-foreground">Correctas</div>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-red-600" />
                  <div>
                    <div className="text-2xl font-bold">{stats.failedQuestions}</div>
                    <div className="text-xs text-muted-foreground">Falladas</div>
                  </div>
                </div>
              </Card>
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
          <Card className={`hover:shadow-lg transition-shadow ${stats.failedQuestions > 0 ? 'cursor-pointer' : ''}`} 
                onClick={() => stats.failedQuestions > 0 && navigate("/practice")}>
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
                {stats.failedQuestions > 0 ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Preguntas pendientes:</span>
                      <Badge variant="destructive" className="text-xs">
                        {stats.failedQuestions}
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
              {stats.totalQuestions > 0 ? (
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>Precisión General</span>
                    <span className="font-medium">{accuracy}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all" 
                      style={{ width: `${accuracy}%` }}
                    ></div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total de preguntas:</span>
                      <span className="font-medium">{stats.totalQuestions}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Respuestas correctas:</span>
                      <span className="font-medium text-green-600">{stats.totalCorrect}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tests completados:</span>
                      <span className="font-medium">{stats.totalTests}</span>
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
                {stats.failedQuestions > 0 && (
                  <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-800">
                      💡 Tienes {stats.failedQuestions} pregunta{stats.failedQuestions !== 1 ? 's' : ''} pendiente{stats.failedQuestions !== 1 ? 's' : ''} de revisar.
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
