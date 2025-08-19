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
  const {
    stats,
    loading,
    refresh
  } = useUnifiedStats();

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
  const MetricCard = ({
    value,
    label,
    trend,
    icon: Icon,
    color = "blue"
  }) => <Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 hover:shadow-xl dark:shadow-gray-900/20 transition-all duration-300">
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
            <p className={`text-2xl md:text-3xl font-bold text-${color}-600 dark:text-${color}-400`}>
              {value}
            </p>
            {trend && <p className={`text-xs ${trend > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {trend > 0 ? '+' : ''}{trend}% vs último período
              </p>}
          </div>
          <div className={`p-3 rounded-full bg-${color}-100 dark:bg-${color}-900/20`}>
            <Icon className={`h-6 w-6 text-${color}-600 dark:text-${color}-400`} />
          </div>
        </div>
      </CardContent>
    </Card>;
  const ProgressRing = ({
    percentage,
    color = "blue",
    size = 60
  }) => {
    const circumference = 2 * Math.PI * 20;
    const strokeDasharray = `${percentage / 100 * circumference} ${circumference}`;
    return <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={20} stroke="currentColor" strokeWidth="4" fill="transparent" className="text-gray-200 dark:text-gray-700" />
          <circle cx={size / 2} cy={size / 2} r={20} stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={strokeDasharray} className={`text-${color}-500 transition-all duration-500`} />
        </svg>
        <span className={`absolute text-sm font-semibold text-${color}-600 dark:text-${color}-400`}>
          {percentage}%
        </span>
      </div>;
  };
  const ChartContainer = ({
    children,
    title,
    subtitle
  }) => <Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 shadow-lg dark:shadow-gray-900/20">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg md:text-xl text-gray-900 dark:text-gray-100">{title}</CardTitle>
        {subtitle && <p className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>;
  const StatsHeader = () => <div className="sticky top-0 z-10 backdrop-blur-sm bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-700 p-4 md:p-6 -m-4 md:-m-6 mb-6">
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
        <Button variant="outline" size="sm" onClick={refresh} className="flex items-center gap-2 bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 border-gray-300 dark:border-gray-600 transition-all duration-200 hover:scale-105">
          <RefreshCw className="h-4 w-4 transition-transform hover:rotate-180 duration-500" />
          <span className="hidden sm:inline">Actualizar</span>
        </Button>
      </div>
    </div>;
  const ExecutiveSummary = () => <div className="space-y-6">
      {/* Racha Semanal al principio - tamaño original */}
      <div className="p-4 bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/20 dark:to-red-900/20 rounded-2xl border border-orange-200 dark:border-orange-700/30 my-[40px]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-500" />
              Racha Semanal
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Lunes a Domingo</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {(() => {
              // Calcular días activos de la semana
              const today = new Date();
              let activeDays = 0;
              for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(today.getDate() - i);
                const dayActivity = (stats?.weeklyActivity || []).find(d => {
                  if (!d?.date) return false;
                  const activityDate = new Date(d.date);
                  return activityDate.toDateString() === date.toDateString();
                });
                if (dayActivity?.sessions > 0) activeDays++;
              }
              return activeDays;
            })()}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">días activos</div>
          </div>
        </div>
        
        {/* Grid semanal L-D con datos reales */}
        <div className="grid grid-cols-7 gap-2">
          {(() => {
          // Usar la misma lógica que ActivityHeatmap para generar la semana actual
          const days = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
          const today = new Date();
          const weekData = [];

          // Generar los últimos 7 días (semana actual)
          for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);

            // Buscar si hay actividad en este día usando los datos de stats
            const dayActivity = (stats?.weeklyActivity || []).find(d => {
              if (!d?.date) return false;
              const activityDate = new Date(d.date);
              return activityDate.toDateString() === date.toDateString();
            });
            const isToday = date.toDateString() === today.toDateString();
            const hasSessions = dayActivity?.sessions > 0;
            weekData.push({
              dayLetter: days[date.getDay() === 0 ? 6 : date.getDay() - 1],
              // Ajustar domingo
              date: date,
              sessions: dayActivity?.sessions || 0,
              isToday,
              hasSessions
            });
          }
          return weekData.map((dayData, index) => <div key={index} className="flex flex-col items-center">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                  {dayData.dayLetter}
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${dayData.hasSessions ? 'bg-orange-500 text-white shadow-lg' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'} ${dayData.isToday ? 'ring-2 ring-orange-300 dark:ring-orange-600' : ''}`}>
                  {dayData.hasSessions ? dayData.sessions : '○'}
                </div>
              </div>);
        })()}
        </div>
      </div>

      {/* Métricas restantes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <MetricCard value={`${Math.round(stats?.overallAccuracy || 0)}%`} label="Precisión Global" icon={Target} color="green" trend={2} />
        <MetricCard value={stats?.totalSessions || 0} label="Sesiones Totales" icon={BarChart3} color="blue" trend={8} />
      </div>
    </div>;
  const TabNavigation = () => <div className="relative">
      <TabsList className="w-full h-auto p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
        <div className="flex overflow-x-auto scrollbar-hide pb-1">
          <div className="flex gap-1 min-w-max px-1">
            <TabsTrigger value="activity" className="flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm whitespace-nowrap min-w-[100px]">
              <Activity className="h-3 w-3 mr-1 text-blue-600 dark:text-blue-400" />
              <span className="hidden sm:inline">Actividad</span>
              <span className="sm:hidden">Act</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm whitespace-nowrap min-w-[100px]">
              <TrendingUp className="h-3 w-3 mr-1 text-green-600 dark:text-green-400" />
              <span className="hidden sm:inline">Rendimiento</span>
              <span className="sm:hidden">Rend</span>
            </TabsTrigger>
            <TabsTrigger value="topics" className="flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm whitespace-nowrap min-w-[100px]">
              <Award className="h-3 w-3 mr-1 text-purple-600 dark:text-purple-400" />
              <span className="hidden sm:inline">Por Temas</span>
              <span className="sm:hidden">Temas</span>
            </TabsTrigger>
          </div>
        </div>
      </TabsList>
    </div>;
  if (loading) {
    return <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div className="container max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
          <div className="animate-pulse space-y-6">
            <div className="h-20 bg-white/50 dark:bg-gray-800/50 rounded-xl" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-white/50 dark:bg-gray-800/50 rounded-xl" />)}
            </div>
            <div className="h-12 bg-white/50 dark:bg-gray-800/50 rounded-xl" />
            <div className="h-96 bg-white/50 dark:bg-gray-800/50 rounded-xl" />
          </div>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        <StatsHeader />
        
        <ExecutiveSummary />

        <Tabs defaultValue="activity" className="space-y-6">
          <TabNavigation />

          <TabsContent value="activity" className="space-y-4 mt-6">
            {/* Actividad Semanal - Solo móvil sin container */}
            <div className="md:hidden -mx-0 md:-mx-6">
              <ActivityHeatmap data={stats?.weeklyActivity || []} />
            </div>
            
            {/* Actividad Mensual */}
            <ChartContainer title="Actividad Mensual" subtitle="Evolución de tu estudio">
              <div className="h-64 md:h-80">
                <MonthlyActivityChart data={stats?.monthlyActivity || []} />
              </div>
            </ChartContainer>
            
            {/* Desktop grid (oculto en móvil) - sin container */}
            <div className="hidden md:grid md:grid-cols-2 gap-6">
              <div className="-mx-6">
                <ActivityHeatmap data={stats?.weeklyActivity || []} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6 mt-10">
            {/* Gráfico principal sin container - más espacio */}
            <div className="relative h-80 md:h-96 -mx-0 md:-mx-6 mb-40">
              <PerformanceChart sessions={stats?.recentSessions || []} title="Evolución del Rendimiento" />
            </div>
            
            {/* Solo ComparisonCard - eliminar duplicados */}
            <div className="w-full relative z-10">
              <ComparisonCard userAverage={stats?.overallAccuracy || 0} globalAverage={75} />
            </div>
          </TabsContent>

          <TabsContent value="topics" className="space-y-6 mt-6">
            {/* TopicAnalysisChart - altura fija móvil */}
            <div className="w-full">
              <TopicAnalysisChart topics={stats?.topicPerformance || []} />
            </div>
            
            {/* Recomendaciones */}
            <RecommendationsCard weakTopics={stats?.weakTopics || []} strongTopics={stats?.strongTopics || []} />
          </TabsContent>
        </Tabs>
      </div>
    </div>;
}