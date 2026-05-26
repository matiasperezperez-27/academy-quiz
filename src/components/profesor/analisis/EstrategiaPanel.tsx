import {
  Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import { Dices, MinusCircle, Ruler, ListChecks, Info } from 'lucide-react';
import { SectionCard, StatCard, tooltipStyle, data, type CuerpoId } from './shared';

const LETRA_COL: Record<string, string> = { A: '#14b8a6', B: '#3b82f6', C: '#f59e0b', D: '#ef4444' };

export default function EstrategiaPanel({ cuerpo }: { cuerpo: CuerpoId }) {
  const e = data.estrategia[cuerpo];
  const tn = data.estrategia.todasAnteriores;

  const sesgoData = (['A', 'B', 'C', 'D'] as const).map((k) => ({
    letra: k, pct: Math.round(e.sesgoLetra[k] * 1000) / 10,
  }));
  const masFrecuente = sesgoData.reduce((a, b) => (b.pct > a.pct ? b : a));
  const porExamen = e.sesgoLetraPorExamen.map((x) => ({
    examen: x.examen, A: Math.round(x.A * 1000) / 10, B: Math.round(x.B * 1000) / 10,
    C: Math.round(x.C * 1000) / 10, D: Math.round(x.D * 1000) / 10,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>Patrones orientativos basados en {e.nValidas} preguntas válidas de {cuerpo}. Con pocos exámenes son tendencias, no reglas: úsalos solo como desempate ante la duda.</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Letra más frecuente" value={masFrecuente.letra} hint={`correcta el ${masFrecuente.pct}% (azar 25%)`} />
        <StatCard label="Preguntas en negativo" value={`${e.pctNegativas}%`} hint="NO / EXCEPTO / incorrecta" color="text-rose-600 dark:text-rose-400" />
        <StatCard label="Correcta = la más larga" value={`${e.pctCorrectaMasLarga}%`} hint="azar 25%" color="text-amber-600 dark:text-amber-400" />
        <StatCard label="'Todas las anteriores'" value={`${tn.pctCorrectaCuandoExiste}%`} hint={`correcta cuando aparece (n=${tn.n})`} color="text-purple-600 dark:text-purple-400" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <SectionCard icon={Dices} title="Sesgo de la letra correcta" subtitle="% de veces que cada opción es la correcta. La línea marca el 25% (azar).">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sesgoData} margin={{ top: 8, right: 12, left: -10, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} />
              <XAxis dataKey="letra" tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }} />
              <YAxis unit="%" tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} formatter={(v: number) => [`${v}%`, 'Correcta']} />
              <ReferenceLine y={25} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" label={{ value: 'azar 25%', position: 'right', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Bar dataKey="pct" name="pct" radius={[6, 6, 0, 0]} fill="#14b8a6" />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard icon={ListChecks} title="¿Es constante el sesgo?" subtitle="Distribución de letras correctas en cada examen (apiladas, suman 100%).">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={porExamen} margin={{ top: 8, right: 12, left: -10, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} />
              <XAxis dataKey="examen" tick={{ fill: 'hsl(var(--foreground))', fontSize: 10 }} />
              <YAxis unit="%" tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} formatter={(v: number, n: string) => [`${v}%`, n]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {(['A', 'B', 'C', 'D'] as const).map((k) => (
                <Bar key={k} dataKey={k} stackId="s" name={k} fill={LETRA_COL[k]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
        <div className="flex items-start gap-2 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <MinusCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <span><b className="text-foreground">{e.pctNegativas}%</b> de las preguntas de {cuerpo} están formuladas en negativo (NO/EXCEPTO/incorrecta): conviene leerlas dos veces.</span>
        </div>
        <div className="flex items-start gap-2 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <Ruler className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <span>La opción correcta es la más larga el <b className="text-foreground">{e.pctCorrectaMasLarga}%</b> de las veces (frente al 25% esperable por azar): señal débil pero real.</span>
        </div>
      </div>
    </div>
  );
}
