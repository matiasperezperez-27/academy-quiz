import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { GraduationCap } from 'lucide-react';
import type { ProfesorAcademia } from '@/hooks/useProfesorData';

interface Props {
  academias: ProfesorAcademia[];
  loading: boolean;
}

export default function ProfesorAcademias({ academias, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!academias.length) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No tienes academias asignadas
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Mis Academias</h2>
      {academias.map((a) => {
        const pct =
          a.total_preguntas > 0
            ? Math.round((a.preguntas_verificadas / a.total_preguntas) * 100)
            : 0;
        return (
          <Card key={a.academia_id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <GraduationCap className="h-5 w-5 text-teal-500" />
                {a.academia_nombre}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>{a.total_temas} temas</span>
                <span>{a.total_preguntas.toLocaleString()} preguntas</span>
                <span className="text-amber-600">{a.preguntas_pendientes.toLocaleString()} pendientes</span>
                <span className="text-green-600">{a.preguntas_verificadas.toLocaleString()} verificadas</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progreso de verificación</span>
                  <span>{pct}%</span>
                </div>
                <Progress value={pct} className="h-2" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
