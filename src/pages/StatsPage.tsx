import React, { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ActivityHeatmap } from "@/components/stats/ActivityHeatmap";
import { PerformanceChart } from "@/components/stats/PerformanceChart";
import { MonthlyActivityChart } from "@/components/stats/MonthlyActivityChart";
import { ComparisonCard } from "@/components/stats/ComparisonCard";
import { RecommendationsCard } from "@/components/stats/RecommendationsCard";
import StudentProfile from "@/components/stats/StudentProfile";
import TopicMasteryGrid from "@/components/stats/TopicMasteryGrid";
import { useUnifiedStats } from "@/hooks/useUnifiedStats";
import { useAdvancedStats } from "@/hooks/useAdvancedStats";
import { useTopicAnalysis } from "@/hooks/useTopicAnalysis";
import { RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function StatsPage() {
  const { stats, loading: statsLoading, refresh } = useUnifiedStats();
  const { stats: advanced, loading: advLoading, refreshStats } = useAdvancedStats();
  const { topicStats, loading: topicsLoading, refreshData: refreshTopics } = useTopicAnalysis();

  const loading = statsLoading || advLoading;

  const handleRefresh = () => {
    refresh();
    refreshStats();
    refreshTopics();
  };

  // Improvement trend chip
  const trend = advanced?.improvementTrend ?? 0;
  const TrendChip = () => {
    if (Math.abs(trend) < 2) return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-muted-foreground">
        <Minus className="h-3 w-3" /> Estable
      </span>
    );
    if (trend > 0) return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300">
        <TrendingUp className="h-3 w-3" /> +{trend}% mejora
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
        <TrendingDown className="h-3 w-3" /> {trend}% bajada
      </span>
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pb-24 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold">Mis estadísticas</h1>
          <p className="text-xs text-muted-foreground">Tu progreso académico</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
          className="h-8 gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline text-xs">Actualizar</span>
        </Button>
      </div>

      {/* Profile card: level + XP + KPI strip */}
      <StudentProfile
        stats={stats ? {
          overallAccuracy: stats.overallAccuracy,
          totalQuestions: stats.totalQuestions,
          completedSessions: stats.completedSessions,
          streakDays: stats.streakDays,
          failedQuestions: stats.failedQuestions,
        } : null}
        advanced={advanced}
        loading={loading}
      />

      {/* Tabs */}
      <Tabs defaultValue="actividad" className="space-y-3">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="actividad">Actividad</TabsTrigger>
          <TabsTrigger value="rendimiento">Rendimiento</TabsTrigger>
          <TabsTrigger value="temas">Temas</TabsTrigger>
        </TabsList>

        {/* ── Tab: Actividad ── */}
        <TabsContent value="actividad" className="space-y-4 mt-2">
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-4 pt-3 pb-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actividad semanal</p>
            </div>
            <ActivityHeatmap data={stats?.weeklyActivity || []} />
          </div>

          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Actividad mensual</p>
            <div className="h-56">
              <MonthlyActivityChart data={stats?.monthlyActivity || []} />
            </div>
          </div>
        </TabsContent>

        {/* ── Tab: Rendimiento ── */}
        <TabsContent value="rendimiento" className="space-y-4 mt-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Últimos tests</p>
            <TrendChip />
          </div>

          <PerformanceChart sessions={stats?.recentSessions || []} title="" />

          <ComparisonCard
            userAverage={stats?.overallAccuracy || 0}
            globalAverage={75}
          />
        </TabsContent>

        {/* ── Tab: Temas ── */}
        <TabsContent value="temas" className="space-y-4 mt-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Maestría por tema
            </p>
            <span className="text-xs text-muted-foreground">
              {new Set(topicStats.map(t => t.academia_id)).size} academias · {topicStats.length} temas
            </span>
          </div>

          <TopicMasteryGrid topics={topicStats} loading={topicsLoading} />

          <RecommendationsCard
            weakTopics={stats?.weakTopics || []}
            strongTopics={stats?.strongTopics || []}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
