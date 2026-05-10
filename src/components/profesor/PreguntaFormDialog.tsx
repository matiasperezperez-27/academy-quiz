import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Library, ChevronDown, ChevronUp } from 'lucide-react';
import { useParteOptions } from '@/hooks/useParteOptions';
import type { PreguntaForm } from '@/hooks/useGestionPreguntas';
import type { ProfesorAcademia } from '@/hooks/useProfesorData';

interface OriginalPregunta {
  pregunta_texto: string;
  opcion_a: string;
  opcion_b: string;
  opcion_c?: string | null;
  opcion_d?: string | null;
  solucion_letra: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  form: PreguntaForm;
  setForm: React.Dispatch<React.SetStateAction<PreguntaForm>>;
  saving: boolean;
  onSave: () => void;
  isEditing: boolean;
  // Contexto (opcional: solo en GestionPreguntas)
  academias?: ProfesorAcademia[];
  temas?: { id: string; nombre: string }[];
  onAcademiaChange?: (id: string) => void;
  // IA rewrite (opcional: solo cuando hay pregunta clonada)
  onRewriteAI?: () => Promise<void>;
  aiBusy?: boolean;
  // Pregunta original del banco (para comparación)
  originalPregunta?: OriginalPregunta;
}

const OPCIONES = [
  { letra: 'A', fieldKey: 'opcion_a' as const, expKey: 'explicacion_a' as const },
  { letra: 'B', fieldKey: 'opcion_b' as const, expKey: 'explicacion_b' as const },
  { letra: 'C', fieldKey: 'opcion_c' as const, expKey: 'explicacion_c' as const },
  { letra: 'D', fieldKey: 'opcion_d' as const, expKey: 'explicacion_d' as const },
] as const;

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
        {children}
      </h3>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

