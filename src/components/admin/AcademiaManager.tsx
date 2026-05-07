import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { GraduationCap } from 'lucide-react';

interface Profesor {
  user_id: string;
  username: string | null;
  email: string | null;
  role: string;
}

interface Props {
  onRefresh?: () => void;
}

export default function AcademiaManager({ onRefresh }: Props) {
  const { user } = useAuth();
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [nombre, setNombre] = useState('');
  const [propietarioId, setPropietarioId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, username, role')
      .in('role', ['profesor', 'admin'])
      .order('username')
      .then(({ data, error }) => {
        if (error) console.error('AcademiaManager load profiles:', error);
        setProfesores(
          ((data as any[]) || []).map((u: any) => ({
            user_id: u.id,
            username: u.username,
            email: null,
            role: u.role,
          }))
        );
      });
  }, []);

  const handleCrear = async () => {
    if (!nombre.trim() || !propietarioId || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc('crear_academia_propietario' as any, {
        p_admin_id: user.id,
        p_nombre: nombre.trim(),
        p_propietario_id: propietarioId,
      });
      if (error) throw error;
      toast.success(`Academia "${nombre.trim()}" creada y asignada`);
      setNombre('');
      setPropietarioId('');
      onRefresh?.();
    } catch (err: any) {
      toast.error(err.message || 'Error al crear la academia');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <GraduationCap className="h-5 w-5 text-teal-500" />
          Crear academia para profesor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Nombre <span className="text-red-500">*</span>
            </Label>
            <Input
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="ej. Academia Yeray"
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Propietario <span className="text-red-500">*</span>
            </Label>
            <Select value={propietarioId} onValueChange={setPropietarioId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Seleccionar profesor" />
              </SelectTrigger>
              <SelectContent>
                {profesores.length === 0 ? (
                  <SelectItem value="__none__" disabled>Sin profesores asignados</SelectItem>
                ) : (
                  profesores.map(p => (
                    <SelectItem key={p.user_id} value={p.user_id}>
                      {p.username || p.email || p.user_id}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <Button
            className="bg-teal-600 hover:bg-teal-700 h-9"
            disabled={saving || !nombre.trim() || !propietarioId}
            onClick={handleCrear}
          >
            {saving ? 'Creando...' : 'Crear academia'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          La academia se crea como academia propia (no biblioteca) y queda asignada automáticamente al profesor seleccionado.
        </p>
      </CardContent>
    </Card>
  );
}
