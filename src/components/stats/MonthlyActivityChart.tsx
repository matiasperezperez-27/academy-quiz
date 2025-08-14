import React from "react";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface MonthlyActivityChartProps {
  data: Array<{
    month: string;
    sessions: number;
    questionsAnswered: number;
    averageAccuracy: number;
  }>;
}

export const MonthlyActivityChart = ({ data }: MonthlyActivityChartProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="text-muted-foreground">No hay datos mensuales disponibles</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey="month" 
          className="text-xs"
          tick={{ fill: 'currentColor' }}
        />
        <YAxis 
          className="text-xs"
          tick={{ fill: 'currentColor' }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px'
          }}
        />
        <Legend />
        <Bar 
          dataKey="sessions" 
          fill="hsl(var(--primary))" 
          name="Sesiones"
          radius={[4, 4, 0, 0]}
        />
        <Bar 
          dataKey="questionsAnswered" 
          fill="hsl(var(--secondary))" 
          name="Preguntas"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default MonthlyActivityChart;