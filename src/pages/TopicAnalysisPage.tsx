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
  RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTopicAnalysis, getNivelIcon, getNivelColor } from "@/hooks/useTopicAnalysis";
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
    loading, 
    refreshData,
    resetSpecificTopicData 
  } = useTopicAnalysis();

  // Estado para controlar el modal de celebración
  const [celebrationModal, setCelebrationModal] = useState<{
    isOpen: boolean;
    achievement: {
      type: 'Dominado' | 'Casi Dominado' | 'En Progreso';
      topicName: string;
      accuracy: number;
      attempts: number;
      previousLevel?: string;
    } | null;
  }>({
    isOpen: false,
    achievement: null
  });

  // ✅ CAMBIO 1: Se elimina el `useState` de `celebratedTopics`. Ya no es necesario.
  // const [celebratedTopics, setCelebratedTopics] = useState<Map<string, boolean>>(new Map());

  // ✅ CAMBIO 2: El useEffect ahora usa localStorage para tener memoria persistente.
  useEffect(() => {
    if (!topicStats.length || !user) return;

    // Se lee del localStorage la lista de temas ya celebrados para este usuario
    const celebratedKey = `celebrated_${user.id}`;
    const alreadyCelebrated: string[] = JSON.parse(localStorage.getItem(celebratedKey) || '[]');

    topicStats.forEach(topic => {
      if (!topic || !topic.tema_id || !topic.tema_nombre) return;
      
      const isFullyCompleted = topic.progreso_temario === 100 && topic.porcentaje_acierto === 100;
      
      // La condición ahora comprueba si el ID del tema NO está en la lista de localStorage
      if (isFullyCompleted && !alreadyCelebrated.includes(topic.tema_id)) {
        
        // Si es un nuevo logro, se añade a la lista y se guarda de nuevo en localStorage
        const newCelebrated = [...alreadyCelebrated, topic.tema_id];
        localStorage.setItem(celebratedKey, JSON.stringify(newCelebrated));
        
        const achievementData = {
          type: 'Dominado' as const,
          topicName: topic.tema_nombre,
          accuracy: topic.porcentaje_acierto,
          attempts: topic.intentos_totales || 1,
          previousLevel: 'En Progreso'
        };

        setTimeout(() => {
          setCelebrationModal({
            isOpen: true,
            achievement: achievementData
          });
        }, 100);

        toast({
          title: "🏆 ¡Tema Completamente Dominado!",
          description: `Has alcanzado la perfección en "${topic.tema_nombre}". ¡Felicidades!`,
          duration: 3000,
        });
      }
    });
    // Se elimina `celebratedTopics` de las dependencias porque ya no existe
  }, [topicStats, user, toast]);

  // ✅ CAMBIO 3: La función de reinicio ahora también limpia el localStorage.
  const resetTopicProgress = async (temaId: string, temaNombre: string) => {
    if (!user) return;

    try {
      const confirmReset = window.confirm(
        `¿Estás seguro de que quieres reiniciar completamente el progreso del tema "${temaNombre}"?\n\n` +
        `Esto eliminará todas tus respuestas y sesiones asociadas.\n\n` +
        `Esta acción NO se puede deshacer.`
      );

      if (!confirmReset) return;

      toast({
        title: "Reiniciando...",
        description: "Eliminando progreso del tema...",
      });

      const success = await resetSpecificTopicData(temaId);

      if (success) {
        // Al reiniciar, se elimina el tema de la lista de celebrados en localStorage
        const celebratedKey = `celebrated_${user.id}`;
        const alreadyCelebrated: string[] = JSON.parse(localStorage.getItem(celebratedKey) || '[]');
        const newCelebrated = alreadyCelebrated.filter(id => id !== temaId);
        localStorage.setItem(celebratedKey, JSON.stringify(newCelebrated));

        await refreshData();

        toast({
          title: "✅ Progreso Reiniciado",
          description: `El tema "${temaNombre}" está listo para empezar de nuevo.`,
          variant: "default"
        });
      } else {
        throw new Error('No se pudo reiniciar el progreso desde el hook.');
      }

    } catch (error) {
      console.error('Error resetting topic progress:', error);
      toast({
        title: "❌ Error",
        description: "No se pudo reiniciar el progreso del tema.",
        variant: "destructive"
      });
    }
  };

  // Navega a la pantalla de práctica o test según si hay preguntas falladas
  const handlePracticeClick = (temaId: string, academiaId: string, preguntasFalladas: string[]) => {
    if (preguntasFalladas.length === 0) {
      navigate(`/quiz?mode=test&academia=${academiaId}&tema=${temaId}`);
    } else {
      const questionIds = preguntasFalladas.join(',');
      navigate(`/quiz?mode=practice&tema=${temaId}&questions=${questionIds}`);
    }
  };

  // --- Manejadores para los botones del Modal de Celebración ---
  const handleCelebrationClose = () => {
    setCelebrationModal({ isOpen: false, achievement: null });
  };

  const handleContinuePractice = () => {
    setCelebrationModal({ isOpen: false, achievement: null });
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

  // ✅ CAMBIO 4: Se elimina la función `testModal`.
  // const testModal = () => { ... };

  // --- Subcomponente para las tarjetas de temas ---
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
      const falladasCount = topic.preguntas_falladas_ids?.length || 0;
      
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

    const isLongTitle = topic.tema_nombre && topic.tema_nombre.length > 25;
    const shouldShowExpander = isLongTitle && !isExpanded;

    const toggleExpanded = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsExpanded(!isExpanded);
    };

    const preguntasRespondidas = topic.total_respondidas || 0;
    const totalPreguntasTemario = topic.total_preguntas_temario || 0;
    const preguntasPendientes = topic.preguntas_pendientes || 0;
    const progresoTemario = topic.progreso_temario || 0;
    const porcentajeDominio = topic.porcentaje_acierto || 0;

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
                  {topic.tema_nombre || 'Sin nombre'}
                </CardTitle>
              </div>
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
            
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground truncate">
                {topic.academia_nombre || 'Sin academia'}
              </p>
              <Badge 
                variant="outline" 
                className={cn("text-xs ml-2 flex-shrink-0", getNivelColor(topic.nivel_dominio))}
              >
                {topic.nivel_dominio || 'Sin nivel'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3 pt-0">
          {isFullyCompleted && (
            <div className="p-2 bg-gradient-to-r from-yellow-50 to-orange-50 rounded border border-yellow-200 text-center">
              <div className="flex items-center justify-center gap-2 text-sm font-medium text-yellow-800">
                <span>🏆</span>
                <span>¡Tema Completamente Dominado!</span>
                <span>🎉</span>
              </div>
            </div>
          )}

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

          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                🎯 Dominio
                {(topic.total_incorrectas || 0) > 0 && (
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

          <div className="grid grid-cols-3 gap-1 text-center py-2 bg-muted/30 rounded">
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Únicas</p>
              <p className="text-sm font-bold">{preguntasRespondidas}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-green-600">Dominadas</p>
              <p className="text-sm font-bold text-green-600">{topic.total_correctas || 0}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-red-600">Errores</p>
              <p className="text-sm font-bold text-red-600">{topic.total_incorrectas || 0}</p>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>Intentos: {topic.intentos_totales || 0}</span>
            {(topic.dias_sin_repasar || 0) < 7 ? (
              <span className="text-green-600">Reciente</span>
            ) : (topic.dias_sin_repasar || 0) < 30 ? (
              <span>Hace {topic.dias_sin_repasar}d</span>
            ) : (
              <span className="text-orange-600">Hace tiempo</span>
            )}
          </div>

          {priority === 'high' && (topic.total_incorrectas || 0) > 5 && (
            <div className="text-center py-1 bg-red-50 rounded border border-red-200">
              <span className="text-xs text-red-700 font-medium">
                ⚠️ Requiere atención urgente
              </span>
            </div>
          )}

          <div className="space-y-2">
            <Button
              onClick={() => handlePracticeClick(
                topic.tema_id, 
                topic.academia_id, 
                topic.preguntas_falladas_ids || []
              )}
              className="w-full h-8"
              variant={getButtonVariant()}
              size="sm"
            >
              {getButtonText()}
            </Button>

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

  if (loading) {
    return (
      <main className="min-h-screen p-4 bg-background">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-8 w-64 bg-muted rounded animate-pulse" />
              <div className="h-4 w-48 bg-muted rounded animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-6">
                <div className="space-y-3">
                  <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                  <div className="h-6 w-20 bg-muted rounded animate-pulse" />
                  <div className="h-2 w-full bg-muted rounded animate-pulse" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>
    );
  }

  const temasDominados = topicStats.filter(t => t?.nivel_dominio === 'Dominado');
  const temasCasiDominados = topicStats.filter(t => t?.nivel_dominio === 'Casi Dominado');
  const temasEnProgreso = topicStats.filter(t => t?.nivel_dominio === 'En Progreso');
  const temasNecesitanPractica = topicStats.filter(t => t?.nivel_dominio === 'Necesita Práctica');
  const totalPreguntas = topicStats.reduce((sum, t) => sum + (t?.total_respondidas || 0), 0);
  const totalCorrectas = topicStats.reduce((sum, t) => sum + (t?.total_correctas || 0), 0);
  const promedioGeneral = totalPreguntas > 0 ? Math.round((totalCorrectas / totalPreguntas) * 100) : 0;

  return (
    <>
      <main className="min-h-screen p-4 bg-background">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Volver
                </Button>
                <h1 className="text-2xl sm:text-3xl font-bold">📊 Análisis por Temas</h1>
              </div>
              <p className="text-muted-foreground">Descubre en qué temas necesitas enfocar tu estudio</p>
            </div>
            <div className="flex gap-2">
              {/* ✅ CAMBIO 5: Se elimina el botón de prueba del JSX. */}
              <Button variant="ghost" size="sm" onClick={refreshData} className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Actualizar
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Promedio General</p>
                    <p className="text-2xl font-bold">{promedioGeneral}%</p>
                  </div>
                  <Target className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Respondidas</p>
                    <p className="text-2xl font-bold">{totalPreguntas}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Temas Dominados</p>
                    <p className="text-2xl font-bold text-yellow-600">{temasDominados.length}</p>
                  </div>
                  <div className="text-2xl">🏆</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Necesitan Práctica</p>
                    <p className="text-2xl font-bold text-red-600">{temasNecesitanPractica.length}</p>
                  </div>
                  <div className="text-2xl">📚</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {temasNecesitanPractica.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-red-600">
                    📚 Necesitan Práctica
                    <Badge variant="destructive" className="ml-auto">
                      {temasNecesitanPractica.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {temasNecesitanPractica.map((topic) => (
                      <TopicCard key={topic.tema_id} topic={topic} priority="high" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {temasEnProgreso.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-green-600">
                    📈 En Progreso
                    <Badge variant="secondary" className="ml-auto bg-green-100 text-green-700">
                      {temasEnProgreso.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {temasEnProgreso.map((topic) => (
                      <TopicCard key={topic.tema_id} topic={topic} priority="medium" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {temasCasiDominados.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-blue-600">
                    ⭐ Casi Dominados
                    <Badge variant="secondary" className="ml-auto bg-blue-100 text-blue-700">
                      {temasCasiDominados.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {temasCasiDominados.map((topic) => (
                      <TopicCard key={topic.tema_id} topic={topic} priority="low" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {temasDominados.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-yellow-600">
                    🏆 Temas Dominados
                    <Badge variant="secondary" className="ml-auto bg-yellow-100 text-yellow-700">
                      {temasDominados.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {temasDominados.map((topic) => (
                      <TopicCard key={topic.tema_id} topic={topic} priority="achieved" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {topicStats.length === 0 && (
              <Card>
                <CardContent className="flex items-center justify-center p-12">
                  <div className="text-center space-y-4">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto" />
                    <div>
                      <h3 className="text-lg font-semibold">No hay datos disponibles</h3>
                      <p className="text-muted-foreground">
                        Completa algunos tests para ver tu análisis por temas
                      </p>
                    </div>
                    <Button onClick={() => navigate("/test-setup")}>
                      <PlayCircle className="mr-2 h-4 w-4" />
                      Hacer un Test
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

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