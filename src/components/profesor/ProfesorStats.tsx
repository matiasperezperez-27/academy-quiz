import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, GraduationCap, HelpCircle, CheckCircle, Clock, Users } from 'lucide-react';
import type { ProfesorStats as ProfesorStatsType } from '@/hooks/useProfesorData';

interface Props {
  stats: ProfesorStatsType | null;
  loading: boolean;
}

export default function ProfesorStats({ stats, loading }: Props) {
  if (loading) {
    return (
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No se pudieron cargar las estadísticas
        </CardContent>
      </Card>
    );
  }

  const cards = [
    { title: 'Academias', value: stats.total_academias, icon: GraduationCap, color: 'text-teal-600' },
    { title: 'Temas', value: stats.total_temas, icon: BookOpen, color: 'text-blue-600' },
    { title: 'Preguntas', value: stats.total_preguntas, icon: HelpCircle, color: 'text-purple-600' },
    { title: 'Verificadas', value: stats.preguntas_verificadas, icon: CheckCircle, color: 'text-green-600' },
    { title: 'Pendientes', value: stats.preguntas_pendientes, icon: Clock, color: 'text-amber-600' },
    { title: 'Estudiantes', value: stats.total_estudiantes, icon: Users, color: 'text-pink-600' },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
      {cards.map((c, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{c.title}</CardTitle>
            <c.icon className={`h-4 w-4 ${c.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{c.value?.toLocaleString() ?? 0}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
