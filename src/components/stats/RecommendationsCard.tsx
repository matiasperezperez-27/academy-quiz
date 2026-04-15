import React from "react";
import { Button } from "@/components/ui/button";
import { BookOpen, Target, TrendingUp, AlertCircle, Lightbulb } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface RecommendationsCardProps {
  weakTopics: string[];
  strongTopics: string[];
}

export const RecommendationsCard = ({ weakTopics, strongTopics }: RecommendationsCardProps) => {
  const navigate = useNavigate();

  if (weakTopics.length === 0 && strongTopics.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
        Recomendaciones
      </p>

      {/* Temas a mejorar */}
      {weakTopics.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 px-1">
            <AlertCircle className="h-3.5 w-3.5 text-red-500" />
            <span className="text-xs font-medium text-red-600 dark:text-red-400">Necesitan atención</span>
          </div>
          {weakTopics.map((topic, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-l-4 border-l-red-400 bg-card hover:shadow-sm transition-shadow"
            >
              <span className="text-sm">🔴</span>
              <span className="text-sm font-medium flex-1 truncate">{topic}</span>
              <Button
                size="sm"
                className="h-7 px-2.5 text-xs bg-red-600 hover:bg-red-700"
                onClick={() => navigate("/practice")}
              >
                Practicar
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Temas fuertes */}
      {strongTopics.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 px-1">
            <TrendingUp className="h-3.5 w-3.5 text-teal-500" />
            <span className="text-xs font-medium text-teal-600 dark:text-teal-400">Puntos fuertes</span>
          </div>
          {strongTopics.map((topic, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-l-4 border-l-teal-400 bg-card"
            >
              <span className="text-sm">🏆</span>
              <span className="text-sm font-medium flex-1 truncate">{topic}</span>
              <span className="text-xs text-teal-600 dark:text-teal-400 font-medium">Dominado</span>
            </div>
          ))}
        </div>
      )}

      {/* Consejo + acciones */}
      <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl border bg-muted/40">
        <Lightbulb className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          15 minutos diarios en tus temas débiles marcan la diferencia. La constancia es la clave.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" onClick={() => navigate("/test-setup")}>
          Nuevo test
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate("/analisis-temas")}>
          Ver análisis
        </Button>
      </div>
    </div>
  );
};

export default RecommendationsCard;
