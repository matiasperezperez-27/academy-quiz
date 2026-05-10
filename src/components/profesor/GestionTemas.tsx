import { useEffect, useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Plus, BookOpen, Tag, Pencil, Trash2, AlertTriangle, BookMarked, Layers, Library, GraduationCap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ProfesorAcademia } from '@/hooks/useProfesorData';

interface TemaConConteos {
  id: string;
  nombre: string;
  academia_id: string;
  created_at: string;
  total: number;
  verificadas: number;
  pendientes: number;
  rechazadas: number;
}

interface AcadBreakdown {
  academia_id: string;
  academia_nombre: string;
  es_biblioteca: boolean;
  total: number;
  verificadas: number;
  pendientes: number;
  rechazadas: number;
}

interface ParteConConteos {
  // id / en_tabla son relativos a la academia propia actualmente seleccionada
  id: string | null;
  en_tabla: boolean;
  nombre: string;
  total: number;
  verificadas: number;
  pendientes: number;
  rechazadas: number;
  breakdown: AcadBreakdown[];
}

const PARTE_PRESETS = ['Común', 'EXAMEN', 'Específica'];

function verifPct(verificadas: number, total: number) {
  return total > 0 ? Math.round((verificadas / total) * 100) : 0;
}

function verifColor(p: number) {
  if (p >= 70) return { bar: 'bg-teal-500', text: 'text-teal-600 dark:text-teal-400' };
  if (p >= 30) return { bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' };
  return { bar: 'bg-red-500', text: 'text-red-600 dark:text-red-400' };
}

interface Props {
  profesorId: string;
  academias: ProfesorAcademia[];
  onRefresh: () => void;
}

export default function GestionTemas({ profesorId, academias, onRefresh }: Props) {
  const propias = useMemo(() => academias.filter(a => !a.es_biblioteca), [academias]);
  const [academiaId, setAcademiaId] = useState('');
  const [seccion, setSeccion] = useState<'temas' | 'partes'>('temas');

  // ── Temas ────────────────────────────────────────────────
  const [temas, setTemas] = useState<TemaConConteos[]>([]);
  const [loadingTemas, setLoadingTemas] = useState(false);
  const [dialogCrearTema, setDialogCrearTema] = useState(false);
  const [nuevoTema, setNuevoTema] = useState('');
  const [editTema, setEditTema] = useState<TemaConConteos | null>(null);
  const [editNombreTema, setEditNombreTema] = useState('');
  const [deleteTema, setDeleteTema] = useState<TemaConConteos | null>(null);

  // ── Partes ───────────────────────────────────────────────
  const [partes, setPartes] = useState<ParteConConteos[]>([]);
  const [loadingPartes, setLoadingPartes] = useState(false);
  const [dialogCrearParte, setDialogCrearParte] = useState(false);
  const [nuevaParte, setNuevaParte] = useState('');
  const [editParte, setEditParte] = useState<ParteConConteos | null>(null);
  const [editNombreParte, setEditNombreParte] = useState('');
  const [deleteParte, setDeleteParte] = useState<ParteConConteos | null>(null);

  // Shared
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const selectedAcademia = propias.find(a => a.academia_id === academiaId);

  useEffect(() => {
    if (propias.length === 1 && !academiaId) setAcademiaId(propias[0].academia_id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propias.length]);

  // ── Data loaders ─────────────────────────────────────────

  const cargarTemas = useCallback(async (aid: string) => {
    if (!aid) return;
    setLoadingTemas(true);
    try {
      const { data: temaData, error } = await supabase
        .from('temas')
        .select('id, nombre, academia_id, created_at')
        .eq('academia_id', aid)
        .order('nombre');
      if (error) throw error;
      if (!temaData || temaData.length === 0) { setTemas([]); return; }

      const ids = temaData.map((t: any) => t.id);
      const { data: pregsData } = await supabase
        .from('preguntas')
        .select('tema_id, verificada, rechazada')
        .in('tema_id', ids);

      const cm: Record<string, { total: number; verificadas: number; pendientes: number; rechazadas: number }> = {};
      temaData.forEach((t: any) => { cm[t.id] = { total: 0, verificadas: 0, pendientes: 0, rechazadas: 0 }; });
      (pregsData ?? []).forEach((p: any) => {
        if (!cm[p.tema_id]) return;
        cm[p.tema_id].total++;
        if (p.verificada) cm[p.tema_id].verificadas++;
        else if (p.rechazada) cm[p.tema_id].rechazadas++;
        else cm[p.tema_id].pendientes++;
      });

      setTemas(temaData.map((t: any) => ({ ...t, ...cm[t.id] }) as TemaConConteos));
    } finally {
      setLoadingTemas(false);
    }
  }, []);

  // cargarPartes: vista GLOBAL de todas las academias accesibles.
  // partes_academia solo se consulta para la academia propia seleccionada
  // (para saber si una parte está "registrada" y permitir gestión).
  const cargarPartes = useCallback(async (selAcademiaId: string, allAcademias: ProfesorAcademia[]) => {
    if (!allAcademias.length) return;
    setLoadingPartes(true);
    try {
      const allIds = allAcademias.map(a => a.academia_id);
      const acadMeta: Record<string, { nombre: string; es_biblioteca: boolean }> = {};
      allAcademias.forEach(a => {
        acadMeta[a.academia_id] = { nombre: a.academia_nombre, es_biblioteca: a.es_biblioteca };
      });

      const [tableRes, pregsRes] = await Promise.all([
        // Partes registradas para la academia propia seleccionada
        selAcademiaId
          ? supabase.from('partes_academia').select('id, nombre').eq('academia_id', selAcademiaId)
          : Promise.resolve({ data: [] as any[] }),
        // Preguntas con parte de TODAS las academias accesibles
        supabase
          .from('preguntas')
          .select('parte, academia_id, verificada, rechazada')
          .in('academia_id', allIds)
          .not('parte', 'is', null),
      ]);

      // Mapa nombre → id para la academia seleccionada (gestión local)
      const tableMap: Record<string, string> = {};
      (tableRes.data ?? []).forEach((p: any) => { tableMap[p.nombre] = p.id; });

      // Conteo por parte × academia
      const parteAcadMap: Record<string, Record<string, { total: number; verificadas: number; pendientes: number; rechazadas: number }>> = {};
      (pregsRes.data ?? []).forEach((p: any) => {
        if (!p.parte) return;
        if (!parteAcadMap[p.parte]) parteAcadMap[p.parte] = {};
        if (!parteAcadMap[p.parte][p.academia_id]) {
          parteAcadMap[p.parte][p.academia_id] = { total: 0, verificadas: 0, pendientes: 0, rechazadas: 0 };
        }
        parteAcadMap[p.parte][p.academia_id].total++;
        if (p.verificada) parteAcadMap[p.parte][p.academia_id].verificadas++;
        else if (p.rechazada) parteAcadMap[p.parte][p.academia_id].rechazadas++;
        else parteAcadMap[p.parte][p.academia_id].pendientes++;
      });

      // Unión de nombres: los de la tabla + los que aparecen en preguntas
      const allNames = new Set([...Object.keys(tableMap), ...Object.keys(parteAcadMap)]);

      const result: ParteConConteos[] = Array.from(allNames).map(nombre => {
        const acadCounts = parteAcadMap[nombre] ?? {};
        const total      = Object.values(acadCounts).reduce((a, c) => a + c.total, 0);
        const verificadas = Object.values(acadCounts).reduce((a, c) => a + c.verificadas, 0);
        const pendientes  = Object.values(acadCounts).reduce((a, c) => a + c.pendientes, 0);
        const rechazadas  = Object.values(acadCounts).reduce((a, c) => a + c.rechazadas, 0);

        const breakdown: AcadBreakdown[] = Object.entries(acadCounts)
          .map(([aid, counts]) => ({
            academia_id: aid,
            academia_nombre: acadMeta[aid]?.nombre ?? aid,
            es_biblioteca: acadMeta[aid]?.es_biblioteca ?? false,
            ...counts,
          }))
          .sort((a, b) => {
            // Propias primero, luego por cantidad desc
            if (!a.es_biblioteca && b.es_biblioteca) return -1;
            if (a.es_biblioteca && !b.es_biblioteca) return 1;
            return b.total - a.total;
          });

        return {
          id: tableMap[nombre] ?? null,
          en_tabla: !!tableMap[nombre],
          nombre,
          total, verificadas, pendientes, rechazadas,
          breakdown,
        };
      }).sort((a, b) => {
        const ia = PARTE_PRESETS.indexOf(a.nombre);
        const ib = PARTE_PRESETS.indexOf(b.nombre);
        if (ia >= 0 && ib < 0) return -1;
        if (ib >= 0 && ia < 0) return 1;
        if (ia >= 0 && ib >= 0) return ia - ib;
        return a.nombre.localeCompare(b.nombre, 'es');
      });

      setPartes(result);
    } finally {
      setLoadingPartes(false);
    }
  }, []);

  // Temas se recargan al cambiar academia; partes siempre son globales
  useEffect(() => {
    cargarTemas(academiaId);
  }, [academiaId, cargarTemas]);

  useEffect(() => {
    if (academias.length > 0) cargarPartes(academiaId, academias);
  }, [academiaId, academias, cargarPartes]);

  // ── Tema handlers ─────────────────────────────────────────

  const handleCrearTema = async () => {
    if (!nuevoTema.trim() || !academiaId) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc('crear_tema' as any, {
        p_profesor_id: profesorId,
        p_academia_id: academiaId,
        p_nombre: nuevoTema.trim(),
      });
      if (error) throw error;
      toast.success('Tema creado');
      setNuevoTema('');
      setDialogCrearTema(false);
      cargarTemas(academiaId);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Error al crear el tema');
    } finally {
      setSaving(false);
    }
  };

  const handleRenombrarTema = async () => {
    if (!editTema || !editNombreTema.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc('renombrar_tema' as any, {
        p_profesor_id: profesorId,
        p_tema_id: editTema.id,
        p_nuevo_nombre: editNombreTema.trim(),
      });
      if (error) throw error;
      toast.success('Tema renombrado');
      setEditTema(null);
      cargarTemas(academiaId);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Error al renombrar');
    } finally {
      setSaving(false);
    }
  };

  const handleEliminarTema = async () => {
    if (!deleteTema) return;
    setDeleting(true);
    try {
      const { error } = await supabase.rpc('eliminar_tema' as any, {
        p_profesor_id: profesorId,
        p_tema_id: deleteTema.id,
      });
      if (error) throw error;
      toast.success(`Tema "${deleteTema.nombre}" eliminado`);
      setDeleteTema(null);
      cargarTemas(academiaId);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar');
    } finally {
      setDeleting(false);
    }
  };

  // ── Parte handlers (siempre sobre la academia propia seleccionada) ───────

  const handleCrearParte = async () => {
    const nombre = nuevaParte.trim();
    if (!nombre || !academiaId) return;
    if (partes.some(p => p.nombre.toLowerCase() === nombre.toLowerCase())) {
      toast.error('Ya existe una parte con ese nombre');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('partes_academia')
        .insert({ academia_id: academiaId, nombre });
      if (error) throw error;
      toast.success(`Parte "${nombre}" creada`);
      setNuevaParte('');
      setDialogCrearParte(false);
      cargarPartes(academiaId, academias);
    } catch (err: any) {
      toast.error(err.message || 'Error al crear la parte');
    } finally {
      setSaving(false);
    }
  };

  const handleRenombrarParte = async () => {
    if (!editParte || !editNombreParte.trim() || !academiaId) return;
    const oldName = editParte.nombre;
    const newName = editNombreParte.trim();
    if (oldName === newName) { setEditParte(null); return; }
    if (partes.some(p => p.nombre.toLowerCase() === newName.toLowerCase() && p.nombre !== oldName)) {
      toast.error('Ya existe una parte con ese nombre');
      return;
    }
    setSaving(true);
    try {
      // Actualizar o insertar en partes_academia para esta academia
      if (editParte.id) {
        const { error } = await supabase.from('partes_academia').update({ nombre: newName }).eq('id', editParte.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('partes_academia').insert({ academia_id: academiaId, nombre: newName });
        if (error) throw error;
      }
      // Renombrar en preguntas de esta academia únicamente
      const propiaBreakdown = editParte.breakdown.find(b => b.academia_id === academiaId);
      if (propiaBreakdown && propiaBreakdown.total > 0) {
        const { error } = await supabase.rpc('renombrar_parte_preguntas' as any, {
          p_profesor_id: profesorId,
          p_academia_id: academiaId,
          p_nombre_actual: oldName,
          p_nombre_nuevo: newName,
        });
        if (error) throw error;
      }
      const propiaCount = propiaBreakdown?.total ?? 0;
      toast.success(
        `"${oldName}" → "${newName}"` +
        (propiaCount > 0 ? ` · ${propiaCount} pregunta${propiaCount !== 1 ? 's' : ''} actualizadas` : '')
      );
      setEditParte(null);
      cargarPartes(academiaId, academias);
    } catch (err: any) {
      toast.error(err.message || 'Error al renombrar la parte');
    } finally {
      setSaving(false);
    }
  };

  const handleEliminarParte = async () => {
    if (!deleteParte || !academiaId) return;
    setDeleting(true);
    try {
      if (deleteParte.id) {
        const { error } = await supabase.from('partes_academia').delete().eq('id', deleteParte.id);
        if (error) throw error;
      }
      const propiaBreakdown = deleteParte.breakdown.find(b => b.academia_id === academiaId);
      if (propiaBreakdown && propiaBreakdown.total > 0) {
        const { error } = await supabase.rpc('eliminar_parte_preguntas' as any, {
          p_profesor_id: profesorId,
          p_academia_id: academiaId,
          p_nombre: deleteParte.nombre,
        });
        if (error) throw error;
      }
      toast.success(`Parte "${deleteParte.nombre}" eliminada de ${selectedAcademia?.academia_nombre ?? 'la academia'}`);
      setDeleteParte(null);
      cargarPartes(academiaId, academias);
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar la parte');
    } finally {
      setDeleting(false);
    }
  };

  // ── Derived totals ────────────────────────────────────────

  const temasTotals = useMemo(() => ({
    total: temas.reduce((a, t) => a + t.total, 0),
    verificadas: temas.reduce((a, t) => a + t.verificadas, 0),
    pendientes: temas.reduce((a, t) => a + t.pendientes, 0),
  }), [temas]);

  const partesTotals = useMemo(() => ({
    total: partes.reduce((a, p) => a + p.total, 0),
  }), [partes]);

  // ── Render ────────────────────────────────────────────────

  // Partes necesita academia seleccionada para gestión (crear/renombrar/borrar)
  const canManagePartes = !!academiaId;

  return (
    <div className="space-y-4">

      {/* Academia selector — para temas es obligatorio; para partes es contexto de gestión */}
      <div className="flex gap-2">
        {propias.length > 1 ? (
          <Select value={academiaId} onValueChange={v => { setAcademiaId(v); setSeccion('temas'); }}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Selecciona academia" />
            </SelectTrigger>
            <SelectContent>
              {propias.map(a => (
                <SelectItem key={a.academia_id} value={a.academia_id}>{a.academia_nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="flex-1 h-10 flex items-center px-3 rounded-md border bg-muted/50 text-sm font-medium text-muted-foreground">
            {propias[0]?.academia_nombre ?? 'Sin academia'}
          </div>
        )}
      </div>

      {/* Section toggle + action */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex p-1 bg-muted border rounded-xl">
          {(['temas', 'partes'] as const).map(s => (
            <button
              key={s}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-4 text-sm font-medium rounded-lg transition-all ${
                seccion === s
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setSeccion(s)}
            >
              {s === 'temas'
                ? <BookOpen className="h-3.5 w-3.5 flex-shrink-0" />
                : <Tag className="h-3.5 w-3.5 flex-shrink-0" />}
              <span>{s === 'temas' ? 'Temas' : 'Partes'}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                seccion === s
                  ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300'
                  : 'bg-muted-foreground/15 text-muted-foreground'
              }`}>
                {s === 'temas' ? temas.length : partes.length}
              </span>
            </button>
          ))}
        </div>
        <div className="flex-1 hidden sm:block" />
        {seccion === 'temas' ? (
          <Button
            onClick={() => setDialogCrearTema(true)}
            disabled={!academiaId}
            className="bg-teal-600 hover:bg-teal-700 flex-shrink-0"
          >
            <Plus className="h-4 w-4 mr-1" />
            Nuevo tema
          </Button>
        ) : (
          <Button
            onClick={() => setDialogCrearParte(true)}
            disabled={!canManagePartes}
            title={!canManagePartes ? 'Selecciona una academia para gestionar partes' : ''}
            className="bg-teal-600 hover:bg-teal-700 flex-shrink-0"
          >
            <Plus className="h-4 w-4 mr-1" />
            Nueva parte
          </Button>
        )}
      </div>

      {/* ═══ TEMAS ══════════════════════════════════════════ */}
      {seccion === 'temas' && (
        <>
          {!academiaId ? (
            <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
              <BookMarked className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Selecciona una academia para ver sus temas</p>
            </div>
          ) : (
            <>
              {!loadingTemas && temas.length > 0 && (
                <div className="flex flex-wrap gap-4 px-4 py-3 rounded-xl border bg-muted/40 text-sm">
                  <span className="flex items-center gap-1.5 font-medium">
                    <BookOpen className="h-3.5 w-3.5 text-teal-500" />
                    {temas.length} {temas.length === 1 ? 'tema' : 'temas'}
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Layers className="h-3.5 w-3.5" />
                    {temasTotals.total.toLocaleString()} preguntas
                  </span>
                  {temasTotals.total > 0 && (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <span className={`font-medium ${verifColor(verifPct(temasTotals.verificadas, temasTotals.total)).text}`}>
                        {verifPct(temasTotals.verificadas, temasTotals.total)}% verificadas
                      </span>
                    </>
                  )}
                </div>
              )}

              {loadingTemas ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl border animate-pulse bg-muted/50" />)}
                </div>
              ) : temas.length === 0 ? (
                <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
                  <BookOpen className="h-8 w-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Esta academia no tiene temas todavía</p>
                  <Button size="sm" className="mt-3 bg-teal-600 hover:bg-teal-700" onClick={() => setDialogCrearTema(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Crear primer tema
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {temas.map(t => {
                    const p = verifPct(t.verificadas, t.total);
                    const c = verifColor(p);
                    return (
                      <div key={t.id} className="flex items-start gap-3 px-3 py-3 rounded-xl border bg-card hover:shadow-sm transition-shadow">
                        <div className="w-7 h-7 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <BookOpen className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold truncate">{t.nombre}</p>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-xs text-muted-foreground font-medium">
                                {t.total > 0 ? `${t.total} preg.` : 'vacío'}
                              </span>
                              <button
                                onClick={() => { setEditTema(t); setEditNombreTema(t.nombre); }}
                                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title="Renombrar"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteTema(t)}
                                className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          {t.total > 0 ? (
                            <>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full transition-all duration-500 ${c.bar}`} style={{ width: `${p}%` }} />
                                </div>
                                <span className={`text-xs font-semibold flex-shrink-0 ${c.text}`}>{p}%</span>
                              </div>
                              <div className="flex gap-3 text-[11px] flex-wrap">
                                {t.verificadas > 0 && <span className="text-teal-600 dark:text-teal-400">✅ {t.verificadas} verif.</span>}
                                {t.pendientes > 0 && <span className="text-amber-600 dark:text-amber-400">🟡 {t.pendientes} pend.</span>}
                                {t.rechazadas > 0 && <span className="text-red-600 dark:text-red-400">❌ {t.rechazadas} rech.</span>}
                              </div>
                            </>
                          ) : (
                            <p className="text-[11px] text-muted-foreground">Sin preguntas aún</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ═══ PARTES (vista global) ═══════════════════════════ */}
      {seccion === 'partes' && (
        <>
          {/* Info bar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 rounded-xl border bg-muted/40">
            <div className="flex-1 space-y-0.5 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vista global de partes</p>
              <p className="text-xs text-muted-foreground">
                Todas las partes de todas tus academias · La gestión (crear/renombrar/borrar) aplica a{' '}
                <span className="font-medium text-foreground">
                  {selectedAcademia?.academia_nombre ?? 'la academia seleccionada'}
                </span>
              </p>
            </div>
            {partes.length > 0 && (
              <div className="flex items-center gap-3 text-sm flex-shrink-0">
                <span className="flex items-center gap-1.5 font-medium">
                  <Tag className="h-3.5 w-3.5 text-purple-500" />
                  {partes.length} {partes.length === 1 ? 'parte' : 'partes'}
                </span>
                {partesTotals.total > 0 && (
                  <>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{partesTotals.total.toLocaleString()} preguntas</span>
                  </>
                )}
              </div>
            )}
          </div>

          {!canManagePartes && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              Selecciona una academia propia arriba para poder crear, renombrar o eliminar partes.
            </div>
          )}

          {loadingPartes ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-xl border animate-pulse bg-muted/50" />)}
            </div>
          ) : partes.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
              <Tag className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Ninguna parte encontrada en tus academias</p>
              <p className="text-xs mt-1 mb-3 text-muted-foreground/70">
                Las partes aparecen automáticamente cuando se asignan a preguntas, o puedes crearlas aquí.
              </p>
              {canManagePartes && (
                <Button size="sm" className="bg-teal-600 hover:bg-teal-700" onClick={() => setDialogCrearParte(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Crear primera parte
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {partes.map(p => {
                const propiaBreakdown = p.breakdown.find(b => b.academia_id === academiaId);
                const propiaTotal = propiaBreakdown?.total ?? 0;
                return (
                  <div key={p.nombre} className="rounded-xl border bg-card hover:shadow-sm transition-shadow">
                    {/* Fila principal */}
                    <div className="flex items-center gap-3 px-3 py-3">
                      <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0">
                        <Tag className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold">{p.nombre}</span>
                          {PARTE_PRESETS.includes(p.nombre) && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300">
                              Preset
                            </Badge>
                          )}
                          {!p.en_tabla && canManagePartes && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400">
                              Sin registrar
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {p.total > 0
                            ? `${p.total.toLocaleString()} preguntas totales en ${p.breakdown.length} academia${p.breakdown.length !== 1 ? 's' : ''}`
                            : 'Sin preguntas aún'}
                        </p>
                      </div>
                      {canManagePartes && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => { setEditParte(p); setEditNombreParte(p.nombre); }}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Renombrar parte"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteParte(p)}
                            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 transition-colors"
                            title="Eliminar parte"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Desglose por academia */}
                    {p.breakdown.length > 0 && (
                      <div className="border-t mx-3 pb-3 pt-2 space-y-1.5">
                        {p.breakdown.map(b => {
                          const bPct = verifPct(b.verificadas, b.total);
                          const bColor = verifColor(bPct);
                          return (
                            <div key={b.academia_id} className="flex items-center gap-2">
                              <div className={`flex-shrink-0 ${b.es_biblioteca ? 'text-muted-foreground' : 'text-teal-600 dark:text-teal-400'}`}>
                                {b.es_biblioteca
                                  ? <Library className="h-3 w-3" />
                                  : <GraduationCap className="h-3 w-3" />}
                              </div>
                              <span className="text-xs text-muted-foreground truncate flex-shrink min-w-0 w-32">
                                {b.academia_nombre}
                              </span>
                              <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden min-w-0">
                                <div
                                  className={`h-full rounded-full ${bColor.bar}`}
                                  style={{ width: `${bPct}%` }}
                                />
                              </div>
                              <span className={`text-[11px] font-medium flex-shrink-0 w-6 text-right ${bColor.text}`}>{bPct}%</span>
                              <span className="text-[11px] text-muted-foreground flex-shrink-0 w-14 text-right">
                                {b.total.toLocaleString()} preg.
                              </span>
                              <div className="flex gap-2 text-[11px] flex-shrink-0">
                                {b.verificadas > 0 && <span className="text-teal-600 dark:text-teal-400">✅{b.verificadas}</span>}
                                {b.pendientes > 0 && <span className="text-amber-600 dark:text-amber-400">🟡{b.pendientes}</span>}
                                {b.rechazadas > 0 && <span className="text-red-600 dark:text-red-400">❌{b.rechazadas}</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ═══ DIALOGS ════════════════════════════════════════ */}

      {/* Crear tema */}
      <Dialog open={dialogCrearTema} onOpenChange={open => { setDialogCrearTema(open); if (!open) setNuevoTema(''); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-teal-500" />
              Nuevo tema
            </DialogTitle>
            {selectedAcademia && (
              <p className="text-xs text-muted-foreground pt-1">
                Academia: <span className="font-medium text-foreground">{selectedAcademia.academia_nombre}</span>
              </p>
            )}
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nombre <span className="text-red-500">*</span></Label>
              <Input value={nuevoTema} onChange={e => setNuevoTema(e.target.value)} placeholder="ej. Anatomía, Legislación..." onKeyDown={e => e.key === 'Enter' && handleCrearTema()} autoFocus />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDialogCrearTema(false)}>Cancelar</Button>
              <Button className="flex-1 bg-teal-600 hover:bg-teal-700" disabled={saving || !nuevoTema.trim()} onClick={handleCrearTema}>
                {saving ? 'Creando...' : 'Crear tema'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Renombrar tema */}
      <Dialog open={!!editTema} onOpenChange={open => { if (!open) setEditTema(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-base">Renombrar tema</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nuevo nombre <span className="text-red-500">*</span></Label>
              <Input value={editNombreTema} onChange={e => setEditNombreTema(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRenombrarTema()} autoFocus />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditTema(null)}>Cancelar</Button>
              <Button className="flex-1 bg-teal-600 hover:bg-teal-700" disabled={saving || !editNombreTema.trim()} onClick={handleRenombrarTema}>
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Eliminar tema */}
      <Dialog open={!!deleteTema} onOpenChange={open => { if (!open) setDeleteTema(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Eliminar tema
            </DialogTitle>
            <DialogDescription>
              Vas a eliminar <span className="font-medium text-foreground">"{deleteTema?.nombre}"</span>
              {deleteTema && deleteTema.total > 0 && <> con <span className="font-semibold text-red-600">{deleteTema.total} preguntas</span></>}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 p-3 flex gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 dark:text-red-400">
                {deleteTema && deleteTema.total > 0
                  ? `Se eliminarán también las ${deleteTema.total} preguntas del tema. Esta acción no se puede deshacer.`
                  : 'El tema se eliminará permanentemente.'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteTema(null)}>Cancelar</Button>
              <Button variant="destructive" className="flex-1" disabled={deleting} onClick={handleEliminarTema}>
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Crear parte */}
      <Dialog open={dialogCrearParte} onOpenChange={open => { setDialogCrearParte(open); if (!open) setNuevaParte(''); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Tag className="h-4 w-4 text-purple-500" />
              Nueva parte
            </DialogTitle>
            {selectedAcademia && (
              <p className="text-xs text-muted-foreground pt-1">
                Se creará en <span className="font-medium text-foreground">{selectedAcademia.academia_nombre}</span>
              </p>
            )}
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nombre <span className="text-red-500">*</span></Label>
              <Input value={nuevaParte} onChange={e => setNuevaParte(e.target.value)} placeholder="ej. Específica, Práctica..." onKeyDown={e => e.key === 'Enter' && handleCrearParte()} autoFocus />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Los presets <strong>Común</strong>, <strong>EXAMEN</strong> y <strong>Específica</strong> están disponibles por defecto en todos los formularios.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDialogCrearParte(false)}>Cancelar</Button>
              <Button className="flex-1 bg-teal-600 hover:bg-teal-700" disabled={saving || !nuevaParte.trim()} onClick={handleCrearParte}>
                {saving ? 'Creando...' : 'Crear parte'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Renombrar parte */}
      <Dialog open={!!editParte} onOpenChange={open => { if (!open) setEditParte(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Renombrar parte</DialogTitle>
            {editParte && selectedAcademia && (
              <p className="text-xs text-muted-foreground pt-1">
                Aplica solo a <span className="font-medium text-foreground">{selectedAcademia.academia_nombre}</span>
                {(() => {
                  const n = editParte.breakdown.find(b => b.academia_id === academiaId)?.total ?? 0;
                  return n > 0 ? ` · actualizará ${n} pregunta${n !== 1 ? 's' : ''}` : '';
                })()}
              </p>
            )}
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nuevo nombre <span className="text-red-500">*</span></Label>
              <Input value={editNombreParte} onChange={e => setEditNombreParte(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRenombrarParte()} autoFocus />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditParte(null)}>Cancelar</Button>
              <Button className="flex-1 bg-teal-600 hover:bg-teal-700" disabled={saving || !editNombreParte.trim()} onClick={handleRenombrarParte}>
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Eliminar parte */}
      <Dialog open={!!deleteParte} onOpenChange={open => { if (!open) setDeleteParte(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Eliminar parte
            </DialogTitle>
            <DialogDescription>
              Vas a eliminar <span className="font-medium text-foreground">"{deleteParte?.nombre}"</span>
              {selectedAcademia && <> de <span className="font-medium text-foreground">{selectedAcademia.academia_nombre}</span></>}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            {deleteParte && (() => {
              const n = deleteParte.breakdown.find(b => b.academia_id === academiaId)?.total ?? 0;
              return n > 0 ? (
                <div className="rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20 p-3 flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    <strong>{n} pregunta{n !== 1 ? 's' : ''}</strong> de esta academia {n !== 1 ? 'quedarán' : 'quedará'} sin parte asignada. No se eliminarán.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-muted p-3">
                  <p className="text-xs text-muted-foreground">Esta parte no tiene preguntas en esta academia. Se eliminará sin efecto sobre ninguna pregunta.</p>
                </div>
              );
            })()}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteParte(null)}>Cancelar</Button>
              <Button variant="destructive" className="flex-1" disabled={deleting} onClick={handleEliminarParte}>
                {deleting ? 'Eliminando...' : 'Eliminar parte'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
