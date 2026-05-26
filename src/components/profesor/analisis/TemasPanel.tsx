import {
  Bar, BarChart, Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { BarChart3, TrendingUp, Layers, Network, CalendarRange, FileSpreadsheet, GraduationCap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  COL, PALETTE, tooltipStyle, trunc, SectionCard, data,
  type Cuerpo, type CuerpoId, type ProbItem,
} from './shared';

function Kpis({ c, cuerpo }: { c: Cuerpo; cuerpo: CuerpoId }) {
  const top = c.ranking[0];
  const items = [
    { label: 'Exámenes', value: c.nExamenes, icon: CalendarRange, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-100 dark:bg-teal-900/40' },
    { label: 'Preguntas válidas', value: c.nValidas, icon: FileSpreadsheet, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/40' },
    { label: '% específico', value: `${c.pctEspecifico}%`, icon: Layers, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/40' },
    { label: 'Grupo', value: cuerpo === 'ITA' ? 'A2' : 'A1', icon: GraduationCap, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/40' },
  ];
  return (
    <Card className="bg-white/95 dark:bg-gray-800/95 border border-gray-200 dark:border-gray-700 shadow-sm">
      <CardContent className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {items.map((k, i) => (
            <div key={i} className="flex flex-col items-center text-center px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className={`w-8 h-8 rounded-full ${k.bg} flex items-center justify-center mb-1.5`}>
                <k.icon className={`h-4 w-4 ${k.color}`} />
              </div>
              <span className="text-xl font-bold leading-none tabular-nums">{k.value}</span>
              <span className="text-[11px] text-muted-foreground mt-1 leading-tight">{k.label}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t text-center">
          Tema más frecuente: <span className="font-semibold text-foreground">{top.titulo}</span>{' '}
          ({top.total} preguntas · {top.pct}%)
        </p>
      </CardContent>
    </Card>
  );
}

function RankingChart({ c }: { c: Cuerpo }) {
  const rows = c.ranking.slice(0, 15).map((r) => ({
    short: trunc(r.titulo, 30),
    titulo: r.titulo,
    comun: r.bloque === 'comun' ? r.total : null,
    especifico: r.bloque === 'especifico' ? r.total : null,
  }));
  return (
    <ResponsiveContainer width="100%" height={470}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 28, left: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} />
        <XAxis type="number" tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }} allowDecimals={false} />
        <YAxis type="category" dataKey="short" width={172} interval={0} tick={{ fill: 'hsl(var(--foreground))', fontSize: 10 }} />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
          formatter={(v: number, name: string) => [`${v} preguntas`, name === 'comun' ? 'Común' : 'Específico']}
          labelFormatter={(_l, p: any) => p?.[0]?.payload?.titulo ?? _l}
        />
        <Bar dataKey="comun" stackId="a" name="comun" fill={COL.comun} radius={[0, 6, 6, 0]} />
        <Bar dataKey="especifico" stackId="a" name="especifico" fill={COL.especifico} radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function Heatmap({ c, cuerpo }: { c: Cuerpo; cuerpo: CuerpoId }) {
  const rows = c.matriz.filas.slice(0, 20);
  const max = c.matriz.maximo || 1;
  const base = COL[cuerpo].base;
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[420px]">
        <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: `minmax(150px,1.4fr) repeat(${c.matriz.examenes.length}, 1fr)` }}>
          <div />
          {c.matriz.examenes.map((e) => (
            <div key={e} className="text-[10px] font-medium text-muted-foreground text-center truncate">{e}</div>
          ))}
        </div>
        {rows.map((row) => (
          <div key={row.titulo} className="grid gap-1 mb-1 items-center" style={{ gridTemplateColumns: `minmax(150px,1.4fr) repeat(${c.matriz.examenes.length}, 1fr)` }}>
            <div className="text-[11px] truncate pr-1" title={row.titulo}>{trunc(row.titulo, 30)}</div>
            {row.valores.map((v, j) => {
              const alpha = v === 0 ? 0 : 0.15 + 0.8 * (v / max);
              return (
                <div
                  key={j}
                  title={`${row.titulo} — ${c.matriz.examenes[j]}: ${v} preguntas`}
                  className="h-7 rounded flex items-center justify-center text-[10px] font-semibold"
                  style={{
                    backgroundColor: v === 0 ? 'hsl(var(--muted))' : `rgba(${base},${alpha})`,
                    color: alpha > 0.55 ? '#fff' : 'hsl(var(--foreground))',
                  }}
                >
                  {v > 0 ? v : ''}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function TemporalChart({ c }: { c: Cuerpo }) {
  const temas = c.temporal.temas.slice(0, 8);
  return (
    <ResponsiveContainer width="100%" height={360}>
      <LineChart data={c.temporal.data} margin={{ top: 8, right: 16, left: -10, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} />
        <XAxis dataKey="examen" tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
        {temas.map((t, i) => (
          <Line key={t} type="monotone" dataKey={t} name={trunc(t, 22)} stroke={PALETTE[i % PALETTE.length]} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function BloquesChart({ c }: { c: Cuerpo }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={c.bloques} margin={{ top: 8, right: 16, left: -10, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} />
        <XAxis dataKey="examen" tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="comun" stackId="a" name="Común" fill={COL.comun} />
        <Bar dataKey="especifico" stackId="a" name="Específico" fill={COL.especifico} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function ProbBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value * 100}%`, backgroundColor: color }} />
      </div>
      <span className="text-[11px] tabular-nums w-9 text-right text-muted-foreground">{Math.round(value * 100)}%</span>
    </div>
  );
}

function ProbRow({ r }: { r: ProbItem }) {
  return (
    <>
      <div className="truncate" title={r.titulo}>
        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle ${r.bloque === 'comun' ? 'bg-blue-500' : 'bg-amber-500'}`} />
        {trunc(r.titulo, 38)}
      </div>
      <div className="w-[120px]"><ProbBar value={r.pIta} color={COL.ITA.hex} /></div>
      <div className="w-[120px]"><ProbBar value={r.pIa} color={COL.IA.hex} /></div>
    </>
  );
}

function ProbabilidadTable() {
  const rows = [...data.probabilidad]
    .sort((a, b) => Math.max(b.pIta, b.pIa) - Math.max(a.pIta, a.pIa))
    .slice(0, 25);
  return (
    <div className="max-h-[420px] overflow-y-auto pr-1">
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-2 items-center text-xs">
        <div className="font-semibold text-muted-foreground sticky top-0 bg-background py-1">Tema</div>
        <div className="font-semibold text-muted-foreground sticky top-0 bg-background py-1 text-center w-[120px]">ITA (A2)</div>
        <div className="font-semibold text-muted-foreground sticky top-0 bg-background py-1 text-center w-[120px]">IA (A1)</div>
        {rows.map((r) => <ProbRow key={r.temaId} r={r} />)}
      </div>
    </div>
  );
}

function Correlacion() {
  return (
    <ul className="space-y-2">
      {data.correlacion.map((p, i) => (
        <li key={i} className="flex items-center gap-3 text-xs p-2 rounded-lg bg-muted/40">
          <span className="shrink-0 px-2 py-0.5 rounded-md bg-teal-600 text-white font-semibold">r {p.r}</span>
          <span className="truncate" title={`${p.temaA} ↔ ${p.temaB}`}>
            {trunc(p.temaA, 28)} <span className="text-muted-foreground">↔</span> {trunc(p.temaB, 28)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function TemasPanel({ cuerpo }: { cuerpo: CuerpoId }) {
  const c = data.cuerpos[cuerpo];
  return (
    <div className="space-y-4">
      <Kpis c={c} cuerpo={cuerpo} />
      <div className="grid lg:grid-cols-2 gap-4">
        <SectionCard icon={TrendingUp} title="Ranking de temas (top 15)" subtitle="Total de preguntas por tema. Azul = común, ámbar = específico.">
          <RankingChart c={c} />
        </SectionCard>
        <SectionCard icon={BarChart3} title="Mapa de calor tema × examen" subtitle="Top 20 temas. Intensidad = nº de preguntas en cada examen.">
          <Heatmap c={c} cuerpo={cuerpo} />
        </SectionCard>
        <SectionCard icon={CalendarRange} title="Evolución temporal" subtitle="Preguntas por examen de los 8 temas más frecuentes.">
          <TemporalChart c={c} />
        </SectionCard>
        <SectionCard icon={Layers} title="Bloque común vs específico" subtitle="Reparto de preguntas por examen.">
          <BloquesChart c={c} />
        </SectionCard>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <SectionCard icon={FileSpreadsheet} title="Probabilidad de aparición (top 25)" subtitle="% de exámenes en que cayó al menos 1 pregunta del tema.">
          <ProbabilidadTable />
        </SectionCard>
        <SectionCard icon={Network} title="Temas que caen juntos" subtitle="5 pares más correlacionados (orientativo: 11 exámenes).">
          <Correlacion />
        </SectionCard>
      </div>
    </div>
  );
}
