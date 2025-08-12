import { Calendar } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ActivityHeatmapProps {
  weeklyActivity: Array<{ day: string; sessions: number; accuracy: number }>;
}

export function ActivityHeatmap({ weeklyActivity }: ActivityHeatmapProps) {
  const getIntensityColor = (sessions: number) => {
    if (sessions === 0) return "bg-gray-100";
    if (sessions === 1) return "bg-blue-200";
    if (sessions === 2) return "bg-blue-400";
    if (sessions >= 3) return "bg-blue-600";
    return "bg-gray-100";
  };

  const getTextColor = (sessions: number) => {
    return sessions >= 2 ? "text-white" : "text-gray-700";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5" />
          Actividad Semanal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {weeklyActivity.map((day, index) => (
            <div key={index} className="text-center">
              <div className="text-xs text-muted-foreground mb-2">{day.day}</div>
              <div
                className={cn(
                  "h-12 w-12 rounded-lg flex flex-col items-center justify-center transition-all hover:scale-105",
                  getIntensityColor(day.sessions),
                  getTextColor(day.sessions)
                )}
              >
                <div className="text-xs font-bold">{day.sessions}</div>
                {day.sessions > 0 && (
                  <div className="text-[10px]">{day.accuracy}%</div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>Menos</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-gray-100 rounded"></div>
            <div className="w-3 h-3 bg-blue-200 rounded"></div>
            <div className="w-3 h-3 bg-blue-400 rounded"></div>
            <div className="w-3 h-3 bg-blue-600 rounded"></div>
          </div>
          <span>Más</span>
        </div>
      </CardContent>
    </Card>
  );
}
