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
import { RefreshCw, Activity, TrendingUp, Target, Calendar, BarChart3, Award, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StatsPage() {
  const { stats, loading, refresh } = useUnifiedStats();

  // Helper function to get dynamic emoji based on performance
  const getDynamicEmoji = () => {
    const accuracy = stats?.overallAccuracy || 0;
    if (accuracy >= 90) return "🎯";
    if (accuracy >= 80) return "🔥";
    if (accuracy >= 70) return "📈";
    if (accuracy >= 60) return "💪";
    return "📊";
  };

  // New UI Components
  const MetricCard = ({ value, label, trend, icon: Icon, color = "blue" }) => (
    <Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 hover:shadow-xl dark:shadow-gray-900/20 transition-all duration-300">
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
            <p className={`text-2xl md:text-3xl font-bold text-${color}-600 dark:text-${color}-400`}>
              {value}
            </p>
            {trend && (
              <p className={`text-xs ${trend > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {trend > 0 ? '+' : ''}{trend}% vs último período
              </p>
            )}
          </div>
          <div className={`p-3 rounded-full bg-${color}-100 dark:bg-${color}-900/20`}>
            <Icon className={`h-6 w-6 text-${color}-600 dark:text-${color}-400`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const ProgressRing = ({ percentage, color = "blue", size = 60 }) => {
    const circumference = 2 * Math.PI * 20;
    const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
    
    return (
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size/2}
            cy={size/2}
            r={20}
            stroke="currentColor"
            strokeWidth="4"
            fill="transparent"
            className="text-gray-200 dark:text-gray-700"
          />
          <circle
            cx={size/2}
            cy={size/2}
            r={20}
            stroke="currentColor"
            strokeWidth="4"
            fill="transparent"
            strokeDasharray={strokeDasharray}
            className={`text-${color}-500 transition-all duration-500`}
          />
        </svg>
        <span className={`absolute text-sm font-semibold text-${color}-600 dark:text-${color}-400`}>
          {percentage}%
        </span>
      </div>
    );
  };

  const ChartContainer = ({ children, title, subtitle }) => (
    <Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 shadow-lg dark:shadow-gray-900/20">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg md:text-xl text-gray-900 dark:text-gray-100">{title}</CardTitle>
        {subtitle && <p className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );

  const StatsHeader = () => (
    <div className="sticky top-0 z-10 backdrop-blur-sm bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-700 p-4 md:p-6 -m-4 md:-m-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span className="text-3xl md:text-4xl">{getDynamicEmoji()}</span>
            Estadísticas
          </h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
            Tu progreso académico detallado
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          className="flex items-center gap-2 bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 border-gray-300 dark:border-gray-600 transition-all duration-200 hover:scale-105"
        >
          <RefreshCw className="h-4 w-4 transition-transform hover:rotate-180 duration-500" />
          <span className="hidden sm:inline">Actualizar</span>
        </Button>
      </div>
    </div>
  );

  const ExecutiveSummary = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      <MetricCard
        value={stats?.streakDays || 0}
        label="Racha Actual"
        icon={Zap}
        color="orange"
        trend={stats?.streakDays > 0 ? 5 : 0}
      />
      <MetricCard
        value={`${Math.round(stats?.overallAccuracy || 0)}%`}
        label="Precisión Global"
        icon={Target}
        color="green"
        trend={2}
      />
      <MetricCard
        value={stats?.totalSessions || 0}
        label="Sesiones Totales"
        icon={BarChart3}
        color="blue"
        trend={8}
      />
    </div>
  );

  const TabNavigation = () => (
    <div className="relative">
      <TabsList className="w-full h-auto p-1 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-x-auto scrollbar-hide">
        <div className="flex gap-1 min-w-max px-1">
          <TabsTrigger 
            value="activity" 
            className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm whitespace-nowrap"
          >
            <Activity className="h-4 w-4 mr-2" />
            Actividad
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
              {stats?.weeklyActivity?.length || 0}
            </span>
          </TabsTrigger>
          <TabsTrigger 
            value="performance" 
            className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm whitespace-nowrap"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Rendimiento
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded">
              {Math.round(stats?.overallAccuracy || 0)}%
            </span>
          </TabsTrigger>
          <TabsTrigger 
            value="topics" 
            className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm whitespace-nowrap"
          >
            <Award className="h-4 w-4 mr-2" />
            Por Temas
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded">
              {stats?.topicPerformance?.length || 0}
            </span>
          </TabsTrigger>
        </div>
      </TabsList>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div className="container max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
          <div className="animate-pulse space-y-6">
            <div className="h-20 bg-white/50 dark:bg-gray-800/50 rounded-xl" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-white/50 dark:bg-gray-800/50 rounded-xl" />
              ))}
            </div>
            <div className="h-12 bg-white/50 dark:bg-gray-800/50 rounded-xl" />
            <div className="h-96 bg-white/50 dark:bg-gray-800/50 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        <StatsHeader />
        
        <ExecutiveSummary />

        <Tabs defaultValue="activity" className="space-y-6">
          <TabNavigation />

          <TabsContent value="activity" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartContainer title="Racha de Estudio" subtitle="Tu constancia diaria">
                <div className="flex items-center justify-center p-6">
                  <div className="text-center space-y-4">
                    <ProgressRing percentage={Math.min((stats?.streakDays || 0) * 10, 100)} color="orange" size={120} />
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats?.streakDays || 0} días</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Racha actual</p>
                    </div>
                  </div>
                </div>
              </ChartContainer>

              <ChartContainer title="Actividad Semanal" subtitle="Heatmap de progreso">
                <ActivityHeatmap data={stats?.weeklyActivity || []} />
              </ChartContainer>
            </div>
            
            <ChartContainer title="Actividad Mensual" subtitle="Evolución temporal de tu estudio">
              <MonthlyActivityChart data={stats?.monthlyActivity || []} />
            </ChartContainer>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ChartContainer title="Evolución del Rendimiento" subtitle="Tu progreso a lo largo del tiempo">
                  <PerformanceChart 
                    sessions={stats?.recentSessions || []} 
                    title="Evolución del Rendimiento"
                  />
                </ChartContainer>
              </div>
              
              <div className="space-y-6">
                <ChartContainer title="Precisión Global" subtitle="Tu nivel actual">
                  <div className="flex items-center justify-center p-6">
                    <ProgressRing 
                      percentage={Math.round(stats?.overallAccuracy || 0)} 
                      color="green" 
                      size={120} 
                    />
                  </div>
                </ChartContainer>

                <ComparisonCard 
                  userAverage={stats?.overallAccuracy || 0}
                  globalAverage={75}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="topics" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartContainer title="Análisis por Temas" subtitle="Fortalezas y áreas de mejora">
                <TopicAnalysisChart 
                  topics={stats?.topicPerformance || []}
                />
              </ChartContainer>

              <div className="space-y-6">
                <RecommendationsCard 
                  weakTopics={stats?.weakTopics || []}
                  strongTopics={stats?.strongTopics || []}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}