import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, CheckCircle, Clock, XCircle, HelpCircle, AlertTriangle, ChevronLeft, ChevronRight, BadgeCheck } from 'lucide-react';
import { useGestionPreguntas, type PreguntaForm } from '@/hooks/useGestionPreguntas';
import { useParteOptions } from '@/hooks/useParteOptions';
import PreguntaFormDialog from '@/components/profesor/PreguntaFormDialog';
import ConvocatoriaBadge, { formatExamLabel } from '@/components/profesor/ConvocatoriaBadge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ProfesorAcademia } from '@/hooks/useProfesorData';

interface Props {
  profesorId: string;
  academias: ProfesorAcademia[];
  onRefresh: () => void;
}

const FORM_EMPTY: PreguntaForm = {
  academia_id: '',
  tema_id: '',
  parte: '',
  pregunta_texto: '',
  opcion_a: '',
  opcion_b: '',
  opcion_c: '',
  opcion_d: '',
  solucion_letra: 'A',
  explicacion_a: null,
  explicacion_b: null,
  explicacion_c: null,
  explicacion_d: null,
};

type StatusKey = 'verificada' | 'rechazada' | 'pendiente';

const STATUS_CONFIG: Record<StatusKey, { icon: React.ElementType; label: string; border: string; dot: string; text: string }> = {
  verificada: { icon: CheckCircle, label: 'Verificada', border: 'border-l-green-400',  dot: 'bg-green-400',  text: 'text-green-600 dark:text-green-400'  },
  rechazada:  { icon: XCircle,     label: 'Rechazada',  border: 'border-l-red-400',    dot: 'bg-red-400',    text: 'text-red-600 dark:text-red-400'    },
  pendiente:  { icon: Clock,       label: 'Pendiente',  border: 'border-l-amber-400',  dot: 'bg-amber-400',  text: 'text-amber-600 dark:text-amber-400' },
};

function getStatus(v: boolean, r: boolean): StatusKey {
  if (v) return 'verificada';
  if (r) return 'rechazada';
  return 'pendiente';
}

const PAGE_SIZE = 50;

