import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, HelpCircle, BookOpen } from 'lucide-react';
import type { ProfesorAcademia } from '@/hooks/useProfesorData';

interface Props {
  academias: ProfesorAcademia[];
  loading: boolean;
}

function getColors(pct: number) {
  if (pct >= 70) return {
    border: 'border-l-teal-400',
    text: 'text-teal-600 dark:text-teal-400',
    bar: '[&>div]:bg-teal-500',
  };
  if (pct >= 30) return {
    border: 'border-l-amber-400',
    text: 'text-amber-600 dark:text-amber-400',
    bar: '[&>div]:bg-amber-500',
  };
  return {
    border: 'border-l-red-400',
    text: 'text-red-600 dark:text-red-400',
    bar: '[&>div]:bg-red-500',
  };
}

export default function ProfesorAcademias({ academias, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-xl border border-l-4 border-l-gray-300 bg-card p-4 space-y-3 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded w-full" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (!academias.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No tienes academias asignadas
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Mis academias
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {academias.map((a) => {
          const pct =
            a.total_preguntas > 0
              ? Math.round((a.preguntas_verificadas / a.total_preguntas) * 100)
              : 0;
          const rechazadas = Math.max(
            0,
            a.total_preguntas - a.preguntas_verificadas - a.preguntas_pendientes
          );
          const colors = getColors(pct);

          return (
            <div
              key={a.academia_id}
              className={`rounded-xl border border-l-4 ${colors.border} bg-card p-4 space-y-3`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-sm leading-tight">{a.academia_nombre}</h3>
                <span className={`text-sm font-bold flex-shrink-0 ${colors.text}`}>{pct}%</span>
              </div>

              {/* Progress bar */}
              <Progress value={pct} className={`h-1.5 ${colors.bar}`} />

              {/* Meta row */}
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />{a.total_temas} temas
                </span>
                <span className="flex items-center gap-1">
                  <HelpCircle className="h-3 w-3" />{a.total_preguntas.toLocaleString()} preguntas
                </span>
              </div>

              {/* Status chips */}
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="flex items-center gap-1 font-medium text-green-600 dark:text-green-400">
                  <CheckCircle className="h-3 w-3" />
                  {a.preguntas_verificadas.toLocaleString()} verif.
                </span>
                <span className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                  <Clock className="h-3 w-3" />
                  {a.preguntas_pendientes.toLocaleString()} pend.
                </span>
                {rechazadas > 0 && (
                  <span className="text-red-500 font-medium">
                    ✗ {rechazadas.toLocaleString()} rech.
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
