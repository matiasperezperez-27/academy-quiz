import { useAuth } from "@/hooks/useAuth";
import { useRankingData, type RankingUser } from "@/hooks/useRankingData";
import { RefreshCw, Trophy, Target, Star, Users, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Level system (same thresholds as /stats) ────────────────────────────────
const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2500, 4000];
const LEVEL_TITLES     = ['Principiante','Aprendiz','Estudiante','Conocedor','Avanzado','Experto','Maestro','Leyenda'];
const LEVEL_COLORS     = [
  'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
  'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
  'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
  'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400',
  'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
  'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400',
  'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
  'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400',
];

function getLevel(points: number) {
  let idx = 0;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (points >= LEVEL_THRESHOLDS[i]) idx = i;
  }
  return { level: idx + 1, title: LEVEL_TITLES[idx], color: LEVEL_COLORS[idx] };
}

function medal(pos: number) {
  if (pos === 1) return '🥇';
  if (pos === 2) return '🥈';
  if (pos === 3) return '🥉';
  return null;
}

function accColor(pct: number) {
  if (pct >= 80) return { text: 'text-teal-600 dark:text-teal-400', bar: 'bg-teal-500' };
  if (pct >= 60) return { text: 'text-amber-600 dark:text-amber-400', bar: 'bg-amber-500' };
  return { text: 'text-red-600 dark:text-red-400', bar: 'bg-red-500' };
}

