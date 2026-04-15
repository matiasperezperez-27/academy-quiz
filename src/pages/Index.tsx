import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Play,
  BookOpen,
  LogOut,
  Trophy,
  Target,
  TrendingUp,
  User,
  Clock,
  CheckCircle2,
  RefreshCw,
  Flame,
  Star,
  BarChart3,
  Shield,
  GraduationCap,
  FileCheck,
  Users,
  AlertCircle,
  ChevronRight,
  Zap,
  BookMarked,
  ClipboardList,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useProfesor } from "@/hooks/useProfesor";
import { useProfesorData } from "@/hooks/useProfesorData";
import { supabase } from "@/integrations/supabase/client";

// ── Level system ─────────────────────────────────────────────────────────────
const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2500, 4000];
const LEVEL_TITLES     = ['Principiante','Aprendiz','Estudiante','Conocedor','Avanzado','Experto','Maestro','Leyenda'];
const LEVEL_COLORS     = [
  'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
  'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
  'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400',
  'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
  'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400',
  'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
  'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400',
];
const LEVEL_BAR_COLORS = ['bg-gray-400','bg-green-500','bg-blue-500','bg-teal-500','bg-purple-500','bg-indigo-500','bg-amber-500','bg-orange-500'];

function computeLevel(points: number) {
  let idx = 0;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (points >= LEVEL_THRESHOLDS[i]) idx = i;
  }
  const level = idx + 1;
  const currentThreshold = LEVEL_THRESHOLDS[idx] ?? 0;
  const nextThreshold    = LEVEL_THRESHOLDS[idx + 1] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const xpRange = nextThreshold - currentThreshold;
  const xpPct   = xpRange > 0 ? Math.min(100, Math.round(((points - currentThreshold) / xpRange) * 100)) : 100;
  return { level, title: LEVEL_TITLES[idx], color: LEVEL_COLORS[idx], bar: LEVEL_BAR_COLORS[idx], xpPct, nextThreshold, isMax: level >= 8 };
}

