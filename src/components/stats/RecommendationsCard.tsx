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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Recomendaciones Personalizadas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Temas a mejorar */}
        {weakTopics.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <h4 className="font-medium text-red-600">Temas que necesitan atención</h4>
            </div>
            <div className="space-y-2">
              {weakTopics.map((topic, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                >
                  <span className="text-sm font-medium">{topic}</span>
                  <Badge variant="destructive" className="text-xs">
                    Practicar
                  </Badge>
                </div>
              ))}
            </div>
            <Button 
              onClick={() => navigate("/practice")}
              variant="destructive"
              className="w-full"
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
              <TrendingUp className="h-4 w-4 text-green-600" />
              <h4 className="font-medium text-green-600">Tus puntos fuertes</h4>
            </div>
            <div className="space-y-2">
              {strongTopics.map((topic, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 bg-green-50 rounded-lg"
                >
                  <span className="text-sm font-medium">{topic}</span>
                  <Badge className="text-xs bg-green-600">
                    Dominado
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mensaje motivacional */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
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
          >
            Nuevo Test
          </Button>
          <Button 
            onClick={() => navigate("/analisis-temas")}
            variant="outline"
            size="sm"
          >
            Ver Análisis
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecommendationsCard;