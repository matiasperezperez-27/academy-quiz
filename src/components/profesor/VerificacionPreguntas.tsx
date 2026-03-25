import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { useVerificacion, type PreguntaParaVerificar } from '@/hooks/useVerificacion';
import { useGestionPreguntas, type PreguntaForm } from '@/hooks/useGestionPreguntas';
import { supabase } from '@/integrations/supabase/client';
import type { ProfesorAcademia } from '@/hooks/useProfesorData';

interface Props {
  profesorId: string;
  academias: ProfesorAcademia[];
}

const PAGE_SIZE = 10;
const SOLUCIONES = ['A', 'B', 'C', 'D'] as const;

export default function VerificacionPreguntas({ profesorId, academias }: Props) {
  const { preguntas, loading, cargar, verificar } = useVerificacion(profesorId);
  const { saving, guardar } = useGestionPreguntas(profesorId);

  const [academiaId, setAcademiaId] = useState('__all__');
  const [temaId, setTemaId] = useState('__all__');
  const [estado, setEstado] = useState('pendiente');
  const [temas, setTemas] = useState<{ id: string; nombre: string }[]>([]);
  const [page, setPage] = useState(0);
  const [procesando, setProcesando] = useState<string | null>(null);

  // Edit dialog state
  const [editando, setEditando] = useState<PreguntaParaVerificar | null>(null);
  const [form, setForm] = useState<PreguntaForm | null>(null);

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
    const ok = await verificar(preguntaId, accion);
    if (ok) recargar();
    setProcesando(null);
  };

  const abrirEdicion = (p: PreguntaParaVerificar) => {
    setEditando(p);
    setForm({
      id: p.id,
      academia_id: p.academia_id,
      tema_id: p.tema_id,
      parte: p.parte || '',
      pregunta_texto: p.pregunta_texto,
      opcion_a: p.opcion_a,
      opcion_b: p.opcion_b,
      opcion_c: p.opcion_c || '',
      opcion_d: p.opcion_d || '',
      solucion_letra: p.solucion_letra,
    });
  };

  const handleGuardar = async () => {
    if (!form) return;
    const id = await guardar(form);
    if (id) {
      setEditando(null);
      setForm(null);
      recargar();
    }
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
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex flex-wrap gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">{p.academia_nombre}</Badge>
                        <Badge variant="outline" className="text-xs">{p.tema_nombre}</Badge>
                        {p.parte && <Badge variant="outline" className="text-xs">{p.parte}</Badge>}
                      </div>
                      <CardTitle className="text-base font-medium leading-snug">
                        {p.pregunta_texto}
                      </CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-shrink-0 text-muted-foreground hover:text-teal-600"
                      onClick={() => abrirEdicion(p)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
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
                    <div className="flex gap-2 pt-2 border-t">
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
                  )}

                  {estado !== 'pendiente' && p.verificacion_notas && (
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
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">Página {page + 1}</span>
            <Button variant="outline" size="sm" disabled={preguntas.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialog de edición */}
      <Dialog open={!!editando} onOpenChange={open => { if (!open) { setEditando(null); setForm(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Pregunta</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Parte (opcional)</Label>
                <Input
                  value={form.parte || ''}
                  onChange={e => setForm(f => f && ({ ...f, parte: e.target.value }))}
                  placeholder="ej. Parte 1, Bloque A..."
                />
              </div>

              <div className="space-y-2">
                <Label>Pregunta</Label>
                <Textarea
                  value={form.pregunta_texto}
                  onChange={e => setForm(f => f && ({ ...f, pregunta_texto: e.target.value }))}
                  className="h-24"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(['opcion_a', 'opcion_b', 'opcion_c', 'opcion_d'] as const).map((key, i) => (
                  <div key={key} className="space-y-1">
                    <Label>Opción {SOLUCIONES[i]}{i >= 2 ? ' (opcional)' : ''}</Label>
                    <Input
                      value={(form as any)[key] || ''}
                      onChange={e => setForm(f => f && ({ ...f, [key]: e.target.value }))}
                      placeholder={`Opción ${SOLUCIONES[i]}`}
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Respuesta correcta</Label>
                <Select
                  value={form.solucion_letra}
                  onValueChange={v => setForm(f => f && ({ ...f, solucion_letra: v }))}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOLUCIONES.map(s => (
                      <SelectItem key={s} value={s}>Opción {s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <p className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded p-2">
                Al guardar la edición, la pregunta volverá a estado <strong>pendiente</strong> para ser reverificada.
              </p>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => { setEditando(null); setForm(null); }}>
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-teal-600 hover:bg-teal-700"
                  disabled={saving || !form.pregunta_texto || !form.opcion_a || !form.opcion_b}
                  onClick={handleGuardar}
                >
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
