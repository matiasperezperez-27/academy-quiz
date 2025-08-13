import React, { useState } from "react";
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
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTopicAnalysis } from "@/hooks/useTopicAnalysis";

export default function TopicAnalysisPage() {
  const navigate = (path: string) => {
    window.location.href = path;
  };

  const { 
    topicStats, 
    academias, 
    loading, 
    refreshData 
  } = useTopicAnalysis();

  const getNivelColor = (nivel: string) => {
    switch (nivel) {
      case 'Dominado': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'Casi Dominado': return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'En Progreso': return 'text-green-600 bg-green-100 border-green-200';
      case 'Necesita Práctica': return 'text-red-600 bg-red-100 border-red-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getProgressColor = (porcentaje: number) => {
    if (porcentaje >= 95) return 'bg-yellow-500';
    if (porcentaje >= 85) return 'bg-blue-500';  
    if (porcentaje >= 70) return 'bg-green-500'; 
    return 'bg-red-500';
  };

  const getNivelIcon = (nivel: string) => {
    switch (nivel) {
      case 'Dominado': return '🏆';
      case 'Casi Dominado': return '⭐';
      case 'En Progreso': return '📈';
      case 'Necesita Práctica': return '📚';
      default: return '❓';
    }
  };

  const handlePracticeClick = (temaId: string, academiaId: string, preguntasFalladas: string[]) => {
    if (preguntasFalladas.length === 0) {
      window.location.href = `/quiz?mode=test&academia=${academiaId}&tema=${temaId}`;
    } else {
      const questionIds = preguntasFalladas.join(',');
      window.location.href = `/quiz?mode=practice&tema=${temaId}&questions=${questionIds}`;
    }
  };

  // Agrupar temas por estado
  const temasDominados = topicStats.filter(topic => topic.nivel_dominio === 'Dominado');
  const temasCasiDominados = topicStats.filter(topic => topic.nivel_dominio === 'Casi Dominado');
  const temasEnProgreso = topicStats.filter(topic => topic.nivel_dominio === 'En Progreso');
  const temasNecesitanPractica = topicStats.filter(topic => topic.nivel_dominio === 'Necesita Práctica');

  // Calcular estadísticas generales
  const totalPreguntas = topicStats.reduce((sum, topic) => sum + topic.total_respondidas, 0);
  const totalCorrectas = topicStats.reduce((sum, topic) => sum + topic.total_correctas, 0);
  const promedioGeneral = totalPreguntas > 0 ? Math.round((totalCorrectas / totalPreguntas) * 100) : 0;

  const TopicCard = ({ topic, priority }: { topic: any; priority: 'high' | 'medium' | 'low' | 'achieved' }) => {
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
      if (priority === 'achieved') {
        return (
          <>
            <RefreshCw className="mr-2 h-4 w-4" />
            Repasar
          </>
        );
      }
      
      if (topic.preguntas_falladas_ids.length > 0) {
        return (
          <>
            <BookOpen className="mr-2 h-4 w-4" />
            Practicar ({topic.preguntas_falladas_ids.length} errores)
          </>
        );
      }
      
      return (
        <>
          <PlayCircle className="mr-2 h-4 w-4" />
          Hacer Test
        </>
      );
    };

    return (
      <Card className={cn("transition-all duration-200", getBorderStyle())}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <CardTitle className="text-base leading-tight flex items-center gap-2">
                <span className="text-lg">{getNivelIcon(topic.nivel_dominio)}</span>
                {topic.tema_nombre}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {topic.academia_nombre}
              </p>
            </div>
            <Badge 
              variant="outline" 
              className={cn("text-xs", getNivelColor(topic.nivel_dominio))}
            >
              {topic.nivel_dominio}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Progreso Visual */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Precisión</span>
              <span className="font-semibold">{topic.porcentaje_acierto}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className={cn("h-2 rounded-full transition-all", getProgressColor(topic.porcentaje_acierto))}
                style={{ width: `${topic.porcentaje_acierto}%` }}
              />
            </div>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-sm font-bold">{topic.total_respondidas}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-green-600">Correctas</p>
              <p className="text-sm font-bold text-green-600">{topic.total_correctas}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-red-600">Errores</p>
              <p className="text-sm font-bold text-red-600">{topic.total_incorrectas}</p>
            </div>
          </div>

          {/* Info adicional */}
          {topic.intentos_totales && (
            <div className="text-xs text-muted-foreground">
              <span>Intentos: {topic.intentos_totales}</span>
              {topic.dias_sin_repasar < 30 && (
                <span className="ml-4">Hace {topic.dias_sin_repasar} días</span>
              )}
            </div>
          )}

          {/* Botón de Acción */}
          <Button
            onClick={() => handlePracticeClick(
              topic.tema_id, 
              topic.academia_id, 
              topic.preguntas_falladas_ids
            )}
            className="w-full"
            variant={getButtonVariant()}
            size="sm"
          >
            {getButtonText()}
          </Button>
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

  return (
    <main className="min-h-screen p-4 bg-background">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.history.back()}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
              <h1 className="text-2xl sm:text-3xl font-bold">
                📊 Análisis por Temas
              </h1>
            </div>
            <p className="text-muted-foreground">
              Descubre en qué temas necesitas enfocar tu estudio
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshData}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        </div>

        {/* Estadísticas Generales */}
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

        {/* Sistema de Niveles - Compacto y Colapsible */}
        <Card className="border-dashed border-2 border-muted">
          <CardContent className="p-3">
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                <span className="flex items-center gap-2">
                  <div className="text-xs">ℹ️</div>
                  ¿Cómo funcionan los niveles?
                </span>
                <div className="transform transition-transform group-open:rotate-180">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </summary>
              
              <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                  <span>🏆</span>
                  <div>
                    <div className="font-medium text-yellow-700">Dominado</div>
                    <div className="text-yellow-600">≥95% + 2 tests</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-200">
                  <span>⭐</span>
                  <div>
                    <div className="font-medium text-blue-700">Casi Dominado</div>
                    <div className="text-blue-600">≥85% + 3 tests</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                  <span>📈</span>
                  <div>
                    <div className="font-medium text-green-700">En Progreso</div>
                    <div className="text-green-600">≥70%</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 p-2 bg-red-50 rounded border border-red-200">
                  <span>📚</span>
                  <div>
                    <div className="font-medium text-red-700">Necesita Práctica</div>
                    <div className="text-red-600">&lt;70%</div>
                  </div>
                </div>
              </div>

              <div className="mt-2 text-xs text-muted-foreground text-center">
                <span>💡 Los niveles se actualizan automáticamente según tu progreso</span>
              </div>
            </details>
          </CardContent>
        </Card>

        {/* Secciones por Estado de Dominio */}
        <div className="space-y-6">
          {/* 🔥 SECCIÓN: NECESITAN PRÁCTICA */}
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

          {/* 📈 SECCIÓN: EN PROGRESO */}
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

          {/* ⭐ SECCIÓN: CASI DOMINADOS */}
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

          {/* 🏆 SECCIÓN: DOMINADOS */}
          {temasDominados.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-yellow-600">
                  🏆 Temas Dominados
                  <Badge variant="secondary" className="ml-auto bg-yellow-100 text-yellow-700">
                    {temasDominados.length}
                  </Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  ¡Felicidades! Has dominado estos temas con excelencia
                </p>
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

          {/* Mensaje si no hay datos */}
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

        {/* Resumen Final */}
        {topicStats.length > 0 && (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">🎯 Tu Progreso General</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="text-2xl font-bold text-yellow-600">{temasDominados.length}</div>
                    <div className="text-xs text-yellow-700">🏆 Dominados</div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-2xl font-bold text-blue-600">{temasCasiDominados.length}</div>
                    <div className="text-xs text-blue-700">⭐ Casi Dominados</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-600">{temasEnProgreso.length}</div>
                    <div className="text-xs text-green-700">📈 En Progreso</div>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="text-2xl font-bold text-red-600">{temasNecesitanPractica.length}</div>
                    <div className="text-xs text-red-700">📚 Necesitan Práctica</div>
                  </div>
                </div>

                <p className="text-muted-foreground">
                  {temasDominados.length > 0 
                    ? `¡Excelente! Has dominado ${temasDominados.length} tema${temasDominados.length > 1 ? 's' : ''}. `
                    : ""
                  }
                  {temasNecesitanPractica.length > 0 
                    ? `Tienes ${temasNecesitanPractica.length} tema${temasNecesitanPractica.length > 1 ? 's' : ''} que necesita${temasNecesitanPractica.length > 1 ? 'n' : ''} más práctica.`
                    : "¡Increíble! No tienes temas pendientes."
                  }
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {temasNecesitanPractica.length > 0 && (
                    <Button onClick={() => navigate("/practice")} className="bg-red-600 hover:bg-red-700">
                      <BookOpen className="mr-2 h-4 w-4" />
                      Practicar Urgentes ({temasNecesitanPractica.length})
                    </Button>
                  )}
                  
                  <Button onClick={() => navigate("/test-setup")} variant="outline">
                    <Target className="mr-2 h-4 w-4" />
                    Nuevo Test
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}