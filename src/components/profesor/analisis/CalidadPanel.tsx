import {
  Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { AlertTriangle, ShieldCheck, Grid2x2, Ban } from 'lucide-react';
import { SectionCard, StatCard, tooltipStyle, trunc, data, type CuerpoId } from './shared';

export default function CalidadPanel({ cuerpo }: { cuerpo: CuerpoId }) {
  const q = data.calidad[cuerpo];
  const totalAnuladas = q.anuladasPorTema.reduce((a, b) => a + b.n, 0);
  const porTema = q.anuladasPorTema.map((t) => ({ ...t, short: trunc(t.titulo, 34) })).reverse();
  const cobertura = q.coberturaPorExamen.map((x) => ({ ...x }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Anuladas (temas)" value={totalAnuladas} hint="preguntas retiradas" color="text-rose-600 dark:text-rose-400" />
        <StatCard label="Reservas activadas" value={q.reservasActivadas} hint="sustituyeron a una anulada" color="text-amber-600 dark:text-amber-400" />
        <StatCard label="Cobertura media" value={`${q.cobertura.media}/${q.cobertura.total}`} hint="temas distintos por examen" />
        <StatCard label="Rango cobertura" value={`${q.cobertura.min}–${q.cobertura.max}`} hint={`de ${q.cobertura.total} temas`} color="text-blue-600 dark:text-blue-400" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <SectionCard icon={AlertTriangle} title={`Temas con más anuladas — ${cuerpo}`} subtitle="Dónde se concentran las preguntas controvertidas/retiradas.">
          {porTema.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin preguntas anuladas en {cuerpo}.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(220, porTema.length * 30)}>
              <BarChart data={porTema} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 4 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }} />
                <YAxis type="category" dataKey="short" width={180} interval={0} tick={{ fill: 'hsl(var(--foreground))', fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                  formatter={(v: number) => [`${v} anuladas`, '']}
                  labelFormatter={(_l, p: any) => p?.[0]?.payload?.titulo ?? _l} />
                <Bar dataKey="n" name="n" fill="#f43f5e" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard icon={Grid2x2} title="Cobertura de temas por examen" subtitle={`Cuántos de los ${q.cobertura.total} temas toca cada examen. La línea marca el máximo (${q.cobertura.total}).`}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={cobertura} margin={{ top: 8, right: 12, left: -10, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} />
              <XAxis dataKey="examen" tick={{ fill: 'hsl(var(--foreground))', fontSize: 10 }} />
              <YAxis domain={[0, q.cobertura.total]} tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                formatter={(v: number) => [`${v} temas`, 'Cobertura']} />
              <ReferenceLine y={q.cobertura.total} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
              <Bar dataKey="nTemas" name="nTemas" fill="#14b8a6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      <SectionCard icon={Ban} title="Anuladas por examen" subtitle="Nº de preguntas anuladas en cada convocatoria (las reservas las sustituyen).">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={q.anuladasPorExamen} margin={{ top: 8, right: 12, left: -10, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} />
            <XAxis dataKey="examen" tick={{ fill: 'hsl(var(--foreground))', fontSize: 10 }} />
            <YAxis allowDecimals={false} tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
              formatter={(v: number) => [`${v} anuladas`, '']} />
            <Bar dataKey="n" name="n" fill="#f59e0b" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </SectionCard>

      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
        <span>Una tasa alta de anuladas en un tema suele indicar normativa cambiante o redacción ambigua: material a vigilar al estudiar y al crear preguntas nuevas.</span>
      </div>
    </div>
  );
}
