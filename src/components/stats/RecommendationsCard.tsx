import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Target, TrendingUp, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface RecommendationsCardProps {
  weakTopics: string[];
  strongTopics: string[];
}

export const RecommendationsCard = ({ weakTopics, strongTopics }: RecommendationsCardProps) => {
  const navigate = useNavigate();

  return (
    <Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Recomendaciones Personalizadas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Temas a mejorar */}
        {weakTopics.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <h4 className="font-medium text-red-600 dark:text-red-400">Temas que necesitan atención</h4>
            </div>
            <div className="space-y-2">
              {weakTopics.map((topic, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800/30"
                >
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{topic}</span>
                  <Badge className="text-xs bg-red-600 dark:bg-red-700 text-white dark:text-red-100 hover:bg-red-700 dark:hover:bg-red-800 border-none">
                    Practicar
                  </Badge>
                </div>
              ))}
            </div>
            <Button 
              onClick={() => navigate("/practice")}
              className="w-full bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white border-none"
              size="sm"
            >
              <BookOpen className="mr-2 h-4 w-4" />
              Practicar Temas Débiles
            </Button>
          </div>
        )}

        {/* Temas fuertes */}
        {strongTopics.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              <h4 className="font-medium text-green-600 dark:text-green-400">Tus puntos fuertes</h4>
            </div>
            <div className="space-y-2">
              {strongTopics.map((topic, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800/30"
                >
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{topic}</span>
                  <Badge className="text-xs bg-green-600 dark:bg-green-700 text-white dark:text-green-100 hover:bg-green-700 dark:hover:bg-green-800 border-none">
                    Dominado
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mensaje motivacional */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800/30">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            💡 <strong>Consejo:</strong> Dedica al menos 15 minutos diarios a practicar 
            tus temas débiles. La constancia es la clave del éxito.
          </p>
        </div>

        {/* Acciones sugeridas */}
        <div className="grid grid-cols-2 gap-2">
          <Button 
            onClick={() => navigate("/test-setup")}
            variant="outline"
            size="sm"
            className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 bg-white dark:bg-gray-900"
          >
            Nuevo Test
          </Button>
          <Button 
            onClick={() => navigate("/analisis-temas")}
            variant="outline"
            size="sm"
            className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 bg-white dark:bg-gray-900"
          >
            Ver Análisis
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecommendationsCard;