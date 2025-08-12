import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export default function DebugDashboard() {
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