import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Target, BookOpen, TrendingUp } from 'lucide-react';
import { useProfesorStudentStats } from '@/hooks/useProfesorStudentStats';
import type { ProfesorAcademia } from '@/hooks/useProfesorData';

interface Props {
  profesorId: string;
  academias: ProfesorAcademia[];
}

function accuracyColors(acc: number) {
  if (acc >= 80) return { text: 'text-green-600 dark:text-green-400', bar: 'bg-green-500', borderColor: '#34d399' };
  if (acc >= 60) return { text: 'text-amber-600 dark:text-amber-400', bar: 'bg-amber-500', borderColor: '#fbbf24' };
  return { text: 'text-red-600 dark:text-red-400', bar: 'bg-red-500', borderColor: '#f87171' };
}

const RANK_MEDAL = ['🥇', '🥈', '🥉'];

export default function EstadisticasEstudiantes({ profesorId, academias }: Props) {
  const { studentStats, topicStats, loading, cargar } = useProfesorStudentStats(profesorId);
  const [academiaId, setAcademiaId] = useState('__all__');

  useEffect(() => {
    cargar(academiaId === '__all__' ? undefined : academiaId);
  }, [cargar, academiaId]);

  const totalStudents = studentStats.length;
  const avgAccuracy = totalStudents > 0
    ? studentStats.reduce((s, x) => s + x.accuracy, 0) / totalStudents
    : 0;
  const totalSessions = studentStats.reduce((s, x) => s + x.total_sessions, 0);
  const totalAnswered = studentStats.reduce((s, x) => s + x.total_answered, 0);

  const summaryKpis = [
    { label: 'Alumnos',      value: String(totalStudents),                icon: Users,      colorClass: 'text-teal-600 dark:text-teal-400',    bg: 'bg-teal-100 dark:bg-teal-900/40'    },
    { label: 'Acierto med.', value: `${avgAccuracy.toFixed(1)}%`,         icon: Target,     colorClass: 'text-green-600 dark:text-green-400',   bg: 'bg-green-100 dark:bg-green-900/40'  },
    { label: 'Sesiones',     value: String(totalSessions),                icon: TrendingUp, colorClass: 'text-blue-600 dark:text-blue-400',     bg: 'bg-blue-100 dark:bg-blue-900/40'    },
    { label: 'Respondidas',  value: totalAnswered.toLocaleString(),        icon: BookOpen,   colorClass: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/40' },
  ];

  return (
    <div className="space-y-4">

      {/* Toolbar */}
      <Select value={academiaId} onValueChange={setAcademiaId}>
        <SelectTrigger className="w-full sm:w-64">
          <SelectValue placeholder="Todas las academias" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Todas las academias</SelectItem>
          {academias.map(a => (
            <SelectItem key={a.academia_id} value={a.academia_id}>{a.academia_nombre}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* KPI strip */}
      {!loading && totalStudents > 0 && (
        <Card>
          <CardContent className="p-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
              {summaryKpis.map((k, i) => (
                <div key={i} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className={`w-7 h-7 rounded-full ${k.bg} flex items-center justify-center flex-shrink-0`}>
                    <k.icon className={`h-3.5 w-3.5 ${k.colorClass}`} />
                  </div>
                  <div>
                    <p className="text-sm font-bold leading-none tabular-nums">{k.value}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{k.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="estudiantes">
        <TabsList className="w-full">
          <TabsTrigger value="estudiantes" className="flex-1">Por alumno</TabsTrigger>
          <TabsTrigger value="temas" className="flex-1">Por tema</TabsTrigger>
        </TabsList>

        {/* Tab: Alumnos */}
        <TabsContent value="estudiantes" className="mt-3">
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 rounded-xl border animate-pulse bg-muted/50" />
              ))}
            </div>
          ) : studentStats.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay datos de alumnos todavía</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {studentStats.map((s, idx) => {
                const acc = accuracyColors(s.accuracy);
                return (
                  <div
                    key={s.user_id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-card hover:shadow-sm transition-shadow"
                  >
                    <span className="text-sm w-6 text-center flex-shrink-0 font-medium">
                      {RANK_MEDAL[idx] ?? <span className="text-muted-foreground text-xs">{idx + 1}</span>}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.username || 'Sin nombre'}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{s.email}</p>
                    </div>
                    <div className="hidden sm:flex flex-col items-end gap-1 w-24 flex-shrink-0">
                      <span className={`text-xs font-bold ${acc.text}`}>{s.accuracy.toFixed(1)}%</span>
                      <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${acc.bar}`} style={{ width: `${s.accuracy}%` }} />
                      </div>
                    </div>
                    <div className="flex flex-col items-end text-xs text-muted-foreground flex-shrink-0 gap-0.5">
                      <span className={`font-bold sm:hidden ${acc.text}`}>{s.accuracy.toFixed(1)}%</span>
                      <span>{s.total_sessions} ses.</span>
                      <span>{s.puntos.toLocaleString()} pts</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab: Temas */}
        <TabsContent value="temas" className="mt-3">
          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 rounded-xl border animate-pulse bg-muted/50" />
              ))}
            </div>
          ) : topicStats.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
              <BookOpen className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay datos de temas todavía</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {topicStats.map(t => {
                const acc = accuracyColors(t.avg_accuracy);
                return (
                  <div
                    key={t.tema_id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-l-4 bg-card hover:shadow-sm transition-shadow"
                    style={{ borderLeftColor: acc.borderColor }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.tema_nombre}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[11px] text-muted-foreground">{t.academia_nombre}</span>
                        <span className="text-[11px] text-muted-foreground">·</span>
                        <span className="text-[11px] text-muted-foreground">{t.total_estudiantes} alumnos</span>
                        <span className="text-[11px] text-muted-foreground">·</span>
                        <span className="text-[11px] text-muted-foreground">{t.total_sesiones} ses.</span>
                        <span className="text-[11px] text-muted-foreground">·</span>
                        <span className="text-[11px] text-muted-foreground">{t.total_preguntas_contestadas.toLocaleString()} resp.</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 w-20 flex-shrink-0">
                      <span className={`text-sm font-bold ${acc.text}`}>{t.avg_accuracy.toFixed(1)}%</span>
                      <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${acc.bar}`} style={{ width: `${t.avg_accuracy}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
