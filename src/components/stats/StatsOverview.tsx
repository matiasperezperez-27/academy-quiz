import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Target, Clock, BookOpen } from "lucide-react";

interface StatsOverviewProps {
  stats: any;
}

export const StatsOverview = ({ stats }: StatsOverviewProps) => {
  if (!stats) return null;

  // Calcular sesiones completadas correctamente
  const completedSessions = stats.recentSessions?.filter(session => 
    session.totalQuestions > 0 && session.scorePercentage !== null
  ).length || 0;

  const cards = [
    {
      title: "Precisión General",
      value: `${stats.overallAccuracy}%`,
      icon: <Target className="h-5 w-5" />,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Tests Completados",
      value: completedSessions, // 👈 CAMBIADO: Ahora usa sesiones completadas
      icon: <Trophy className="h-5 w-5" />,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50"
    },
    {
      title: "Preguntas Respondidas",
      value: stats.totalQuestions,
      icon: <BookOpen className="h-5 w-5" />,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Última Actividad",
      value: stats.lastActivityDate 
        ? new Date(stats.lastActivityDate).toLocaleDateString('es-ES')
        : "Nunca",
      icon: <Clock className="h-5 w-5" />,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <div className={card.color}>
                  {card.icon}
                </div>
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.title}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};