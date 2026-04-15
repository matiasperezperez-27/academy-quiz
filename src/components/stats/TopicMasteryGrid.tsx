import React from "react";
import { BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { TopicStats } from "@/hooks/useTopicAnalysis";

interface Props {
  topics: TopicStats[];
  loading: boolean;
}

const MASTERY_CONFIG = {
  'Dominado':         { icon: '🏆', borderColor: 'border-l-teal-400',  accColor: 'text-teal-600 dark:text-teal-400',   bar: 'bg-teal-500',   badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'   },
  'Casi Dominado':    { icon: '✅', borderColor: 'border-l-blue-400',   accColor: 'text-blue-600 dark:text-blue-400',    bar: 'bg-blue-500',   badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'   },
  'En Progreso':      { icon: '🔄', borderColor: 'border-l-amber-400',  accColor: 'text-amber-600 dark:text-amber-400',  bar: 'bg-amber-500',  badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  'Necesita Práctica':{ icon: '🔴', borderColor: 'border-l-red-400',    accColor: 'text-red-600 dark:text-red-400',      bar: 'bg-red-500',    badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'       },
};

const MASTERY_ORDER = ['Necesita Práctica', 'En Progreso', 'Casi Dominado', 'Dominado'];

export default function TopicMasteryGrid({ topics, loading }: Props) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="space-y-1.5">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-16 rounded-xl border border-l-4 border-l-gray-200 animate-pulse bg-card" />
        ))}
      </div>
    );
  }

  if (topics.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
        <BookOpen className="h-8 w-8 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Completa algún test para ver tu progreso por tema</p>
      </div>
    );
  }

  // Sort: Necesita Práctica first, Dominado last
  const sorted = [...topics].sort((a, b) => {
    const ai = MASTERY_ORDER.indexOf(a.nivel_dominio);
    const bi = MASTERY_ORDER.indexOf(b.nivel_dominio);
    if (ai !== bi) return ai - bi;
    return a.porcentaje_acierto - b.porcentaje_acierto;
  });

  return (
    <div className="space-y-1.5">
      {sorted.map(t => {
        const cfg = MASTERY_CONFIG[t.nivel_dominio] ?? MASTERY_CONFIG['Necesita Práctica'];
        const diasTexto = t.dias_sin_repasar === 0 ? 'hoy' : t.dias_sin_repasar === 1 ? 'ayer' : `hace ${t.dias_sin_repasar}d`;

        return (
          <button
            key={t.tema_id}
            className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl border border-l-4 ${cfg.borderColor} bg-card hover:shadow-sm transition-shadow active:scale-[0.99]`}
            onClick={() => navigate(`/test-setup?tema=${t.tema_id}`)}
          >
            {/* Mastery icon */}
            <span className="text-base flex-shrink-0">{cfg.icon}</span>

            {/* Info block */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{t.tema_nombre}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-[11px] text-muted-foreground">{t.academia_nombre}</span>
                <span className="text-[11px] text-muted-foreground">·</span>
                <span className="text-[11px] text-muted-foreground">{t.total_respondidas} resp.</span>
                {t.ultima_respuesta && (
                  <>
                    <span className="text-[11px] text-muted-foreground">·</span>
                    <span className="text-[11px] text-muted-foreground">{diasTexto}</span>
                  </>
                )}
              </div>

              {/* Accuracy bar */}
              <div className="mt-1.5 w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${t.porcentaje_acierto}%` }} />
              </div>
            </div>

            {/* Right: % accuracy + mastery badge + temario % */}
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className={`text-sm font-bold ${cfg.accColor}`}>{t.porcentaje_acierto}%</span>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${cfg.badge}`}>
                {t.nivel_dominio}
              </span>
              {t.total_preguntas_temario > 0 && (
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {t.progreso_temario}% temario
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
