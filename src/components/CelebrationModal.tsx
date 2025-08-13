import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  Star, 
  Target, 
  PartyPopper, 
  ArrowRight,
  RotateCcw 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  achievement: {
    type: 'Dominado' | 'Casi Dominado' | 'En Progreso';
    topicName: string;
    accuracy: number;
    attempts: number;
    previousLevel?: string;
  };
  onContinue?: () => void;
  onPracticeMore?: () => void;
  onNextTopic?: () => void;
}

export default function CelebrationModal({
  isOpen,
  onClose,
  achievement,
  onContinue,
  onPracticeMore,
  onNextTopic
}: CelebrationModalProps) {
  
  const getAchievementConfig = (type: string) => {
    switch (type) {
      case 'Dominado':
        return {
          icon: <Trophy className="h-12 w-12 text-yellow-500" />,
          title: "🏆 ¡Tema Dominado!",
          description: "Has alcanzado un nivel excepcional",
          bgGradient: "bg-gradient-to-r from-yellow-50 to-orange-50",
          borderColor: "border-yellow-200",
          textColor: "text-yellow-800",
          emoji: "🎉"
        };
      case 'Casi Dominado':
        return {
          icon: <Star className="h-12 w-12 text-blue-500" />,
          title: "⭐ ¡Casi lo Tienes!",
          description: "Estás muy cerca de dominar este tema",
          bgGradient: "bg-gradient-to-r from-blue-50 to-purple-50",
          borderColor: "border-blue-200",
          textColor: "text-blue-800",
          emoji: "🚀"
        };
      case 'En Progreso':
        return {
          icon: <Target className="h-12 w-12 text-green-500" />,
          title: "🎯 ¡Buen Progreso!",
          description: "Sigues mejorando constantemente",
          bgGradient: "bg-gradient-to-r from-green-50 to-teal-50",
          borderColor: "border-green-200",
          textColor: "text-green-800",
          emoji: "📈"
        };
      default:
        return {
          icon: <PartyPopper className="h-12 w-12 text-purple-500" />,
          title: "🎊 ¡Felicidades!",
          description: "Has logrado un nuevo hito",
          bgGradient: "bg-gradient-to-r from-purple-50 to-pink-50",
          borderColor: "border-purple-200",
          textColor: "text-purple-800",
          emoji: "🎉"
        };
    }
  };

  const config = getAchievementConfig(achievement.type);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className={cn(
              "p-4 rounded-full border-2",
              config.bgGradient,
              config.borderColor
            )}>
              {config.icon}
            </div>
          </div>
          
          <DialogTitle className="text-2xl font-bold">
            {config.title}
          </DialogTitle>
          
          <div className="space-y-3">
            <p className={cn("text-lg font-medium", config.textColor)}>
              {achievement.topicName}
            </p>
            <p className="text-muted-foreground">
              {config.description}
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Estadísticas del logro */}
          <div className={cn(
            "p-4 rounded-lg border-2",
            config.bgGradient,
            config.borderColor
          )}>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">
                  {achievement.accuracy}%
                </div>
                <div className="text-sm text-muted-foreground">Precisión</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  {achievement.attempts}
                </div>
                <div className="text-sm text-muted-foreground">Intentos</div>
              </div>
            </div>
            
            {achievement.previousLevel && (
              <div className="mt-3 text-center">
                <Badge variant="outline" className="text-xs">
                  Nivel anterior: {achievement.previousLevel}
                </Badge>
              </div>
            )}
          </div>

          {/* Mensaje motivacional */}
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <p className="text-sm italic">
              {achievement.type === 'Dominado' 
                ? "¡Increíble! Has demostrado un dominio excepcional de este tema. 🌟"
                : achievement.type === 'Casi Dominado'
                ? "¡Estás muy cerca! Un poco más de práctica y lo dominarás completamente. 💪"
                : "¡Excelente progreso! Cada respuesta correcta te acerca más a la maestría. 🎯"
              }
            </p>
          </div>

          {/* Botones de acción */}
          <div className="space-y-2">
            {achievement.type === 'Dominado' ? (
              <>
                <Button 
                  onClick={onNextTopic}
                  className="w-full"
                  size="lg"
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Ir al Siguiente Tema
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    onClick={onPracticeMore}
                    variant="outline"
                    size="sm"
                  >
                    <RotateCcw className="mr-2 h-3 w-3" />
                    Repasar
                  </Button>
                  <Button 
                    onClick={onClose}
                    variant="outline"
                    size="sm"
                  >
                    Continuar
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Button 
                  onClick={onContinue}
                  className="w-full"
                  size="lg"
                >
                  <Target className="mr-2 h-4 w-4" />
                  Seguir Practicando
                </Button>
                <Button 
                  onClick={onClose}
                  variant="outline"
                  className="w-full"
                  size="sm"
                >
                  Ver Progreso
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}