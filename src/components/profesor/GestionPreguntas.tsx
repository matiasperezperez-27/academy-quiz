import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useGestionPreguntas, type PreguntaForm } from '@/hooks/useGestionPreguntas';
import { supabase } from '@/integrations/supabase/client';
import type { ProfesorAcademia } from '@/hooks/useProfesorData';

interface Props {
  profesorId: string;
  academias: ProfesorAcademia[];
  onRefresh: () => void;
}

const SOLUCIONES = ['A', 'B', 'C', 'D'] as const;

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
};

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
      supabase
        .from('temas')
        .select('id, nombre')
        .eq('academia_id', academiaId)
        .order('nombre')
        .then(({ data }) => setTemas(data || []));
      setTemaId('__all__');
    } else {
      setTemas([]);
    }
  }, [academiaId]);

  useEffect(() => {
    if (academiaId) {
      cargar(academiaId, temaId === '__all__' ? undefined : temaId);
    }
  }, [academiaId, temaId, cargar]);

  const handleAcademiaForm = async (value: string) => {
    setForm(prev => ({ ...prev, academia_id: value, tema_id: '' }));
    const { data } = await supabase
      .from('temas')
      .select('id, nombre')
      .eq('academia_id', value)
      .order('nombre');
    setFormTemas(data || []);
  };

  const handleEditar = async (p: typeof preguntas[0]) => {
    const { data: tema } = await supabase.from('temas').select('id, nombre').eq('academia_id', p.academia_id).order('nombre');
    setFormTemas(tema || []);
    setForm({
      id: p.id,
      academia_id: p.academia_id,
      tema_id: p.tema_id,
      parte: p.parte || '',
      pregunta_texto: p.pregunta_texto,
      opcion_a: '',
      opcion_b: '',
      opcion_c: '',
      opcion_d: '',
      solucion_letra: p.solucion_letra,
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

  const statusBadge = (v: boolean, r: boolean) => {
    if (v) return <Badge className="bg-green-100 text-green-700 text-xs"><CheckCircle className="h-3 w-3 mr-1" />Verificada</Badge>;
    if (r) return <Badge className="bg-red-100 text-red-700 text-xs"><XCircle className="h-3 w-3 mr-1" />Rechazada</Badge>;
    return <Badge className="bg-amber-100 text-amber-700 text-xs"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Filtros + Nueva */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={academiaId} onValueChange={setAcademiaId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecciona academia" />
              </SelectTrigger>
              <SelectContent>
                {academias.map(a => (
                  <SelectItem key={a.academia_id} value={a.academia_id}>
                    {a.academia_nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {temas.length > 0 && (
              <Select value={temaId} onValueChange={setTemaId}>
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

            <Button onClick={handleNueva} disabled={!academiaId} className="bg-teal-600 hover:bg-teal-700">
              <Plus className="h-4 w-4 mr-1" />
              Nueva
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      {!academiaId ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Selecciona una academia para ver sus preguntas
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : preguntas.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No hay preguntas en esta selección
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {preguntas.map(p => (
            <Card key={p.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.pregunta_texto}</p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {statusBadge(p.verificada, p.rechazada)}
                    {p.parte && <Badge variant="outline" className="text-xs">{p.parte}</Badge>}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleEditar(p)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
          <p className="text-xs text-center text-muted-foreground pt-2">
            Mostrando {preguntas.length} preguntas
          </p>
        </div>
      )}

      {/* Dialog formulario */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Editar Pregunta' : 'Nueva Pregunta'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Academia</Label>
                <Select value={form.academia_id} onValueChange={handleAcademiaForm}>
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
                <Label>Tema</Label>
                <Select
                  value={form.tema_id}
                  onValueChange={v => setForm(prev => ({ ...prev, tema_id: v }))}
                  disabled={!form.academia_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {formTemas.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Parte (opcional)</Label>
              <Input
                value={form.parte || ''}
                onChange={e => setForm(prev => ({ ...prev, parte: e.target.value }))}
                placeholder="ej. Parte 1, Bloque A..."
              />
            </div>

            <div className="space-y-2">
              <Label>Pregunta</Label>
              <Textarea
                value={form.pregunta_texto}
                onChange={e => setForm(prev => ({ ...prev, pregunta_texto: e.target.value }))}
                placeholder="Texto de la pregunta..."
                className="h-20"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(['opcion_a', 'opcion_b', 'opcion_c', 'opcion_d'] as const).map((key, i) => (
                <div key={key} className="space-y-1">
                  <Label>Opción {SOLUCIONES[i]}{i >= 2 ? ' (opcional)' : ''}</Label>
                  <Input
                    value={(form as any)[key] || ''}
                    onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={`Opción ${SOLUCIONES[i]}`}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Respuesta correcta</Label>
              <Select
                value={form.solucion_letra}
                onValueChange={v => setForm(prev => ({ ...prev, solucion_letra: v }))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOLUCIONES.map(s => (
                    <SelectItem key={s} value={s}>Opción {s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-teal-600 hover:bg-teal-700"
                disabled={saving || !form.academia_id || !form.tema_id || !form.pregunta_texto || !form.opcion_a || !form.opcion_b}
                onClick={handleGuardar}
              >
                {saving ? 'Guardando...' : form.id ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
