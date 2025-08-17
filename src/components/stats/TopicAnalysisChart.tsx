import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TopicData {
  topicId: string;
  topicName: string;
  academyName: string;
  accuracy: number;
  totalQuestions: number;
  trend: 'up' | 'down' | 'stable';
}

interface TopicAnalysisChartProps {
  topics: TopicData[];
}

export const TopicAnalysisChart = ({ topics }: TopicAnalysisChartProps) => {
  if (!topics || topics.length === 0) {
    return (
      <Card className="backdrop-blur-sm bg-white/95 dark:bg-gray-800/95 border border-gray-200 dark:border-gray-700 shadow-xl shadow-gray-500/10">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-gray-200/50 dark:border-gray-700/50">
          <CardTitle className="flex items-center gap-3 text-lg font-semibold">
            <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Análisis por Temas
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full flex items-center justify-center">
              <BarChart3 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 font-medium">No hay datos de temas disponibles</p>
            <p className="text-sm text-gray-500 dark:text-gray-500">Completa algunos tests para ver tu progreso</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Preparar datos para el gráfico
  const chartData = topics.map(t => ({
    name: t.topicName.length > 15 ? t.topicName.substring(0, 15) + '...' : t.topicName,
    fullName: t.topicName,
    accuracy: t.accuracy,
    questions: t.totalQuestions
  }));

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return "hsl(var(--success))";
    if (accuracy >= 60) return "hsl(var(--warning))";
    return "hsl(var(--destructive))";
  };

  return (
    <Card className="backdrop-blur-sm bg-white/95 dark:bg-gray-800/95 border border-gray-200 dark:border-gray-700 shadow-xl shadow-gray-500/10">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-gray-200/50 dark:border-gray-700/50">
        <CardTitle className="flex items-center gap-3 text-lg font-semibold">
          <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Rendimiento por Temas
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div className="mb-6 -mx-4 sm:mx-0">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 20, right: 10, left: 10, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" strokeOpacity={0.3} />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={100}
                className="text-xs"
                tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                domain={[0, 100]}
                className="text-xs"
                tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                label={{ value: 'Precisión (%)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' }, dx:10 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                  color: 'hsl(var(--foreground))'
                }}
                labelStyle={{ 
                  color: 'hsl(var(--foreground))', 
                  fontWeight: 'semibold' 
                }}
                itemStyle={{
                  color: 'hsl(var(--foreground))'
                }}
                formatter={(value: any, name: any) => {
                  if (name === 'accuracy') return [`${value}%`, 'Precisión'];
                  return [value, name];
                }}
                labelFormatter={(label: string, payload: any) => {
                  if (payload && payload[0]) {
                    return payload[0].payload.fullName;
                  }
                  return label;
                }}
              />
              <Bar 
                dataKey="accuracy" 
                fill="url(#colorGradient)"
                radius={[6, 6, 0, 0]}
                strokeWidth={1}
                stroke="rgba(59, 130, 246, 0.3)"
              />
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity={0.6} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Lista detallada de temas con diseño premium */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent"></div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider px-3">
              Detalle por Tema
            </h4>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent"></div>
          </div>
          
          <div className="space-y-3">
            {topics.map((topic) => {
              const [isExpanded, setIsExpanded] = useState(false);
              const isLongTitle = topic.topicName && topic.topicName.length > 40;
              const truncatedTitle = isLongTitle && !isExpanded 
                ? topic.topicName.substring(0, 40) + '...' 
                : topic.topicName;
                
              return (
                <div 
                  key={topic.topicId}
                  className="group flex flex-col md:flex-row md:items-center gap-3 md:gap-6 p-4 md:p-5 bg-gradient-to-r from-gray-50/80 to-blue-50/30 dark:from-gray-800/50 dark:to-blue-900/10 rounded-xl hover:shadow-lg transition-all duration-300 border border-gray-200/50 dark:border-gray-700/50"
                >
                  {/* Contenido principal - stack vertical en móvil */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-sm md:text-base text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">
                            {truncatedTitle}
                          </p>
                          {isLongTitle && (
                            <button
                              onClick={() => setIsExpanded(!isExpanded)}
                              className="flex-shrink-0 p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                            >
                              <svg 
                                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{topic.academyName}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Métricas y badge - layout móvil */}
                  <div className="flex items-center justify-between md:justify-end gap-4 md:gap-6 flex-shrink-0">
                    <div className="text-left md:text-right">
                      <div className="flex items-center gap-2 md:justify-end mb-1">
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{topic.accuracy}%</p>
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600">
                          {topic.trend === 'up' && (
                            <TrendingUp className="h-3 w-3 text-green-600 dark:text-green-400" />
                          )}
                          {topic.trend === 'down' && (
                            <TrendingDown className="h-3 w-3 text-red-600 dark:text-red-400" />
                          )}
                          {topic.trend === 'stable' && (
                            <Minus className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {topic.totalQuestions} preguntas
                      </p>
                    </div>
                    
                    <Badge 
                      variant={
                        topic.accuracy >= 80 ? "default" :
                        topic.accuracy >= 60 ? "secondary" :
                        "destructive"
                      }
                      className={`min-w-[90px] md:min-w-[100px] justify-center font-semibold shadow-sm text-xs ${
                        topic.accuracy >= 80 ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0" :
                        topic.accuracy >= 60 ? "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0" :
                        "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white border-0"
                      }`}
                    >
                      {topic.accuracy >= 80 ? "🏆 Dominado" :
                       topic.accuracy >= 60 ? "📈 En progreso" :
                       "📚 Necesita práctica"}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};