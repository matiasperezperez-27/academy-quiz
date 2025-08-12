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

// COMPONENTE DE DEBUG TEMPORAL
import React from "react";
import { supabase } from "@/integrations/supabase/client";

function DebugDashboard() {
  const { user, session } = useAuth();
  const [debugInfo, setDebugInfo] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const runTests = async () => {
    setLoading(true);
    const results = {};

    try {
      // Test 1: Usuario actual
      results.user = {
        exists: !!user,
        id: user?.id,
        email: user?.email
      };

      // Test 2: Sesión actual  
      results.session = {
        exists: !!session,
        accessToken: !!session?.access_token
      };

      if (!user) {
        setDebugInfo(results);
        setLoading(false);
        return;
      }

      // Test 3: Crear perfil si no existe
      const { data: profileUpsert, error: profileUpsertError } = await supabase
        .from("profiles")
        .upsert({ 
          id: user.id, 
          puntos: 0,
          created_at: new Date().toISOString()
        })
        .select();

      results.profileCreation = {
        success: !profileUpsertError,
        data: profileUpsert,
        error: profileUpsertError?.message
      };

      // Test 4: Verificar perfil
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      results.profileQuery = {
        success: !profileError,
        data: profile,
        error: profileError?.message
      };

      // Test 5: Probar función RPC
      const { data: rpcStats, error: rpcError } = await supabase
        .rpc("get_user_stats", { p_user_id: user.id });

      results.rpcFunction = {
        success: !rpcError,
        data: rpcStats,
        error: rpcError?.message
      };

      // Test 6: Verificar datos básicos
      const { data: academias } = await supabase
        .from("academias")
        .select("count");

      const { data: temas } = await supabase
        .from("temas") 
        .select("count");

      const { data: preguntas } = await supabase
        .from("preguntas")
        .select("count");

      results.dataExists = {
        academias: academias?.length || 0,
        temas: temas?.length || 0, 
        preguntas: preguntas?.length || 0
      };

      // Test 7: Sesiones del usuario
      const { data: userSessions } = await supabase
        .from("user_sessions")
        .select("count")
        .eq("user_id", user.id);

      results.userSessions = userSessions?.length || 0;

    } catch (error) {
      results.error = error.message;
    }

    setDebugInfo(results);
    setLoading(false);
  };

  React.useEffect(() => {
    if (user) {
      runTests();
    }
  }, [user]);

  if (!user) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>🚫 No hay usuario autenticado</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Ve a /auth para iniciar sesión primero.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            🔍 Debug del Dashboard
            <button
              onClick={runTests}
              disabled={loading}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm disabled:opacity-50"
            >
              {loading ? "Probando..." : "Probar de nuevo"}
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p>Ejecutando pruebas...</p>}
          {debugInfo && (
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>

      {debugInfo?.rpcFunction?.success && (
        <Card>
          <CardHeader>
            <CardTitle>✅ Estadísticas obtenidas correctamente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Sesiones totales:</strong> {debugInfo.rpcFunction.data.total_sessions}
              </div>
              <div>
                <strong>Sesiones completadas:</strong> {debugInfo.rpcFunction.data.completed_sessions}
              </div>
              <div>
                <strong>Preguntas respondidas:</strong> {debugInfo.rpcFunction.data.total_questions_answered}
              </div>
              <div>
                <strong>Precisión:</strong> {debugInfo.rpcFunction.data.overall_accuracy_percentage}%
              </div>
              <div>
                <strong>Puntos:</strong> {debugInfo.rpcFunction.data.points}
              </div>
              <div>
                <strong>Preguntas falladas:</strong> {debugInfo.rpcFunction.data.current_failed_questions}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

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

  // ACTIVAR DEBUG TEMPORALMENTE
  const DEBUG_MODE = true;
  
  if (DEBUG_MODE) {
    return (
      <main className="min-h-screen p-4 bg-background">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">🔧 Modo Debug Activado</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Cerrar Sesión
            </Button>
          </div>
          <DebugDashboard />
        </div>
      </main>
    );
  }

  // EL RESTO DEL CÓDIGO ORIGINAL DEL DASHBOARD...
  // (todo el código que ya tenías)

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

        {/* Rest of your original dashboard code... */}
        {/* Por brevedad, no incluyo todo el código original aquí */}
        
      </div>
    </main>
  );
};

export default Index;