export default function PreguntaFormDialog({
  open, onClose, form, setForm, saving, onSave, isEditing,
  academias, temas, onAcademiaChange,
  onRewriteAI, aiBusy, originalPregunta,
}: Props) {
  const patch = (updates: Partial<PreguntaForm>) =>
    setForm(prev => ({ ...prev, ...updates }));

  const [showOriginal, setShowOriginal] = useState(false);
  useEffect(() => { if (!open) setShowOriginal(false); }, [open]);

  // Parte dropdown — carga valores existentes de la BD
  const academiaIds = academias
    ? academias.filter(a => !a.es_biblioteca).map(a => a.academia_id)
    : form.academia_id ? [form.academia_id] : [];
  const parteOptions = useParteOptions(academiaIds);
  // Asegura que el valor actual siempre aparezca en el listado aunque no esté en la BD aún
  const allParteOptions = form.parte && !parteOptions.includes(form.parte)
    ? [...parteOptions, form.parte].sort()
    : parteOptions;
  const [parteKey, setParteKey] = useState('__none__');
  const [parteNew, setParteNew] = useState('');

  useEffect(() => {
    if (!open) return;
    const val = form.parte?.trim() || '';
    if (!val) { setParteKey('__none__'); setParteNew(''); }
    else { setParteKey(val); setParteNew(''); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleParteChange = (val: string) => {
    setParteKey(val);
    if (val === '__none__') { patch({ parte: '' }); setParteNew(''); }
    else if (val !== '__new__') { patch({ parte: val }); setParteNew(''); }
  };

  const optionRefs = useRef<(HTMLTextAreaElement | null)[]>([null, null, null, null]);
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      optionRefs.current.forEach(el => {
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = el.scrollHeight + 'px';
      });
    });
    return () => cancelAnimationFrame(id);
  }, [open, form.opcion_a, form.opcion_b, form.opcion_c, form.opcion_d]);

  const canSave = Boolean(
    form.pregunta_texto?.trim() &&
    form.opcion_a?.trim() &&
    form.opcion_b?.trim() &&
    form.solucion_letra &&
    (!academias || (form.academia_id && form.tema_id))
  );

  return (
    <Dialog open={open} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {isEditing ? 'Editar Pregunta' : 'Nueva Pregunta'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-1">

          {/* ── Reescribir con IA (solo cuando la pregunta viene del banco) ── */}
          {onRewriteAI && (
            <div className="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-purple-700 dark:text-purple-400">Reescribir con IA</p>
                <p className="text-xs text-purple-600 dark:text-purple-500">
                  Genera una nueva redacción manteniendo el significado y la respuesta correcta.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={aiBusy || saving}
                onClick={onRewriteAI}
                className="flex-shrink-0 border-purple-300 text-purple-700 hover:bg-purple-100 dark:text-purple-400 dark:border-purple-700 dark:hover:bg-purple-900/40"
              >
                {aiBusy ? (
                  <><span className="animate-spin inline-block mr-1.5">⚙️</span>Reescribiendo...</>
                ) : (
                  <>🤖 Reescribir</>
                )}
              </Button>
            </div>
          )}

          {/* ── Original del banco (referencia para comparar) ── */}
          {originalPregunta && (
            <div className="rounded-lg border border-blue-200 dark:border-blue-800 overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-950/60 transition-colors text-left"
                onClick={() => setShowOriginal(v => !v)}
              >
                <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400">
                  <Library className="h-3.5 w-3.5" />
                  Original del banco
                </span>
                {showOriginal
                  ? <ChevronUp className="h-3.5 w-3.5 text-blue-500" />
                  : <ChevronDown className="h-3.5 w-3.5 text-blue-500" />}
              </button>
              {showOriginal && (
                <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 space-y-2.5">
                  <p className="text-sm font-medium leading-snug text-foreground">{originalPregunta.pregunta_texto}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {([
                      ['A', originalPregunta.opcion_a],
                      ['B', originalPregunta.opcion_b],
                      ['C', originalPregunta.opcion_c],
                      ['D', originalPregunta.opcion_d],
                    ] as [string, string | null | undefined][])
                      .filter(([, v]) => v)
                      .map(([letra, texto]) => {
                        const esCorrecta = originalPregunta.solucion_letra === letra;
                        return (
                          <div key={letra} className={`flex gap-1.5 items-start text-xs px-2 py-1.5 rounded border ${esCorrecta ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-white/60 dark:bg-white/5 border-transparent'}`}>
                            <span className={`font-bold flex-shrink-0 ${esCorrecta ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>{letra}.</span>
                            <span className="break-words flex-1">{texto}</span>
                            {esCorrecta && <span className="flex-shrink-0 text-green-500 font-bold text-[11px]">✓</span>}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Ubicación (solo GestionPreguntas) ── */}
          {academias && (
            <div className="space-y-3">
              <SectionHeader>Ubicación</SectionHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Academia <span className="text-red-500">*</span></Label>
                  <Select value={form.academia_id} onValueChange={onAcademiaChange}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {academias.map(a => (
                        <SelectItem key={a.academia_id} value={a.academia_id}>{a.academia_nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Tema <span className="text-red-500">*</span></Label>
                  <Select
                    value={form.tema_id}
                    onValueChange={v => patch({ tema_id: v })}
                    disabled={!form.academia_id || !temas?.length}
                  >
                    <SelectTrigger><SelectValue placeholder="Seleccionar tema" /></SelectTrigger>
                    <SelectContent>
                      {temas?.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* ── Enunciado ── */}
          <div className="space-y-3">
            <SectionHeader>Enunciado</SectionHeader>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Parte <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Select value={parteKey} onValueChange={handleParteChange}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Sin parte específica" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin parte específica</SelectItem>
                  {allParteOptions.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                  <SelectItem value="__new__">+ Nueva parte...</SelectItem>
                </SelectContent>
              </Select>
              {parteKey === '__new__' && (
                <Input
                  value={parteNew}
                  onChange={e => { setParteNew(e.target.value); patch({ parte: e.target.value }); }}
                  placeholder="Escribe el nombre de la nueva parte..."
                  className="h-9"
                  autoFocus
                />
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Texto de la pregunta <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={form.pregunta_texto}
                onChange={e => patch({ pregunta_texto: e.target.value })}
                placeholder="Escribe aquí el enunciado completo..."
                className="min-h-[96px] resize-y"
              />
            </div>
          </div>

          {/* ── Opciones ── */}
          <div className="space-y-3">
            <SectionHeader>Opciones de respuesta</SectionHeader>
            <p className="text-xs text-muted-foreground -mt-1">
              Haz clic en la letra para marcarla como respuesta correcta. C y D son opcionales.
            </p>
            <div className="space-y-2">
              {OPCIONES.map(({ letra, fieldKey }, i) => {
                const isCorrecta = form.solucion_letra === letra;
                const isOpcional = i >= 2;
                return (
                  <div
                    key={letra}
                    className={`flex items-start gap-2 pl-1 pr-3 py-1.5 rounded-lg border transition-all duration-150 ${
                      isCorrecta
                        ? 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-700'
                        : 'bg-background border-input hover:border-muted-foreground/40'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => patch({ solucion_letra: letra })}
                      className={`flex-shrink-0 mt-1 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                        isCorrecta
                          ? 'bg-green-500 border-green-500 text-white shadow-sm shadow-green-200 dark:shadow-green-900/40'
                          : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-teal-400 hover:text-teal-600'
                      }`}
                      title={isCorrecta ? 'Respuesta correcta' : `Marcar ${letra} como correcta`}
                    >
                      {isCorrecta ? <CheckCircle2 className="h-4 w-4" /> : letra}
                    </button>
                    <textarea
                      ref={el => { optionRefs.current[i] = el; }}
                      value={(form as any)[fieldKey] || ''}
                      onChange={e => {
                        patch({ [fieldKey]: e.target.value });
                        e.currentTarget.style.height = '0';
                        e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                      }}
                      placeholder={isOpcional ? `Opción ${letra} (opcional)` : `Opción ${letra} *`}
                      rows={1}
                      className="flex-1 resize-none overflow-hidden border-0 bg-transparent outline-none focus:ring-0 px-1 py-1.5 text-sm leading-snug placeholder:text-muted-foreground"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Explicaciones IA ── */}
          <div className="space-y-3">
            <SectionHeader>Explicaciones IA <span className="font-normal text-muted-foreground">(opcional)</span></SectionHeader>
            <p className="text-xs text-muted-foreground -mt-1">
              Se muestran al alumno tras responder. Correcta: por qué es correcta. Distractores: por qué son incorrectas.
            </p>
            <div className="space-y-3">
              {OPCIONES.map(({ letra, expKey }) => {
                const isCorrecta = form.solucion_letra === letra;
                const val = (form as any)[expKey] as string | null | undefined;
                return (
                  <div key={letra} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                        isCorrecta
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}>{letra}</span>
                      <span className={`text-xs ${isCorrecta ? 'text-green-600 dark:text-green-400 font-medium' : 'text-muted-foreground'}`}>
                        {isCorrecta ? '✓ Correcta' : 'Distractor'}
                      </span>
                      {val && (
                        <span className="text-xs text-muted-foreground ml-auto">{val.length} car.</span>
                      )}
                    </div>
                    <Textarea
                      value={val || ''}
                      onChange={e => patch({ [expKey]: e.target.value || null })}
                      placeholder={
                        isCorrecta
                          ? 'Explica por qué esta opción es correcta...'
                          : 'Explica brevemente por qué esta opción es incorrecta...'
                      }
                      className={`h-16 resize-none text-sm ${
                        isCorrecta
                          ? 'border-green-200 focus-visible:ring-green-400 dark:border-green-800'
                          : ''
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Aviso + Acciones ── */}
          {isEditing && (
            <p className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              Los cambios manuales conservan el estado actual. Solo las reescrituras con IA devuelven la pregunta a <strong>pendiente</strong>.
            </p>
          )}

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-teal-600 hover:bg-teal-700"
              disabled={saving || !canSave}
              onClick={onSave}
            >
              {saving
                ? 'Guardando...'
                : isEditing ? 'Guardar cambios' : 'Crear pregunta'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
