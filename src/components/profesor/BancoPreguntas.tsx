import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  ChevronLeft, ChevronRight, Download, BookOpen, Loader2,
  CheckSquare2, Square, CheckCircle2, XCircle, Sparkles, Trash2, AlertTriangle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useBancoPreguntas, type PreguntaBanco } from '@/hooks/useBancoPreguntas';
import { useGestionPreguntas, type PreguntaForm } from '@/hooks/useGestionPreguntas';
import PreguntaFormDialog from '@/components/profesor/PreguntaFormDialog';
import { shuffleOptions } from '@/lib/shuffleOptions';
import type { ProfesorAcademia } from '@/hooks/useProfesorData';

interface BancoTemaStats {
  tema_id: string;
  tema_nombre: string;
  total: number;
  importadas: number;
  verificadas: number;
}

type BatchItemStatus = 'pending' | 'processing' | 'done' | 'done_no_ai' | 'error';

interface BatchItem {
  id: string;
  texto: string;
  status: BatchItemStatus;
}

function bancoTemaIcon(importadas: number, verificadas: number) {
  if (importadas === 0) return '⭕';
  if (verificadas === importadas) return '✅';
  if (verificadas > 0) return '🔄';
  return '🔵';
}

const MAX_BATCH = 20;

interface Props {
  profesorId: string;
  academias: ProfesorAcademia[];
}

const PAGE_SIZE = 10;

