import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2 } from 'lucide-react';
import type { PreguntaForm } from '@/hooks/useGestionPreguntas';
import type { ProfesorAcademia } from '@/hooks/useProfesorData';

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
}: Props) {
  const patch = (updates: Partial<PreguntaForm>) =>
    setForm(prev => ({ ...prev, ...updates }));

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
              <Input
                value={form.parte || ''}
                onChange={e => patch({ parte: e.target.value })}
                placeholder="ej. Parte 1, Bloque A, EXAMEN..."
                className="h-9"
              />
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
                    className={`flex items-center gap-2 pl-1 pr-3 py-1.5 rounded-lg border transition-all duration-150 ${
                      isCorrecta
                        ? 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-700'
                        : 'bg-background border-input hover:border-muted-foreground/40'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => patch({ solucion_letra: letra })}
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                        isCorrecta
                          ? 'bg-green-500 border-green-500 text-white shadow-sm shadow-green-200 dark:shadow-green-900/40'
                          : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-teal-400 hover:text-teal-600'
                      }`}
                      title={isCorrecta ? 'Respuesta correcta' : `Marcar ${letra} como correcta`}
                    >
                      {isCorrecta ? <CheckCircle2 className="h-4 w-4" /> : letra}
                    </button>
                    <Input
                      value={(form as any)[fieldKey] || ''}
                      onChange={e => patch({ [fieldKey]: e.target.value })}
                      placeholder={isOpcional ? `Opción ${letra} (opcional)` : `Opción ${letra} *`}
                      className="flex-1 h-8 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-1 text-sm"
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
              Al guardar cambios en el enunciado u opciones, la pregunta volverá a estado <strong>pendiente</strong> para ser reverificada.
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
