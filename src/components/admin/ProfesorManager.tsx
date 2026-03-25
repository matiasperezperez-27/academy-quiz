import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { GraduationCap, UserCheck, UserX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserRow {
  user_id: string;
  email: string;
  nombre: string;
  role: string;
  puntos: number;
}

interface Academia {
  id: string;
  nombre: string;
}

export default function ProfesorManager() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [academias, setAcademias] = useState<Academia[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [asignaciones, setAsignaciones] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, acadRes] = await Promise.all([
        supabase.rpc('get_users_list' as any, { limit_count: 100 }),
        supabase.from('academias').select('id, nombre').order('nombre'),
      ]);
      setUsers((usersRes.data as UserRow[]) || []);
      setAcademias((acadRes.data as Academia[]) || []);
    } catch (err) {
      console.error('ProfesorManager.cargar:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleGestionar = async (user: UserRow) => {
    setSelectedUser(user);
    const { data } = await supabase
      .from('profesor_academias' as any)
      .select('academia_id')
      .eq('profesor_id', user.user_id);
    setAsignaciones((data as any[] || []).map((r: any) => r.academia_id));
    setDialogOpen(true);
  };

  const handleAsignarRol = async (userId: string, nuevoRol: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: nuevoRol })
        .eq('id', userId);
      if (error) throw error;
      toast.success(`Rol cambiado a ${nuevoRol}`);
      cargar();
    } catch (err) {
      console.error('ProfesorManager.handleAsignarRol:', err);
      toast.error('Error al cambiar el rol');
    }
  };

  const handleGuardarAcademias = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      // Delete existing
      await supabase
        .from('profesor_academias' as any)
        .delete()
        .eq('profesor_id', selectedUser.user_id);

      // Insert new ones
      if (asignaciones.length > 0) {
        const rows = asignaciones.map(aid => ({
          profesor_id: selectedUser.user_id,
          academia_id: aid,
        }));
        const { error } = await supabase.from('profesor_academias' as any).insert(rows);
        if (error) throw error;
      }

      toast.success('Academias actualizadas');
      setDialogOpen(false);
    } catch (err) {
      console.error('ProfesorManager.handleGuardarAcademias:', err);
      toast.error('Error al actualizar academias');
    } finally {
      setSaving(false);
    }
  };

  const toggleAcademia = (id: string) => {
    setAsignaciones(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const roleBadge = (role: string) => {
    if (role === 'admin') return <Badge className="bg-orange-100 text-orange-700">Admin</Badge>;
    if (role === 'profesor') return <Badge className="bg-teal-100 text-teal-700">Profesor</Badge>;
    return <Badge variant="secondary">Usuario</Badge>;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-teal-500" />
            Gestión de Profesores
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse h-14 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {users.map(u => (
                <div
                  key={u.user_id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.email}</p>
                    <div className="flex gap-2 mt-1">
                      {roleBadge(u.role)}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {u.role !== 'profesor' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-teal-600 border-teal-300 hover:bg-teal-50"
                        onClick={() => handleAsignarRol(u.user_id, 'profesor')}
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        Hacer Profesor
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-teal-600 border-teal-300 hover:bg-teal-50"
                          onClick={() => handleGestionar(u)}
                        >
                          Academias
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground hover:text-red-600"
                          onClick={() => handleAsignarRol(u.user_id, 'user')}
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Academias de {selectedUser?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            {academias.map(a => (
              <div key={a.id} className="flex items-center gap-3">
                <Checkbox
                  id={`ac-${a.id}`}
                  checked={asignaciones.includes(a.id)}
                  onCheckedChange={() => toggleAcademia(a.id)}
                />
                <Label htmlFor={`ac-${a.id}`} className="cursor-pointer">
                  {a.nombre}
                </Label>
              </div>
            ))}
            <div className="flex gap-2 pt-3">
              <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-teal-600 hover:bg-teal-700"
                disabled={saving}
                onClick={handleGuardarAcademias}
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
