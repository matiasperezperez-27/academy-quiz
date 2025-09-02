import React, { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
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
  Search
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

  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

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
    navigate("/analisis-temas");
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

  const {
    temasDominados,
    temasCasiDominados,
    temasEnProgreso,
    temasNecesitanPractica
  } = useMemo(() => {
    const removeAccents = (str: string) => {
      if (!str) return "";
      return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };

    let filtered = topicStats;

    if (activeFilter) {
        filtered = filtered.filter(t => t?.nivel_dominio === activeFilter);
    }

    if (searchTerm) {
        const normalizedSearchTerm = removeAccents(searchTerm.toLowerCase());
        filtered = filtered.filter(t =>
            removeAccents(t?.tema_nombre.toLowerCase()).includes(normalizedSearchTerm)
        );
    }

    return {
        temasDominados: filtered.filter(t => t?.nivel_dominio === 'Dominado'),
        temasCasiDominados: filtered.filter(t => t?.nivel_dominio === 'Casi Dominado'),
        temasEnProgreso: filtered.filter(t => t?.nivel_dominio === 'En Progreso'),
        temasNecesitanPractica: filtered.filter(t => t?.nivel_dominio === 'Necesita Práctica'),
    };
  }, [topicStats, searchTerm, activeFilter]);
  const totalPreguntas = topicStats.reduce((sum, t) => sum + (t?.total_respondidas || 0), 0);
  const totalCorrectas = topicStats.reduce((sum, t) => sum + (t?.total_correctas || 0), 0);
  const promedioGeneral = totalPreguntas > 0 ? Math.round((totalCorrectas / totalPreguntas) * 100) : 0;

  const filters = [
    { label: 'Necesitan Práctica', value: 'Necesita Práctica' },
    { label: 'En Progreso', value: 'En Progreso' },
    { label: 'Casi Dominados', value: 'Casi Dominado' },
    { label: 'Dominados', value: 'Dominado' },
  ];

  // --- Subcomponente para las tarjetas de temas ---
  const TopicCard = ({ topic, priority }: { topic: any; priority: 'high' | 'medium' | 'low' | 'achieved' }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    const getBorderStyle = () => {
      switch (priority) {
        case 'high': return 'border-l-4 border-l-red-500 hover:shadow-xl hover:shadow-red-500/20 hover:scale-[1.02] bg-gradient-to-r from-red-50/30 to-white dark:from-red-900/10 dark:to-gray-800';
        case 'medium': return 'border-l-4 border-l-green-500 hover:shadow-xl hover:shadow-green-500/20 hover:scale-[1.02] bg-gradient-to-r from-green-50/30 to-white dark:from-green-900/10 dark:to-gray-800';
        case 'low': return 'border-l-4 border-l-blue-500 hover:shadow-xl hover:shadow-blue-500/20 hover:scale-[1.02] bg-gradient-to-r from-blue-50/30 to-white dark:from-blue-900/10 dark:to-gray-800';
        case 'achieved': return 'border-l-4 border-l-yellow-500 hover:shadow-xl hover:shadow-yellow-500/20 hover:scale-[1.02] bg-gradient-to-r from-yellow-50/50 to-orange-50/30 dark:from-yellow-900/20 dark:to-orange-900/10';
        default: return 'hover:shadow-lg hover:scale-[1.02]';
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
      if (porcentaje >= 90) return 'bg-gradient-to-r from-blue-500 to-indigo-600';
      if (porcentaje >= 70) return 'bg-gradient-to-r from-green-500 to-emerald-600';
      if (porcentaje >= 50) return 'bg-gradient-to-r from-yellow-500 to-orange-500';
      return 'bg-gradient-to-r from-orange-500 to-red-500';
    };

    const getDominioColor = (porcentaje: number) => {
      if (porcentaje >= 95) return 'bg-gradient-to-r from-yellow-500 to-orange-500';
      if (porcentaje >= 85) return 'bg-gradient-to-r from-blue-500 to-indigo-600';  
      if (porcentaje >= 70) return 'bg-gradient-to-r from-green-500 to-emerald-600'; 
      return 'bg-gradient-to-r from-red-500 to-rose-600';
    };

    return (
      <Card className={cn("transition-all duration-300 backdrop-blur-sm bg-white/95 dark:bg-gray-800/95 shadow-lg border border-gray-200/50 dark:border-gray-700/50", getBorderStyle())}>
        <CardHeader className="pb-3">
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 text-lg mt-0.5">{getNivelIcon(topic.nivel_dominio)}</div>
              <div className="flex-1 min-w-0">
                <CardTitle 
                  className={cn(
                    "text-sm leading-tight cursor-pointer transition-all duration-200 font-semibold",
                    shouldShowExpander && "truncate hover:text-blue-600 dark:hover:text-blue-400",
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
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
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
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 shadow-inner">
              <div 
                className={cn("h-2.5 rounded-full transition-all duration-500 ease-out shadow-sm", getProgresoColor(progresoTemario))}
                style={{ width: `${progresoTemario}%` }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                🎯 Dominio
                {(topic.total_incorrectas || 0) > 0 && (
                  <span className="text-red-600 dark:text-red-400 font-medium">
                    ({topic.total_incorrectas} errores)
                  </span>
                )}
              </span>
              <span className="font-bold text-sm">{porcentajeDominio}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 shadow-inner">
              <div 
                className={cn("h-2.5 rounded-full transition-all duration-500 ease-out shadow-sm", getDominioColor(porcentajeDominio))}
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

          <div className="space-y-3">
            <Button
              onClick={() => handlePracticeClick(
                topic.tema_id, 
                topic.academia_id, 
                topic.preguntas_falladas_ids || []
              )}
              className={cn(
                "w-full h-10 font-semibold transition-all duration-200 shadow-sm hover:shadow-md",
                priority === 'high' && "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white border-0",
                priority === 'medium' && "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0",
                priority === 'low' && "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0",
                priority === 'achieved' && "bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-600 dark:hover:to-gray-500 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600"
              )}
              size="sm"
            >
              {getButtonText()}
            </Button>

            {isFullyCompleted && (
              <Button
                onClick={() => resetTopicProgress(topic.tema_id, topic.tema_nombre)}
                variant="outline"
                size="sm"
                className="w-full h-8 text-xs border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300 hover:border-red-300 dark:hover:border-red-600 transition-all duration-200"
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
      // Aquí puedes poner el componente de carga que uses
      // Por ejemplo, un componente simple con texto:
      <div className="flex items-center justify-center min-h-screen text-lg text-gray-500 dark:text-gray-400">
        Cargando tus estadísticas... ⏳
      </div>
    );
  }
  
  return (
    <>
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="relative">
          {/* Hero background with decorative elements */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-indigo-600/5 to-purple-600/5 dark:from-blue-400/5 dark:via-indigo-400/5 dark:to-purple-400/5"></div>
          <div className="absolute top-0 left-0 w-72 h-72 bg-gradient-to-br from-blue-400/20 to-indigo-600/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-indigo-400/20 to-purple-600/20 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
          
          <div className="relative p-6">
            <div className="max-w-7xl mx-auto space-y-8">
              {/* Header premium con efectos glassmorphism */}
              <div className="flex items-center justify-between p-6 backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 rounded-2xl shadow-xl shadow-gray-500/10 border border-gray-200/50 dark:border-gray-700/50">
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => window.history.back()} 
                      className="flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors rounded-xl px-3 py-2"
                    >
                      <ArrowLeft className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Volver</span>
                    </Button>
                    <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300 dark:via-gray-600 to-transparent"></div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                        <BarChart3 className="h-6 w-6 text-white" />
                      </div>
                      <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        Análisis por Temas
                      </h1>
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 ml-20 text-lg">
                    Descubre en qué temas necesitas enfocar tu estudio
                  </p>
                </div>
                <div className="flex gap-3">
                  {/* ✅ CAMBIO 5: Se elimina el botón de prueba del JSX. */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={refreshData} 
                    className="flex items-center gap-2 h-10 px-4 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 border border-gray-200 dark:border-gray-700 rounded-xl transition-all duration-200 hover:shadow-md"
                  >
                    <RefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Actualizar</span>
                  </Button>
                </div>
              </div>

              {/* Search and Filter Section */}
              <div className="space-y-4 p-4 backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="Buscar tema por nombre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-11 w-full h-12 text-base rounded-xl"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => setActiveFilter(null)}
                    variant={activeFilter === null ? 'default' : 'outline'}
                    className="rounded-full"
                  >
                    Todos
                  </Button>
                  {filters.map(filter => (
                    <Button
                      key={filter.value}
                      onClick={() => setActiveFilter(activeFilter === filter.value ? null : filter.value)}
                      variant={activeFilter === filter.value ? 'default' : 'outline'}
                      className="rounded-full"
                    >
                      {filter.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Cards de estadísticas premium con animaciones */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="group hover:scale-[1.02] transition-all duration-300 backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 shadow-xl shadow-gray-500/10 border border-gray-200/50 dark:border-gray-700/50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Promedio General</p>
                        <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                          {promedioGeneral}%
                        </p>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${promedioGeneral}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <Target className="h-8 w-8 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="group hover:scale-[1.02] transition-all duration-300 backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 shadow-xl shadow-gray-500/10 border border-gray-200/50 dark:border-gray-700/50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Respondidas</p>
                        <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                          {totalPreguntas}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">preguntas completadas</p>
                      </div>
                      <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <BarChart3 className="h-8 w-8 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="group hover:scale-[1.02] transition-all duration-300 backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 shadow-xl shadow-gray-500/10 border border-gray-200/50 dark:border-gray-700/50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Temas Dominados</p>
                        <p className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                          {temasDominados.length}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">completamente dominados</p>
                      </div>
                      <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300 group-hover:rotate-12">
                        <div className="text-2xl">🏆</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="group hover:scale-[1.02] transition-all duration-300 backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 shadow-xl shadow-gray-500/10 border border-gray-200/50 dark:border-gray-700/50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Necesitan Práctica</p>
                        <p className="text-3xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
                          {temasNecesitanPractica.length}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">requieren atención</p>
                      </div>
                      <div className="p-3 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <div className="text-2xl">📚</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Secciones de temas con diseño premium */}
              <div className="space-y-8">
                {temasNecesitanPractica.length > 0 && (
                  <Card className="backdrop-blur-sm bg-white/95 dark:bg-gray-800/95 shadow-xl shadow-red-500/5 border border-red-200/50 dark:border-red-700/50">
                    <CardHeader className="bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-b border-red-200/50 dark:border-red-700/50">
                      <CardTitle className="flex items-center gap-3 text-xl">
                        <div className="p-2 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl shadow-lg">
                          <div className="text-xl">📚</div>
                        </div>
                        <span className="bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent font-bold">
                          Necesitan Práctica
                        </span>
                        <div className="ml-auto flex items-center gap-2">
                          <div className="text-xs text-red-600 dark:text-red-400 font-medium">PRIORIDAD ALTA</div>
                          <Badge className="bg-gradient-to-r from-red-500 to-rose-600 text-white border-0 font-semibold shadow-lg">
                            {temasNecesitanPractica.length}
                          </Badge>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {temasNecesitanPractica.map((topic) => (
                          <TopicCard key={topic.tema_id} topic={topic} priority="high" />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {temasEnProgreso.length > 0 && (
                  <Card className="backdrop-blur-sm bg-white/95 dark:bg-gray-800/95 shadow-xl shadow-green-500/5 border border-green-200/50 dark:border-green-700/50">
                    <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-b border-green-200/50 dark:border-green-700/50">
                      <CardTitle className="flex items-center gap-3 text-xl">
                        <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                          <div className="text-xl">📈</div>
                        </div>
                        <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent font-bold">
                          En Progreso
                        </span>
                        <div className="ml-auto flex items-center gap-2">
                          <div className="text-xs text-green-600 dark:text-green-400 font-medium">AVANZANDO</div>
                          <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 font-semibold shadow-lg">
                            {temasEnProgreso.length}
                          </Badge>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {temasEnProgreso.map((topic) => (
                          <TopicCard key={topic.tema_id} topic={topic} priority="medium" />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {temasCasiDominados.length > 0 && (
                  <Card className="backdrop-blur-sm bg-white/95 dark:bg-gray-800/95 shadow-xl shadow-blue-500/5 border border-blue-200/50 dark:border-blue-700/50">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-blue-200/50 dark:border-blue-700/50">
                      <CardTitle className="flex items-center gap-3 text-xl">
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                          <div className="text-xl">⭐</div>
                        </div>
                        <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent font-bold">
                          Casi Dominados
                        </span>
                        <div className="ml-auto flex items-center gap-2">
                          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">CERCA DEL ÉXITO</div>
                          <Badge className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0 font-semibold shadow-lg">
                            {temasCasiDominados.length}
                          </Badge>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {temasCasiDominados.map((topic) => (
                          <TopicCard key={topic.tema_id} topic={topic} priority="low" />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {temasDominados.length > 0 && (
                  <Card className="backdrop-blur-sm bg-white/95 dark:bg-gray-800/95 shadow-xl shadow-yellow-500/5 border border-yellow-200/50 dark:border-yellow-700/50">
                    <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-b border-yellow-200/50 dark:border-yellow-700/50">
                      <CardTitle className="flex items-center gap-3 text-xl">
                        <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl shadow-lg animate-pulse">
                          <div className="text-xl">🏆</div>
                        </div>
                        <span className="bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent font-bold">
                          Temas Dominados
                        </span>
                        <div className="ml-auto flex items-center gap-2">
                          <div className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">¡COMPLETADOS!</div>
                          <Badge className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white border-0 font-semibold shadow-lg">
                            {temasDominados.length}
                          </Badge>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {temasDominados.map((topic) => (
                          <TopicCard key={topic.tema_id} topic={topic} priority="achieved" />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {topicStats.length > 0 && 
                  temasNecesitanPractica.length === 0 && 
                  temasEnProgreso.length === 0 && 
                  temasCasiDominados.length === 0 && 
                  temasDominados.length === 0 && (
                  <Card className="backdrop-blur-sm bg-white/95 dark:bg-gray-800/95 shadow-xl shadow-gray-500/10 border border-gray-200/50 dark:border-gray-700/50">
                    <CardContent className="flex items-center justify-center p-16">
                      <div className="text-center space-y-6 max-w-md">
                        <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full flex items-center justify-center mb-4">
                          <Search className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-xl font-bold bg-gradient-to-r from-gray-700 to-gray-900 dark:from-gray-200 dark:to-gray-100 bg-clip-text text-transparent">
                          No se encontraron temas
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                          Prueba con otro término de búsqueda o un filtro diferente.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {topicStats.length === 0 && (
                  <Card className="backdrop-blur-sm bg-white/95 dark:bg-gray-800/95 shadow-xl shadow-gray-500/10 border border-gray-200/50 dark:border-gray-700/50">
                    <CardContent className="flex items-center justify-center p-16">
                      <div className="text-center space-y-6 max-w-md">
                        <div className="relative">
                          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full flex items-center justify-center mb-4">
                            <BookOpen className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white text-lg animate-bounce">
                            ✨
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-xl font-bold bg-gradient-to-r from-gray-700 to-gray-900 dark:from-gray-200 dark:to-gray-100 bg-clip-text text-transparent">
                            No hay datos disponibles
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                            Completa algunos tests para ver tu análisis por temas y descubrir en qué áreas necesitas mejorar
                          </p>
                        </div>
                        <Button 
                          onClick={() => navigate("/test-setup")}
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 h-12 px-8 rounded-xl font-semibold"
                        >
                          <PlayCircle className="mr-2 h-5 w-5" />
                          Hacer un Test
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
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