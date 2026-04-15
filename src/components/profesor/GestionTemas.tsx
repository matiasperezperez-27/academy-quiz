import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, BookOpen, BookMarked } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ProfesorAcademia } from '@/hooks/useProfesorData';

interface Tema {
  id: string;
  nombre: string;
  academia_id: string;
  created_at: string;
}

interface Props {
  profesorId: string;
  academias: ProfesorAcademia[];
  onRefresh: () => void;
}

export default function GestionTemas({ profesorId, academias, onRefresh }: Props) {
  const [academiaId, setAcademiaId] = useState('');
  const [temas, setTemas] = useState<Tema[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nombre, setNombre] = useState('');
  const [saving, setSaving] = useState(false);

  const cargar = async (aid: string) => {
    if (!aid) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('temas')
      .select('id, nombre, academia_id, created_at')
      .eq('academia_id', aid)
      .order('nombre');
    if (!error) setTemas((data as Tema[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    cargar(academiaId);
  }, [academiaId]);

  const handleCrear = async () => {
    if (!nombre.trim() || !academiaId) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc('crear_tema' as any, {
        p_profesor_id: profesorId,
        p_academia_id: academiaId,
        p_nombre: nombre.trim(),
      });
      if (error) throw error;
      toast.success('Tema creado correctamente');
      setNombre('');
      setDialogOpen(false);
      cargar(academiaId);
      onRefresh();
    } catch (err) {
      console.error('GestionTemas.handleCrear:', err);
      toast.error('Error al crear el tema');
    } finally {
      setSaving(false);
    }
  };

  const selectedAcademia = academias.find(a => a.academia_id === academiaId);

  return (
    <div className="space-y-4">

      {/* Toolbar */}
      <div className="flex gap-2">
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
        <Button
          onClick={() => setDialogOpen(true)}
          disabled={!academiaId}
          className="bg-teal-600 hover:bg-teal-700 flex-shrink-0"
        >
          <Plus className="h-4 w-4 mr-1" />
          Nuevo
        </Button>
      </div>

      {/* Context bar */}
      {academiaId && !loading && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">{selectedAcademia?.academia_nombre}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {temas.length} {temas.length === 1 ? 'tema' : 'temas'}
          </p>
        </div>
      )}

      {/* Content */}
      {!academiaId ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <BookMarked className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Selecciona una academia para ver sus temas</p>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 rounded-xl border animate-pulse bg-muted/50" />
          ))}
        </div>
      ) : temas.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <p className="text-sm">Esta academia no tiene temas todavía</p>
          <Button
            size="sm"
            className="mt-3 bg-teal-600 hover:bg-teal-700"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Crear primer tema
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {temas.map((t, i) => (
            <div
              key={t.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-card hover:shadow-sm transition-shadow"
            >
              <div className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center flex-shrink-0">
                <BookOpen className="h-3 w-3 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{t.nombre}</p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(t.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <span className="text-[11px] text-muted-foreground flex-shrink-0">#{i + 1}</span>
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) setNombre(''); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Nuevo Tema</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            {selectedAcademia && (
              <p className="text-xs text-muted-foreground">
                Academia: <span className="font-medium text-foreground">{selectedAcademia.academia_nombre}</span>
              </p>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Nombre del tema <span className="text-red-500">*</span>
              </Label>
              <Input
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="ej. Anatomía, Legislación, Técnicas..."
                onKeyDown={e => e.key === 'Enter' && handleCrear()}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-teal-600 hover:bg-teal-700"
                disabled={saving || !nombre.trim()}
                onClick={handleCrear}
              >
                {saving ? 'Creando...' : 'Crear tema'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
