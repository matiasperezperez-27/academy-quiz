import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  Star, 
  Target, 
  PartyPopper, 
  ArrowRight,
  RotateCcw,
  Sparkles
} from "lucide-react";

interface CelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  achievement: {
    type: 'Dominado' | 'Casi Dominado' | 'En Progreso';
    topicName: string;
    accuracy: number;
    attempts: number;
    previousLevel?: string;
  } | null;
  onContinue?: () => void;
  onPracticeMore?: () => void;
  onNextTopic?: () => void;
}

// 🎊 Componente de Confeti CSS mejorado
const ConfettiAnimation = () => {
  const [confetti, setConfetti] = useState<Array<{
    id: number; 
    left: number; 
    delay: number; 
    color: string;
    size: number;
    rotation: number;
  }>>([]);

  useEffect(() => {
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#FF69B4', '#32CD32'];
    const newConfetti = Array.from({ length: 80 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4, // Entre 4px y 12px
      rotation: Math.random() * 360
    }));
    setConfetti(newConfetti);
  }, []);

  return (
    <>
      {/* Portal para confeti que se renderiza fuera del modal */}
      <div 
        className="fixed inset-0 pointer-events-none overflow-hidden"
        style={{ zIndex: 9999 }}
      >
        {confetti.map((piece) => (
          <div
            key={piece.id}
            className="absolute animate-confetti-fall"
            style={{
              left: `${piece.left}%`,
              top: '-20px',
              width: `${piece.size}px`,
              height: `${piece.size}px`,
              backgroundColor: piece.color,
              borderRadius: '2px',
              animationDelay: `${piece.delay}s`,
              animationDuration: '4s',
              animationFillMode: 'forwards',
              transform: `rotate(${piece.rotation}deg)`,
              boxShadow: '0 0 6px rgba(0,0,0,0.1)'
            }}
          />
        ))}
      </div>

      {/* Estilos CSS para la animación */}
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-20px) rotate(0deg);
            opacity: 1;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        
        .animate-confetti-fall {
          animation: confetti-fall 4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
      `}</style>
    </>
  );
};

// 🎆 Componente de fuegos artificiales adicional
const FireworksAnimation = () => {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    delay: number;
    color: string;
  }>>([]);

  useEffect(() => {
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FF69B4'];
    const newParticles = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: 20 + Math.random() * 40,
      delay: Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)]
    }));
    setParticles(newParticles);
  }, []);

  return (
    <>
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 9998 }}
      >
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute animate-firework"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              animationDelay: `${particle.delay}s`
            }}
          >
            {/* Múltiples partículas para simular explosión */}
            {[...Array(8)].map((_, j) => (
              <div
                key={j}
                className="absolute w-1 h-1 rounded-full animate-particle-burst"
                style={{
                  backgroundColor: particle.color,
                  animationDelay: `${particle.delay + 0.1 * j}s`,
                  transform: `rotate(${j * 45}deg)`
                }}
              />
            ))}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes firework {
          0% {
            transform: scale(0);
            opacity: 1;
          }
          50% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
        
        @keyframes particle-burst {
          0% {
            transform: translateX(0) translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateX(30px) translateY(30px) scale(0);
            opacity: 0;
          }
        }
        
        .animate-firework {
          animation: firework 1.5s ease-out forwards;
        }
        
        .animate-particle-burst {
          animation: particle-burst 1s ease-out forwards;
        }
      `}</style>
    </>
  );
};

