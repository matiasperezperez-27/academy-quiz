import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface PerformanceChartProps {
  sessions: Array<{
    id: string;
    testNumber: number;
    date: string;
    scorePercentage: number;
    totalQuestions: number;
    tema: string;
  }>;
  title?: string;
}

export const PerformanceChart = ({ sessions, title = "Evolución - Últimos 10 Tests" }: PerformanceChartProps) => {
  if (!sessions || sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <p className="text-muted-foreground">No hay datos suficientes para mostrar</p>
        </CardContent>
      </Card>
    );
  }

  // Calcular tendencia
  const firstHalf = sessions.slice(0, Math.floor(sessions.length / 2));
  const secondHalf = sessions.slice(Math.floor(sessions.length / 2));
  
  const avgFirst = firstHalf.reduce((sum, s) => sum + s.scorePercentage, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((sum, s) => sum + s.scorePercentage, 0) / secondHalf.length;
  
  const trend = avgSecond > avgFirst + 5 ? 'up' : avgSecond < avgFirst - 5 ? 'down' : 'stable';
  
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-yellow-600';
  const trendText = trend === 'up' ? 'Mejorando' : trend === 'down' ? 'Bajando' : 'Estable';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <div className={`flex items-center gap-2 ${trendColor}`}>
            <TrendIcon className="h-4 w-4" />
            <span className="text-sm font-medium">{trendText}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={sessions} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="testNumber" 
              className="text-xs"
              tick={{ fill: 'currentColor' }}
              interval={0}
              label={{ value: 'Test #', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle' } }}
            />
            <YAxis 
              domain={[0, 100]}
              className="text-xs"
              tick={{ fill: 'currentColor' }}
              label={{ value: 'Puntuación (%)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                color: 'hsl(var(--foreground))'
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              itemStyle={{ color: 'hsl(var(--primary))' }}
              formatter={(value, name, props) => [
                `${Number(value).toFixed(0)}%`, 
                'Puntuación'
              ]}
              labelFormatter={(label) => {
                const testData = sessions.find(s => s.testNumber === label);
                return `Test #${label} - ${testData?.tema || 'Sin tema'}`;
              }}
            />
            <Line 
              type="monotone" 
              dataKey="scorePercentage" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
        
        {/* Resumen estadístico */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Promedio</p>
            <p className="text-lg font-bold">
              {Math.round(sessions.reduce((sum, s) => sum + s.scorePercentage, 0) / sessions.length)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Mejor</p>
            <p className="text-lg font-bold text-green-600">
              {Math.max(...sessions.map(s => s.scorePercentage))}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Última</p>
            <p className="text-lg font-bold text-blue-600">
              {sessions[sessions.length - 1].scorePercentage}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};