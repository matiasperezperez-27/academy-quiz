import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useProfesorStudentStats } from '@/hooks/useProfesorStudentStats';
import type { ProfesorAcademia } from '@/hooks/useProfesorData';

interface Props {
  profesorId: string;
  academias: ProfesorAcademia[];
}

export default function EstadisticasEstudiantes({ profesorId, academias }: Props) {
  const { studentStats, topicStats, loading, cargar } = useProfesorStudentStats(profesorId);
  const [academiaId, setAcademiaId] = useState('__all__');

  useEffect(() => {
    cargar(academiaId === '__all__' ? undefined : academiaId);
  }, [cargar, academiaId]);

  const accuracyColor = (acc: number) => {
    if (acc >= 80) return 'text-green-600';
    if (acc >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <Select value={academiaId} onValueChange={setAcademiaId}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Todas las academias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas</SelectItem>
              {academias.map(a => (
                <SelectItem key={a.academia_id} value={a.academia_id}>
                  {a.academia_nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Tabs defaultValue="estudiantes">
        <TabsList className="w-full">
          <TabsTrigger value="estudiantes" className="flex-1">Por Estudiante</TabsTrigger>
          <TabsTrigger value="temas" className="flex-1">Por Tema</TabsTrigger>
        </TabsList>

        <TabsContent value="estudiantes" className="mt-4">
          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          ) : studentStats.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No hay datos de estudiantes todavía
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Estudiante</TableHead>
                      <TableHead className="text-right">Sesiones</TableHead>
                      <TableHead className="text-right">Respondidas</TableHead>
                      <TableHead className="text-right">Aciertos</TableHead>
                      <TableHead className="text-right">Puntos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentStats.map(s => (
                      <TableRow key={s.user_id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{s.username || 'Sin nombre'}</p>
                            <p className="text-xs text-muted-foreground">{s.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm">{s.total_sessions}</TableCell>
                        <TableCell className="text-right text-sm">{s.total_answered}</TableCell>
                        <TableCell className="text-right">
                          <span className={`text-sm font-medium ${accuracyColor(s.accuracy)}`}>
                            {s.accuracy.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm">{s.puntos.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="temas" className="mt-4">
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : topicStats.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No hay datos de temas todavía
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {topicStats.map(t => (
                <Card key={t.tema_id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{t.tema_nombre}</p>
                        <p className="text-xs text-muted-foreground">{t.academia_nombre}</p>
                        <div className="flex gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                          <span>{t.total_sesiones} sesiones</span>
                          <span>{t.total_estudiantes} estudiantes</span>
                          <span>{t.total_preguntas_contestadas.toLocaleString()} respuestas</span>
                        </div>
                      </div>
                      <Badge
                        className={`text-sm font-semibold ${
                          t.avg_accuracy >= 80
                            ? 'bg-green-100 text-green-700'
                            : t.avg_accuracy >= 60
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {t.avg_accuracy.toFixed(1)}%
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
