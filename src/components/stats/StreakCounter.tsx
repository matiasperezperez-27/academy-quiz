import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Flame, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreakCounterProps {
  streak: number;
}

export const StreakCounter = ({ streak }: StreakCounterProps) => {
  const getStreakColor = () => {
    if (streak === 0) return "text-gray-400";
    if (streak < 3) return "text-orange-400";
    if (streak < 7) return "text-orange-500";
    if (streak < 14) return "text-orange-600";
    return "text-red-600";
  };

  const getStreakMessage = () => {
    if (streak === 0) return "¡Comienza tu racha hoy!";
    if (streak === 1) return "¡Buen comienzo!";
    if (streak < 3) return "¡Sigue así!";
    if (streak < 7) return "¡Excelente constancia!";
    if (streak < 14) return "¡Una semana completa!";
    if (streak < 30) return "¡Eres imparable!";
    return "¡Leyenda del estudio!";
  };

  return (
    <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Flame className={cn("h-6 w-6", getStreakColor())} />
              <h2 className="text-xl font-bold">Racha de Estudio</h2>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-4xl font-bold", getStreakColor())}>
                {streak}
              </span>
              <span className="text-muted-foreground">
                {streak === 1 ? "día" : "días"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{getStreakMessage()}</p>
          </div>
          
          {streak > 0 && (
            <div className="flex flex-col items-center justify-center p-4 bg-white/80 rounded-lg">
              <TrendingUp className="h-8 w-8 text-green-600 mb-1" />
              <span className="text-xs text-muted-foreground">En racha</span>
            </div>
          )}
        </div>

        {/* Indicadores visuales de la racha */}
        {streak > 0 && (
          <div className="mt-4 flex gap-1">
            {Array.from({ length: Math.min(streak, 30) }, (_, i) => (
              <div
                key={i}
                className={cn(
                  "h-2 flex-1 rounded-full",
                  i < 7 ? "bg-orange-400" :
                  i < 14 ? "bg-orange-500" :
                  i < 21 ? "bg-orange-600" :
                  "bg-red-600"
                )}
                style={{ maxWidth: "20px" }}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
