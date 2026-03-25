import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, BookOpen } from 'lucide-react';
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

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
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
            <Button
              onClick={() => setDialogOpen(true)}
              disabled={!academiaId}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Nuevo
            </Button>
          </div>
        </CardContent>
      </Card>

      {!academiaId ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Selecciona una academia para ver sus temas
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : temas.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Esta academia no tiene temas todavía
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {temas.map(t => (
            <Card key={t.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex items-center gap-3">
                <BookOpen className="h-4 w-4 text-teal-500 flex-shrink-0" />
                <span className="text-sm font-medium">{t.nombre}</span>
              </CardContent>
            </Card>
          ))}
          <p className="text-xs text-center text-muted-foreground pt-2">
            {temas.length} temas en esta academia
          </p>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Tema</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Nombre del tema</Label>
              <Input
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="ej. Anatomía, Legislación, Técnicas..."
                onKeyDown={e => e.key === 'Enter' && handleCrear()}
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
                {saving ? 'Creando...' : 'Crear Tema'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
