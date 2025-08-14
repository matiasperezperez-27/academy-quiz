import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
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
      <Card>
        <CardHeader>
          <CardTitle>Análisis por Temas</CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <p className="text-muted-foreground">No hay datos de temas disponibles</p>
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
    <Card>
      <CardHeader>
        <CardTitle>Rendimiento por Temas</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={100}
              className="text-xs"
              tick={{ fill: 'currentColor' }}
            />
            <YAxis 
              domain={[0, 100]}
              className="text-xs"
              tick={{ fill: 'currentColor' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
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
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>

        {/* Lista detallada de temas */}
        <div className="mt-6 space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Detalle por Tema</h4>
          {topics.map((topic) => (
            <div 
              key={topic.topicId}
              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{topic.topicName}</p>
                  {topic.trend === 'up' && (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  )}
                  {topic.trend === 'down' && (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  )}
                  {topic.trend === 'stable' && (
                    <Minus className="h-3 w-3 text-yellow-600" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{topic.academyName}</p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-bold">{topic.accuracy}%</p>
                  <p className="text-xs text-muted-foreground">
                    {topic.totalQuestions} preguntas
                  </p>
                </div>
                <Badge 
                  variant={
                    topic.accuracy >= 80 ? "default" :
                    topic.accuracy >= 60 ? "secondary" :
                    "destructive"
                  }
                  className="min-w-[60px] justify-center"
                >
                  {topic.accuracy >= 80 ? "Dominado" :
                   topic.accuracy >= 60 ? "En progreso" :
                   "Necesita práctica"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};