function accColor(pct: number) {
  if (pct >= 80) return { text: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-100 dark:bg-teal-900/40', bar: 'bg-teal-500' };
  if (pct >= 60) return { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/40', bar: 'bg-amber-500' };
  return { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/40', bar: 'bg-red-500' };
}

function verColor(pct: number) {
  if (pct >= 70) return { border: 'border-l-teal-400', text: 'text-teal-600 dark:text-teal-400', bar: 'bg-teal-500' };
  if (pct >= 30) return { border: 'border-l-amber-400', text: 'text-amber-600 dark:text-amber-400', bar: 'bg-amber-500' };
  return { border: 'border-l-red-400', text: 'text-red-600 dark:text-red-400', bar: 'bg-red-500' };
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 18) return "Buenas tardes";
  return "Buenas noches";
}

function getDisplayName(user: any) {
  if (user?.user_metadata?.username) return user.user_metadata.username;
  if (user?.email) return user.email.split("@")[0];
  return "Usuario";
}

// ── KPI cell ─────────────────────────────────────────────────────────────────
function KpiCell({ label, value, icon: Icon, iconBg, iconColor }: { label: string; value: string | number; icon: React.ElementType; iconBg: string; iconColor: string }) {
  return (
    <div className="flex flex-col items-center text-center px-1 py-2 rounded-xl border bg-card">
      <div className={`w-7 h-7 rounded-full ${iconBg} flex items-center justify-center mb-1`}>
        <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
      </div>
      <span className="text-base font-bold leading-none tabular-nums">{value}</span>
      <span className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{label}</span>
    </div>
  );
}

// ── Action card ───────────────────────────────────────────────────────────────
function ActionCard({
  icon: Icon, iconBg, title, description, badge, badgeColor = 'bg-red-500 text-white',
  btnLabel, btnVariant = 'default', onClick, disabled = false,
}: {
  icon: React.ElementType; iconBg: string; title: string; description: string;
  badge?: string | number; badgeColor?: string;
  btnLabel: string; btnVariant?: 'default' | 'outline'; onClick: () => void; disabled?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{title}</p>
            {badge !== undefined && Number(badge) > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <Button
        size="sm"
        variant={btnVariant}
        className="w-full h-9"
        onClick={onClick}
        disabled={disabled}
      >
        {btnLabel}
      </Button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VISTA ALUMNO
// ═══════════════════════════════════════════════════════════════════════════════
function StudentHome({ user }: { user: any }) {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: d } = await supabase.rpc("get_user_stats", { p_user_id: user.id });
      setData(d ?? {});
    } catch { setData({}); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const safe = (key: string, def = 0) => {
    if (!data || typeof data !== 'object') return def;
    return data[key] ?? def;
  };

  const points        = safe('points');
  const accuracy      = Math.round(safe('overall_accuracy_percentage'));
  const sessions      = safe('completed_sessions');
  const totalQ        = safe('total_questions_answered');
  const failed        = safe('current_failed_questions');
  const bestScore     = Math.round(safe('best_session_score_percentage'));
  const lastActivity  = safe('last_activity', null) as string | null;

  const lv  = computeLevel(points);
  const ac  = accColor(accuracy);

  const motivational = () => {
    if (sessions === 0) return { emoji: '🌟', msg: '¡Comienza tu viaje! Haz tu primer test y empieza a ganar XP.' };
    if (failed > 10) return { emoji: '💪', msg: `Tienes ${failed} preguntas pendientes. Repasarlas es la forma más rápida de mejorar.` };
    if (accuracy >= 80) return { emoji: '🏆', msg: '¡Excelente rendimiento! Estás por encima del 80% de precisión. ¡Sigue así!' };
    return { emoji: '🎯', msg: `${sessions} sesiones completadas. La constancia es la clave del éxito.` };
  };
  const mot = motivational();

  return (
    <div className="max-w-2xl mx-auto px-4 pb-24 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <p className="text-xs text-muted-foreground">{getGreeting()}</p>
          <h1 className="text-xl font-bold">{getDisplayName(user)}</h1>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="h-8 gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline text-xs">Actualizar</span>
        </Button>
      </div>

      {/* Level + XP card */}
      {loading ? (
        <div className="rounded-xl border bg-card p-4 animate-pulse space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-2.5 bg-muted rounded w-full" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-muted rounded-xl" />)}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-4 space-y-4">
          {/* Level + XP bar */}
          <div className="flex items-center gap-3">
            <div className={`w-14 h-14 rounded-full flex flex-col items-center justify-center flex-shrink-0 ${lv.color}`}>
              <span className="text-lg font-black leading-none">{lv.level}</span>
              <Star className="h-3 w-3 mt-0.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2 mb-1.5">
                <span className="text-sm font-bold">{lv.title}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {lv.isMax ? `${points.toLocaleString()} XP · Nivel máximo` : `${points.toLocaleString()} / ${lv.nextThreshold.toLocaleString()} XP`}
                </span>
              </div>
              <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${lv.bar}`} style={{ width: `${lv.xpPct}%` }} />
              </div>
            </div>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-4 gap-1 border-t pt-3">
            <KpiCell label="Precisión"  value={`${accuracy}%`}            icon={Target}   iconBg={ac.bg}                                        iconColor={ac.text} />
            <KpiCell label="Sesiones"   value={sessions.toLocaleString()}  icon={BarChart3} iconBg="bg-blue-100 dark:bg-blue-900/40"             iconColor="text-blue-600 dark:text-blue-400" />
            <KpiCell label="Preguntas"  value={totalQ.toLocaleString()}    icon={BookOpen}  iconBg="bg-purple-100 dark:bg-purple-900/40"          iconColor="text-purple-600 dark:text-purple-400" />
            <KpiCell label="Falladas"   value={failed.toLocaleString()}    icon={AlertCircle} iconBg={failed > 0 ? 'bg-red-100 dark:bg-red-900/40' : 'bg-gray-100 dark:bg-gray-800'} iconColor={failed > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'} />
          </div>
        </div>
      )}

      {/* Motivational banner */}
      {!loading && (
        <div className="rounded-xl border bg-card px-4 py-3 flex items-center gap-3">
          <span className="text-xl flex-shrink-0">{mot.emoji}</span>
          <p className="text-xs text-muted-foreground leading-relaxed">{mot.msg}</p>
          {sessions === 0 && (
            <Button size="sm" className="flex-shrink-0 h-8 px-3 text-xs" onClick={() => navigate('/test-setup')}>
              Empezar
            </Button>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-0.5">Acciones</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <ActionCard
            icon={Play}
            iconBg="bg-teal-600"
            title="Nuevo Test"
            description="Elige academia y tema para empezar"
            btnLabel="Comenzar test"
            onClick={() => navigate('/test-setup')}
          />
          <ActionCard
            icon={BookOpen}
            iconBg={failed > 0 ? 'bg-orange-500' : 'bg-gray-400'}
            title="Modo Práctica"
            description={failed > 0 ? `${failed} preguntas falladas pendientes` : 'No hay preguntas falladas'}
            badge={failed > 0 ? failed : undefined}
            btnLabel={failed > 0 ? 'Practicar ahora' : 'Sin pendientes'}
            btnVariant="outline"
            onClick={() => navigate('/practice')}
            disabled={failed === 0}
          />
          <ActionCard
            icon={BarChart3}
            iconBg="bg-blue-600"
            title="Análisis por Temas"
            description="Ve tu progreso detallado por tema"
            btnLabel={totalQ > 0 ? 'Ver análisis' : 'Sin datos aún'}
            btnVariant="outline"
            onClick={() => navigate('/analisis-temas')}
            disabled={totalQ === 0}
          />
          <ActionCard
            icon={TrendingUp}
            iconBg="bg-purple-600"
            title="Mis Estadísticas"
            description="Actividad, rendimiento y maestría"
            btnLabel="Ver estadísticas"
            btnVariant="outline"
            onClick={() => navigate('/stats')}
          />
        </div>
      </div>

      {/* Quick stats row */}
      {!loading && sessions > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-0.5">Resumen</p>
          <div className="rounded-xl border bg-card divide-y">
            {[
              { label: 'Mejor puntuación',   value: `${bestScore}%` },
              { label: 'Última actividad',    value: lastActivity ? new Date(lastActivity).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }) : 'Nunca' },
              { label: 'Ranking',             value: <button className="text-xs text-teal-600 dark:text-teal-400 flex items-center gap-0.5" onClick={() => navigate('/ranking')}>Ver ranking <ChevronRight className="h-3 w-3" /></button> },
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs text-muted-foreground">{row.label}</span>
                <span className="text-xs font-semibold">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VISTA PROFESOR
// ═══════════════════════════════════════════════════════════════════════════════
function ProfesorHome({ user }: { user: any }) {
  const navigate = useNavigate();
  const { stats, academias, loading, refresh } = useProfesorData(user?.id);

  const totalP   = stats?.total_preguntas     ?? 0;
  const verified = stats?.preguntas_verificadas ?? 0;
  const pending  = stats?.preguntas_pendientes  ?? 0;
  const verPct   = totalP > 0 ? Math.round((verified / totalP) * 100) : 0;
  const vc       = verColor(verPct);

  return (
    <div className="max-w-2xl mx-auto px-4 pb-24 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <p className="text-xs text-muted-foreground">{getGreeting()}, profesor</p>
          <h1 className="text-xl font-bold">{getDisplayName(user)}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading} className="h-8 gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline text-xs">Actualizar</span>
          </Button>
          <Button size="sm" className="h-8 gap-1.5 bg-teal-600 hover:bg-teal-700" onClick={() => navigate('/profesor')}>
            <Shield className="h-3.5 w-3.5" />
            <span className="text-xs">Panel completo</span>
          </Button>
        </div>
      </div>

      {/* Verification health bar */}
      {loading ? (
        <div className="rounded-xl border bg-card p-4 animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-2 bg-muted rounded w-full" />
          <div className="grid grid-cols-3 gap-1">
            {[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-muted rounded-xl" />)}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-4 space-y-4">
          {/* Health bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Salud del contenido</p>
              <span className={`text-sm font-bold ${vc.text}`}>{verPct}% verificado</span>
            </div>
            <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${vc.bar}`} style={{ width: `${verPct}%` }} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {verified} verificadas · {pending} pendientes · {totalP} total
            </p>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-3 gap-1 border-t pt-3">
            <KpiCell label="Academias"  value={stats?.total_academias ?? 0}    icon={GraduationCap} iconBg="bg-teal-100 dark:bg-teal-900/40"   iconColor="text-teal-600 dark:text-teal-400" />
            <KpiCell label="Temas"      value={stats?.total_temas ?? 0}        icon={BookMarked}    iconBg="bg-blue-100 dark:bg-blue-900/40"    iconColor="text-blue-600 dark:text-blue-400" />
            <KpiCell label="Estudiantes" value={stats?.total_estudiantes ?? 0} icon={Users}         iconBg="bg-purple-100 dark:bg-purple-900/40" iconColor="text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      )}

      {/* Pending alert */}
      {!loading && pending > 0 && (
        <div className="rounded-xl border border-l-4 border-l-amber-400 bg-card px-4 py-3 flex items-center gap-3">
          <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
          <p className="text-xs text-muted-foreground flex-1">
            <span className="font-semibold text-foreground">{pending} preguntas</span> esperan verificación
          </p>
          <Button size="sm" className="h-8 px-3 text-xs bg-amber-500 hover:bg-amber-600" onClick={() => navigate('/profesor?tab=verificar')}>
            Verificar
          </Button>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-0.5">Acciones rápidas</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <ActionCard
            icon={FileCheck}
            iconBg={pending > 0 ? 'bg-amber-500' : 'bg-teal-600'}
            title="Verificar Preguntas"
            description={pending > 0 ? `${pending} preguntas pendientes de revisión` : 'Todas las preguntas están verificadas'}
            badge={pending > 0 ? pending : undefined}
            badgeColor="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
            btnLabel="Ir a verificar"
            onClick={() => navigate('/profesor?tab=verificar')}
          />
          <ActionCard
            icon={ClipboardList}
            iconBg="bg-blue-600"
            title="Gestionar Preguntas"
            description="Crea, edita y organiza el banco de preguntas"
            btnLabel="Gestionar"
            btnVariant="outline"
            onClick={() => navigate('/profesor?tab=preguntas')}
          />
          <ActionCard
            icon={Users}
            iconBg="bg-purple-600"
            title="Estadísticas Alumnos"
            description="Rendimiento y progreso de tus estudiantes"
            btnLabel="Ver alumnos"
            btnVariant="outline"
            onClick={() => navigate('/profesor?tab=alumnos')}
          />
          <ActionCard
            icon={BarChart3}
            iconBg="bg-indigo-600"
            title="Exámenes"
            description="Crea y gestiona exámenes para tus academias"
            btnLabel="Ver exámenes"
            btnVariant="outline"
            onClick={() => navigate('/profesor?tab=examenes')}
          />
        </div>
      </div>

      {/* Academia list */}
      {!loading && academias.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-0.5">
            Mis academias
          </p>
          <div className="space-y-2">
            {academias.map(a => {
              const pct = a.total_preguntas > 0 ? Math.round((a.preguntas_verificadas / a.total_preguntas) * 100) : 0;
              const c   = verColor(pct);
              return (
                <div key={a.academia_id} className={`rounded-xl border border-l-4 ${c.border} bg-card px-4 py-3`}>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{a.academia_nombre}</p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                        <span>{a.total_temas} temas</span>
                        <span>·</span>
                        <span>{a.total_preguntas} preguntas</span>
                        {a.preguntas_pendientes > 0 && (
                          <>
                            <span>·</span>
                            <span className="text-amber-600 dark:text-amber-400">{a.preguntas_pendientes} pendientes</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className={`text-sm font-bold flex-shrink-0 ${c.text}`}>{pct}%</span>
                  </div>
                  <div className="mt-2 w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state (no academias assigned) */}
      {!loading && academias.length === 0 && (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <GraduationCap className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No tienes academias asignadas aún.</p>
          <p className="text-xs mt-1">Contacta con un administrador para que te asigne academias.</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT — decide qué vista mostrar
// ═══════════════════════════════════════════════════════════════════════════════
export default function HomePage() {
  const { user } = useAuth();
  const { isAdmin }    = useAdmin();
  const { isProfesor, loading: profLoading } = useProfesor();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground text-sm">Cargando...</p>
      </div>
    );
  }

  if (profLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-8 space-y-3 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/2" />
        <div className="h-32 bg-muted rounded-xl" />
        <div className="grid grid-cols-2 gap-2">
          <div className="h-28 bg-muted rounded-xl" />
          <div className="h-28 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  if (isProfesor) return <ProfesorHome user={user} />;
  return <StudentHome user={user} />;
}
