import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Target, BookOpen, BarChart3, Flame, AlertCircle, Star } from "lucide-react";
import type { AdvancedUserStats } from "@/hooks/useAdvancedStats";

interface UnifiedStatsShape {
  overallAccuracy: number;
  totalQuestions: number;
  completedSessions: number;
  streakDays: number;
  failedQuestions: number;
}

interface Props {
  stats: UnifiedStatsShape | null;
  advanced: AdvancedUserStats | null;
  loading: boolean;
}

const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2500, 4000];
const LEVEL_TITLES = ['Principiante', 'Aprendiz', 'Estudiante', 'Conocedor', 'Avanzado', 'Experto', 'Maestro', 'Leyenda'];
const LEVEL_COLORS = [
  'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
  'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
  'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400',
  'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
  'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400',
  'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
  'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400',
];
const LEVEL_BAR_COLORS = [
  'bg-gray-400', 'bg-green-500', 'bg-blue-500', 'bg-teal-500',
  'bg-purple-500', 'bg-indigo-500', 'bg-amber-500', 'bg-orange-500',
];

function accuracyColor(acc: number) {
  if (acc >= 80) return { text: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-100 dark:bg-teal-900/40', icon: 'bg-teal-500' };
  if (acc >= 60) return { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/40', icon: 'bg-amber-500' };
  return { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/40', icon: 'bg-red-500' };
}

export default function StudentProfile({ stats, advanced, loading }: Props) {
  if (loading || !stats || !advanced) {
    return (
      <Card>
        <CardContent className="p-4 space-y-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-2.5 bg-muted rounded w-full" />
            </div>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const level = advanced.currentLevel;
  const points = advanced.points;
  const levelIdx = level - 1;
  const currentThreshold = LEVEL_THRESHOLDS[levelIdx] ?? 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const xpRange = nextThreshold - currentThreshold;
  const xpPct = xpRange > 0 ? Math.min(100, Math.round(((points - currentThreshold) / xpRange) * 100)) : 100;
  const levelColor = LEVEL_COLORS[levelIdx] ?? LEVEL_COLORS[0];
  const barColor = LEVEL_BAR_COLORS[levelIdx] ?? LEVEL_BAR_COLORS[0];
  const isMaxLevel = level >= 8;

  const acc = accuracyColor(stats.overallAccuracy);

  const kpis = [
    {
      label: 'Precisión',
      value: `${stats.overallAccuracy}%`,
      icon: Target,
      iconBg: acc.bg,
      iconColor: acc.text,
    },
    {
      label: 'Preguntas',
      value: stats.totalQuestions.toLocaleString(),
      icon: BookOpen,
      iconBg: 'bg-blue-100 dark:bg-blue-900/40',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Sesiones',
      value: stats.completedSessions.toLocaleString(),
      icon: BarChart3,
      iconBg: 'bg-purple-100 dark:bg-purple-900/40',
      iconColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      label: 'Racha',
      value: `${stats.streakDays}d`,
      icon: Flame,
      iconBg: stats.streakDays > 0 ? 'bg-orange-100 dark:bg-orange-900/40' : 'bg-gray-100 dark:bg-gray-800',
      iconColor: stats.streakDays > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400 dark:text-gray-600',
    },
    {
      label: 'Falladas',
      value: stats.failedQuestions.toLocaleString(),
      icon: AlertCircle,
      iconBg: stats.failedQuestions > 0 ? 'bg-red-100 dark:bg-red-900/40' : 'bg-gray-100 dark:bg-gray-800',
      iconColor: stats.failedQuestions > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400',
    },
  ];

  return (
    <Card>
      <CardContent className="p-4 space-y-4">

        {/* Level + XP bar */}
        <div className="flex items-center gap-3">
          {/* Level badge */}
          <div className={`w-14 h-14 rounded-full flex flex-col items-center justify-center flex-shrink-0 ${levelColor}`}>
            <span className="text-lg font-black leading-none">{level}</span>
            <Star className="h-3 w-3 mt-0.5" />
          </div>

          {/* XP info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2 mb-1.5">
              <span className="text-sm font-bold">{LEVEL_TITLES[levelIdx]}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {isMaxLevel ? `${points.toLocaleString()} XP · Nivel máximo` : `${points.toLocaleString()} / ${nextThreshold.toLocaleString()} XP`}
              </span>
            </div>
            <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                style={{ width: `${xpPct}%` }}
              />
            </div>
            {!isMaxLevel && (
              <p className="text-[11px] text-muted-foreground mt-1">
                {advanced.experienceToNextLevel.toLocaleString()} XP para {LEVEL_TITLES[level] ?? 'siguiente nivel'}
              </p>
            )}
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-5 gap-1 border-t pt-3">
          {kpis.map((k, i) => (
            <div key={i} className="flex flex-col items-center text-center px-0.5 py-1 rounded-lg hover:bg-muted/50 transition-colors">
              <div className={`w-7 h-7 rounded-full ${k.iconBg} flex items-center justify-center mb-1.5`}>
                <k.icon className={`h-3.5 w-3.5 ${k.iconColor}`} />
              </div>
              <span className="text-base font-bold leading-none tabular-nums">{k.value}</span>
              <span className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{k.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
