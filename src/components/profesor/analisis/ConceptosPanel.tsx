import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Tags, Cloud } from 'lucide-react';
import { SectionCard, tooltipStyle, trunc, data, type CuerpoId } from './shared';

export default function ConceptosPanel({ cuerpo }: { cuerpo: CuerpoId }) {
  const conceptos = data.conceptos[cuerpo];
  const top = conceptos.slice(0, 18).map((c) => ({ ...c, short: trunc(c.keyword, 30) })).reverse();
  const max = Math.max(...conceptos.map((c) => c.n), 1);
  const min = Math.min(...conceptos.map((c) => c.n));

  const fontFor = (n: number) => {
    const t = max === min ? 1 : (n - min) / (max - min);
    return 11 + Math.round(t * 17); // 11px .. 28px
  };
  const opacityFor = (n: number) => {
    const t = max === min ? 1 : (n - min) / (max - min);
    return 0.45 + 0.55 * t;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
        <Tags className="w-4 h-4 shrink-0 mt-0.5" />
        <span>Conceptos, normas y siglas más presentes en {cuerpo}, ponderados por el nº de preguntas de los temas en que aparecen. Permite ver qué normativa pesa de verdad, por encima del tema.</span>
      </div>

      <SectionCard icon={Tags} title={`Conceptos más citados — ${cuerpo}`} subtitle="Top 18 keywords por peso (nº de preguntas asociadas).">
        <ResponsiveContainer width="100%" height={520}>
          <BarChart data={top} layout="vertical" margin={{ top: 4, right: 28, left: 4, bottom: 4 }}>
            <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} />
            <XAxis type="number" tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }} allowDecimals={false} />
            <YAxis type="category" dataKey="short" width={160} interval={0} tick={{ fill: 'hsl(var(--foreground))', fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
              formatter={(v: number) => [`${v} preguntas`, 'Peso']}
              labelFormatter={(_l, p: any) => p?.[0]?.payload?.keyword ?? _l} />
            <Bar dataKey="n" name="n" fill="#14b8a6" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </SectionCard>

      <SectionCard icon={Cloud} title="Nube de conceptos" subtitle="Tamaño proporcional al peso. Pasa el ratón para ver el recuento.">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2">
          {conceptos.map((c) => (
            <span
              key={c.keyword}
              title={`${c.keyword}: ${c.n} preguntas`}
              className="font-semibold text-teal-700 dark:text-teal-300 leading-none"
              style={{ fontSize: fontFor(c.n), opacity: opacityFor(c.n) }}
            >
              {c.keyword}
            </span>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
