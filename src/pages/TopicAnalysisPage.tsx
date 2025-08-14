// ========================================
// SISTEMA DE CELEBRACIÓN Y REINICIO - TopicAnalysisPage.tsx
// ========================================

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Target, 
  BarChart3,
  ArrowLeft,
  RefreshCw,
  PlayCircle,
  RotateCcw,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTopicAnalysis } from "@/hooks/useTopicAnalysis";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import CelebrationModal from "@/components/CelebrationModal";

export default function TopicAnalysisPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = (path: string) => {
    window.location.href = path;
  };

  const { 
    topicStats, 
    academias, 
    loading, 
    refreshData 
  } = useTopicAnalysis();

const getNivelIcon = (nivel: string) => {
  switch (nivel) {
    case 'Dominado': return '🏆';
    case 'Casi Dominado': return '⭐';
    case 'En Progreso': return '📈';
    case 'Necesita Práctica': return '📚';
    default: return '❓';
  }
};

// 🎨 Función para obtener colores del nivel
const getNivelColor = (nivel: string) => {
  switch (nivel) {
    case 'Dominado': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    case 'Casi Dominado': return 'text-blue-600 bg-blue-100 border-blue-200';
    case 'En Progreso': return 'text-green-600 bg-green-100 border-green-200';
    case 'Necesita Práctica': return 'text-red-600 bg-red-100 border-red-200';
    default: return 'text-gray-600 bg-gray-100 border-gray-200';
  }
};
  
  // 🎉 ESTADOS PARA CELEBRACIÓN
  const [celebrationModal, setCelebrationModal] = useState<{
    isOpen: boolean;
    achievement: any;
  }>({
    isOpen: false,
    achievement: null
  });

  const [completedTopics, setCompletedTopics] = useState<Set<string>>(new Set());

  // 🎯 DETECTAR TEMAS COMPLETADOS AL 100%
  useEffect(() => {
    if (!topicStats.length) return;

    topicStats.forEach(topic => {
      const isFullyCompleted = topic.progreso_temario === 100 && topic.porcentaje_acierto === 100;
      const wasAlreadyCompleted = completedTopics.has(topic.tema_id);

      // 🎉 NUEVA CELEBRACIÓN: Si no estaba completado y ahora sí
      if (isFullyCompleted && !wasAlreadyCompleted) {
        setCompletedTopics(prev => new Set([...prev, topic.tema_id]));
        
        // Mostrar modal de celebración
        setCelebrationModal({
          isOpen: true,
          achievement: {
            type: 'Dominado',
            topicName: topic.tema_nombre,
            accuracy: topic.porcentaje_acierto,
            attempts: topic.intentos_totales,
            previousLevel: 'En Progreso'
          }
        });
      }
    });
  }, [topicStats, completedTopics]);

  // 🗑️ FUNCIÓN PARA REINICIAR PROGRESO DE UN TEMA
  const resetTopicProgress = async (temaId: string, temaNombre: string) => {
    if (!user) return;

    try {
      const confirmReset = window.confirm(
        `¿Estás seguro de que quieres reiniciar completamente el progreso del tema "${temaNombre}"?\n\n` +
        `Esto eliminará:\n` +
        `• Todas tus respuestas\n` +
        `• Todas las sesiones\n` +
        `• El progreso de dominio\n\n` +
        `Esta acción NO se puede deshacer.`
      );

      if (!confirmReset) return;

      toast({
        title: "Reiniciando...",
        description: "Eliminando progreso del tema...",
      });

      // 1. Eliminar todas las respuestas del usuario para este tema
      const { error: answersError } = await supabase
        .from('user_answers')
        .delete()
        .eq('user_id', user.id)
        .in('pregunta_id', 
          supabase
            .from('preguntas')
            .select('id')
            .eq('tema_id', temaId)
        );

      if (answersError) throw answersError;

      // 2. Eliminar preguntas falladas del tema
      const { error: falladasError } = await supabase
        .from('preguntas_falladas')
        .delete()
        .eq('user_id', user.id)
        .in('pregunta_id',
          supabase
            .from('preguntas')
            .select('id')
            .eq('tema_id', temaId)
        );

      if (falladasError) throw falladasError;

      // 3. Eliminar sesiones del tema
      const { error: sessionsError } = await supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', user.id)
        .eq('tema_id', temaId);

      if (sessionsError) throw sessionsError;

      // 4. Actualizar estado local
      setCompletedTopics(prev => {
        const newSet = new Set(prev);
        newSet.delete(temaId);
        return newSet;
      });

      // 5. Refrescar datos
      await refreshData();

      toast({
        title: "✅ Progreso Reiniciado",
        description: `El tema "${temaNombre}" ha sido reiniciado completamente.`,
        variant: "default"
      });

    } catch (error) {
      console.error('Error resetting topic progress:', error);
      toast({
        title: "❌ Error",
        description: "No se pudo reiniciar el progreso del tema.",
        variant: "destructive"
      });
    }
  };

  // 🎨 COMPONENTE TOPIC CARD ACTUALIZADO
  const TopicCard = ({ topic, priority }: { topic: any; priority: 'high' | 'medium' | 'low' | 'achieved' }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    const getBorderStyle = () => {
      switch (priority) {
        case 'high': return 'border-l-4 border-l-red-500 hover:shadow-lg';
        case 'medium': return 'border-l-4 border-l-green-500 hover:shadow-md';
        case 'low': return 'border-l-4 border-l-blue-500 hover:shadow-md';
        case 'achieved': return 'border-l-4 border-l-yellow-500 hover:shadow-sm bg-yellow-50/30';
        default: return 'hover:shadow-md';
      }
    };

    const getButtonVariant = () => {
      switch (priority) {
        case 'high': return 'default';
        case 'medium': return 'secondary';
        case 'low': return 'outline';
        case 'achieved': return 'ghost';
        default: return 'outline';
      }
    };

    const getButtonText = () => {
      const falladasCount = topic.preguntas_falladas_ids.length;
      
      if (priority === 'achieved') {
        return (
          <>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Repasar
          </>
        );
      }
      
      if (falladasCount > 0) {
        return (
          <>
            <BookOpen className="mr-1.5 h-4 w-4" />
            Practicar ({falladasCount})
          </>
        );
      }
      
      return (
        <>
          <PlayCircle className="mr-1.5 h-4 w-4" />
          Hacer Test
        </>
      );
    };

    // Detectar si el título es largo
    const isLongTitle = topic.tema_nombre.length > 25;
    const shouldShowExpander = isLongTitle && !isExpanded;

    const toggleExpanded = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsExpanded(!isExpanded);
    };

    // Valores corregidos
    const preguntasRespondidas = topic.total_respondidas;
    const totalPreguntasTemario = topic.total_preguntas_temario;
    const preguntasPendientes = topic.preguntas_pendientes;
    const progresoTemario = topic.progreso_temario;
    const porcentajeDominio = topic.porcentaje_acierto;

    // 🎉 DETECTAR SI ESTÁ COMPLETADO AL 100%
    const isFullyCompleted = progresoTemario === 100 && porcentajeDominio === 100;

    const getProgresoColor = (porcentaje: number) => {
      if (porcentaje >= 90) return 'bg-blue-500';
      if (porcentaje >= 70) return 'bg-green-500';
      if (porcentaje >= 50) return 'bg-yellow-500';
      return 'bg-orange-500';
    };

    const getDominioColor = (porcentaje: number) => {
      if (porcentaje >= 95) return 'bg-yellow-500';
      if (porcentaje >= 85) return 'bg-blue-500';  
      if (porcentaje >= 70) return 'bg-green-500'; 
      return 'bg-red-500';
    };

    return (
      <Card className={cn("transition-all duration-200", getBorderStyle())}>
        <CardHeader className="pb-2">
          <div className="space-y-1.5">
            {/* 🎯 TÍTULO DEL TEMA - ESPACIO COMPLETO */}
            <div className="flex items-start gap-1.5">
              <span className="text-base flex-shrink-0">{getNivelIcon(topic.nivel_dominio)}</span>
              <div className="flex-1 min-w-0">
                <CardTitle 
                  className={cn(
                    "text-sm leading-tight cursor-pointer transition-all duration-200",
                    shouldShowExpander && "truncate hover:text-primary",
                    isExpanded && "whitespace-normal"
                  )}
                  onClick={isLongTitle ? toggleExpanded : undefined}
                >
                  {topic.tema_nombre}
                </CardTitle>
              </div>
              {/* 🎯 BOTÓN "VER MÁS" A LA DERECHA */}
              {isLongTitle && (
                <button
                  onClick={toggleExpanded}
                  className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 flex-shrink-0 transition-colors"
                >
                  {isExpanded ? (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                      Menos
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      Ver más
                    </>
                  )}
                </button>
              )}
            </div>
            
            {/* 🎯 ACADEMIA + BADGE EN LA MISMA LÍNEA */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground truncate">
                {topic.academia_nombre}
              </p>
              <Badge 
                variant="outline" 
                className={cn("text-xs ml-2 flex-shrink-0", getNivelColor(topic.nivel_dominio))}
              >
                {topic.nivel_dominio}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3 pt-0">
          {/* 🎉 INDICADOR DE COMPLETADO AL 100% */}
          {isFullyCompleted && (
            <div className="p-2 bg-gradient-to-r from-yellow-50 to-orange-50 rounded border border-yellow-200 text-center">
              <div className="flex items-center justify-center gap-2 text-sm font-medium text-yellow-800">
                <span>🏆</span>
                <span>¡Tema Completamente Dominado!</span>
                <span>🎉</span>
              </div>
            </div>
          )}

          {/* 🎯 PROGRESO TEMARIO - COMPACTO */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                📚 Progreso
                {preguntasPendientes > 0 && (
                  <span className="text-blue-600 font-medium">
                    ({preguntasPendientes} pendientes)
                  </span>
                )}
              </span>
              <span className="font-bold text-sm">
                {preguntasRespondidas}/{totalPreguntasTemario}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className={cn("h-2 rounded-full transition-all", getProgresoColor(progresoTemario))}
                style={{ width: `${progresoTemario}%` }}
              />
            </div>
          </div>

          {/* 🎯 DOMINIO - COMPACTO */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                🎯 Dominio
                {topic.total_incorrectas > 0 && (
                  <span className="text-red-600 font-medium">
                    ({topic.total_incorrectas} errores)
                  </span>
                )}
              </span>
              <span className="font-bold text-sm">{porcentajeDominio}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className={cn("h-2 rounded-full transition-all", getDominioColor(porcentajeDominio))}
                style={{ width: `${porcentajeDominio}%` }}
              />
            </div>
          </div>

          {/* 🎯 ESTADÍSTICAS GRID - MÁS COMPACTO */}
          <div className="grid grid-cols-3 gap-1 text-center py-2 bg-muted/30 rounded">
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Únicas</p>
              <p className="text-sm font-bold">{preguntasRespondidas}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-green-600">Dominadas</p>
              <p className="text-sm font-bold text-green-600">{topic.total_correctas}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-red-600">Errores</p>
              <p className="text-sm font-bold text-red-600">{topic.total_incorrectas}</p>
            </div>
          </div>

          {/* 🎯 INFO ADICIONAL - UNA SOLA LÍNEA */}
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>Intentos: {topic.intentos_totales}</span>
            {topic.dias_sin_repasar < 7 ? (
              <span className="text-green-600">Reciente</span>
            ) : topic.dias_sin_repasar < 30 ? (
              <span>Hace {topic.dias_sin_repasar}d</span>
            ) : (
              <span className="text-orange-600">Hace tiempo</span>
            )}
          </div>

          {/* 🎯 ESTADO RÁPIDO - SOLO SI ES IMPORTANTE */}
          {priority === 'high' && topic.total_incorrectas > 5 && (
            <div className="text-center py-1 bg-red-50 rounded border border-red-200">
              <span className="text-xs text-red-700 font-medium">
                ⚠️ Requiere atención urgente
              </span>
            </div>
          )}

          {/* 🎯 BOTONES DE ACCIÓN */}
          <div className="space-y-2">
            {/* Botón principal */}
            <Button
              onClick={() => handlePracticeClick(
                topic.tema_id, 
                topic.academia_id, 
                topic.preguntas_falladas_ids
              )}
              className="w-full h-8"
              variant={getButtonVariant()}
              size="sm"
            >
              {getButtonText()}
            </Button>

            {/* 🗑️ BOTÓN DE REINICIO (solo para temas completados) */}
            {isFullyCompleted && (
              <Button
                onClick={() => resetTopicProgress(topic.tema_id, topic.tema_nombre)}
                variant="outline"
                size="sm"
                className="w-full h-7 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                Reiniciar Progreso
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const handlePracticeClick = (temaId: string, academiaId: string, preguntasFalladas: string[]) => {
    if (preguntasFalladas.length === 0) {
      window.location.href = `/quiz?mode=test&academia=${academiaId}&tema=${temaId}`;
    } else {
      const questionIds = preguntasFalladas.join(',');
      window.location.href = `/quiz?mode=practice&tema=${temaId}&questions=${questionIds}`;
    }
  };

  // 🎉 MANEJADORES DEL MODAL DE CELEBRACIÓN
  const handleCelebrationClose = () => {
    setCelebrationModal({ isOpen: false, achievement: null });
  };

  const handleContinuePractice = () => {
    setCelebrationModal({ isOpen: false, achievement: null });
    // Navegar a análisis de temas o continuar con otro tema
    navigate("/topic-analysis");
  };

  const handleNextTopic = () => {
    setCelebrationModal({ isOpen: false, achievement: null });
    navigate("/test-setup");
  };

  const handlePracticeMore = () => {
    setCelebrationModal({ isOpen: false, achievement: null });
    navigate("/practice");
  };

  // ... resto del componente existente (loading, render principal, etc.)
  
  return (
    <>
      {/* COMPONENTE PRINCIPAL EXISTENTE */}
      <main className="min-h-screen p-4 bg-background">
        {/* ... resto del JSX existente ... */}
      </main>

      {/* 🎉 MODAL DE CELEBRACIÓN */}
      <CelebrationModal
        isOpen={celebrationModal.isOpen}
        onClose={handleCelebrationClose}
        achievement={celebrationModal.achievement}
        onContinue={handleContinuePractice}
        onNextTopic={handleNextTopic}
        onPracticeMore={handlePracticeMore}
      />
    </>
  );
}