export default function CelebrationModal({
  isOpen,
  onClose,
  achievement,
  onContinue,
  onPracticeMore,
  onNextTopic
}: CelebrationModalProps) {
  
  const navigate = useNavigate();
  const [showEffects, setShowEffects] = useState(false);

  const handleNextTopic = () => {
    navigate('/test-setup');
    onClose();
  };

  // Activar efectos cuando se abre el modal
  useEffect(() => {
    if (isOpen && achievement) {
      // Pequeño delay para asegurar que el modal esté renderizado
      const timer = setTimeout(() => {
        setShowEffects(true);
      }, 100);
      
      // Limpiar efectos después de la animación
      const cleanupTimer = setTimeout(() => {
        setShowEffects(false);
      }, 6000);
      
      return () => {
        clearTimeout(timer);
        clearTimeout(cleanupTimer);
      };
    } else {
      setShowEffects(false);
    }
  }, [isOpen, achievement]);

  // Validación de seguridad
  if (!achievement || !achievement.type || !achievement.topicName) {
    return null;
  }

  const getAchievementConfig = (type: string) => {
    switch (type) {
      case 'Dominado':
        return {
          icon: <Trophy className="h-12 w-12 text-yellow-500 drop-shadow-lg" />,
          title: "🏆 ¡Tema Dominado!",
          description: "Has alcanzado un nivel excepcional",
          bgGradient: "bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 dark:from-yellow-900/20 dark:via-orange-900/20 dark:to-amber-900/20",
          borderColor: "border-yellow-200 dark:border-yellow-700",
          textColor: "text-yellow-900 dark:text-yellow-100",
          titleColor: "text-gray-900 dark:text-white",
          descriptionColor: "text-gray-700 dark:text-gray-300",
          accentColor: "text-yellow-600 dark:text-yellow-400",
          emoji: "🎉"
        };
      case 'Casi Dominado':
        return {
          icon: <Star className="h-12 w-12 text-blue-500 drop-shadow-lg" />,
          title: "⭐ ¡Casi lo Tienes!",
          description: "Estás muy cerca de dominar este tema",
          bgGradient: "bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20",
          borderColor: "border-blue-200 dark:border-blue-700",
          textColor: "text-blue-900 dark:text-blue-100",
          titleColor: "text-gray-900 dark:text-white",
          descriptionColor: "text-gray-700 dark:text-gray-300",
          accentColor: "text-blue-600 dark:text-blue-400",
          emoji: "🚀"
        };
      case 'En Progreso':
        return {
          icon: <Target className="h-12 w-12 text-green-500 drop-shadow-lg" />,
          title: "🎯 ¡Buen Progreso!",
          description: "Sigues mejorando constantemente",
          bgGradient: "bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-900/20 dark:via-emerald-900/20 dark:to-teal-900/20",
          borderColor: "border-green-200 dark:border-green-700",
          textColor: "text-green-900 dark:text-green-100",
          titleColor: "text-gray-900 dark:text-white",
          descriptionColor: "text-gray-700 dark:text-gray-300",
          accentColor: "text-green-600 dark:text-green-400",
          emoji: "📈"
        };
      default:
        return {
          icon: <PartyPopper className="h-12 w-12 text-purple-500 drop-shadow-lg" />,
          title: "🎊 ¡Felicidades!",
          description: "Has logrado un nuevo hito",
          bgGradient: "bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-rose-900/20",
          borderColor: "border-purple-200 dark:border-purple-700",
          textColor: "text-purple-900 dark:text-purple-100",
          titleColor: "text-gray-900 dark:text-white",
          descriptionColor: "text-gray-700 dark:text-gray-300",
          accentColor: "text-purple-600 dark:text-purple-400",
          emoji: "🎉"
        };
    }
  };

  const config = getAchievementConfig(achievement.type);

  const getMotivationalMessage = (type: string) => {
    const messages = {
      'Dominado': [
        "¡Increíble! Has demostrado un dominio excepcional de este tema. 🌟",
        "¡Excelencia pura! Este tema ya no tiene secretos para ti. 🚀",
        "¡Maestría alcanzada! Tu dedicación ha dado frutos extraordinarios. 🏆"
      ],
      'Casi Dominado': [
        "¡Excelente progreso! Solo un poco más y lo dominarás completamente. 💪",
        "¡Impresionante! Estás en el camino correcto hacia la maestría. ⭐",
        "¡Fantástico! La perfección está al alcance de tus manos. 🎯"
      ],
      'En Progreso': [
        "¡Genial! Cada respuesta correcta te acerca más a la maestría. 📈",
        "¡Sigue así! Tu progreso constante es admirable. 🎯",
        "¡Excelente trabajo! Estás construyendo una base sólida. 💪"
      ]
    };
    
    const typeMessages = messages[type as keyof typeof messages] || messages['Dominado'];
    return typeMessages[Math.floor(Math.random() * typeMessages.length)];
  };

  return (
    <>
      {/* 🎊 Efectos de celebración */}
      {showEffects && (
        <>
          <ConfettiAnimation />
          {achievement.type === 'Dominado' && <FireworksAnimation />}
        </>
      )}
      
      <Dialog open={isOpen && !!achievement} onOpenChange={onClose}>
        <DialogContent 
          className="sm:max-w-md max-w-[90vw] border-0 p-0 overflow-hidden bg-transparent shadow-2xl"
          style={{ zIndex: 9997 }}
        >
          <div className={`
            relative rounded-2xl border-2 overflow-hidden
            bg-white dark:bg-gray-900
            ${config.borderColor}
            shadow-2xl
            animate-in zoom-in-95 duration-300
          `}>
            {/* Fondo decorativo con gradiente */}
            <div className={`absolute inset-0 opacity-30 ${config.bgGradient}`} />
            
            <div className="relative z-10 p-4 sm:p-5 pt-8 sm:pt-10">
              <DialogHeader className="text-center space-y-3">
                {/* Icono principal con animación */}
                <div className="flex justify-center mt-2">
                  <div className={`
                    relative p-4 rounded-full border-4 shadow-xl
                    bg-white dark:bg-gray-800
                    ${config.borderColor}
                    animate-bounce
                  `}>
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400/20 to-orange-400/20 animate-ping" />
                    <div className="relative z-10">
                      {config.icon}
                    </div>
                    <Sparkles className="absolute -top-2 -right-2 h-5 w-5 text-yellow-400 animate-bounce" />
                    <Sparkles className="absolute -bottom-2 -left-2 h-3 w-3 text-yellow-400 animate-bounce delay-75" />
                  </div>
                </div>
                
                <DialogTitle className={`text-2xl font-bold tracking-tight ${config.titleColor}`}>
                  {config.title}
                </DialogTitle>
                
                <div className="space-y-1.5">
                  <h3 className={`text-lg font-semibold leading-tight ${config.accentColor}`}>
                    {achievement.topicName}
                  </h3>
                  <p className={`text-sm ${config.descriptionColor}`}>
                    {config.description}
                  </p>
                </div>
              </DialogHeader>

              <div className="space-y-4 mt-6">
                {/* Estadísticas del logro */}
                <div className={`
                  p-4 rounded-xl border-2 shadow-lg
                  ${config.bgGradient}
                  ${config.borderColor}
                  bg-white/50 dark:bg-gray-800/50
                `}>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="space-y-1">
                      <div className={`text-2xl font-bold ${config.accentColor}`}>
                        {achievement.accuracy || 0}%
                      </div>
                      <div className={`text-xs font-medium ${config.descriptionColor}`}>
                        Precisión
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className={`text-2xl font-bold ${config.accentColor}`}>
                        {achievement.attempts || 0}
                      </div>
                      <div className={`text-xs font-medium ${config.descriptionColor}`}>
                        Tests
                      </div>
                    </div>
                  </div>
                  
                  {achievement.previousLevel && (
                    <div className="mt-3 text-center">
                      <Badge 
                        variant="outline" 
                        className={`
                          text-xs border-2
                          ${config.borderColor}
                          ${config.textColor}
                          bg-white/70 dark:bg-gray-800/70
                        `}
                      >
                        Progreso: {achievement.previousLevel} → {achievement.type}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Mensaje motivacional */}
                <div className={`
                  text-center p-4 rounded-xl border
                  bg-white/80 dark:bg-gray-800/80
                  border-gray-200 dark:border-gray-600
                  shadow-inner
                `}>
                  <p className={`text-sm italic font-medium ${config.descriptionColor}`}>
                    {getMotivationalMessage(achievement.type)}
                  </p>
                </div>

                {/* Botones de acción */}
                <div className="space-y-3">
                  {achievement.type === 'Dominado' ? (
                    <>
                      <Button 
                        onClick={handleNextTopic}
                        className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                        size="lg"
                      >
                        <ArrowRight className="mr-2 h-5 w-5" />
                        Ir al Siguiente Tema
                      </Button>
                      <div className="grid grid-cols-2 gap-3">
                        <Button 
                          onClick={onPracticeMore}
                          variant="outline"
                          className={`h-10 font-medium border-2 ${config.borderColor} ${config.textColor} hover:bg-gradient-to-r hover:from-white hover:to-gray-50 dark:hover:from-gray-800 dark:hover:to-gray-700`}
                          size="sm"
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Repasar
                        </Button>
                        <Button 
                          onClick={onClose}
                          variant="outline"
                          className="h-10 font-medium border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
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
                        className="w-full h-12 text-base font-semibold bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                        size="lg"
                      >
                        <Target className="mr-2 h-5 w-5" />
                        Seguir Practicando
                      </Button>
                      <Button 
                        onClick={onClose}
                        variant="outline"
                        className="w-full h-10 font-medium border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        size="sm"
                      >
                        Ver Progreso General
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
