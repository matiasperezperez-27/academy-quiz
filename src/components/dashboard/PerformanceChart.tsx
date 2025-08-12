import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PerformanceChartProps {
  data: Array<{date: string; accuracy: number; questionsAnswered: number}>;
  type?: "line" | "bar";
  title?: string;
}

export function PerformanceChart({ 
  data, 
  type = "line", 
  title = "Rendimiento Reciente" 
}: PerformanceChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-muted-foreground">
            <Target className="h-8 w-8 mx-auto mb-2" />
            <p>No hay datos suficientes</p>
            <p className="text-sm">Completa más tests para ver tu progreso</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calcular tendencia
  const firstAccuracy = data[0]?.accuracy || 0;
  const lastAccuracy = data[data.length - 1]?.accuracy || 0;
  const trend = lastAccuracy - firstAccuracy;
  const averageAccuracy = Math.round(data.reduce((sum, item) => sum + item.accuracy, 0) / data.length);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          {title}
          <div className="flex items-center gap-2">
            {trend > 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : trend < 0 ? (
              <TrendingDown className="h-4 w-4 text-red-600" />
            ) : (
              <Target className="h-4 w-4 text-gray-600" />
            )}
            <span className={cn(
              "text-sm font-medium",
              trend > 0 ? "text-green-600" : trend < 0 ? "text-red-600" : "text-gray-600"
            )}>
              {trend > 0 ? `+${trend}%` : `${trend}%`}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Resumen */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{averageAccuracy}%</div>
              <div className="text-xs text-muted-foreground">Promedio</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{Math.max(...data.map(d => d.accuracy))}%</div>
              <div className="text-xs text-muted-foreground">Mejor</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{data.length}</div>
              <div className="text-xs text-muted-foreground">Sesiones</div>
            </div>
          </div>

          {/* Lista de datos */}
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {data.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                <span className="text-sm font-medium">{item.date}</span>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-sm font-bold",
                    item.accuracy >= 80 ? "text-green-600" : 
                    item.accuracy >= 60 ? "text-yellow-600" : "text-red-600"
                  )}>
                    {item.accuracy}%
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({item.questionsAnswered} preguntas)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