function posStyle(pos: number) {
  if (pos === 1) return { border: 'border-l-amber-400',  num: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' };
  if (pos === 2) return { border: 'border-l-gray-400',   num: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' };
  if (pos === 3) return { border: 'border-l-orange-400', num: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400' };
  if (pos <= 10) return { border: 'border-l-blue-400',   num: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400' };
  return         { border: 'border-l-gray-200 dark:border-l-gray-700', num: 'bg-muted text-muted-foreground' };
}

// ── Podium card (top 3) ──────────────────────────────────────────────────────
function PodiumCard({ user, isCurrentUser }: { user: RankingUser; isCurrentUser: boolean }) {
  const pos = user.position ?? 0;
  const lv  = getLevel(user.puntos);
  const ac  = accColor(Math.round(user.accuracy));
  const ps  = posStyle(pos);

  return (
    <div className={`rounded-xl border border-l-4 ${ps.border} bg-card p-3 flex flex-col gap-2 ${isCurrentUser ? 'ring-2 ring-teal-400/40' : ''}`}>
      <div className="flex items-start gap-1.5">
        <span className="text-lg leading-none flex-shrink-0">{medal(pos)}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-bold truncate leading-tight ${isCurrentUser ? 'text-teal-600 dark:text-teal-400' : ''}`}>
            {user.username || user.email}
            {isCurrentUser && <span className="ml-1 text-[9px] font-normal text-teal-500">← Tú</span>}
          </p>
          <span className={`inline-block text-[9px] font-medium px-1 py-0.5 rounded-full mt-0.5 ${lv.color}`}>{lv.title}</span>
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-black tabular-nums">{user.puntos.toLocaleString()}</span>
        <span className="text-[10px] text-muted-foreground">pts</span>
      </div>
      <div>
        <div className="flex justify-between mb-0.5">
          <span className="text-[9px] text-muted-foreground">Precisión</span>
          <span className={`text-[9px] font-bold ${ac.text}`}>{Math.round(user.accuracy)}%</span>
        </div>
        <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${ac.bar}`} style={{ width: `${Math.round(user.accuracy)}%` }} />
        </div>
      </div>
      <p className="text-[9px] text-muted-foreground">{user.total_sessions} tests completados</p>
    </div>
  );
}

// ── Ranking row (position 4+) ────────────────────────────────────────────────
function RankRow({ user, isCurrentUser }: { user: RankingUser; isCurrentUser: boolean }) {
  const pos = user.position ?? 0;
  const lv  = getLevel(user.puntos);
  const ac  = accColor(Math.round(user.accuracy));
  const ps  = posStyle(pos);
  const m   = medal(pos);

  return (
    <div className={`rounded-xl border border-l-4 ${ps.border} bg-card px-3 py-2.5 flex items-center gap-3 ${isCurrentUser ? 'ring-1 ring-teal-400/40' : ''}`}>
      {/* Rank number / medal */}
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${ps.num}`}>
        {m
          ? <span className="text-sm leading-none">{m}</span>
          : <span className="text-xs font-bold">{pos}</span>
        }
      </div>

      {/* Name + level + tests */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className={`text-sm font-semibold truncate ${isCurrentUser ? 'text-teal-600 dark:text-teal-400' : ''}`}>
            {user.username || user.email}
          </p>
          {isCurrentUser && <span className="text-[10px] text-teal-500 font-medium flex-shrink-0">← Tú</span>}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${lv.color}`}>{lv.title}</span>
          <span className="text-[10px] text-muted-foreground">{user.total_sessions} tests</span>
        </div>
      </div>

      {/* Accuracy bar — hidden on very small screens */}
      <div className="hidden sm:flex flex-col items-end w-20 gap-0.5 flex-shrink-0">
        <span className={`text-[10px] font-bold ${ac.text}`}>{Math.round(user.accuracy)}%</span>
        <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${ac.bar}`} style={{ width: `${Math.round(user.accuracy)}%` }} />
        </div>
        <span className="text-[10px] text-muted-foreground">precisión</span>
      </div>

      {/* Points */}
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-black tabular-nums">{user.puntos.toLocaleString()}</p>
        <p className="text-[10px] text-muted-foreground">pts</p>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function RankingPage() {
  const { user } = useAuth();
  const { data, loading, error, refresh } = useRankingData(50);

  const rankings   = data?.rankings ?? [];
  const userPos    = data?.userPosition ?? null;
  const totalUsers = data?.totalUsers ?? 0;
  const me         = rankings.find(r => r.id === user?.id) ?? null;
  const topThree   = rankings.slice(0, 3);
  const rest       = rankings.slice(3);

  const avgPoints   = rankings.length > 0 ? Math.round(rankings.reduce((s, r) => s + r.puntos, 0) / rankings.length) : 0;
  const avgAccuracy = rankings.length > 0 ? Math.round(rankings.reduce((s, r) => s + r.accuracy, 0) / rankings.length) : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 pb-24 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold">Ranking Global</h1>
          <p className="text-xs text-muted-foreground">
            {loading ? 'Cargando...' : `${totalUsers} estudiantes clasificados`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading} className="h-8 gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline text-xs">Actualizar</span>
        </Button>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2 animate-pulse">
          <div className="grid grid-cols-4 gap-2">
            {[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-xl border bg-muted" />)}
          </div>
          <div className="h-20 rounded-xl border bg-muted" />
          <div className="grid grid-cols-3 gap-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-32 rounded-xl border bg-muted" />)}
          </div>
          {[...Array(6)].map((_, i) => <div key={i} className="h-14 rounded-xl border border-l-4 border-l-gray-200 bg-card" />)}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="rounded-xl border border-l-4 border-l-red-400 bg-card px-4 py-3 flex items-center gap-3">
          <Trophy className="h-4 w-4 text-red-500 flex-shrink-0" />
          <p className="text-xs text-muted-foreground flex-1">Error al cargar el ranking</p>
          <Button size="sm" variant="outline" onClick={refresh} className="h-8 text-xs">Reintentar</Button>
        </div>
      )}

      {!loading && !error && rankings.length > 0 && (
        <>
          {/* KPI strip */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Clasificados', value: totalUsers,                    icon: Users,     bg: 'bg-blue-100 dark:bg-blue-900/40',    color: 'text-blue-600 dark:text-blue-400'    },
              { label: 'Tu posición',  value: userPos ? `#${userPos}` : '–', icon: Trophy,    bg: 'bg-amber-100 dark:bg-amber-900/40',  color: 'text-amber-600 dark:text-amber-400'  },
              { label: 'Media pts',    value: avgPoints.toLocaleString(),     icon: Star,      bg: 'bg-purple-100 dark:bg-purple-900/40',color: 'text-purple-600 dark:text-purple-400'},
              { label: 'Media acc.',   value: `${avgAccuracy}%`,             icon: Target,    bg: 'bg-teal-100 dark:bg-teal-900/40',   color: 'text-teal-600 dark:text-teal-400'    },
            ].map((k, i) => (
              <div key={i} className="flex flex-col items-center text-center px-1 py-2 rounded-xl border bg-card">
                <div className={`w-7 h-7 rounded-full ${k.bg} flex items-center justify-center mb-1`}>
                  <k.icon className={`h-3.5 w-3.5 ${k.color}`} />
                </div>
                <span className={`text-base font-bold leading-none tabular-nums ${k.color}`}>{k.value}</span>
                <span className="text-[10px] text-muted-foreground mt-0.5">{k.label}</span>
              </div>
            ))}
          </div>

          {/* My position banner */}
          {me && userPos && (
            <div className={`rounded-xl border border-l-4 ${posStyle(userPos).border} bg-card px-4 py-3`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Tu posición</p>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm ${posStyle(userPos).num}`}>
                  {medal(userPos) || <span className="font-black text-base">#{userPos}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{me.username || me.email}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${getLevel(me.puntos).color}`}>{getLevel(me.puntos).title}</span>
                    <span className="text-[10px] text-muted-foreground">{me.total_sessions} tests</span>
                    <span className={`text-[10px] font-semibold ${accColor(Math.round(me.accuracy)).text}`}>{Math.round(me.accuracy)}% precisión</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-black tabular-nums">{me.puntos.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">puntos</p>
                </div>
              </div>
              {/* Gap to leader / leader message */}
              <div className="mt-2 pt-2 border-t flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                {userPos === 1 ? (
                  <p className="text-[11px] font-medium text-teal-600 dark:text-teal-400">¡Eres el líder del ranking! 🏆</p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Te faltan{' '}
                    <span className="font-semibold text-foreground">
                      {(rankings[0].puntos - me.puntos).toLocaleString()} pts
                    </span>{' '}
                    para liderar · estás en el top {Math.round((userPos / totalUsers) * 100)}%
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Podium */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-0.5">
              🏆 Podio
            </p>
            <div className="grid grid-cols-3 gap-2">
              {topThree.map(u => (
                <PodiumCard key={u.id} user={u} isCurrentUser={u.id === user?.id} />
              ))}
            </div>
          </div>

          {/* Full ranking */}
          {rest.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-0.5">
                Clasificación completa
              </p>
              <div className="space-y-1.5">
                {rest.map(u => (
                  <RankRow key={u.id} user={u} isCurrentUser={u.id === user?.id} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!loading && !error && rankings.length === 0 && (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <Trophy className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">El ranking está vacío</p>
          <p className="text-xs mt-1">¡Completa un test para aparecer aquí!</p>
        </div>
      )}
    </div>
  );
}
