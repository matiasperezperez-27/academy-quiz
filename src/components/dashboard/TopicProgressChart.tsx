import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Target, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from "lucide-react";

interface TopicProgressData {
  tema_nombre: string;
  porcentaje_acierto: number;
  total_respondidas: number;
  total_incorrectas: number;
  nivel_dominio: string;
}

interface TopicProgressChartProps {
  data: TopicProgressData[];
  maxItems?: number;
  title?: string;
  variant?: 'horizontal' | 'grid';
}

export default function TopicProgressChart({ 
  data, 
  maxItems = 10, 
  title = "Progreso por Temas",
  variant = 'horizontal' 
}: TopicProgressChartProps) {
  
  const limitedData = data.slice(0, maxItems);
  
  const getProgressColor = (porcentaje: number) => {
    if (porcentaje >= 90) return 'bg-green-500';
    if (porcentaje >= 75) return 'bg-blue-500';
    if (porcentaje >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getProgressColorText = (porcentaje: number) => {
    if (porcentaje >= 90) return 'text-green-600';
    if (porcentaje >= 75) return 'text-blue-600';
    if (porcentaje >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getNivelIcon = (nivel: string) => {
    switch (nivel) {
      case 'Excelente': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'Bueno': return <TrendingUp className="h-4 w-4 text-blue-600" />;
      case 'Regular': return <Target className="h-4 w-4 text-yellow-600" />;
      case 'Necesita práctica': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <Target className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRankingPosition = (index: number) => {
    const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
    return emoji ? `${emoji} ` : `${index + 1}. `;
  };

  if (limitedData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center text-muted-foreground">
            <Target className="h-8 w-8 mx-auto mb-2" />
            <p>No hay datos disponibles</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'grid') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {limitedData.map((topic, index) => (
              <div 
                key={index} 
                className="p-4 bg-muted/30 rounded-lg border hover:shadow-md transition-shadow"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {getNivelIcon(topic.nivel_dominio)}
                        <h4 className="font-medium text-sm leading-tight">
                          {getRankingPosition(index)}{topic.tema_nombre}
                        </h4>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {topic.total_respondidas} preguntas, {topic.total_incorrectas} errores
                      </p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs ml-2", getProgressColorText(topic.porcentaje_acierto))}
                    >
                      {topic.porcentaje_acierto}%
                    </Badge>
                  </div>
                  
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className={cn("h-2 rounded-full transition-all", getProgressColor(topic.porcentaje_acierto))}
                      style={{ width: `${topic.porcentaje_acierto}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {limitedData.map((topic, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getNivelIcon(topic.nivel_dominio)}
                  <span className="font-medium text-sm truncate">
                    {getRankingPosition(index)}{topic.tema_nombre}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{topic.total_respondidas} preguntas</span>
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs", getProgressColorText(topic.porcentaje_acierto))}
                  >
                    {topic.porcentaje_acierto}%
                  </Badge>
                </div>
              </div>
              
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className={cn("h-2 rounded-full transition-all", getProgressColor(topic.porcentaje_acierto))}
                  style={{ width: `${topic.porcentaje_acierto}%` }}
                />
              </div>
              
              {topic.total_incorrectas > 0 && (
                <div className="flex items-center gap-1 text-xs text-red-600">
                  <TrendingDown className="h-3 w-3" />
                  <span>{topic.total_incorrectas} errores para practicar</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}