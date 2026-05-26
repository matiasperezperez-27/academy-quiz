import { Repeat, Copy, ArrowLeftRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SectionCard, StatCard, data, type CuerpoId } from './shared';

function ExamChips({ examenes, color = 'bg-teal-600' }: { examenes: string[]; color?: string }) {
  return (
    <div className="flex flex-wrap gap-1">
      {examenes.map((e) => (
        <span key={e} className={`text-[10px] font-semibold text-white px-1.5 py-0.5 rounded ${color}`}>{e}</span>
      ))}
    </div>
  );
}

export default function RecicladasPanel({ cuerpo }: { cuerpo: CuerpoId }) {
  const { exactas, nearDuplicados, compartidasEntreCuerpos } = data.recicladas;
  const exC = exactas.filter((e) => e.cuerpo === cuerpo);
  const nearC = nearDuplicados.filter((e) => e.cuerpo === cuerpo);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Repetidas exactas" value={exC.length} hint="mismo enunciado en ≥2 exámenes" />
        <StatCard label="Casi idénticas" value={nearC.length} hint="similitud ≥ 85%" color="text-amber-600 dark:text-amber-400" />
        <StatCard label="Compartidas ITA↔IA" value={compartidasEntreCuerpos.length} hint="caen en ambos cuerpos" color="text-purple-600 dark:text-purple-400" />
      </div>

      <SectionCard icon={Repeat} title={`Preguntas repetidas literalmente — ${cuerpo}`} subtitle="El mismo enunciado ha caído tal cual en más de un examen. Máxima prioridad de estudio.">
        {exC.length === 0 ? (
          <p className="text-sm text-muted-foreground">No se detectaron repeticiones exactas en {cuerpo}.</p>
        ) : (
          <ul className="space-y-3">
            {exC.map((e, i) => (
              <li key={i} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm leading-snug">{e.enunciado}</p>
                  <Badge variant="secondary" className="shrink-0">×{e.veces}</Badge>
                </div>
                <div className="flex items-center justify-between gap-2 mt-2">
                  <Badge variant="outline" className="text-[10px]">{e.tema}</Badge>
                  <ExamChips examenes={e.examenes} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard icon={Copy} title={`Variaciones de la misma pregunta — ${cuerpo}`} subtitle="Enunciados casi idénticos entre exámenes (reformulaciones). Conviene dominar el concepto, no memorizar la frase.">
        {nearC.length === 0 ? (
          <p className="text-sm text-muted-foreground">No se detectaron variaciones en {cuerpo}.</p>
        ) : (
          <ul className="space-y-3">
            {nearC.map((e, i) => (
              <li key={i} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="text-[10px]">{e.tema}</Badge>
                  <Badge className="bg-amber-500 text-white border-0 shrink-0">{Math.round(e.similitud * 100)}% similar</Badge>
                </div>
                <div className="text-xs leading-snug">
                  <span className="font-semibold text-teal-600 dark:text-teal-400 mr-1">{e.a.examen}:</span>{e.a.enunciado}
                </div>
                <div className="text-xs leading-snug">
                  <span className="font-semibold text-teal-600 dark:text-teal-400 mr-1">{e.b.examen}:</span>{e.b.enunciado}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard icon={ArrowLeftRight} title="Compartidas entre ITA e IA" subtitle="Mismo enunciado en ambos cuerpos: material común que sirve para las dos oposiciones.">
        {compartidasEntreCuerpos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin coincidencias entre cuerpos.</p>
        ) : (
          <ul className="space-y-3">
            {compartidasEntreCuerpos.map((e, i) => (
              <li key={i} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-sm leading-snug">{e.enunciado}</p>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <Badge variant="outline" className="text-[10px]">{e.tema}</Badge>
                  <div className="flex items-center gap-1"><span className="text-[10px] text-muted-foreground">ITA</span><ExamChips examenes={e.examenesITA} color="bg-teal-600" /></div>
                  <div className="flex items-center gap-1"><span className="text-[10px] text-muted-foreground">IA</span><ExamChips examenes={e.examenesIA} color="bg-purple-600" /></div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
