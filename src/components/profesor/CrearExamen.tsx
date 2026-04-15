import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, FileText, Clock, GraduationCap, HelpCircle } from 'lucide-react';
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

  const activos = examenes.filter(e => e.activo).length;

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">
            {examenes.length} exámenes
            {activos > 0 && (
              <span className="ml-2 text-teal-600 dark:text-teal-400 font-medium">· {activos} activos</span>
            )}
          </p>
        </div>
        <Button onClick={() => setCreando(true)} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="h-4 w-4 mr-1" />
          Nuevo examen
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl border border-l-4 border-l-gray-200 animate-pulse bg-card" />
          ))}
        </div>
      ) : examenes.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Sin exámenes todavía</p>
          <p className="text-xs mt-1 mb-4">Crea tu primer examen con preguntas verificadas</p>
          <Button className="bg-teal-600 hover:bg-teal-700" onClick={() => setCreando(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Crear primer examen
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {examenes.map(e => {
            const academia = academias.find(a => a.academia_id === e.academia_id);
            return (
              <div
                key={e.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border border-l-4 bg-card transition-opacity ${
                  e.activo ? 'border-l-teal-400' : 'border-l-gray-300 opacity-60'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate">{e.nombre}</p>
                    <Badge
                      variant="outline"
                      className={`text-[11px] px-1.5 py-0 ${
                        e.activo
                          ? 'border-teal-300 text-teal-700 dark:text-teal-400'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {e.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    {academia && (
                      <span className="flex items-center gap-1">
                        <GraduationCap className="h-3 w-3" />{academia.academia_nombre}
                      </span>
                    )}
                    {e.duracion_minutos && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />{e.duracion_minutos} min
                      </span>
                    )}
                    <span>{new Date(e.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                  {e.descripcion && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{e.descripcion}</p>
                  )}
                </div>
                <Switch
                  checked={e.activo}
                  onCheckedChange={v => toggleActivo(e.id, v)}
                  className="flex-shrink-0"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
