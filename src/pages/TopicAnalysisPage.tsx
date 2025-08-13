import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  BookOpen, 
  Target, 
  TrendingDown, 
  TrendingUp, 
  PlayCircle, 
  BarChart3,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  RefreshCw
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
    filters, 
    setFilters, 
    refreshData 
  } = useTopicAnalysis();

  const getNivelColor = (nivel: string) => {
    switch (nivel) {
      case 'Excelente': return 'text-green-600 bg-green-100 border-green-200';
      case 'Bueno': return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'Regular': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'Necesita práctica': return 'text-red-600 bg-red-100 border-red-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getProgressColor = (porcentaje: number) => {
    if (porcentaje >= 90) return 'bg-green-500';
    if (porcentaje >= 75) return 'bg-blue-500';
    if (porcentaje >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

// En TopicAnalysisPage.tsx, modificar handlePracticeClick:
const handlePracticeClick = (temaId: string, academiaId: string, preguntasFalladas: string[]) => {
  if (preguntasFalladas.length === 0) {
    // Si no hay preguntas falladas específicas, ir a test normal
    window.location.href = `/quiz?mode=test&academia=${academiaId}&tema=${temaId}`;
  } else {
    // 🆕 NUEVA LÓGICA: Pasar IDs específicos como parámetro de consulta
    const questionIds = preguntasFalladas.join(',');
    window.location.href = `/quiz?mode=practice&tema=${temaId}&questions=${questionIds}`;
  }
};

  // Calcular estadísticas generales
  const totalPreguntas = topicStats.reduce((sum, topic) => sum + topic.total_respondidas, 0);
  const totalCorrectas = topicStats.reduce((sum, topic) => sum + topic.total_correctas, 0);
  const totalIncorrectas = topicStats.reduce((sum, topic) => sum + topic.total_incorrectas, 0);
  const promedioGeneral = totalPreguntas > 0 ? Math.round((totalCorrectas / totalPreguntas) * 100) : 0;

  const temasConErrores = topicStats.filter(topic => topic.total_incorrectas > 0).length;
  const temasDominados = topicStats.filter(topic => topic.porcentaje_acierto >= 90).length;

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
                  <p className="text-2xl font-bold text-green-600">{temasDominados}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Necesitan Práctica</p>
                  <p className="text-2xl font-bold text-red-600">{temasConErrores}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              Filtros y Ordenación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium">Academia</label>
                <Select
                  value={filters.academia_id || 'all'}
                  onValueChange={(value) => 
                    setFilters(prev => ({ 
                      ...prev, 
                      academia_id: value === 'all' ? undefined : value 
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las academias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las academias</SelectItem>
                    {academias.map(academia => (
                      <SelectItem key={academia.id} value={academia.id}>
                        {academia.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ordenar por</label>
                <Select
                  value={filters.ordenar_por}
                  onValueChange={(value: any) => 
                    setFilters(prev => ({ ...prev, ordenar_por: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="porcentaje_asc">Menor porcentaje primero</SelectItem>
                    <SelectItem value="porcentaje_desc">Mayor porcentaje primero</SelectItem>
                    <SelectItem value="incorrectas_desc">Más errores primero</SelectItem>
                    <SelectItem value="total_desc">Más preguntas primero</SelectItem>
                    <SelectItem value="nombre">Nombre A-Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="solo-errores"
                  checked={filters.solo_con_errores}
                  onCheckedChange={(checked) =>
                    setFilters(prev => ({ ...prev, solo_con_errores: !!checked }))
                  }
                />
                <label
                  htmlFor="solo-errores"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Solo temas con errores
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Temas */}
        {topicStats.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center p-12">
              <div className="text-center space-y-4">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold">No hay datos disponibles</h3>
                  <p className="text-muted-foreground">
                    {filters.solo_con_errores 
                      ? "No hay temas con errores para mostrar"
                      : "Completa algunos tests para ver tu análisis por temas"}
                  </p>
                </div>
                <Button onClick={() => navigate("/test-setup")}>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Hacer un Test
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topicStats.map((topic) => (
              <Card key={topic.tema_id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-base leading-tight">
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

                  {/* Última Actividad */}
                  {topic.ultima_respuesta && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        Última vez: {new Date(topic.ultima_respuesta).toLocaleDateString('es-ES')}
                      </span>
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
                    variant={topic.total_incorrectas > 0 ? "default" : "secondary"}
                    size="sm"
                  >
                    {topic.total_incorrectas > 0 ? (
                      <>
                        <BookOpen className="mr-2 h-4 w-4" />
                        Practicar ({topic.preguntas_falladas_ids.length} errores)
                      </>
                    ) : (
                      <>
                        <PlayCircle className="mr-2 h-4 w-4" />
                        Hacer Test
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Resumen Final */}
        {topicStats.length > 0 && (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">🎯 Recomendación de Estudio</h3>
                <p className="text-muted-foreground">
                  {temasConErrores > 0 
                    ? `Tienes ${temasConErrores} temas que necesitan práctica. ¡Enfócate en los que tienen menor porcentaje para mejorar más rápido!`
                    : "¡Excelente! No tienes temas pendientes. Sigue practicando para mantener tu nivel."
                  }
                </p>
                {temasConErrores > 0 && (
                  <Button onClick={() => navigate("/practice")}>
                    <BookOpen className="mr-2 h-4 w-4" />
                    Practicar Todas las Preguntas Fallidas
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}