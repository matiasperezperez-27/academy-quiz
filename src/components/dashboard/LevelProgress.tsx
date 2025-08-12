import { Trophy, Star, Target } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface LevelProgressProps {
  currentLevel: number;
  points: number;
  experienceToNextLevel: number;
}

const LEVEL_TITLES = {
  1: "Principiante",
  2: "Aprendiz", 
  3: "Estudiante",
  4: "Conocedor",
  5: "Avanzado",
  6: "Experto",
  7: "Maestro",
  8: "Leyenda"
};

const LEVEL_COLORS = {
  1: "text-gray-600 bg-gray-100",
  2: "text-green-600 bg-green-100",
  3: "text-blue-600 bg-blue-100", 
  4: "text-purple-600 bg-purple-100",
  5: "text-orange-600 bg-orange-100",
  6: "text-red-600 bg-red-100",
  7: "text-yellow-600 bg-yellow-100",
  8: "text-pink-600 bg-pink-100"
};

export function LevelProgress({ currentLevel, points, experienceToNextLevel }: LevelProgressProps) {
  const levelTitle = LEVEL_TITLES[currentLevel as keyof typeof LEVEL_TITLES] || "Desconocido";
  const levelColor = LEVEL_COLORS[currentLevel as keyof typeof LEVEL_COLORS] || "text-gray-600 bg-gray-100";
  const progressPercentage = experienceToNextLevel > 0 
    ? Math.max(0, 100 - (experienceToNextLevel / (points + experienceToNextLevel)) * 100)
    : 100;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="h-5 w-5 text-yellow-600" />
          Nivel de Experiencia
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Nivel actual */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-full", levelColor.split(' ')[1])}>
              <Star className={cn("h-5 w-5", levelColor.split(' ')[0])} />
            </div>
            <div>
              <div className="font-semibold">Nivel {currentLevel}</div>
              <div className="text-sm text-muted-foreground">{levelTitle}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{points}</div>
            <div className="text-xs text-muted-foreground">puntos</div>
          </div>
        </div>

        {/* Progreso al siguiente nivel */}
        {experienceToNextLevel > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progreso al Nivel {currentLevel + 1}</span>
              <span className="font-medium">{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <div className="text-xs text-muted-foreground text-center">
              {experienceToNextLevel} puntos para el siguiente nivel
            </div>
          </div>
        )}

        {currentLevel >= 8 && (
          <div className="text-center p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
            <Trophy className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <div className="font-semibold text-yellow-800">¡Nivel Máximo Alcanzado!</div>
            <div className="text-sm text-yellow-700">Eres una leyenda del conocimiento</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
