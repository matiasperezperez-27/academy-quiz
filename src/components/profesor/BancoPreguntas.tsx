import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ChevronLeft, ChevronRight, Download, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useBancoPreguntas, type PreguntaBanco } from '@/hooks/useBancoPreguntas';
import { useGestionPreguntas, type PreguntaForm } from '@/hooks/useGestionPreguntas';
import PreguntaFormDialog from '@/components/profesor/PreguntaFormDialog';
import type { ProfesorAcademia } from '@/hooks/useProfesorData';

interface Props {
  profesorId: string;
  academias: ProfesorAcademia[];
}

const PAGE_SIZE = 10;

export default function BancoPreguntas({ profesorId, academias }: Props) {
  const { preguntas, loading, total, cloning, cargar, clonar } = useBancoPreguntas(profesorId);
  const { saving, guardar } = useGestionPreguntas(profesorId);

  // Academias propias del profesor (no biblioteca)
  const propias = academias; // ya filtradas por profesor_academias, que excluye bibliotecas

  // Academias biblioteca (fuente)
  const [bibliotecas, setBibliotecas] = useState<{ id: string; nombre: string }[]>([]);
  const [srcAcademiaId, setSrcAcademiaId] = useState('__all__');
  const [srcTemaId, setSrcTemaId] = useState('__all__');
  const [srcTemas, setSrcTemas] = useState<{ id: string; nombre: string }[]>([]);

  // Destino
  const [destAcademiaId, setDestAcademiaId] = useState('');
  const [destTemaId, setDestTemaId] = useState('');
  const [destTemas, setDestTemas] = useState<{ id: string; nombre: string }[]>([]);

  const [soloNoImportadas, setSoloNoImportadas] = useState(true);
  const [page, setPage] = useState(0);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<PreguntaForm | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  // Cargar academias biblioteca
  useEffect(() => {
    (supabase.from('academias') as any)
      .select('id, nombre')
      .eq('es_biblioteca', true)
      .order('nombre')
      .then(({ data }: any) => setBibliotecas(data || []));
  }, []);

  // Auto-seleccionar primera academia propia
  useEffect(() => {
    if (propias.length === 1 && !destAcademiaId) {
      setDestAcademiaId(propias[0].academia_id);
    }
  }, [propias, destAcademiaId]);

  // Cargar temas fuente cuando cambia academia fuente
  useEffect(() => {
    if (srcAcademiaId === '__all__') {
      setSrcTemas([]);
      setSrcTemaId('__all__');
      return;
    }
    supabase.from('temas').select('id, nombre').eq('academia_id', srcAcademiaId).order('nombre')
      .then(({ data }) => { setSrcTemas(data || []); setSrcTemaId('__all__'); });
  }, [srcAcademiaId]);

  // Cargar temas destino cuando cambia academia destino
  useEffect(() => {
    if (!destAcademiaId) {
      setDestTemas([]);
      setDestTemaId('');
      return;
    }
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

  const handleImportar = async (pregunta: PreguntaBanco) => {
    if (!destAcademiaId || !destTemaId) {
      toast.error('Selecciona la academia y tema destino antes de importar');
      return;
    }
    const newId = await clonar(pregunta.id, destAcademiaId, destTemaId);
    if (!newId) return;

    // Abrir dialog con la pregunta clonada para revisión/edición
    setForm({
      id: newId,
      academia_id: destAcademiaId,
      tema_id: destTemaId,
      parte: pregunta.parte || '',
      pregunta_texto: pregunta.pregunta_texto,
      opcion_a: pregunta.opcion_a,
      opcion_b: pregunta.opcion_b,
      opcion_c: pregunta.opcion_c || '',
      opcion_d: pregunta.opcion_d || '',
      solucion_letra: pregunta.solucion_letra,
      pregunta_origen_id: pregunta.id,
      modificada_por_ia: false,
    });
    setDialogOpen(true);
  };

  const handleRewriteAI = async () => {
    if (!form) return;
    setAiBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('rewrite-question', {
        body: {
          pregunta_texto: form.pregunta_texto,
          opcion_a: form.opcion_a,
          opcion_b: form.opcion_b,
          opcion_c: form.opcion_c || null,
          opcion_d: form.opcion_d || null,
          solucion_letra: form.solucion_letra,
          parte: form.parte || null,
          tema_nombre: destTemas.find(t => t.id === form.tema_id)?.nombre,
        },
      });
      if (error) throw error;
      setForm(prev => prev ? {
        ...prev,
        pregunta_texto: data.pregunta_texto ?? prev.pregunta_texto,
        opcion_a: data.opcion_a ?? prev.opcion_a,
        opcion_b: data.opcion_b ?? prev.opcion_b,
        opcion_c: data.opcion_c ?? prev.opcion_c,
        opcion_d: data.opcion_d ?? prev.opcion_d,
        solucion_letra: data.solucion_letra ?? prev.solucion_letra,
        modificada_por_ia: true,
      } : prev);
      toast.success('Pregunta reescrita con IA');
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
      toast.success('Pregunta guardada en tu academia');
    }
  };

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

  return (
    <div className="space-y-4">

      {/* Destino */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Importar hacia
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Academia destino</Label>
              <Select value={destAcademiaId} onValueChange={setDestAcademiaId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Seleccionar tu academia" />
                </SelectTrigger>
                <SelectContent>
                  {propias.map(a => (
                    <SelectItem key={a.academia_id} value={a.academia_id}>
                      {a.academia_nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tema destino <span className="text-red-500">*</span></Label>
              <Select
                value={destTemaId}
                onValueChange={setDestTemaId}
                disabled={!destAcademiaId || destTemas.length === 0}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={destTemas.length === 0 ? 'Crea un tema primero' : 'Seleccionar tema'} />
                </SelectTrigger>
                <SelectContent>
                  {destTemas.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>
                  ))}
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
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Banco de preguntas
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={srcAcademiaId} onValueChange={v => { setSrcAcademiaId(v); setPage(0); }}>
              <SelectTrigger className="flex-1 h-9">
                <SelectValue placeholder="Todas las academias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas las academias</SelectItem>
                {bibliotecas.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={srcTemaId}
              onValueChange={v => { setSrcTemaId(v); setPage(0); }}
              disabled={srcTemas.length === 0}
            >
              <SelectTrigger className="flex-1 h-9">
                <SelectValue placeholder="Todos los temas" />
              </SelectTrigger>
              <SelectContent className="w-[var(--radix-select-trigger-width)]">
                <SelectItem value="__all__">Todos los temas</SelectItem>
                {srcTemas.map(t => (
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
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="solo-no-importadas"
              checked={soloNoImportadas}
              onCheckedChange={v => { setSoloNoImportadas(v); setPage(0); }}
            />
            <Label htmlFor="solo-no-importadas" className="text-xs cursor-pointer">
              Ocultar ya importadas
            </Label>
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              {total} pregunta{total !== 1 ? 's' : ''}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : preguntas.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {soloNoImportadas
              ? 'Todas las preguntas de este filtro ya han sido importadas.'
              : 'No hay preguntas en este banco con los filtros seleccionados.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {preguntas.map(p => {
            const isCloning = cloning === p.id;
            return (
              <Card
                key={p.id}
                className={`border-l-4 ${p.ya_importada ? 'border-l-teal-400 opacity-70' : 'border-l-blue-400'}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <Badge variant="outline" className="text-xs">{p.academia_nombre}</Badge>
                        <Badge variant="outline" className="text-xs">{p.tema_nombre}</Badge>
                        {p.parte && <Badge variant="outline" className="text-xs">{p.parte}</Badge>}
                        {p.ya_importada && (
                          <Badge variant="outline" className="text-xs text-teal-600 border-teal-300 dark:text-teal-400 dark:border-teal-700">
                            ✓ Importada
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-sm font-medium leading-snug line-clamp-3">
                        {p.pregunta_texto}
                      </CardTitle>
                    </div>
                    <Button
                      size="sm"
                      variant={p.ya_importada ? 'outline' : 'default'}
                      className={`flex-shrink-0 gap-1.5 ${p.ya_importada ? 'text-muted-foreground' : 'bg-teal-600 hover:bg-teal-700'}`}
                      disabled={isCloning || !destAcademiaId || !destTemaId}
                      onClick={() => handleImportar(p)}
                      title={!destTemaId ? 'Selecciona el tema destino arriba' : undefined}
                    >
                      <Download className="h-3.5 w-3.5" />
                      {isCloning ? 'Importando...' : p.ya_importada ? 'Re-importar' : 'Importar'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {([['A', p.opcion_a], ['B', p.opcion_b], ['C', p.opcion_c], ['D', p.opcion_d]] as [string, string | null][])
                      .filter(([, v]) => v)
                      .map(([letra, texto]) => {
                        const esCorrecta = p.solucion_letra === letra;
                        return (
                          <div
                            key={letra}
                            className={`p-2 rounded border text-xs flex gap-1.5 ${
                              esCorrecta
                                ? 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-700'
                                : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                            }`}
                          >
                            <span className={`font-bold flex-shrink-0 ${esCorrecta ? 'text-green-600' : 'text-muted-foreground'}`}>
                              {letra}.
                            </span>
                            <span className="break-words">{texto}</span>
                          </div>
                        );
                      })}
                  </div>
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

      {/* Dialog edición / revisión tras importar */}
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
