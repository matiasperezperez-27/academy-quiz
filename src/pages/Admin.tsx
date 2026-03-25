import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import AdminStats from '@/components/admin/AdminStats';
import UsersList from '@/components/admin/UsersList';
import ResetProgress from '@/components/admin/ResetProgress';
import ProfesorManager from '@/components/admin/ProfesorManager';
import { Shield, ArrowLeft } from 'lucide-react';

function setSEO(title: string, description: string) {
  document.title = title;
  const meta = document.querySelector('meta[name="description"]') || document.createElement("meta");
  meta.setAttribute("name", "description");
  meta.setAttribute("content", description);
  document.head.appendChild(meta);
}

export default function Admin() {
  const { user } = useAuth();
  const { isAdmin, loading } = useAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    setSEO("Panel de Administración | Academy Quiz", "Panel de control para administradores");
  }, []);

  useEffect(() => {
    // Añadir un delay para evitar redirects prematuros
    const timer = setTimeout(() => {
      if (!loading && !user) {
        toast({
          title: "Acceso denegado",
          description: "Debes iniciar sesión para acceder al panel de administración",
          variant: "destructive"
        });
        navigate("/", { replace: true });
        return;
      }

      if (!loading && user && !isAdmin) {
        toast({
          title: "Acceso denegado", 
          description: "No tienes permisos de administrador",
          variant: "destructive"
        });
        navigate("/", { replace: true });
      }
    }, 500); // Delay de 500ms para que se estabilice el auth

    return () => clearTimeout(timer);
  }, [user, isAdmin, loading, navigate, toast]);

  if (loading) {
    return (
      <main className="min-h-screen p-4 flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">Verificando permisos...</p>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!isAdmin) {
    return null; // El useEffect ya maneja la redirección
  }

  return (
    <main className="min-h-screen p-4 bg-background">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al Inicio
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Shield className="h-8 w-8 text-primary" />
                Panel de Administración
              </h1>
              <p className="text-muted-foreground">Gestión y control del sistema</p>
            </div>
          </div>
        </div>

        {/* Estadísticas Generales */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Estadísticas Generales</h2>
          <AdminStats />
        </section>

        {/* Grid de herramientas */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Reset de Progreso */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Gestión de Usuarios</h2>
            <ResetProgress />
          </section>

          {/* Acciones rápidas */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Acciones Rápidas</h2>
            <Card>
              <CardHeader>
                <CardTitle>Herramientas de Admin</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
                >
                  🗄️ Abrir Panel de Supabase
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate("/test-setup")}
                >
                  🧪 Probar Quiz
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.location.reload()}
                >
                  🔄 Recargar Datos
                </Button>
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Gestión de Profesores */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Gestión de Profesores</h2>
          <ProfesorManager />
        </section>

        {/* Lista de Usuarios */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Usuarios del Sistema</h2>
          <UsersList />
        </section>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground py-4">
          Panel de administración • Academy Quiz • {new Date().getFullYear()}
        </div>
      </div>
    </main>
  );
}