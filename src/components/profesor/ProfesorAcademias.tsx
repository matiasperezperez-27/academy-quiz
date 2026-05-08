import { useState, useCallback } from 'react';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, HelpCircle, BookOpen, Library, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { ProfesorAcademia } from '@/hooks/useProfesorData';

interface BancoTemaStats {
  tema_id: string;
  tema_nombre: string;
  total: number;
  importadas: number;
  verificadas: number;
}

interface Props {
  profesorId: string;
  academias: ProfesorAcademia[];
  loading: boolean;
}

function getColors(pct: number) {
  if (pct >= 70) return {
    border: 'border-l-teal-400',
    text: 'text-teal-600 dark:text-teal-400',
    bar: '[&>div]:bg-teal-500',
  };
  if (pct >= 30) return {
    border: 'border-l-amber-400',
    text: 'text-amber-600 dark:text-amber-400',
    bar: '[&>div]:bg-amber-500',
  };
  return {
    border: 'border-l-red-400',
    text: 'text-red-600 dark:text-red-400',
    bar: '[&>div]:bg-red-500',
  };
}

function bancoTemaIcon(importadas: number, verificadas: number) {
  if (importadas === 0) return '⭕';
  if (verificadas === importadas) return '✅';
  if (verificadas > 0) return '🔄';
  return '🔵';
}

export default function ProfesorAcademias({ profesorId, academias, loading }: Props) {
  const propias = academias.filter(a => !a.es_biblioteca);
  const banco = academias.filter(a => a.es_biblioteca);

  const [expandedBancoId, setExpandedBancoId] = useState<string | null>(null);
  const [bancoTemaStatsMap, setBancoTemaStatsMap] = useState<Record<string, BancoTemaStats[]>>({});
  const [loadingBancoTemas, setLoadingBancoTemas] = useState<string | null>(null);

  const loadBancoTemaStats = useCallback(async (acaId: string) => {
    if (bancoTemaStatsMap[acaId]) return;
    setLoadingBancoTemas(acaId);
    try {
      const { data } = await supabase.rpc('get_banco_tema_import_stats' as any, {
        p_profesor_id: profesorId,
        p_banco_academia_id: acaId,
      });
      setBancoTemaStatsMap(prev => ({ ...prev, [acaId]: (data || []) as BancoTemaStats[] }));
    } finally {
      setLoadingBancoTemas(null);
    }
  }, [bancoTemaStatsMap, profesorId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-xl border border-l-4 border-l-gray-300 bg-card p-4 space-y-3 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded w-full" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (!academias.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No tienes academias asignadas
      </p>
    );
  }

  return (
    <div className="space-y-6">

      {/* Mis academias (propias) */}
      {propias.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Mis academias
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {propias.map((a) => {
              const pct = a.total_preguntas > 0
                ? Math.round((a.preguntas_verificadas / a.total_preguntas) * 100)
                : 0;
              const rechazadas = Math.max(0, a.total_preguntas - a.preguntas_verificadas - a.preguntas_pendientes);
              const colors = getColors(pct);

              return (
                <div
                  key={a.academia_id}
                  className={`rounded-xl border border-l-4 ${colors.border} bg-card p-4 space-y-3`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm leading-tight">{a.academia_nombre}</h3>
                    <span className={`text-sm font-bold flex-shrink-0 ${colors.text}`}>{pct}%</span>
                  </div>
                  <Progress value={pct} className={`h-1.5 ${colors.bar}`} />
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />{a.total_temas} temas
                    </span>
                    <span className="flex items-center gap-1">
                      <HelpCircle className="h-3 w-3" />{a.total_preguntas.toLocaleString()} preguntas
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="flex items-center gap-1 font-medium text-green-600 dark:text-green-400">
                      <CheckCircle className="h-3 w-3" />
                      {a.preguntas_verificadas.toLocaleString()} verif.
                    </span>
                    <span className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                      <Clock className="h-3 w-3" />
                      {a.preguntas_pendientes.toLocaleString()} pend.
                    </span>
                    {rechazadas > 0 && (
                      <span className="text-red-500 font-medium">
                        ✗ {rechazadas.toLocaleString()} rech.
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Progreso del banco */}
      {banco.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Progreso del banco
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {banco.map(a => {
              const importPct = a.total_preguntas > 0
                ? Math.round((a.importadas / a.total_preguntas) * 100)
                : 0;
              const isExpanded = expandedBancoId === a.academia_id;
              const bancoTemas = bancoTemaStatsMap[a.academia_id];

              return (
                <div
                  key={a.academia_id}
                  className="rounded-xl border border-l-4 border-l-blue-400 bg-card p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Library className="h-4 w-4 flex-shrink-0 text-blue-500" />
                      <h3 className="font-semibold text-sm leading-tight truncate">{a.academia_nombre}</h3>
                    </div>
                    <span className="text-sm font-bold flex-shrink-0 text-blue-600 dark:text-blue-400">{importPct}%</span>
                  </div>

                  <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${importPct}%` }} />
                  </div>

                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                    <span className="flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400">
                      🔵 {a.importadas.toLocaleString()} import.
                    </span>
                    <span className="flex items-center gap-1 font-medium text-teal-600 dark:text-teal-400">
                      ✅ {a.verificadas_importadas.toLocaleString()} verif.
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {a.total_preguntas.toLocaleString()} preguntas · {a.total_temas} temas
                  </p>

                  {/* Temas expandibles */}
                  <button
                    className={`w-full flex items-center justify-between gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors border ${isExpanded ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300' : 'bg-muted border-border text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                    onClick={() => {
                      if (!isExpanded) loadBancoTemaStats(a.academia_id);
                      setExpandedBancoId(isExpanded ? null : a.academia_id);
                    }}
                  >
                    <span>Ver temas</span>
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>

                  {isExpanded && (
                    <div className="pt-1">
                      {loadingBancoTemas === a.academia_id ? (
                        <div className="grid grid-cols-2 gap-1.5">
                          {[...Array(4)].map((_, i) => <div key={i} className="animate-pulse h-14 bg-gray-200 dark:bg-gray-700 rounded-lg" />)}
                        </div>
                      ) : bancoTemas && bancoTemas.length > 0 ? (
                        <div className="max-h-64 overflow-y-auto pr-0.5">
                          <div className="grid grid-cols-2 gap-1.5">
                            {bancoTemas.map(t => {
                              const tPct = t.total > 0 ? Math.round((t.importadas / t.total) * 100) : 0;
                              const icon = bancoTemaIcon(t.importadas, t.verificadas);
                              return (
                                <div key={t.tema_id} className="text-left p-2 rounded-lg border bg-background border-muted">
                                  <div className="flex items-center gap-1 mb-1">
                                    <span className="text-xs leading-none flex-shrink-0">{icon}</span>
                                    <span className="text-xs font-medium truncate flex-1 min-w-0">{t.tema_nombre}</span>
                                    <span className="text-xs font-bold flex-shrink-0 ml-0.5 text-blue-600 dark:text-blue-400">{tPct}%</span>
                                  </div>
                                  <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${tPct}%` }} />
                                  </div>
                                  <p className="text-[10px] text-muted-foreground mt-1 truncate">
                                    {t.importadas}/{t.total} import. · {t.verificadas} verif.
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-2">Sin temas</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
