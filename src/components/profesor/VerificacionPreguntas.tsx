import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useVerificacion } from '@/hooks/useVerificacion';
import { supabase } from '@/integrations/supabase/client';
import type { ProfesorAcademia } from '@/hooks/useProfesorData';

interface Props {
  profesorId: string;
  academias: ProfesorAcademia[];
}

const PAGE_SIZE = 10;

const OPCIONES = ['A', 'B', 'C', 'D'] as const;

export default function VerificacionPreguntas({ profesorId, academias }: Props) {
  const { preguntas, loading, cargar, verificar } = useVerificacion(profesorId);
  const [academiaId, setAcademiaId] = useState('__all__');
  const [temaId, setTemaId] = useState('__all__');
  const [estado, setEstado] = useState('pendiente');
  const [temas, setTemas] = useState<{ id: string; nombre: string }[]>([]);
  const [page, setPage] = useState(0);
  const [notas, setNotas] = useState<Record<string, string>>({});
  const [procesando, setProcesando] = useState<string | null>(null);

  const recargar = useCallback(() => {
    cargar({
      academia_id: academiaId === '__all__' ? undefined : academiaId,
      tema_id: temaId === '__all__' ? undefined : temaId,
      estado,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    });
  }, [cargar, academiaId, temaId, estado, page]);

  useEffect(() => {
    if (academiaId && academiaId !== '__all__') {
      supabase
        .from('temas')
        .select('id, nombre')
        .eq('academia_id', academiaId)
        .order('nombre')
        .then(({ data }) => setTemas(data || []));
      setTemaId('__all__');
    } else {
      setTemas([]);
      setTemaId('__all__');
    }
  }, [academiaId]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  const handleAccion = async (preguntaId: string, accion: 'verificar' | 'rechazar') => {
    setProcesando(preguntaId);
    const ok = await verificar(preguntaId, accion, notas[preguntaId]);
    if (ok) recargar();
    setProcesando(null);
  };

  const estadoLabel: Record<string, string> = {
    pendiente: 'pendientes de revisión',
    verificada: 'verificadas',
    rechazada: 'rechazadas',
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={academiaId} onValueChange={v => { setAcademiaId(v); setPage(0); }}>
              <SelectTrigger className="flex-1">
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

            {temas.length > 0 && (
              <Select value={temaId} onValueChange={v => { setTemaId(v); setPage(0); }}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Todos los temas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {temas.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={estado} onValueChange={v => { setEstado(v); setPage(0); }}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendiente">Pendientes</SelectItem>
                <SelectItem value="verificada">Verificadas</SelectItem>
                <SelectItem value="rechazada">Rechazadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : preguntas.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No hay preguntas {estadoLabel[estado] ?? estado}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {preguntas.map(p => {
            const opciones: Array<[string, string | null]> = [
              ['A', p.opcion_a],
              ['B', p.opcion_b],
              ['C', p.opcion_c],
              ['D', p.opcion_d],
            ];
            return (
              <Card key={p.id} className="border-l-4 border-l-amber-400">
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">{p.academia_nombre}</Badge>
                    <Badge variant="outline" className="text-xs">{p.tema_nombre}</Badge>
                    {p.parte && <Badge variant="outline" className="text-xs">{p.parte}</Badge>}
                  </div>
                  <CardTitle className="text-base font-medium leading-snug">
                    {p.pregunta_texto}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {opciones.filter(([, v]) => v).map(([letra, texto]) => (
                      <div
                        key={letra}
                        className={`p-2 rounded border text-sm flex gap-2 ${
                          p.solucion_letra === letra
                            ? 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-700'
                            : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <span className={`font-bold flex-shrink-0 ${p.solucion_letra === letra ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {letra}.
                        </span>
                        <span>{texto}</span>
                      </div>
                    ))}
                  </div>

                  {estado === 'pendiente' && (
                    <div className="space-y-2 pt-2 border-t">
                      <Textarea
                        placeholder="Notas de verificación (opcional)"
                        value={notas[p.id] || ''}
                        onChange={e => setNotas(prev => ({ ...prev, [p.id]: e.target.value }))}
                        className="text-sm h-16 resize-none"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          disabled={procesando === p.id}
                          onClick={() => handleAccion(p.id, 'verificar')}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Verificar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                          disabled={procesando === p.id}
                          onClick={() => handleAccion(p.id, 'rechazar')}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Rechazar
                        </Button>
                      </div>
                    </div>
                  )}

                  {p.verificacion_notas && (
                    <p className="text-xs text-muted-foreground italic border-t pt-2">
                      Nota: {p.verificacion_notas}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Paginación */}
          <div className="flex justify-center items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">Página {page + 1}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={preguntas.length < PAGE_SIZE}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
