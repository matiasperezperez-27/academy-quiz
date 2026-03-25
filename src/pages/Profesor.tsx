import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProfesor } from '@/hooks/useProfesor';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useProfesorData } from '@/hooks/useProfesorData';
import ProfesorStats from '@/components/profesor/ProfesorStats';
import ProfesorAcademias from '@/components/profesor/ProfesorAcademias';
import VerificacionPreguntas from '@/components/profesor/VerificacionPreguntas';
import GestionPreguntas from '@/components/profesor/GestionPreguntas';
import GestionTemas from '@/components/profesor/GestionTemas';
import CrearExamen from '@/components/profesor/CrearExamen';
import EstadisticasEstudiantes from '@/components/profesor/EstadisticasEstudiantes';
import { GraduationCap, ArrowLeft } from 'lucide-react';

function setSEO(title: string, description: string) {
  document.title = title;
  const meta = document.querySelector('meta[name="description"]') || document.createElement('meta');
  meta.setAttribute('name', 'description');
  meta.setAttribute('content', description);
  document.head.appendChild(meta);
}

export default function Profesor() {
  const { user } = useAuth();
  const { isProfesor, loading } = useProfesor();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { stats, academias, loading: dataLoading, refresh } = useProfesorData(user?.id);

  useEffect(() => {
    setSEO('Panel del Profesor | Academy Quiz', 'Panel de gestión para profesores');
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!loading && !user) {
        toast({
          title: 'Acceso denegado',
          description: 'Debes iniciar sesión para acceder al panel del profesor',
          variant: 'destructive',
        });
        navigate('/', { replace: true });
        return;
      }
      if (!loading && user && !isProfesor) {
        toast({
          title: 'Acceso denegado',
          description: 'No tienes permisos de profesor',
          variant: 'destructive',
        });
        navigate('/', { replace: true });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [user, isProfesor, loading, navigate, toast]);

  if (loading) {
    return (
      <main className="min-h-screen p-4 flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mx-auto"></div>
              <p className="text-muted-foreground">Verificando permisos...</p>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!isProfesor) return null;

  return (
    <main className="min-h-screen p-4 bg-background">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <GraduationCap className="h-8 w-8 text-teal-500" />
              Panel del Profesor
            </h1>
            <p className="text-muted-foreground text-sm">Gestión de contenido y seguimiento de alumnos</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="dashboard">
          <TabsList className="w-full grid grid-cols-3 sm:grid-cols-6 h-auto">
            <TabsTrigger value="dashboard" className="text-xs sm:text-sm">Inicio</TabsTrigger>
            <TabsTrigger value="verificar" className="text-xs sm:text-sm">Verificar</TabsTrigger>
            <TabsTrigger value="preguntas" className="text-xs sm:text-sm">Preguntas</TabsTrigger>
            <TabsTrigger value="temas" className="text-xs sm:text-sm">Temas</TabsTrigger>
            <TabsTrigger value="examenes" className="text-xs sm:text-sm">Exámenes</TabsTrigger>
            <TabsTrigger value="alumnos" className="text-xs sm:text-sm">Alumnos</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6 mt-6">
            <ProfesorStats stats={stats} loading={dataLoading} />
            <ProfesorAcademias academias={academias} loading={dataLoading} />
          </TabsContent>

          <TabsContent value="verificar" className="mt-6">
            <VerificacionPreguntas profesorId={user!.id} academias={academias} />
          </TabsContent>

          <TabsContent value="preguntas" className="mt-6">
            <GestionPreguntas profesorId={user!.id} academias={academias} onRefresh={refresh} />
          </TabsContent>

          <TabsContent value="temas" className="mt-6">
            <GestionTemas profesorId={user!.id} academias={academias} onRefresh={refresh} />
          </TabsContent>

          <TabsContent value="examenes" className="mt-6">
            <CrearExamen profesorId={user!.id} academias={academias} />
          </TabsContent>

          <TabsContent value="alumnos" className="mt-6">
            <EstadisticasEstudiantes profesorId={user!.id} academias={academias} />
          </TabsContent>
        </Tabs>

        <div className="text-center text-sm text-muted-foreground py-4">
          Panel del Profesor • Academy Quiz • {new Date().getFullYear()}
        </div>
      </div>
    </main>
  );
}
