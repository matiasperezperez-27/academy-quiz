import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, FileText, Clock } from 'lucide-react';
import { useExamenes } from '@/hooks/useExamenes';
import ExamenForm from './ExamenForm';
import type { ProfesorAcademia } from '@/hooks/useProfesorData';

interface Props {
  profesorId: string;
  academias: ProfesorAcademia[];
}

export default function CrearExamen({ profesorId, academias }: Props) {
  const { examenes, loading, saving, cargar, crear, toggleActivo } = useExamenes(profesorId);
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleCrear = async (form: Parameters<typeof crear>[0]) => {
    const id = await crear(form);
    if (id) {
      setCreando(false);
      cargar();
    }
  };

  if (creando) {
    return (
      <ExamenForm
        academias={academias}
        saving={saving}
        onSave={handleCrear}
        onCancel={() => setCreando(false)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Mis Exámenes</h2>
        <Button onClick={() => setCreando(true)} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="h-4 w-4 mr-1" />
          Nuevo Examen
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse space-y-2">
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : examenes.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No has creado ningún examen todavía</p>
            <Button className="mt-4 bg-teal-600 hover:bg-teal-700" onClick={() => setCreando(true)}>
              Crear primer examen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {examenes.map(e => (
            <Card key={e.id} className={e.activo ? '' : 'opacity-60'}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base">{e.nombre}</CardTitle>
                      <Badge variant={e.activo ? 'default' : 'secondary'} className="text-xs">
                        {e.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                    {e.descripcion && (
                      <p className="text-sm text-muted-foreground mt-1 truncate">{e.descripcion}</p>
                    )}
                    <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                      {e.duracion_minutos && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {e.duracion_minutos} min
                        </span>
                      )}
                      <span>{new Date(e.created_at).toLocaleDateString('es-ES')}</span>
                    </div>
                  </div>
                  <Switch
                    checked={e.activo}
                    onCheckedChange={v => toggleActivo(e.id, v)}
                    className="flex-shrink-0"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
