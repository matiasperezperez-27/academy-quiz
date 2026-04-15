import React, { useState } from "react";
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { TopicStats } from "@/hooks/useTopicAnalysis";

interface Props {
  topics: TopicStats[];
  loading: boolean;
}

const MASTERY_CONFIG = {
  'Dominado':          { icon: '🏆', borderColor: 'border-l-teal-400',  accColor: 'text-teal-600 dark:text-teal-400',   bar: 'bg-teal-500',   badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'    },
  'Casi Dominado':     { icon: '✅', borderColor: 'border-l-blue-400',   accColor: 'text-blue-600 dark:text-blue-400',    bar: 'bg-blue-500',   badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'    },
  'En Progreso':       { icon: '🔄', borderColor: 'border-l-amber-400',  accColor: 'text-amber-600 dark:text-amber-400',  bar: 'bg-amber-500',  badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  'Necesita Práctica': { icon: '🔴', borderColor: 'border-l-red-400',    accColor: 'text-red-600 dark:text-red-400',      bar: 'bg-red-500',    badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'        },
};

const MASTERY_ORDER = ['Necesita Práctica', 'En Progreso', 'Casi Dominado', 'Dominado'];

function academiaProgressColor(pct: number) {
  if (pct >= 70) return { border: 'border-l-teal-400', text: 'text-teal-600 dark:text-teal-400', bar: 'bg-teal-500' };
  if (pct >= 30) return { border: 'border-l-amber-400', text: 'text-amber-600 dark:text-amber-400', bar: 'bg-amber-500' };
  return { border: 'border-l-red-400', text: 'text-red-600 dark:text-red-400', bar: 'bg-red-500' };
}

export default function TopicMasteryGrid({ topics, loading }: Props) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
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

  // Group by academia
  const academiaMap = new Map<string, { nombre: string; id: string; topics: TopicStats[] }>();
  for (const t of topics) {
    if (!academiaMap.has(t.academia_id)) {
      academiaMap.set(t.academia_id, { nombre: t.academia_nombre, id: t.academia_id, topics: [] });
    }
    academiaMap.get(t.academia_id)!.topics.push(t);
  }

  const academias = Array.from(academiaMap.values()).map(a => {
    // Sort topics: needs attention first
    const sorted = [...a.topics].sort((x, y) => {
      const xi = MASTERY_ORDER.indexOf(x.nivel_dominio);
      const yi = MASTERY_ORDER.indexOf(y.nivel_dominio);
      if (xi !== yi) return xi - yi;
      return x.porcentaje_acierto - y.porcentaje_acierto;
    });
    const avgPct = sorted.length > 0
      ? Math.round(sorted.reduce((s, t) => s + t.porcentaje_acierto, 0) / sorted.length)
      : 0;
    return { ...a, topics: sorted, avgPct };
  });

  return (
    <div className="space-y-2">
      {academias.map(a => {
        const isExpanded = expanded === a.id;
        const colors = academiaProgressColor(a.avgPct);
        const dominadas = a.topics.filter(t => t.nivel_dominio === 'Dominado').length;

        return (
          <div
            key={a.id}
            className={`rounded-xl border border-l-4 ${colors.border} bg-card transition-all duration-200`}
          >
            {/* Academia header row */}
            <div className="flex items-center gap-3 px-4 py-3">
              {/* Click on name area → filter (no-op here, just toggle) */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{a.nombre}</p>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                  <span>{a.topics.length} temas</span>
                  <span>·</span>
                  <span className="text-teal-600 dark:text-teal-400">{dominadas} dominados</span>
                </div>
              </div>

              <span className={`text-sm font-bold flex-shrink-0 ${colors.text}`}>{a.avgPct}%</span>

              {/* Expand button */}
              <button
                className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors border ${
                  isExpanded
                    ? 'bg-teal-100 dark:bg-teal-900/40 border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300'
                    : 'bg-muted border-border text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
                onClick={() => setExpanded(isExpanded ? null : a.id)}
              >
                Temas
                {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>

            {/* Mini progress bar */}
            <div className="px-4 pb-3 -mt-1">
              <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${colors.bar}`} style={{ width: `${a.avgPct}%` }} />
              </div>
            </div>

            {/* Expandable topic grid */}
            {isExpanded && (
              <div className="border-t px-3 pb-3 pt-2">
                <div className="max-h-72 overflow-y-auto pr-0.5">
                  <div className="grid grid-cols-2 gap-1.5">
                    {a.topics.map(t => {
                      const cfg = MASTERY_CONFIG[t.nivel_dominio] ?? MASTERY_CONFIG['Necesita Práctica'];
                      const isComplete = t.nivel_dominio === 'Dominado';
                      return (
                        <button
                          key={t.tema_id}
                          className={`text-left p-2 rounded-lg border transition-all hover:shadow-sm active:scale-95 ${
                            isComplete
                              ? 'bg-teal-50/60 dark:bg-teal-900/10 border-teal-200 dark:border-teal-800 opacity-70'
                              : 'bg-background border-muted hover:border-muted-foreground/40'
                          }`}
                          onClick={() => navigate(`/test-setup?tema=${t.tema_id}`)}
                        >
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-xs leading-none flex-shrink-0">{cfg.icon}</span>
                            <span className={`text-xs font-medium truncate flex-1 min-w-0 ${isComplete ? 'line-through text-muted-foreground' : ''}`}>
                              {t.tema_nombre}
                            </span>
                            <span className={`text-xs font-bold flex-shrink-0 ml-0.5 ${cfg.accColor}`}>{t.porcentaje_acierto}%</span>
                          </div>
                          <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${t.porcentaje_acierto}%` }} />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1 truncate">
                            {t.total_respondidas} resp. · {t.progreso_temario}% temario
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