export default function BancoPreguntas({ profesorId, academias }: Props) {
  const { preguntas, loading, total, cargar } = useBancoPreguntas(profesorId);
  const { saving, guardar } = useGestionPreguntas(profesorId);

  const propias = academias.filter(a => !a.es_biblioteca);

  // Fuente
  const [bibliotecas, setBibliotecas] = useState<{ id: string; nombre: string }[]>([]);
  const [srcAcademiaId, setSrcAcademiaId] = useState('__all__');
  const [srcTemaId, setSrcTemaId] = useState('__all__');
  const [bancoTemaStats, setBancoTemaStats] = useState<BancoTemaStats[]>([]);
  const [loadingBancoTemas, setLoadingBancoTemas] = useState(false);
  const [bancoTemasKey, setBancoTemasKey] = useState(0);

  // Destino
  const [destAcademiaId, setDestAcademiaId] = useState('');
  const [destTemaId, setDestTemaId] = useState('');
  const [destTemas, setDestTemas] = useState<{ id: string; nombre: string }[]>([]);

  const [soloNoImportadas, setSoloNoImportadas] = useState(true);
  const [page, setPage] = useState(0);
  const [importing, setImporting] = useState<string | null>(null);

  // Dialog individual
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<PreguntaForm | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  // Delete banco
  const [deleteItem, setDeleteItem] = useState<{ id: string; texto: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Batch mode
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchDone, setBatchDone] = useState(false);
  const [batchDoneCount, setBatchDoneCount] = useState(0);
  const [batchErrorCount, setBatchErrorCount] = useState(0);

  useEffect(() => {
    (supabase.from('academias') as any)
      .select('id, nombre').eq('es_biblioteca', true).order('nombre')
      .then(({ data }: any) => setBibliotecas(data || []));
  }, []);

  useEffect(() => {
    if (propias.length === 1 && !destAcademiaId) setDestAcademiaId(propias[0].academia_id);
  }, [propias, destAcademiaId]);

  useEffect(() => {
    if (srcAcademiaId === '__all__') { setBancoTemaStats([]); setSrcTemaId('__all__'); return; }
    setLoadingBancoTemas(true);
    setSrcTemaId('__all__');
    supabase.rpc('get_banco_tema_import_stats' as any, {
      p_profesor_id: profesorId,
      p_banco_academia_id: srcAcademiaId,
    }).then(({ data }: any) => {
      setBancoTemaStats((data || []) as BancoTemaStats[]);
    }).finally(() => setLoadingBancoTemas(false));
  }, [srcAcademiaId, bancoTemasKey, profesorId]);

  useEffect(() => {
    if (!destAcademiaId) { setDestTemas([]); setDestTemaId(''); return; }
    supabase.from('temas').select('id, nombre').eq('academia_id', destAcademiaId).order('nombre')
      .then(({ data }) => { setDestTemas(data || []); setDestTemaId(''); });
  }, [destAcademiaId]);

  const recargar = useCallback(() => {
    cargar({
      academia_id: srcAcademiaId === '__all__' ? undefined : srcAcademiaId,
      tema_id: srcTemaId === '__all__' ? undefined : srcTemaId,
      solo_no_importadas: soloNoImportadas,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    });
  }, [cargar, srcAcademiaId, srcTemaId, soloNoImportadas, page]);

  useEffect(() => { recargar(); }, [recargar]);

  // ── Selección batch ──────────────────────────────────────────────────────
  const toggleSelect = (p: PreguntaBanco) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(p.id)) {
        next.delete(p.id);
      } else if (next.size >= MAX_BATCH) {
        toast.error(`Máximo ${MAX_BATCH} preguntas por lote`);
      } else {
        next.add(p.id);
      }
      return next;
    });
  };

  const exitBatchMode = () => {
    setBatchMode(false);
    setSelectedIds(new Set());
  };

  // ── Import individual ────────────────────────────────────────────────────
  const handleImportar = async (pregunta: PreguntaBanco) => {
    if (!destAcademiaId || !destTemaId) {
      toast.error('Selecciona el tema destino antes de importar');
      return;
    }
    setImporting(pregunta.id);
    try {
      const { data: bancoQ } = await supabase
        .from('preguntas')
        .select('parte, pregunta_texto, opcion_a, opcion_b, opcion_c, opcion_d, solucion_letra, explicacion_a, explicacion_b, explicacion_c, explicacion_d')
        .eq('id', pregunta.id).single();
      setForm({
        academia_id: destAcademiaId,
        tema_id: destTemaId,
        parte: bancoQ?.parte || '',
        pregunta_texto: bancoQ?.pregunta_texto ?? pregunta.pregunta_texto,
        opcion_a: bancoQ?.opcion_a ?? pregunta.opcion_a,
        opcion_b: bancoQ?.opcion_b ?? pregunta.opcion_b,
        opcion_c: bancoQ?.opcion_c ?? pregunta.opcion_c ?? '',
        opcion_d: bancoQ?.opcion_d ?? pregunta.opcion_d ?? '',
        solucion_letra: bancoQ?.solucion_letra ?? pregunta.solucion_letra,
        explicacion_a: bancoQ?.explicacion_a ?? null,
        explicacion_b: bancoQ?.explicacion_b ?? null,
        explicacion_c: bancoQ?.explicacion_c ?? null,
        explicacion_d: bancoQ?.explicacion_d ?? null,
        pregunta_origen_id: pregunta.id,
        modificada_por_ia: false,
      });
      setDialogOpen(true);
    } finally {
      setImporting(null);
    }
  };

  const handleRewriteAI = async () => {
    if (!form) return;
    setAiBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('rewrite-question', {
        body: {
          pregunta_texto: form.pregunta_texto,
          opcion_a: form.opcion_a, opcion_b: form.opcion_b,
          opcion_c: form.opcion_c || null, opcion_d: form.opcion_d || null,
          solucion_letra: form.solucion_letra, parte: form.parte || null,
          tema_nombre: destTemas.find(t => t.id === form.tema_id)?.nombre,
          explicacion_a: form.explicacion_a || null, explicacion_b: form.explicacion_b || null,
          explicacion_c: form.explicacion_c || null, explicacion_d: form.explicacion_d || null,
        },
      });
      if (error) throw error;
      const rewritten: PreguntaForm = {
        ...form,
        pregunta_texto: data.pregunta_texto || form.pregunta_texto,
        opcion_a: data.opcion_a || form.opcion_a,
        opcion_b: data.opcion_b || form.opcion_b,
        opcion_c: form.opcion_c ? (data.opcion_c || form.opcion_c) : '',
        opcion_d: form.opcion_d ? (data.opcion_d || form.opcion_d) : '',
        solucion_letra: data.solucion_letra || form.solucion_letra,
        modificada_por_ia: true,
      };
      setForm(shuffleOptions(rewritten));
      toast.success('Pregunta reescrita con IA y opciones barajadas');
    } catch (err: any) {
      toast.error(err.message || 'Error al reescribir con IA');
    } finally {
      setAiBusy(false);
    }
  };

  const handleGuardar = async () => {
    if (!form) return;
    const id = await guardar(form);
    if (id) {
      setDialogOpen(false);
      setForm(null);
      recargar();
      setBancoTemasKey(k => k + 1);
      toast.success('Pregunta guardada en tu academia');
    }
  };

  // ── Import batch ─────────────────────────────────────────────────────────
  const handleBatchImport = async (withAI: boolean) => {
    if (!destAcademiaId || !destTemaId) {
      toast.error('Selecciona el tema destino antes de importar');
      return;
    }
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    // Inicializar estado del batch
    const items: BatchItem[] = ids.map(id => ({
      id,
      texto: preguntas.find(p => p.id === id)?.pregunta_texto ?? id,
      status: 'pending',
    }));
    setBatchItems(items);
    setBatchProcessing(true);
    setBatchDone(false);
    setBatchDoneCount(0);
    setBatchErrorCount(0);

    let doneCount = 0;
    let errorCount = 0;

    for (let i = 0; i < ids.length; i++) {
      const preguntaId = ids[i];

      setBatchItems(prev => prev.map(it => it.id === preguntaId ? { ...it, status: 'processing' } : it));

      try {
        // 1. Fetch pregunta completa del banco
        const { data: bancoQ, error: fetchErr } = await supabase
          .from('preguntas')
          .select('parte, pregunta_texto, opcion_a, opcion_b, opcion_c, opcion_d, solucion_letra, explicacion_a, explicacion_b, explicacion_c, explicacion_d')
          .eq('id', preguntaId).single();

        if (fetchErr || !bancoQ) throw new Error('No se pudo leer la pregunta del banco');

        let finalForm: PreguntaForm = {
          academia_id: destAcademiaId,
          tema_id: destTemaId,
          parte: bancoQ.parte || '',
          pregunta_texto: bancoQ.pregunta_texto,
          opcion_a: bancoQ.opcion_a,
          opcion_b: bancoQ.opcion_b,
          opcion_c: bancoQ.opcion_c || '',
          opcion_d: bancoQ.opcion_d || '',
          solucion_letra: bancoQ.solucion_letra,
          explicacion_a: bancoQ.explicacion_a ?? null,
          explicacion_b: bancoQ.explicacion_b ?? null,
          explicacion_c: bancoQ.explicacion_c ?? null,
          explicacion_d: bancoQ.explicacion_d ?? null,
          pregunta_origen_id: preguntaId,
          modificada_por_ia: false,
        };

        // 2. Reescribir con IA (si se pidió); si falla, guarda sin IA
        let aiUsed = false;
        if (withAI) {
          try {
            const { data: aiData, error: aiErr } = await supabase.functions.invoke('rewrite-question', {
              body: {
                pregunta_texto: bancoQ.pregunta_texto,
                opcion_a: bancoQ.opcion_a, opcion_b: bancoQ.opcion_b,
                opcion_c: bancoQ.opcion_c || null, opcion_d: bancoQ.opcion_d || null,
                solucion_letra: bancoQ.solucion_letra, parte: bancoQ.parte || null,
                explicacion_a: bancoQ.explicacion_a || null,
                explicacion_b: bancoQ.explicacion_b || null,
                explicacion_c: bancoQ.explicacion_c || null,
                explicacion_d: bancoQ.explicacion_d || null,
              },
            });
            if (!aiErr && aiData?.pregunta_texto) {
              const rewritten: PreguntaForm = {
                ...finalForm,
                pregunta_texto: aiData.pregunta_texto || finalForm.pregunta_texto,
                opcion_a: aiData.opcion_a || finalForm.opcion_a,
                opcion_b: aiData.opcion_b || finalForm.opcion_b,
                opcion_c: finalForm.opcion_c ? (aiData.opcion_c || finalForm.opcion_c) : '',
                opcion_d: finalForm.opcion_d ? (aiData.opcion_d || finalForm.opcion_d) : '',
                solucion_letra: aiData.solucion_letra || finalForm.solucion_letra,
                modificada_por_ia: true,
              };
              finalForm = shuffleOptions(rewritten);
              aiUsed = true;
            }
          } catch {
            // IA falló — continúa sin reescribir
          }
        }

        // 3. Guardar pregunta
        const { data: newId, error: saveErr } = await supabase.rpc('upsert_pregunta' as any, {
          p_profesor_id: profesorId,
          p_pregunta_id: null,
          p_academia_id: finalForm.academia_id,
          p_tema_id: finalForm.tema_id,
          p_parte: finalForm.parte || null,
          p_pregunta_texto: finalForm.pregunta_texto,
          p_opcion_a: finalForm.opcion_a,
          p_opcion_b: finalForm.opcion_b,
          p_opcion_c: finalForm.opcion_c || null,
          p_opcion_d: finalForm.opcion_d || null,
          p_solucion_letra: finalForm.solucion_letra,
          p_pregunta_origen_id: finalForm.pregunta_origen_id,
          p_modificada_por_ia: finalForm.modificada_por_ia ?? false,
        });
        if (saveErr) throw saveErr;

        // 4. Guardar explicaciones (usar finalForm, no bancoQ — el shuffle reposiciona explicaciones)
        const hasExp = finalForm.explicacion_a || finalForm.explicacion_b || finalForm.explicacion_c || finalForm.explicacion_d;
        if (newId && hasExp) {
          await supabase.rpc('update_explicaciones_pregunta' as any, {
            p_profesor_id: profesorId,
            p_pregunta_id: newId as string,
            p_explicacion_a: finalForm.explicacion_a || null,
            p_explicacion_b: finalForm.explicacion_b || null,
            p_explicacion_c: finalForm.explicacion_c || null,
            p_explicacion_d: finalForm.explicacion_d || null,
          });
        }

        doneCount++;
        setBatchItems(prev => prev.map(it =>
          it.id === preguntaId ? { ...it, status: aiUsed ? 'done' : 'done_no_ai' } : it
        ));
      } catch (err) {
        console.error('Batch import error for', preguntaId, err);
        errorCount++;
        setBatchItems(prev => prev.map(it => it.id === preguntaId ? { ...it, status: 'error' } : it));
      }

      // Pausa entre requests para no saturar la API
      if (withAI && i < ids.length - 1) {
        await new Promise(r => setTimeout(r, 600));
      }
    }

    setBatchDoneCount(doneCount);
    setBatchErrorCount(errorCount);
    setBatchProcessing(false);
    setBatchDone(true);
    recargar();
    setBancoTemasKey(k => k + 1);
  };

  const handleEliminarBanco = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      const { error } = await supabase.rpc('eliminar_pregunta_banco' as any, {
        p_profesor_id: profesorId,
        p_pregunta_id: deleteItem.id,
      });
      if (error) throw error;
      toast.success('Pregunta eliminada del banco');
      setDeleteItem(null);
      recargar();
      setBancoTemasKey(k => k + 1);
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar la pregunta');
    } finally {
      setDeleting(false);
    }
  };

  const closeBatchDialog = () => {
    setBatchItems([]);
    setBatchDone(false);
    exitBatchMode();
  };

  // ─────────────────────────────────────────────────────────────────────────
  const sinAcademiaPropia = propias.length === 0;

  if (sinAcademiaPropia) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-2">
          <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold text-muted-foreground">Sin academia propia</p>
          <p className="text-sm text-muted-foreground">
            Pide a tu administrador que te cree una academia para poder importar preguntas del banco.
          </p>
        </CardContent>
      </Card>
    );
  }

  const batchProgressPct = batchItems.length > 0
    ? Math.round((batchItems.filter(i => i.status !== 'pending' && i.status !== 'processing').length / batchItems.length) * 100)
    : 0;

  return (
    <div className="space-y-4">

      {/* Destino */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Importar hacia</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {propias.length > 1 ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Academia destino</Label>
                <Select value={destAcademiaId} onValueChange={setDestAcademiaId}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar tu academia" /></SelectTrigger>
                  <SelectContent>
                    {propias.map(a => <SelectItem key={a.academia_id} value={a.academia_id}>{a.academia_nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Academia destino</Label>
                <div className="h-9 flex items-center px-3 rounded-md border bg-muted/50 text-sm font-medium text-muted-foreground">
                  {propias[0].academia_nombre}
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tema destino <span className="text-red-500">*</span></Label>
              <Select value={destTemaId} onValueChange={setDestTemaId} disabled={!destAcademiaId || destTemas.length === 0}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={destTemas.length === 0 ? 'Crea un tema primero' : 'Seleccionar tema'} />
                </SelectTrigger>
                <SelectContent>
                  {destTemas.map(t => <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {destAcademiaId && destTemas.length === 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Esta academia no tiene temas. Ve a la pestaña "Temas" para crear uno primero.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Filtros fuente */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Banco de preguntas</p>
            {preguntas.length > 0 && (
              <button
                className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md border transition-colors ${
                  batchMode
                    ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-400 text-blue-700 dark:text-blue-300'
                    : 'bg-muted border-border text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
                onClick={() => {
                  if (batchMode) {
                    exitBatchMode();
                    return;
                  }
                  if (!destAcademiaId || !destTemaId) {
                    toast.error('Selecciona el tema destino antes de importar');
                    return;
                  }
                  setBatchMode(true);
                }}
              >
                {batchMode ? <CheckSquare2 className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                {batchMode ? 'Cancelar selección' : 'Selección múltiple'}
              </button>
            )}
          </div>

          <Select value={srcAcademiaId} onValueChange={v => { setSrcAcademiaId(v); setPage(0); }}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Todas las academias" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas las academias</SelectItem>
              {bibliotecas.map(a => <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Chip grid de temas con stats */}
          {srcAcademiaId !== '__all__' && (
            <div>
              {loadingBancoTemas ? (
                <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />Cargando temas...
                </div>
              ) : bancoTemaStats.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">Sin temas en esta academia</p>
              ) : (
                <div className="max-h-64 overflow-y-auto pr-0.5">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      className={`col-span-2 text-left p-2 rounded-lg border transition-all text-xs font-medium ${
                        srcTemaId === '__all__'
                          ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-400 text-blue-700 dark:text-blue-300'
                          : 'bg-background border-muted hover:border-muted-foreground/40'
                      }`}
                      onClick={() => { setSrcTemaId('__all__'); setPage(0); }}
                    >
                      Todos los temas ({bancoTemaStats.reduce((s, t) => s + t.total, 0)} preguntas)
                    </button>
                    {bancoTemaStats.map(t => {
                      const pct = t.total > 0 ? Math.round((t.importadas / t.total) * 100) : 0;
                      const icon = bancoTemaIcon(t.importadas, t.verificadas);
                      const isActive = srcTemaId === t.tema_id;
                      const isDone = t.importadas === t.total && t.total > 0;
                      return (
                        <button
                          key={t.tema_id}
                          className={`text-left p-2 rounded-lg border transition-all hover:shadow-sm active:scale-95 ${
                            isActive ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-400 ring-1 ring-blue-400'
                            : isDone ? 'bg-teal-50/60 dark:bg-teal-900/10 border-teal-200 dark:border-teal-800 opacity-70'
                            : 'bg-background border-muted hover:border-muted-foreground/40'
                          }`}
                          onClick={() => { setSrcTemaId(isActive ? '__all__' : t.tema_id); setPage(0); }}
                        >
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-xs leading-none flex-shrink-0">{icon}</span>
                            <span className={`text-xs font-medium truncate flex-1 min-w-0 ${isDone ? 'line-through text-muted-foreground' : ''}`}>{t.tema_nombre}</span>
                            <span className="text-xs font-bold flex-shrink-0 ml-0.5 text-blue-600 dark:text-blue-400">{pct}%</span>
                          </div>
                          <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1 truncate">
                            {t.importadas}/{t.total} import. · {t.verificadas} verif.
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Switch id="solo-no-importadas" checked={soloNoImportadas} onCheckedChange={v => { setSoloNoImportadas(v); setPage(0); }} />
            <Label htmlFor="solo-no-importadas" className="text-xs cursor-pointer">Ocultar ya importadas</Label>
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">{total} pregunta{total !== 1 ? 's' : ''}</span>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}><CardContent className="p-5">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
              </div>
            </CardContent></Card>
          ))}
        </div>
      ) : preguntas.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {soloNoImportadas ? 'Todas las preguntas de este filtro ya han sido importadas.' : 'No hay preguntas en este banco con los filtros seleccionados.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {preguntas.map(p => {
            const isImporting = importing === p.id;
            const isSelected = selectedIds.has(p.id);
            return (
              <Card
                key={p.id}
                className={`border-l-4 transition-all ${
                  batchMode && isSelected ? 'border-l-blue-500 ring-2 ring-blue-400 ring-offset-1'
                  : p.ya_importada ? 'border-l-teal-400 opacity-70'
                  : 'border-l-blue-400'
                }`}
                onClick={batchMode ? () => toggleSelect(p) : undefined}
                style={batchMode ? { cursor: 'pointer' } : undefined}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    {/* Checkbox en modo batch */}
                    {batchMode && (
                      <button
                        className="flex-shrink-0 mt-0.5"
                        onClick={e => { e.stopPropagation(); toggleSelect(p); }}
                      >
                        {isSelected
                          ? <CheckSquare2 className="h-5 w-5 text-blue-500" />
                          : <Square className="h-5 w-5 text-muted-foreground" />
                        }
                      </button>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <Badge variant="outline" className="text-xs">{p.academia_nombre}</Badge>
                        <Badge variant="outline" className="text-xs">{p.tema_nombre}</Badge>
                        {p.parte && <Badge variant="outline" className="text-xs">{p.parte}</Badge>}
                        {p.ya_importada && (
                          <Badge variant="outline" className="text-xs text-teal-600 border-teal-300 dark:text-teal-400 dark:border-teal-700">✓ Importada</Badge>
                        )}
                      </div>
                      <CardTitle className="text-sm font-medium leading-snug line-clamp-3">{p.pregunta_texto}</CardTitle>
                    </div>
                    {!batchMode && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Button
                          size="sm"
                          variant={p.ya_importada ? 'outline' : 'default'}
                          className={`gap-1.5 ${p.ya_importada ? 'text-muted-foreground' : 'bg-teal-600 hover:bg-teal-700'}`}
                          disabled={isImporting || !destAcademiaId || !destTemaId}
                          onClick={() => handleImportar(p)}
                          title={!destTemaId ? 'Selecciona el tema destino arriba' : undefined}
                        >
                          <Download className="h-3.5 w-3.5" />
                          {isImporting ? 'Cargando...' : p.ya_importada ? 'Re-importar' : 'Importar'}
                        </Button>
                        <button
                          onClick={() => setDeleteItem({ id: p.id, texto: p.pregunta_texto })}
                          className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 transition-colors"
                          title="Eliminar del banco"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {([['A', p.opcion_a], ['B', p.opcion_b], ['C', p.opcion_c], ['D', p.opcion_d]] as [string, string | null][])
                      .filter(([, v]) => v)
                      .map(([letra, texto]) => {
                        const esCorrecta = p.solucion_letra === letra;
                        return (
                          <div key={letra} className={`p-2 rounded border text-xs flex gap-1.5 ${esCorrecta ? 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-700' : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'}`}>
                            <span className={`font-bold flex-shrink-0 ${esCorrecta ? 'text-green-600' : 'text-muted-foreground'}`}>{letra}.</span>
                            <span className="break-words">{texto}</span>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            );
          })}

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

      {/* Barra flotante de selección batch */}
      {batchMode && selectedIds.size > 0 && !batchProcessing && (
        <div className="fixed bottom-20 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
          <div className="bg-card border shadow-xl rounded-xl p-3 flex flex-col sm:flex-row items-center gap-3 w-full max-w-2xl pointer-events-auto">
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 flex-shrink-0">
              {selectedIds.size}/{MAX_BATCH} seleccionadas
            </span>
            <div className="flex-1" />
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 sm:flex-none gap-1.5"
                onClick={() => handleBatchImport(false)}
              >
                <Download className="h-3.5 w-3.5" />
                Sin IA
              </Button>
              <Button
                size="sm"
                className="flex-1 sm:flex-none gap-1.5 bg-teal-600 hover:bg-teal-700"
                onClick={() => handleBatchImport(true)}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Importar con IA
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog de progreso batch */}
      <Dialog open={batchProcessing || batchDone} onOpenChange={() => {}}>
        <DialogContent
          className="max-w-lg"
          onPointerDownOutside={e => { if (batchProcessing) e.preventDefault(); }}
          onEscapeKeyDown={e => { if (batchProcessing) e.preventDefault(); }}
        >
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              {batchProcessing
                ? <><Loader2 className="h-4 w-4 animate-spin text-teal-500" /> Importando preguntas...</>
                : batchErrorCount === 0
                ? <><CheckCircle2 className="h-4 w-4 text-green-500" /> Importación completada</>
                : <><XCircle className="h-4 w-4 text-amber-500" /> Importación finalizada con errores</>
              }
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Barra de progreso */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{batchItems.filter(i => i.status !== 'pending' && i.status !== 'processing').length} de {batchItems.length}</span>
                <span>{batchProgressPct}%</span>
              </div>
              <Progress value={batchProgressPct} className="h-2" />
            </div>

            {/* Lista de items con estado */}
            <div className="max-h-64 overflow-y-auto space-y-2 pr-0.5">
              {batchItems.map(item => (
                <div key={item.id} className="flex items-center gap-2 text-xs">
                  {item.status === 'processing' && <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin text-blue-500" />}
                  {item.status === 'done' && <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-teal-500" />}
                  {item.status === 'done_no_ai' && <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />}
                  {item.status === 'error' && <XCircle className="h-3.5 w-3.5 flex-shrink-0 text-red-500" />}
                  {item.status === 'pending' && <div className="h-3.5 w-3.5 flex-shrink-0 rounded-full bg-gray-200 dark:bg-gray-700" />}
                  <span className="flex-1 text-muted-foreground leading-snug">{item.texto}</span>
                  {item.status === 'done' && <span className="flex-shrink-0 text-teal-500 font-medium">🤖</span>}
                  {item.status === 'done_no_ai' && <span className="flex-shrink-0 text-gray-400">📋</span>}
                </div>
              ))}
            </div>

            {/* Resumen final */}
            {batchDone && (
              <div className="space-y-3">
                <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
                  {batchDoneCount > 0 && (
                    <p className="text-teal-600 dark:text-teal-400 font-medium">✅ {batchDoneCount} guardadas en pendientes de verificación</p>
                  )}
                  {batchErrorCount > 0 && (
                    <p className="text-red-600 dark:text-red-400 font-medium">❌ {batchErrorCount} fallaron (puedes importarlas individualmente)</p>
                  )}
                  <p className="text-muted-foreground">🤖 = reescrita con IA · 📋 = clonada sin IA</p>
                </div>
                <Button className="w-full bg-teal-600 hover:bg-teal-700" onClick={closeBatchDialog}>
                  Cerrar
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo confirmación borrado banco */}
      <Dialog open={!!deleteItem} onOpenChange={open => { if (!open) setDeleteItem(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Eliminar del banco
            </DialogTitle>
            <DialogDescription className="text-sm line-clamp-2">
              "{deleteItem?.texto}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 p-3 flex gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 dark:text-red-400">
                Esta acción no se puede deshacer. Las copias ya importadas en tu academia no se verán afectadas.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteItem(null)}>
                Cancelar
              </Button>
              <Button variant="destructive" className="flex-1" disabled={deleting} onClick={handleEliminarBanco}>
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog edición individual */}
      {form && (
        <PreguntaFormDialog
          open={dialogOpen}
          onClose={() => { setDialogOpen(false); setForm(null); }}
          form={form}
          setForm={setForm as React.Dispatch<React.SetStateAction<PreguntaForm>>}
          saving={saving}
          onSave={handleGuardar}
          isEditing
          onRewriteAI={handleRewriteAI}
          aiBusy={aiBusy}
        />
      )}
    </div>
  );
}
