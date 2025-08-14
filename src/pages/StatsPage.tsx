import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityHeatmap } from "@/components/stats/ActivityHeatmap";
import { PerformanceChart } from "@/components/stats/PerformanceChart";
import { TopicAnalysisChart } from "@/components/stats/TopicAnalysisChart";
import { StreakCounter } from "@/components/stats/StreakCounter";
import { StatsOverview } from "@/components/stats/StatsOverview";
import { MonthlyActivityChart } from "@/components/stats/MonthlyActivityChart";
import { ComparisonCard } from "@/components/stats/ComparisonCard";
import { RecommendationsCard } from "@/components/stats/RecommendationsCard";
import { useUnifiedStats } from "@/hooks/useUnifiedStats";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StatsPage() {
  const { stats, loading, refresh } = useUnifiedStats();

  if (loading) {
    return (
      <div className="min-h-screen p-4 bg-background">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="animate-pulse space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-background">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">📊 Estadísticas</h1>
            <p className="text-muted-foreground">Tu progreso detallado</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={refresh}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        </div>

        {/* Racha de estudio destacada */}
        <StreakCounter streak={stats?.streakDays || 0} />

        {/* Resumen general */}
        <StatsOverview stats={stats} />

        {/* Tabs con diferentes vistas */}
        <Tabs defaultValue="activity" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="activity">Actividad</TabsTrigger>
            <TabsTrigger value="performance">Rendimiento</TabsTrigger>
            <TabsTrigger value="topics">Por Temas</TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="space-y-4">
            {/* Heatmap de actividad semanal */}
            <ActivityHeatmap data={stats?.weeklyActivity || []} />
            
            {/* Actividad mensual */}
            <Card>
              <CardHeader>
                <CardTitle>Actividad Mensual</CardTitle>
              </CardHeader>
              <CardContent>
                <MonthlyActivityChart data={stats?.monthlyActivity || []} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            {/* Gráfico de evolución */}
            <PerformanceChart 
              sessions={stats?.recentSessions || []} 
              title="Evolución del Rendimiento"
            />

            {/* Comparación con promedio */}
            <ComparisonCard 
              userAverage={stats?.overallAccuracy || 0}
              globalAverage={75} // Esto vendría de la BD
            />
          </TabsContent>

          <TabsContent value="topics" className="space-y-4">
            {/* Análisis por temas */}
            <TopicAnalysisChart 
              topics={stats?.topicPerformance || []}
            />

            {/* Recomendaciones */}
            <RecommendationsCard 
              weakTopics={stats?.weakTopics || []}
              strongTopics={stats?.strongTopics || []}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}