export default function GestionPreguntas({ profesorId, academias, onRefresh }: Props) {
  const propias = academias.filter(a => !a.es_biblioteca);
  const { preguntas, total, loading, saving, cargar, guardar } = useGestionPreguntas(profesorId);
  const [academiaId, setAcademiaId] = useState('');

  useEffect(() => {
    if (propias.length === 1 && !academiaId) setAcademiaId(propias[0].academia_id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propias.length]);
  const [temaId, setTemaId] = useState('__all__');
  const [parteFilter, setParteFilter] = useState('__all__');
  const [convocatoriaId, setConvocatoriaId] = useState('__all__');
  const [soloOficiales, setSoloOficiales] = useState(false);
  const [page, setPage] = useState(0);
  const [temas, setTemas] = useState<{ id: string; nombre: string }[]>([]);
  const [convocatorias, setConvocatorias] = useState<{ id: string; exam_id: string }[]>([]);
  const parteOptions = useParteOptions(academiaId ? [academiaId] : []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<PreguntaForm>(FORM_EMPTY);
  const [formTemas, setFormTemas] = useState<{ id: string; nombre: string }[]>([]);
  const [formConvocatoria, setFormConvocatoria] = useState<{
    exam_id?: string | null;
    numero_pregunta?: number | null;
    anulada?: boolean | null;
    reserva?: boolean | null;
    sustituye_a?: number | null;
  } | undefined>(undefined);
  const [deleteItem, setDeleteItem] = useState<{ id: string; texto: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (academiaId) {
      supabase.from('temas').select('id, nombre').eq('academia_id', academiaId).order('nombre')
        .then(({ data }) => setTemas(data || []));
      supabase.from('convocatorias').select('id, exam_id').eq('academia_id', academiaId).order('exam_id')
        .then(({ data }) => setConvocatorias(data || []));
      setTemaId('__all__');
      setParteFilter('__all__');
      setConvocatoriaId('__all__');
      setPage(0);
    } else {
      setTemas([]);
      setConvocatorias([]);
    }
  }, [academiaId]);

  // Reset pagination al cambiar cualquier filtro
  useEffect(() => {
    setPage(0);
  }, [temaId, parteFilter, convocatoriaId, soloOficiales]);

  useEffect(() => {
    if (academiaId) cargar(academiaId, {
      temaId: temaId === '__all__' ? undefined : temaId,
      parteFilter: parteFilter === '__all__' ? undefined : parteFilter,
      convocatoriaId: convocatoriaId === '__all__' ? undefined : convocatoriaId,
      esOficial: soloOficiales ? true : undefined,
      page,
      pageSize: PAGE_SIZE,
    });
  }, [academiaId, temaId, parteFilter, convocatoriaId, soloOficiales, page, cargar]);

  const handleAcademiaForm = async (value: string) => {
    setForm(prev => ({ ...prev, academia_id: value, tema_id: '' }));
    const { data } = await supabase.from('temas').select('id, nombre').eq('academia_id', value).order('nombre');
    setFormTemas(data || []);
  };

  const handleEditar = async (p: typeof preguntas[0]) => {
    const [temaRes, pregRes] = await Promise.all([
      supabase.from('temas').select('id, nombre').eq('academia_id', p.academia_id).order('nombre'),
      supabase.from('preguntas')
        .select('opcion_a, opcion_b, opcion_c, opcion_d, explicacion_a, explicacion_b, explicacion_c, explicacion_d')
        .eq('id', p.id).single(),
    ]);
    setFormTemas(temaRes.data || []);
    const full = pregRes.data;
    setForm({
      id: p.id,
      academia_id: p.academia_id,
      tema_id: p.tema_id,
      parte: p.parte || '',
      pregunta_texto: p.pregunta_texto,
      opcion_a: full?.opcion_a || '',
      opcion_b: full?.opcion_b || '',
      opcion_c: full?.opcion_c || '',
      opcion_d: full?.opcion_d || '',
      solucion_letra: p.solucion_letra,
      explicacion_a: full?.explicacion_a || null,
      explicacion_b: full?.explicacion_b || null,
      explicacion_c: full?.explicacion_c || null,
      explicacion_d: full?.explicacion_d || null,
    });
    const conv = Array.isArray(p.convocatoria) ? p.convocatoria[0] : p.convocatoria;
    setFormConvocatoria(conv?.exam_id ? {
      exam_id: conv.exam_id,
      numero_pregunta: p.numero_pregunta,
      anulada: p.anulada,
      reserva: p.reserva,
      sustituye_a: p.sustituye_a,
    } : undefined);
    setDialogOpen(true);
  };

  const handleNueva = () => {
    setForm({ ...FORM_EMPTY, academia_id: academiaId, tema_id: temaId === '__all__' ? '' : temaId });
    if (academiaId) setFormTemas(temas);
    setFormConvocatoria(undefined);
    setDialogOpen(true);
  };

  const reload = () => {
    if (!academiaId) return;
    cargar(academiaId, {
      temaId: temaId === '__all__' ? undefined : temaId,
      parteFilter: parteFilter === '__all__' ? undefined : parteFilter,
      convocatoriaId: convocatoriaId === '__all__' ? undefined : convocatoriaId,
      esOficial: soloOficiales ? true : undefined,
      page,
      pageSize: PAGE_SIZE,
    });
  };

  const handleGuardar = async () => {
    if (!form.academia_id || !form.tema_id || !form.pregunta_texto || !form.opcion_a || !form.opcion_b) return;
    const id = await guardar(form);
    if (id) {
      setDialogOpen(false);
      setForm(FORM_EMPTY);
      reload();
      onRefresh();
    }
  };

  const handleEliminar = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      const { error } = await supabase.rpc('eliminar_pregunta' as any, {
        p_profesor_id: profesorId,
        p_pregunta_id: deleteItem.id,
      });
      if (error) throw error;
      toast.success('Pregunta eliminada');
      setDeleteItem(null);
      reload();
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar la pregunta');
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = total > 0 ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1;
  const hasNextPage = (page + 1) * PAGE_SIZE < total;

  const selectedTema = temas.find(t => t.id === temaId);

  return (
    <div className="space-y-4">

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        {propias.length > 1 ? (
          <Select value={academiaId} onValueChange={setAcademiaId}>
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

        {temas.length > 0 && (
          <Select value={temaId} onValueChange={setTemaId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Todos los temas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos los temas</SelectItem>
              {temas.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {academiaId && parteOptions.length > 0 && (
          <Select value={parteFilter} onValueChange={setParteFilter}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Todas las partes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas las partes</SelectItem>
              {parteOptions.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {convocatorias.length > 0 && (
          <Select value={convocatoriaId} onValueChange={setConvocatoriaId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Todos los exámenes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos los exámenes</SelectItem>
              {convocatorias.map(c => (
                <SelectItem key={c.id} value={c.id}>📋 {formatExamLabel(c.exam_id)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button
          variant="outline"
          onClick={() => setSoloOficiales(v => !v)}
          className={`flex-shrink-0 gap-1.5 ${soloOficiales ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-700 dark:text-indigo-300' : ''}`}
        >
          <BadgeCheck className="h-4 w-4" />
          Oficiales
        </Button>

        <Button onClick={handleNueva} disabled={!academiaId} className="bg-teal-600 hover:bg-teal-700 flex-shrink-0">
          <Plus className="h-4 w-4 mr-1" />
          Nueva
        </Button>
      </div>

      {/* Context bar */}
      {academiaId && !loading && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            {selectedTema ? <><span className="font-medium">{selectedTema.nombre}</span> · </> : ''}
            {total > preguntas.length
              ? <>Mostrando <span className="font-medium">{preguntas.length}</span> de <span className="font-medium">{total.toLocaleString()}</span></>
              : <>{total.toLocaleString()} preguntas</>}
          </p>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              {preguntas.filter(p => p.verificada).length} verif.
            </span>
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
              {preguntas.filter(p => !p.verificada && !p.rechazada).length} pend.
            </span>
          </div>
        </div>
      )}

      {/* Lista */}
      {!academiaId ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <HelpCircle className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Selecciona una academia para ver sus preguntas</p>
        </div>
      ) : loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl border border-l-4 border-l-gray-200 animate-pulse bg-card" />
          ))}
        </div>
      ) : preguntas.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <p className="text-sm">No hay preguntas en esta selección</p>
          <Button onClick={handleNueva} size="sm" className="mt-3 bg-teal-600 hover:bg-teal-700">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Crear primera pregunta
          </Button>
        </div>
      ) : (
        <>
        <div className="space-y-1.5">
          {preguntas.map(p => {
            const statusKey = getStatus(p.verificada, p.rechazada);
            const cfg = STATUS_CONFIG[statusKey];
            const Icon = cfg.icon;
            return (
              <div
                key={p.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border border-l-4 ${cfg.border} bg-card hover:shadow-sm transition-shadow`}
              >
                <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${cfg.text}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.pregunta_texto}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className={`text-[11px] font-medium ${cfg.text}`}>{cfg.label}</span>
                    {(() => {
                      const temaNombre = temas.find(t => t.id === p.tema_id)?.nombre;
                      return temaNombre ? (
                        <span className="text-[11px] text-muted-foreground border rounded px-1 truncate max-w-[120px]">{temaNombre}</span>
                      ) : null;
                    })()}
                    {p.parte && (
                      <span className="text-[11px] text-muted-foreground border rounded px-1">{p.parte}</span>
                    )}
                    {(() => {
                      const conv = Array.isArray(p.convocatoria) ? p.convocatoria[0] : p.convocatoria;
                      return (
                        <ConvocatoriaBadge
                          exam_id={conv?.exam_id}
                          numero_pregunta={p.numero_pregunta}
                          anulada={p.anulada}
                          reserva={p.reserva}
                          sustituye_a={p.sustituye_a}
                        />
                      );
                    })()}
                    <span className="text-[11px] text-muted-foreground ml-auto">
                      {new Date(p.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-shrink-0 h-8 w-8 p-0 text-muted-foreground hover:text-teal-600"
                  onClick={() => handleEditar(p)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <button
                  onClick={() => setDeleteItem({ id: p.id, texto: p.pregunta_texto })}
                  className="flex-shrink-0 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 transition-colors"
                  title="Eliminar pregunta"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 pt-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {page + 1} de {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={!hasNextPage} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
        </>
      )}

      {dialogOpen && (
        <PreguntaFormDialog
          open={dialogOpen}
          onClose={() => { setDialogOpen(false); setForm(FORM_EMPTY); setFormConvocatoria(undefined); }}
          form={form}
          setForm={setForm}
          saving={saving}
          onSave={handleGuardar}
          isEditing={!!form.id}
          academias={academias}
          temas={formTemas}
          onAcademiaChange={handleAcademiaForm}
          convocatoriaInfo={formConvocatoria}
        />
      )}

      {/* Diálogo de confirmación de borrado */}
      <Dialog open={!!deleteItem} onOpenChange={open => { if (!open) setDeleteItem(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Eliminar pregunta
            </DialogTitle>
            <DialogDescription className="text-sm line-clamp-2">
              "{deleteItem?.texto}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 p-3 flex gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 dark:text-red-400">
                Esta acción no se puede deshacer. Si la pregunta fue importada del banco, podrás volver a importarla.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteItem(null)}>
                Cancelar
              </Button>
              <Button variant="destructive" className="flex-1" disabled={deleting} onClick={handleEliminar}>
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
