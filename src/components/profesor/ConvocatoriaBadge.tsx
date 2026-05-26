import { Badge } from '@/components/ui/badge';

interface Props {
  exam_id?: string | null;
  numero_pregunta?: number | null;
  anulada?: boolean | null;
  reserva?: boolean | null;
  sustituye_a?: number | null;
}

// "1_IA_2024" → { cuerpo: "IA", anio: "2024", interna: false }
// "1_ITA_2024" → { cuerpo: "ITA", anio: "2024", interna: false }
// "1_IA_2022_Interna" → { cuerpo: "IA", anio: "2022", interna: true }
export function parseExamId(exam_id: string) {
  const match = exam_id.match(/^\d+_(ITA|IA)_(\d{4})(_Interna)?$/);
  if (!match) return null;
  return { cuerpo: match[1], anio: match[2], interna: !!match[3] };
}

// Friendly label: "IA 2024" or "IA 2024 Int"
export function formatExamLabel(exam_id: string): string {
  const p = parseExamId(exam_id);
  if (!p) return exam_id;
  return `${p.cuerpo} ${p.anio}${p.interna ? ' Int' : ''}`;
}

export default function ConvocatoriaBadge({
  exam_id,
  numero_pregunta,
  anulada,
  reserva,
  sustituye_a,
}: Props) {
  if (!exam_id) return null;
  const parsed = parseExamId(exam_id);
  if (!parsed) return null;

  const base = `📋 ${parsed.cuerpo} ${parsed.anio}${parsed.interna ? ' Int' : ''}`;
  const num = numero_pregunta ? ` · Q${numero_pregunta}` : '';

  if (anulada) {
    return (
      <Badge
        variant="outline"
        className="text-xs text-red-600 border-red-300 dark:text-red-400 dark:border-red-800"
      >
        {base}{num} · anulada
      </Badge>
    );
  }

  if (reserva) {
    return (
      <Badge
        variant="outline"
        className="text-xs text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-800"
      >
        {base}{num} · reserva{sustituye_a ? ` → Q${sustituye_a}` : ''}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="text-xs text-indigo-600 border-indigo-300 dark:text-indigo-400 dark:border-indigo-800"
    >
      {base}{num}
    </Badge>
  );
}
