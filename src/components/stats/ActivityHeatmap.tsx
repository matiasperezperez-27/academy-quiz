import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";

interface DayActivity {
  date: string;
  sessions: number;
  accuracy: number;
}

interface ActivityHeatmapProps {
  data: DayActivity[];
}

export const ActivityHeatmap = ({ data }: ActivityHeatmapProps) => {
  // Crear grid de 7x5 semanas
  const weeks = 5;
  const days = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  
  // Generar datos para las últimas 5 semanas
  const generateHeatmapData = () => {
    const grid = [];
    const today = new Date();
    
    for (let week = 0; week < weeks; week++) {
      const weekData = [];
      for (let day = 0; day < 7; day++) {
        const date = new Date(today);
        date.setDate(today.getDate() - ((weeks - week - 1) * 7 + (6 - day)));
        
        const dayData = data.find(d => {
          const dDate = new Date(d.date);
          return dDate.toDateString() === date.toDateString();
        });
        
        weekData.push({
          date: date.toISOString(),
          sessions: dayData?.sessions || 0,
          accuracy: dayData?.accuracy || 0,
          isToday: date.toDateString() === today.toDateString(),
          isFuture: date > today
        });
      }
      grid.push(weekData);
    }
    
    return grid;
  };

  const getIntensityClass = (sessions: number, isFuture: boolean) => {
    if (isFuture) return "bg-muted opacity-30";
    if (sessions === 0) return "bg-muted hover:bg-muted/80";
    if (sessions === 1) return "bg-blue-200 hover:bg-blue-300";
    if (sessions === 2) return "bg-blue-400 hover:bg-blue-500";
    if (sessions >= 3) return "bg-blue-600 hover:bg-blue-700";
    return "bg-muted";
  };

  const heatmapData = generateHeatmapData();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Actividad de las Últimas 5 Semanas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Días de la semana - con celdas más grandes */}
          <div className="flex gap-2 ml-16">
            {days.map(day => (
              <div key={day} className="w-12 h-12 flex items-center justify-center text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          {/* Grid de actividad - celdas más grandes y mejor espaciado */}
          <div className="flex gap-2">
            <div className="flex flex-col gap-2 justify-end pr-3">
              {Array.from({ length: weeks }, (_, i) => (
                <div key={i} className="h-12 flex items-center text-sm font-medium text-muted-foreground">
                  S{weeks - i}
                </div>
              ))}
            </div>
            
            <div className="flex flex-col gap-2 flex-1">
              {heatmapData.map((week, weekIndex) => (
                <div key={weekIndex} className="flex gap-2">
                  {week.map((day, dayIndex) => (
                    <div
                      key={dayIndex}
                      className={cn(
                        "w-12 h-12 rounded-lg transition-all cursor-pointer relative group flex-1 max-w-[48px]",
                        getIntensityClass(day.sessions, day.isFuture),
                        day.isToday && "ring-2 ring-primary ring-offset-2"
                      )}
                      title={`${day.sessions} sesiones - ${day.accuracy}% precisión`}
                    >
                      {day.sessions > 0 && !day.isFuture && (
                        <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
                          {day.sessions}
                        </div>
                      )}
                      
                      {/* Tooltip mejorado */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-2 bg-popover text-popover-foreground text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap border">
                        {new Date(day.date).toLocaleDateString('es-ES', { 
                          weekday: 'short', 
                          day: 'numeric',
                          month: 'short'
                        })}
                        {day.sessions > 0 && (
                          <>
                            <br />
                            <span className="font-medium">{day.sessions} sesión{day.sessions > 1 ? 'es' : ''}</span>
                            <br />
                            <span className="text-green-600 dark:text-green-400">{day.accuracy}% precisión</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Leyenda mejorada */}
          <div className="flex items-center justify-between mt-6 text-sm text-muted-foreground">
            <span>Menos</span>
            <div className="flex gap-2">
              <div className="w-6 h-6 bg-muted rounded-lg" />
              <div className="w-6 h-6 bg-blue-200 rounded-lg" />
              <div className="w-6 h-6 bg-blue-400 rounded-lg" />
              <div className="w-6 h-6 bg-blue-600 rounded-lg" />
            </div>
            <span>Más</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};