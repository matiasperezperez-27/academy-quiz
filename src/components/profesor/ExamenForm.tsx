import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { ProfesorAcademia } from '@/hooks/useProfesorData';
import type { ExamenForm as ExamenFormType } from '@/hooks/useExamenes';

interface Props {
  academias: ProfesorAcademia[];
  saving: boolean;
  onSave: (form: ExamenFormType) => void;
  onCancel: () => void;
}

interface PreguntaSeleccionable {
  id: string;
  pregunta_texto: string;
  solucion_letra: string;
  parte: string | null;
  tema_nombre: string;
}

const STEPS = ['Datos básicos', 'Seleccionar preguntas', 'Revisar y crear'] as const;

export default function ExamenForm({ academias, saving, onSave, onCancel }: Props) {
  const [step, setStep] = useState(0);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [academiaId, setAcademiaId] = useState('');
  const [duracion, setDuracion] = useState('');
  const [preguntas, setPreguntas] = useState<PreguntaSeleccionable[]>([]);
  const [seleccionadas, setSeleccionadas] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [loadingPreguntas, setLoadingPreguntas] = useState(false);

  useEffect(() => {
    if (step === 1 && academiaId) {
      setLoadingPreguntas(true);
      supabase
        .from('preguntas')
        .select('id, pregunta_texto, solucion_letra, parte, tema:temas(nombre)')
        .eq('academia_id', academiaId)
        .eq('verificada', true)
        .order('created_at', { ascending: false })
        .limit(200)
        .then(({ data }) => {
          setPreguntas(
            (data || []).map((p: any) => ({
              id: p.id,
              pregunta_texto: p.pregunta_texto,
              solucion_letra: p.solucion_letra,
              parte: p.parte,
              tema_nombre: p.tema?.nombre ?? '',
            }))
          );
          setLoadingPreguntas(false);
        });
    }
  }, [step, academiaId]);

  const toggleSeleccion = (id: string) => {
    setSeleccionadas(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const preguntasFiltradas = preguntas.filter(p =>
    busqueda === '' ||
    p.pregunta_texto.toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.tema_nombre || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  const academia = academias.find(a => a.academia_id === academiaId);

  const handleFinalizar = () => {
    onSave({
      nombre,
      descripcion: descripcion || undefined,
      academia_id: academiaId,
      duracion_minutos: duracion ? parseInt(duracion) : undefined,
      pregunta_ids: seleccionadas,
    });
  };

  return (
    <div className="space-y-4">
      {/* Progress steps */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium ${
                i < step
                  ? 'bg-teal-600 text-white'
                  : i === step
                  ? 'bg-teal-100 text-teal-700 border-2 border-teal-600'
                  : 'bg-gray-100 text-gray-400 dark:bg-gray-800'
              }`}
            >
              {i < step ? <CheckCircle className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`text-sm hidden sm:inline ${i === step ? 'font-medium' : 'text-muted-foreground'}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`h-px flex-1 w-6 ${i < step ? 'bg-teal-600' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Datos básicos */}
      {step === 0 && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Nombre del examen *</Label>
              <Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="ej. Examen final Tema 1" />
            </div>
            <div className="space-y-2">
              <Label>Descripción (opcional)</Label>
              <Textarea
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                placeholder="Descripción del examen..."
                className="h-20"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Academia *</Label>
                <Select value={academiaId} onValueChange={v => { setAcademiaId(v); setSeleccionadas([]); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {academias.map(a => (
                      <SelectItem key={a.academia_id} value={a.academia_id}>
                        {a.academia_nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duración (minutos, opcional)</Label>
                <Input
                  type="number"
                  value={duracion}
                  onChange={e => setDuracion(e.target.value)}
                  placeholder="ej. 60"
                  min="1"
                />
              </div>
            </div>
            <Button
              className="w-full bg-teal-600 hover:bg-teal-700"
              disabled={!nombre.trim() || !academiaId}
              onClick={() => setStep(1)}
            >
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Seleccionar preguntas */}
      {step === 1 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {seleccionadas.length} preguntas seleccionadas
            </p>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar..."
                className="pl-9 w-48 h-9"
              />
            </div>
          </div>

          {loadingPreguntas ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse h-14 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              ))}
            </div>
          ) : preguntasFiltradas.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                {preguntas.length === 0
                  ? 'No hay preguntas verificadas en esta academia'
                  : 'No hay resultados para tu búsqueda'}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {preguntasFiltradas.map(p => {
                const sel = seleccionadas.includes(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => toggleSeleccion(p.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      sel
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-teal-300'
                    }`}
                  >
                    <div className="flex gap-3 items-start">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        sel ? 'bg-teal-600 border-teal-600' : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {sel && <CheckCircle className="h-3 w-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-snug line-clamp-2">{p.pregunta_texto}</p>
                        <div className="flex gap-2 mt-1">
                          {p.tema_nombre && <Badge variant="outline" className="text-xs">{p.tema_nombre}</Badge>}
                          {p.parte && <Badge variant="outline" className="text-xs">{p.parte}</Badge>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(0)}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Atrás
            </Button>
            <Button
              className="flex-1 bg-teal-600 hover:bg-teal-700"
              disabled={seleccionadas.length === 0}
              onClick={() => setStep(2)}
            >
              Revisar ({seleccionadas.length})
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Revisar y crear */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumen del examen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Nombre</p>
                <p className="font-medium">{nombre}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Academia</p>
                <p className="font-medium">{academia?.academia_nombre}</p>
              </div>
              {duracion && (
                <div>
                  <p className="text-muted-foreground">Duración</p>
                  <p className="font-medium">{duracion} min</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">Preguntas</p>
                <p className="font-medium">{seleccionadas.length}</p>
              </div>
            </div>
            {descripcion && (
              <div>
                <p className="text-sm text-muted-foreground">Descripción</p>
                <p className="text-sm">{descripcion}</p>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Atrás
              </Button>
              <Button
                className="flex-1 bg-teal-600 hover:bg-teal-700"
                disabled={saving}
                onClick={handleFinalizar}
              >
                {saving ? 'Creando...' : 'Crear Examen'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Button variant="ghost" className="w-full text-muted-foreground" onClick={onCancel}>
        Cancelar
      </Button>
    </div>
  );
}
