import React, { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Target,
  BarChart3,
  RefreshCw,
  PlayCircle,
  RotateCcw,
  Search,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTopicAnalysis } from "@/hooks/useTopicAnalysis";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import CelebrationModal from "@/components/CelebrationModal";

// ── Mastery config ──────────────────────────────────────────────────────────
const MASTERY_CONFIG = {
  'Dominado':          { icon: '🏆', border: 'border-l-teal-400',  text: 'text-teal-600 dark:text-teal-400',   bar: 'bg-teal-500',   badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'    },
  'Casi Dominado':     { icon: '✅', border: 'border-l-blue-400',   text: 'text-blue-600 dark:text-blue-400',    bar: 'bg-blue-500',   badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'    },
  'En Progreso':       { icon: '🔄', border: 'border-l-amber-400',  text: 'text-amber-600 dark:text-amber-400',  bar: 'bg-amber-500',  badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  'Necesita Práctica': { icon: '🔴', border: 'border-l-red-400',    text: 'text-red-600 dark:text-red-400',      bar: 'bg-red-500',    badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'        },
} as const;

type NivelDominio = keyof typeof MASTERY_CONFIG;

const SECTION_ORDER: NivelDominio[] = ['Necesita Práctica', 'En Progreso', 'Casi Dominado', 'Dominado'];

const SECTION_LABELS: Record<NivelDominio, string> = {
  'Necesita Práctica': 'Necesitan Práctica',
  'En Progreso':       'En Progreso',
  'Casi Dominado':     'Casi Dominados',
  'Dominado':          'Dominados',
};

function promedioColor(pct: number) {
  if (pct >= 80) return { text: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-100 dark:bg-teal-900/40', bar: 'bg-teal-500' };
  if (pct >= 60) return { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/40', bar: 'bg-amber-500' };
  return { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/40', bar: 'bg-red-500' };
}

// ── Small pill button ───────────────────────────────────────────────────────
function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
        active
          ? 'bg-foreground text-background border-foreground'
          : 'border-border text-muted-foreground hover:border-foreground/50 hover:text-foreground bg-card'
      }`}
    >
      {children}
    </button>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function TopicAnalysisPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const { topicStats, loading, refreshData, resetSpecificTopicData } = useTopicAnalysis();

  const [searchTerm, setSearchTerm]           = useState("");
  const [filterNivel, setFilterNivel]         = useState<NivelDominio | null>(null);
  const [filterAcademia, setFilterAcademia]   = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set()); // all collapsed

  const [celebrationModal, setCelebrationModal] = useState<{
    isOpen: boolean;
    achievement: { type: 'Dominado' | 'Casi Dominado' | 'En Progreso'; topicName: string; accuracy: number; attempts: number; previousLevel?: string } | null;
  }>({ isOpen: false, achievement: null });

  // ── Celebration logic ──────────────────────────────────────────────────
  useEffect(() => {
    if (!topicStats.length || !user) return;
    const key = `celebrated_${user.id}`;
    const already: string[] = JSON.parse(localStorage.getItem(key) || '[]');
    topicStats.forEach(topic => {
      if (!topic?.tema_id || !topic?.tema_nombre) return;
      if (topic.progreso_temario === 100 && topic.porcentaje_acierto === 100 && !already.includes(topic.tema_id)) {
        localStorage.setItem(key, JSON.stringify([...already, topic.tema_id]));
        setTimeout(() => {
          setCelebrationModal({ isOpen: true, achievement: { type: 'Dominado', topicName: topic.tema_nombre, accuracy: topic.porcentaje_acierto, attempts: topic.intentos_totales || 1, previousLevel: 'En Progreso' } });
        }, 100);
        toast({ title: "🏆 ¡Tema Dominado!", description: `Has alcanzado la perfección en "${topic.tema_nombre}".`, duration: 3000 });
      }
    });
  }, [topicStats, user, toast]);

  // ── Reset topic ────────────────────────────────────────────────────────
  const resetTopicProgress = async (temaId: string, temaNombre: string) => {
    if (!user) return;
    if (!window.confirm(`¿Reiniciar el progreso de "${temaNombre}"?\n\nEsta acción NO se puede deshacer.`)) return;
    toast({ title: "Reiniciando...", description: "Eliminando progreso del tema..." });
    const ok = await resetSpecificTopicData(temaId);
    if (ok) {
      const key = `celebrated_${user.id}`;
      const already: string[] = JSON.parse(localStorage.getItem(key) || '[]');
      localStorage.setItem(key, JSON.stringify(already.filter(id => id !== temaId)));
      await refreshData();
      toast({ title: "✅ Progreso Reiniciado", description: `"${temaNombre}" está listo para empezar de nuevo.` });
    } else {
      toast({ title: "❌ Error", description: "No se pudo reiniciar el progreso.", variant: "destructive" });
    }
  };

  // ── Practice click ─────────────────────────────────────────────────────
  const handlePracticeClick = (temaId: string, academiaId: string, falladas: string[]) => {
    if (falladas.length === 0) navigate(`/quiz?mode=test&academia=${academiaId}&tema=${temaId}`);
    else navigate(`/quiz?mode=practice&tema=${temaId}&questions=${falladas.join(',')}`);
  };

  // ── Celebration handlers ───────────────────────────────────────────────
  const closeCelebration = () => setCelebrationModal({ isOpen: false, achievement: null });

  // ── Toggle section ─────────────────────────────────────────────────────
  const toggleSection = (nivel: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(nivel) ? next.delete(nivel) : next.add(nivel);
      return next;
    });
  };

  // ── Derived: unique academias ──────────────────────────────────────────
  const academias = useMemo(() => {
    const map = new Map<string, string>();
    topicStats.forEach(t => { if (t?.academia_id) map.set(t.academia_id, t.academia_nombre); });
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [topicStats]);

  // ── Filtered groups ────────────────────────────────────────────────────
  const filteredGroups = useMemo(() => {
    const removeAccents = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    let list = topicStats;
    if (filterAcademia) list = list.filter(t => t?.academia_id === filterAcademia);
    if (filterNivel)    list = list.filter(t => t?.nivel_dominio === filterNivel);
    if (searchTerm) {
      const q = removeAccents(searchTerm.toLowerCase());
      list = list.filter(t => removeAccents(t?.tema_nombre?.toLowerCase() ?? '').includes(q));
    }
    const groups: Partial<Record<NivelDominio, typeof topicStats>> = {};
    for (const n of SECTION_ORDER) groups[n] = list.filter(t => t?.nivel_dominio === n);
    return groups;
  }, [topicStats, filterAcademia, filterNivel, searchTerm]);

  // ── KPI stats (respect academia filter, not level filter) ──────────────
  const kpiBase = useMemo(() =>
    filterAcademia ? topicStats.filter(t => t?.academia_id === filterAcademia) : topicStats,
    [topicStats, filterAcademia]
  );
  const totalResp    = kpiBase.reduce((s, t) => s + (t?.total_respondidas || 0), 0);
  const totalCorr    = kpiBase.reduce((s, t) => s + (t?.total_correctas || 0), 0);
  const promedio     = totalResp > 0 ? Math.round((totalCorr / totalResp) * 100) : 0;
  const dominados    = kpiBase.filter(t => t?.nivel_dominio === 'Dominado').length;
  const necesitan    = kpiBase.filter(t => t?.nivel_dominio === 'Necesita Práctica').length;
  const totalTemas   = kpiBase.length;
  const pc           = promedioColor(promedio);

  const hasAnyResult = SECTION_ORDER.some(n => (filteredGroups[n]?.length ?? 0) > 0);
  const activeFilters = [filterAcademia, filterNivel, searchTerm].filter(Boolean).length;

  return (
    <>
      <div className="max-w-2xl mx-auto px-4 pb-24 space-y-4">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <h1 className="text-xl font-bold">Análisis por Temas</h1>
            <p className="text-xs text-muted-foreground">
              {loading ? 'Cargando...' : `${totalTemas} temas · ${academias.length} academias`}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={refreshData} disabled={loading} className="h-8 gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline text-xs">Actualizar</span>
          </Button>
        </div>

        {/* ── KPI strip ──────────────────────────────────────────────── */}
        {!loading && topicStats.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {/* Promedio */}
            <div className="flex flex-col items-center text-center px-1 py-3 rounded-xl border bg-card">
              <div className={`w-8 h-8 rounded-full ${pc.bg} flex items-center justify-center mb-1.5`}>
                <Target className={`h-4 w-4 ${pc.text}`} />
              </div>
              <span className={`text-lg font-black leading-none tabular-nums ${pc.text}`}>{promedio}%</span>
              <div className="w-full px-2 mt-1.5">
                <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${pc.bar}`} style={{ width: `${promedio}%` }} />
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground mt-1">Promedio</span>
            </div>
            {/* Respondidas */}
            <div className="flex flex-col items-center text-center px-1 py-3 rounded-xl border bg-card">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mb-1.5">
                <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-lg font-black leading-none tabular-nums text-blue-600 dark:text-blue-400">{totalResp.toLocaleString()}</span>
              <span className="text-[10px] text-muted-foreground mt-1">Respondidas</span>
            </div>
            {/* Dominados */}
            <div className="flex flex-col items-center text-center px-1 py-3 rounded-xl border bg-card">
              <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center mb-1.5">
                <span className="text-base leading-none">🏆</span>
              </div>
              <span className="text-lg font-black leading-none tabular-nums text-teal-600 dark:text-teal-400">{dominados}</span>
              <span className="text-[10px] text-muted-foreground mt-1">Dominados</span>
            </div>
            {/* Atención */}
            <div className="flex flex-col items-center text-center px-1 py-3 rounded-xl border bg-card">
              <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center mb-1.5">
                <span className="text-base leading-none">🔴</span>
              </div>
              <span className="text-lg font-black leading-none tabular-nums text-red-600 dark:text-red-400">{necesitan}</span>
              <span className="text-[10px] text-muted-foreground mt-1">Atención</span>
            </div>
          </div>
        )}

        {/* ── Loading skeleton ────────────────────────────────────────── */}
        {loading && (
          <div className="space-y-2 animate-pulse">
            <div className="grid grid-cols-4 gap-2">
              {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-xl border bg-muted" />)}
            </div>
            <div className="h-9 rounded-lg bg-muted" />
            <div className="h-8 rounded-lg bg-muted w-3/4" />
            {[...Array(4)].map((_, i) => <div key={i} className="h-14 rounded-xl border border-l-4 border-l-gray-200 bg-card" />)}
          </div>
        )}

        {/* ── Filters ────────────────────────────────────────────────── */}
        {!loading && topicStats.length > 0 && (
          <div className="space-y-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar tema..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Academia filters */}
            {academias.length > 1 && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-0.5 flex items-center gap-1">
                  <GraduationCap className="h-3 w-3" /> Academia
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <Pill active={filterAcademia === null} onClick={() => setFilterAcademia(null)}>
                    Todas
                  </Pill>
                  {academias.map(a => (
                    <Pill key={a.id} active={filterAcademia === a.id} onClick={() => setFilterAcademia(filterAcademia === a.id ? null : a.id)}>
                      {a.nombre}
                    </Pill>
                  ))}
                </div>
              </div>
            )}

            {/* Mastery level filters */}
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-0.5">Nivel</p>
              <div className="flex flex-wrap gap-1.5">
                <Pill active={filterNivel === null} onClick={() => setFilterNivel(null)}>
                  Todos ({topicStats.filter(t => !filterAcademia || t.academia_id === filterAcademia).length})
                </Pill>
                {SECTION_ORDER.map(nivel => {
                  const cfg = MASTERY_CONFIG[nivel];
                  const count = topicStats.filter(t =>
                    t?.nivel_dominio === nivel &&
                    (!filterAcademia || t.academia_id === filterAcademia)
                  ).length;
                  if (count === 0) return null;
                  return (
                    <Pill key={nivel} active={filterNivel === nivel} onClick={() => setFilterNivel(filterNivel === nivel ? null : nivel)}>
                      {cfg.icon} {SECTION_LABELS[nivel]} ({count})
                    </Pill>
                  );
                })}
              </div>
            </div>

            {/* Active filter summary */}
            {activeFilters > 0 && (
              <button
                onClick={() => { setFilterAcademia(null); setFilterNivel(null); setSearchTerm(''); }}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3 w-3" />
                Limpiar filtros
              </button>
            )}
          </div>
        )}

        {/* ── Topic sections ──────────────────────────────────────────── */}
        {!loading && (
          <div className="space-y-2">
            {SECTION_ORDER.map(nivel => {
              const topics = filteredGroups[nivel] ?? [];
              if (topics.length === 0) return null;
              const cfg = MASTERY_CONFIG[nivel];
              const isExpanded = expandedSections.has(nivel);
              const avgPct = Math.round(topics.reduce((s, t) => s + t.porcentaje_acierto, 0) / topics.length);

              return (
                <div key={nivel} className={`rounded-xl border border-l-4 ${cfg.border} bg-card transition-all duration-200`}>

                  {/* Section header */}
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    onClick={() => toggleSection(nivel)}
                  >
                    <span className="text-base leading-none flex-shrink-0">{cfg.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{SECTION_LABELS[nivel]}</p>
                      <p className={`text-[11px] font-medium ${cfg.text}`}>
                        {topics.length} tema{topics.length !== 1 ? 's' : ''} · {avgPct}% acierto medio
                      </p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.badge}`}>
                      {topics.length}
                    </span>
                    {isExpanded
                      ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    }
                  </button>

                  {/* Mini bar */}
                  <div className="px-4 pb-2 -mt-1">
                    <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${avgPct}%` }} />
                    </div>
                  </div>

                  {/* Topic rows */}
                  {isExpanded && (
                    <div className="border-t px-3 pb-3 pt-2 space-y-1.5">
                      {topics.map(topic => {
                        const isDominado = topic.nivel_dominio === 'Dominado';
                        return (
                          <div
                            key={topic.tema_id}
                            className={`rounded-lg border p-2.5 transition-colors ${
                              isDominado
                                ? 'bg-teal-50/50 dark:bg-teal-900/10 border-teal-100 dark:border-teal-900'
                                : 'bg-background border-muted hover:border-muted-foreground/30'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                {/* Name + academia */}
                                <p className={`text-sm font-medium leading-tight mb-0.5 ${isDominado ? 'line-through text-muted-foreground' : ''}`}>
                                  {topic.tema_nombre}
                                </p>
                                {/* Show academia if not filtered to one */}
                                {!filterAcademia && (
                                  <p className="text-[10px] text-muted-foreground mb-1 truncate">{topic.academia_nombre}</p>
                                )}
                                {/* Dual progress bars */}
                                <div className="space-y-0.5 mt-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-muted-foreground w-12 flex-shrink-0">Acierto</span>
                                    <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                      <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${topic.porcentaje_acierto}%` }} />
                                    </div>
                                    <span className={`text-[10px] font-bold w-7 text-right flex-shrink-0 ${cfg.text}`}>{topic.porcentaje_acierto}%</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-muted-foreground w-12 flex-shrink-0">Temario</span>
                                    <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                      <div className="h-full rounded-full bg-gray-400 dark:bg-gray-500" style={{ width: `${topic.progreso_temario}%` }} />
                                    </div>
                                    <span className="text-[10px] text-muted-foreground w-7 text-right flex-shrink-0">{topic.progreso_temario}%</span>
                                  </div>
                                </div>
                                {/* Meta */}
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  {topic.total_respondidas} resp.
                                  {topic.dias_sin_repasar > 0 && ` · ${topic.dias_sin_repasar}d sin repasar`}
                                  {topic.preguntas_pendientes > 0 && ` · ${topic.preguntas_pendientes} pend.`}
                                </p>
                              </div>

                              {/* Actions */}
                              <div className="flex flex-col gap-1 flex-shrink-0 mt-0.5">
                                <Button
                                  size="sm"
                                  className="h-7 px-2.5 text-xs"
                                  onClick={() => handlePracticeClick(topic.tema_id, topic.academia_id, topic.preguntas_falladas_ids || [])}
                                >
                                  <PlayCircle className="h-3 w-3 mr-1" />
                                  {isDominado ? 'Repasar' : 'Practicar'}
                                </Button>
                                {isDominado && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2.5 text-[11px] text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    onClick={() => resetTopicProgress(topic.tema_id, topic.tema_nombre)}
                                  >
                                    <RotateCcw className="h-3 w-3 mr-1" />
                                    Reset
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* No results */}
            {topicStats.length > 0 && !hasAnyResult && (
              <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm mb-3">No hay temas con ese filtro</p>
                <button
                  onClick={() => { setFilterAcademia(null); setFilterNivel(null); setSearchTerm(''); }}
                  className="text-xs text-muted-foreground underline underline-offset-2"
                >
                  Limpiar filtros
                </button>
              </div>
            )}

            {/* Empty state */}
            {topicStats.length === 0 && !loading && (
              <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
                <BookOpen className="h-8 w-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm mb-4">Completa algún test para ver tu análisis por temas</p>
                <Button size="sm" onClick={() => navigate("/test-setup")}>
                  <PlayCircle className="h-4 w-4 mr-1.5" />
                  Hacer un test
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <CelebrationModal
        isOpen={celebrationModal.isOpen}
        onClose={closeCelebration}
        achievement={celebrationModal.achievement}
        onContinue={() => { closeCelebration(); navigate("/analisis-temas"); }}
        onNextTopic={() => { closeCelebration(); navigate("/test-setup"); }}
        onPracticeMore={() => { closeCelebration(); navigate("/practice"); }}
      />
    </>
  );
}
