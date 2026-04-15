import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BookOpen, GraduationCap, HelpCircle, CheckCircle, Clock, Users } from 'lucide-react';
import type { ProfesorStats as ProfesorStatsType } from '@/hooks/useProfesorData';

interface Props {
  stats: ProfesorStatsType | null;
  loading: boolean;
}

export default function ProfesorStats({ stats, loading }: Props) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="animate-pulse space-y-3">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
            <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-full" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 border-t pt-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 animate-pulse">
                <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="h-5 w-10 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const verPct =
    stats.total_preguntas > 0
      ? Math.round((stats.preguntas_verificadas / stats.total_preguntas) * 100)
      : 0;

  const barColor =
    verPct >= 70
      ? 'text-teal-600 dark:text-teal-400'
      : verPct >= 30
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-red-600 dark:text-red-400';

  const kpis = [
    { label: 'Academias',  value: stats.total_academias,        icon: GraduationCap, bg: 'bg-teal-100 dark:bg-teal-900/40',   color: 'text-teal-600 dark:text-teal-400'   },
    { label: 'Temas',      value: stats.total_temas,            icon: BookOpen,      bg: 'bg-blue-100 dark:bg-blue-900/40',    color: 'text-blue-600 dark:text-blue-400'   },
    { label: 'Preguntas',  value: stats.total_preguntas,        icon: HelpCircle,    bg: 'bg-purple-100 dark:bg-purple-900/40',color: 'text-purple-600 dark:text-purple-400'},
    { label: 'Verificadas',value: stats.preguntas_verificadas,  icon: CheckCircle,   bg: 'bg-green-100 dark:bg-green-900/40',  color: 'text-green-600 dark:text-green-400' },
    { label: 'Pendientes', value: stats.preguntas_pendientes,   icon: Clock,         bg: 'bg-amber-100 dark:bg-amber-900/40',  color: 'text-amber-600 dark:text-amber-400' },
    { label: 'Alumnos',    value: stats.total_estudiantes,      icon: Users,         bg: 'bg-pink-100 dark:bg-pink-900/40',    color: 'text-pink-600 dark:text-pink-400'   },
  ];

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Verification health */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Verificación global
            </span>
            <span className={`text-sm font-bold ${barColor}`}>{verPct}%</span>
          </div>
          <Progress value={verPct} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1.5">
            <span className="text-green-600 dark:text-green-400 font-medium">{stats.preguntas_verificadas.toLocaleString()} verificadas</span>
            {' · '}
            <span className="text-amber-600 dark:text-amber-400 font-medium">{stats.preguntas_pendientes.toLocaleString()} pendientes</span>
            {' · '}
            {stats.total_preguntas.toLocaleString()} totales
          </p>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 border-t pt-3">
          {kpis.map((k, i) => (
            <div key={i} className="flex flex-col items-center text-center px-1 py-1.5 rounded-lg hover:bg-muted/50 transition-colors">
              <div className={`w-7 h-7 rounded-full ${k.bg} flex items-center justify-center mb-1.5`}>
                <k.icon className={`h-3.5 w-3.5 ${k.color}`} />
              </div>
              <span className="text-lg font-bold leading-none tabular-nums">
                {(k.value ?? 0).toLocaleString()}
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{k.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
