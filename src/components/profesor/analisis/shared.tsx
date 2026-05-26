import type { ElementType, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import rawData from '@/data/analisisExamenes.json';

// ----------------------------------------------------------------- tipos
export type CuerpoId = 'ITA' | 'IA';

export interface RankItem { temaId: string; titulo: string; bloque: string; total: number; media: number; pct: number; }
export interface Matriz { examenes: string[]; maximo: number; filas: { titulo: string; valores: number[] }[]; }
export interface Temporal { data: Record<string, number | string>[]; temas: string[]; }
export interface Bloque { examen: string; comun: number; especifico: number; }
export interface Cuerpo {
  nExamenes: number; nValidas: number; pctComun: number; pctEspecifico: number;
  examenes: string[]; ranking: RankItem[]; matriz: Matriz; temporal: Temporal;
  bloques: Bloque[]; calientes: RankItem[];
}
export interface ProbItem { temaId: string; titulo: string; bloque: string; pIta: number; pIa: number; dif: number; }
export interface CorrItem { temaA: string; temaB: string; r: number; }

export interface ReciExacta { cuerpo: CuerpoId; enunciado: string; tema: string; examenes: string[]; veces: number; }
export interface ReciNear { cuerpo: CuerpoId; similitud: number; tema: string; a: { examen: string; enunciado: string }; b: { examen: string; enunciado: string }; }
export interface ReciCross { enunciado: string; tema: string; examenesITA: string[]; examenesIA: string[]; }
export interface Recicladas { exactas: ReciExacta[]; nearDuplicados: ReciNear[]; compartidasEntreCuerpos: ReciCross[]; }

export interface LetraSesgo { A: number; B: number; C: number; D: number; }
export interface SesgoExamen extends LetraSesgo { examen: string; }
export interface EstrategiaCuerpo {
  nValidas: number; sesgoLetra: LetraSesgo; sesgoLetraPorExamen: SesgoExamen[];
  pctNegativas: number; pctCorrectaMasLarga: number;
}
export interface Estrategia {
  ITA: EstrategiaCuerpo; IA: EstrategiaCuerpo;
  todasAnteriores: { n: number; pctCorrectaCuandoExiste: number };
}

export interface Concepto { keyword: string; n: number; }
export interface Conceptos { global: Concepto[]; ITA: Concepto[]; IA: Concepto[]; }

export interface CalidadCuerpo {
  anuladasPorTema: { titulo: string; n: number }[];
  anuladasPorExamen: { examen: string; n: number }[];
  reservasActivadas: number;
  cobertura: { media: number; min: number; max: number; total: number };
  coberturaPorExamen: { examen: string; nTemas: number }[];
}
export interface Calidad { ITA: CalidadCuerpo; IA: CalidadCuerpo; }

export interface AnalisisData {
  generado: string; fuente: string; global: { nValidas: number; nExamenes: number };
  cuerpos: { ITA: Cuerpo; IA: Cuerpo };
  probabilidad: ProbItem[]; correlacion: CorrItem[];
  recicladas: Recicladas; estrategia: Estrategia; conceptos: Conceptos; calidad: Calidad;
}

export const data = rawData as unknown as AnalisisData;

// ----------------------------------------------------------------- estilo
export const COL = {
  comun: '#3b82f6',
  especifico: '#f59e0b',
  ITA: { base: '20,184,166', hex: '#14b8a6' },
  IA: { base: '139,92,246', hex: '#8b5cf6' },
};
export const PALETTE = ['#14b8a6', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#10b981', '#6366f1'];

export const tooltipStyle = {
  backgroundColor: 'hsl(var(--background))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '12px',
  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
  color: 'hsl(var(--foreground))',
  fontSize: 12,
};

export const trunc = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

// ----------------------------------------------------------------- UI compartida
export function SectionCard({
  icon: Icon, title, subtitle, children, className = '',
}: {
  icon: ElementType; title: string; subtitle?: string;
  children: ReactNode; className?: string;
}) {
  return (
    <Card className={`bg-white/95 dark:bg-gray-800/95 border border-gray-200 dark:border-gray-700 shadow-lg shadow-gray-500/5 ${className}`}>
      <CardHeader className="pb-3 bg-gradient-to-r from-teal-50 to-blue-50 dark:from-teal-900/15 dark:to-blue-900/15 border-b border-gray-200/60 dark:border-gray-700/60">
        <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
          <Icon className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          {title}
        </CardTitle>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}

export function StatCard({
  label, value, hint, color = 'text-teal-600 dark:text-teal-400',
}: { label: string; value: string | number; hint?: string; color?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 p-4 text-center">
      <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
      <div className="text-xs font-medium mt-1">{label}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{hint}</div>}
    </div>
  );
}
