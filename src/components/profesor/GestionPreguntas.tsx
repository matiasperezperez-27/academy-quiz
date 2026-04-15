import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, CheckCircle, Clock, XCircle, HelpCircle } from 'lucide-react';
import { useGestionPreguntas, type PreguntaForm } from '@/hooks/useGestionPreguntas';
import PreguntaFormDialog from '@/components/profesor/PreguntaFormDialog';
import { supabase } from '@/integrations/supabase/client';
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

export default function GestionPreguntas({ profesorId, academias, onRefresh }: Props) {
  const { preguntas, loading, saving, cargar, guardar } = useGestionPreguntas(profesorId);
  const [academiaId, setAcademiaId] = useState('');
  const [temaId, setTemaId] = useState('__all__');
  const [temas, setTemas] = useState<{ id: string; nombre: string }[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<PreguntaForm>(FORM_EMPTY);
  const [formTemas, setFormTemas] = useState<{ id: string; nombre: string }[]>([]);

  useEffect(() => {
    if (academiaId) {
      supabase.from('temas').select('id, nombre').eq('academia_id', academiaId).order('nombre')
        .then(({ data }) => setTemas(data || []));
      setTemaId('__all__');
    } else {
      setTemas([]);
    }
  }, [academiaId]);

  useEffect(() => {
    if (academiaId) cargar(academiaId, temaId === '__all__' ? undefined : temaId);
  }, [academiaId, temaId, cargar]);

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
    setDialogOpen(true);
  };

  const handleNueva = () => {
    setForm({ ...FORM_EMPTY, academia_id: academiaId, tema_id: temaId });
    if (academiaId) setFormTemas(temas);
    setDialogOpen(true);
  };

  const handleGuardar = async () => {
    if (!form.academia_id || !form.tema_id || !form.pregunta_texto || !form.opcion_a || !form.opcion_b) return;
    const id = await guardar(form);
    if (id) {
      setDialogOpen(false);
      setForm(FORM_EMPTY);
      if (academiaId) cargar(academiaId, temaId || undefined);
      onRefresh();
    }
  };

  const selectedTema = temas.find(t => t.id === temaId);

  return (
    <div className="space-y-4">

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={academiaId} onValueChange={setAcademiaId}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Selecciona academia" />
          </SelectTrigger>
          <SelectContent>
            {academias.map(a => (
              <SelectItem key={a.academia_id} value={a.academia_id}>{a.academia_nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>

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
            {preguntas.length} preguntas
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
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[11px] font-medium ${cfg.text}`}>{cfg.label}</span>
                    {p.parte && (
                      <span className="text-[11px] text-muted-foreground border rounded px-1">{p.parte}</span>
                    )}
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
              </div>
            );
          })}
        </div>
      )}

      <PreguntaFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setForm(FORM_EMPTY); }}
        form={form}
        setForm={setForm}
        saving={saving}
        onSave={handleGuardar}
        isEditing={!!form.id}
        academias={academias}
        temas={formTemas}
        onAcademiaChange={handleAcademiaForm}
      />
    </div>
  );
}
