import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Pencil, GraduationCap, Trophy, Filter } from 'lucide-react';
import { useVerificacion, type PreguntaParaVerificar } from '@/hooks/useVerificacion';
import { useGestionPreguntas, type PreguntaForm } from '@/hooks/useGestionPreguntas';
import PreguntaFormDialog from '@/components/profesor/PreguntaFormDialog';
import { supabase } from '@/integrations/supabase/client';
import type { ProfesorAcademia } from '@/hooks/useProfesorData';

interface FilterCounts {
  pendientes: number;
  verificadas: number;
  rechazadas: number;
  total: number;
}

interface TemaStats {
  id: string;
  nombre: string;
  pendientes: number;
  verificadas: number;
  rechazadas: number;
  total: number;
}

function getProgressColor(pct: number) {
  if (pct >= 70) return { border: 'border-teal-400', bar: 'bg-teal-500', text: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-900/20' };
  if (pct >= 30) return { border: 'border-amber-400', bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' };
  return { border: 'border-red-400', bar: 'bg-red-500', text: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' };
}

function temaIcon(pct: number) {
  if (pct === 100) return '🏆';
  if (pct >= 70) return '✅';
  if (pct >= 30) return '🔄';
  if (pct > 0)   return '🔴';
  return '⭕';
}

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
  const [filterCounts, setFilterCounts] = useState<FilterCounts | null>(null);
  const [expandedAcademia, setExpandedAcademia] = useState<string | null>(null);
  const [temaStatsMap, setTemaStatsMap] = useState<Record<string, TemaStats[]>>({});
  const [loadingTemas, setLoadingTemas] = useState<string | null>(null);

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
      // No reseteamos temaId aquí: si el cambio vino de un chip ya tiene el tema correcto.
      // El reset lo hace el onValueChange del Select de academia.
    } else {
      setTemas([]);
      setTemaId('__all__');
    }
  }, [academiaId]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  // Carga conteos pendiente/verificada/rechazada para el filtro activo
  useEffect(() => {
    if (!academias.length) return;
    const load = async () => {
      const ids = academias.map(a => a.academia_id);
      const base = () => {
        let q = supabase.from('preguntas').select('*', { count: 'exact', head: true });
        if (academiaId !== '__all__') q = q.eq('academia_id', academiaId);
        else q = q.in('academia_id', ids);
        if (temaId !== '__all__') q = q.eq('tema_id', temaId);
        return q;
      };
      const [pendRes, verRes, rechRes] = await Promise.all([
        base().eq('verificada', false).eq('rechazada', false),
        base().eq('verificada', true),
        base().eq('rechazada', true),
      ]);
      const pendientes = pendRes.count ?? 0;
      const verificadas = verRes.count ?? 0;
      const rechazadas = rechRes.count ?? 0;
      setFilterCounts({ pendientes, verificadas, rechazadas, total: pendientes + verificadas + rechazadas });
    };
    load();
  }, [academiaId, temaId, academias]);

  const handleAccion = async (preguntaId: string, accion: 'verificar' | 'rechazar') => {
    setProcesando(preguntaId);
    const ok = await verificar(preguntaId, accion);
    if (ok) recargar();
    setProcesando(null);
  };

  const loadTemaStats = useCallback(async (acaId: string) => {
    if (temaStatsMap[acaId]) return; // already loaded
    setLoadingTemas(acaId);
    try {
      const { data: temaList } = await supabase.from('temas').select('id, nombre').eq('academia_id', acaId).order('nombre');
      if (!temaList || temaList.length === 0) { setTemaStatsMap(prev => ({ ...prev, [acaId]: [] })); return; }
      const results = await Promise.all(
        temaList.map(async t => {
          const base = () => supabase.from('preguntas').select('*', { count: 'exact', head: true }).eq('tema_id', t.id);
          const [pend, ver, rech] = await Promise.all([
            base().eq('verificada', false).eq('rechazada', false),
            base().eq('verificada', true),
            base().eq('rechazada', true),
          ]);
          const pendientes = pend.count ?? 0;
          const verificadas = ver.count ?? 0;
          const rechazadas = rech.count ?? 0;
          return { id: t.id, nombre: t.nombre, pendientes, verificadas, rechazadas, total: pendientes + verificadas + rechazadas } as TemaStats;
        })
      );
      // Sort: incomplete first (by % ascending), complete at bottom
      results.sort((a, b) => {
        const pctA = a.total > 0 ? a.verificadas / a.total : 0;
        const pctB = b.total > 0 ? b.verificadas / b.total : 0;
        if (pctA === 1 && pctB !== 1) return 1;
        if (pctB === 1 && pctA !== 1) return -1;
        return pctA - pctB;
      });
      setTemaStatsMap(prev => ({ ...prev, [acaId]: results }));
    } finally {
      setLoadingTemas(null);
    }
  }, [temaStatsMap]);

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
      explicacion_a: p.explicacion_a || null,
      explicacion_b: p.explicacion_b || null,
      explicacion_c: p.explicacion_c || null,
      explicacion_d: p.explicacion_d || null,
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

  const selectedAcademiaName = academias.find(a => a.academia_id === academiaId)?.academia_nombre;
  const selectedTemaName = temas.find(t => t.id === temaId)?.nombre;

  return (
    <div className="space-y-4">

      {/* Mini-dashboard por academia */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {academias.map(a => {
          const pct = a.total_preguntas > 0 ? Math.round((a.preguntas_verificadas / a.total_preguntas) * 100) : 0;
          const rechazadas = Math.max(0, a.total_preguntas - a.preguntas_verificadas - a.preguntas_pendientes);
          const colors = getProgressColor(pct);
          const isActive = academiaId === a.academia_id;
          const isExpanded = expandedAcademia === a.academia_id;
          const temaStats = temaStatsMap[a.academia_id];
          return (
            <Card
              key={a.academia_id}
              className={`border-l-4 transition-all duration-200 hover:shadow-md ${colors.border} ${isActive ? `${colors.bg} ring-2 ring-offset-1 ${colors.border.replace('border', 'ring')}` : ''}`}
            >
              <CardContent className="p-4 space-y-2">
                {/* Header row: filter click + expand toggle */}
                <div className="flex items-center gap-2">
                  <button
                    className="flex-1 flex items-center justify-between gap-2 text-left"
                    onClick={() => { setAcademiaId(isActive ? '__all__' : a.academia_id); setTemaId('__all__'); setPage(0); }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <GraduationCap className={`h-4 w-4 flex-shrink-0 ${colors.text}`} />
                      <span className="font-semibold text-sm truncate">{a.academia_nombre}</span>
                    </div>
                    <span className={`text-sm font-bold flex-shrink-0 ${colors.text}`}>{pct}%</span>
                  </button>
                  <button
                    className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors border ${isExpanded ? 'bg-teal-100 dark:bg-teal-900/40 border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300' : 'bg-muted border-border text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                    onClick={() => {
                      if (!isExpanded) loadTemaStats(a.academia_id);
                      setExpandedAcademia(isExpanded ? null : a.academia_id);
                    }}
                    title={isExpanded ? 'Ocultar temas' : 'Ver progreso por tema'}
                  >
                    Temas
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                </div>

                <Progress value={pct} className="h-2" />
                <div className="flex gap-3 text-xs flex-wrap">
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    🟡 {a.preguntas_pendientes.toLocaleString()} pend.
                  </span>
                  <span className="text-teal-600 dark:text-teal-400 font-medium">
                    ✅ {a.preguntas_verificadas.toLocaleString()} verif.
                  </span>
                  {rechazadas > 0 && (
                    <span className="text-red-600 dark:text-red-400 font-medium">
                      ❌ {rechazadas.toLocaleString()} rech.
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{a.total_preguntas.toLocaleString()} preguntas · {a.total_temas} temas</p>

                {/* Expandable tema grid */}
                {isExpanded && (
                  <div className="pt-2 border-t mt-1">
                    {loadingTemas === a.academia_id ? (
                      <div className="grid grid-cols-2 gap-1.5">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="animate-pulse h-14 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                        ))}
                      </div>
                    ) : temaStats && temaStats.length > 0 ? (
                      <div className="max-h-72 overflow-y-auto pr-0.5">
                        <div className="grid grid-cols-2 gap-1.5">
                          {temaStats.map(t => {
                            const tPct = t.total > 0 ? Math.round((t.verificadas / t.total) * 100) : 0;
                            const tColors = getProgressColor(tPct);
                            const icon = temaIcon(tPct);
                            const isComplete = tPct === 100;
                            return (
                              <button
                                key={t.id}
                                className={`text-left p-2 rounded-lg border transition-all hover:shadow-sm active:scale-95 ${isComplete ? 'bg-teal-50/60 dark:bg-teal-900/10 border-teal-200 dark:border-teal-800 opacity-60' : 'bg-background border-muted hover:border-muted-foreground/40'}`}
                                onClick={() => { setAcademiaId(a.academia_id); setTemaId(t.id); setPage(0); }}
                              >
                                <div className="flex items-center gap-1 mb-1">
                                  <span className="text-xs leading-none flex-shrink-0">{icon}</span>
                                  <span className={`text-xs font-medium truncate flex-1 min-w-0 ${isComplete ? 'line-through text-muted-foreground' : ''}`}>{t.nombre}</span>
                                  <span className={`text-xs font-bold flex-shrink-0 ml-0.5 ${tColors.text}`}>{tPct}%</span>
                                </div>
                                <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${tColors.bar}`} style={{ width: `${tPct}%` }} />
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1 truncate">
                                  {t.pendientes} pend. · {t.verificadas} verif.
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-2">Sin temas</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={academiaId} onValueChange={v => { setAcademiaId(v); setTemaId('__all__'); setPage(0); }}>
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

            <Select
              value={temaId}
              onValueChange={v => { setTemaId(v); setPage(0); }}
              disabled={temas.length === 0}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={temas.length === 0 ? 'Selecciona una academia' : 'Todos los temas'} />
              </SelectTrigger>
              <SelectContent className="w-[var(--radix-select-trigger-width)]">
                <SelectItem value="__all__">Todos los temas</SelectItem>
                {temas.map(t => (
                  <SelectItem
                    key={t.id}
                    value={t.id}
                    className="[&>span:last-child]:flex [&>span:last-child]:w-full [&>span:last-child]:min-w-0 [&>span:last-child]:overflow-hidden [&>span:last-child]:items-center"
                  >
                    <span className="truncate">{t.nombre}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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

      {/* Barra de contexto: counts del filtro activo */}
      {filterCounts && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 rounded-xl border bg-muted/40">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              {selectedAcademiaName
                ? selectedTemaName
                  ? `${selectedAcademiaName} · ${selectedTemaName}`
                  : selectedAcademiaName
                : 'Todas las academias'}
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400"></span>
                {filterCounts.pendientes.toLocaleString()} pendientes
              </span>
              <span className="flex items-center gap-1 font-medium text-teal-600 dark:text-teal-400">
                <span className="inline-block w-2 h-2 rounded-full bg-teal-400"></span>
                {filterCounts.verificadas.toLocaleString()} verificadas
              </span>
              {filterCounts.rechazadas > 0 && (
                <span className="flex items-center gap-1 font-medium text-red-600 dark:text-red-400">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-400"></span>
                  {filterCounts.rechazadas.toLocaleString()} rechazadas
                </span>
              )}
            </div>
          </div>
          {filterCounts.total > 0 && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {(() => {
                const pct = Math.round((filterCounts.verificadas / filterCounts.total) * 100);
                const colors = getProgressColor(pct);
                return (
                  <div className="text-right space-y-1">
                    <p className={`text-sm font-bold ${colors.text}`}>{pct}% verificado</p>
                    <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${colors.bar}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

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
                    {opciones.filter(([, v]) => v).map(([letra, texto]) => {
                      const esCorrecta = p.solucion_letra === letra;
                      const expKey = `explicacion_${letra.toLowerCase()}` as keyof typeof p;
                      const explicacion = p[expKey] as string | null;
                      return (
                        <div
                          key={letra}
                          className={`p-2 rounded border text-sm flex gap-2 ${
                            esCorrecta
                              ? 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-700'
                              : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          <span className={`font-bold flex-shrink-0 ${esCorrecta ? 'text-green-600' : 'text-muted-foreground'}`}>
                            {letra}.
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="break-words">{texto}</span>
                            {explicacion && (
                              <p className={`mt-1 text-xs leading-relaxed break-words whitespace-normal ${esCorrecta ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'}`}>
                                {explicacion}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
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

      {form && (
        <PreguntaFormDialog
          open={!!editando}
          onClose={() => { setEditando(null); setForm(null); }}
          form={form}
          setForm={setForm as React.Dispatch<React.SetStateAction<PreguntaForm>>}
          saving={saving}
          onSave={handleGuardar}
          isEditing
        />
      )}
    </div>
  );
}
