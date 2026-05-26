import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { data, type CuerpoId } from './analisis/shared';
import TemasPanel from './analisis/TemasPanel';
import RecicladasPanel from './analisis/RecicladasPanel';
import EstrategiaPanel from './analisis/EstrategiaPanel';
import ConceptosPanel from './analisis/ConceptosPanel';
import CalidadPanel from './analisis/CalidadPanel';

const SUBTABS = [
  { value: 'temas', label: 'Temas' },
  { value: 'recicladas', label: 'Recicladas' },
  { value: 'estrategia', label: 'Estrategia' },
  { value: 'conceptos', label: 'Conceptos' },
  { value: 'calidad', label: 'Calidad' },
];

export default function AnalisisExamenes() {
  const [cuerpo, setCuerpo] = useState<CuerpoId>('ITA');

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-teal-500" />
            Análisis de exámenes oficiales
          </h2>
          <p className="text-xs text-muted-foreground">
            {data.global.nValidas.toLocaleString('es-ES')} preguntas válidas · {data.global.nExamenes} exámenes oficiales JCCM · datos {data.generado}
          </p>
        </div>
        <Tabs value={cuerpo} onValueChange={(v) => setCuerpo(v as CuerpoId)}>
          <TabsList>
            <TabsTrigger value="ITA">ITA · A2</TabsTrigger>
            <TabsTrigger value="IA">IA · A1</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Tabs defaultValue="temas">
        <TabsList className="w-full grid grid-cols-3 sm:grid-cols-5 h-auto">
          {SUBTABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs sm:text-sm">{t.label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="temas" className="mt-5"><TemasPanel cuerpo={cuerpo} /></TabsContent>
        <TabsContent value="recicladas" className="mt-5"><RecicladasPanel cuerpo={cuerpo} /></TabsContent>
        <TabsContent value="estrategia" className="mt-5"><EstrategiaPanel cuerpo={cuerpo} /></TabsContent>
        <TabsContent value="conceptos" className="mt-5"><ConceptosPanel cuerpo={cuerpo} /></TabsContent>
        <TabsContent value="calidad" className="mt-5"><CalidadPanel cuerpo={cuerpo} /></TabsContent>
      </Tabs>
    </div>
  );
}
