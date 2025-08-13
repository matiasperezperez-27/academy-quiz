import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Trophy, 
  TrendingUp, 
  Target, 
  RotateCcw, 
  Home, 
  BookOpen,
  Award,
  AlertCircle,
  ArrowLeft,
  Play,
  CheckCircle,
  BarChart3
} from "lucide-react";

interface ResultsState {
  score: number;
  total: number;
  mode?: "test" | "practice";
  timeSpent?: number;
  questionsCorrect?: string[];
  questionsIncorrect?: string[];
  // NUEVOS campos para el sistema de progreso
  remainingQuestionsInTopic?: number;
  academiaId?: string;
  temaId?: string;
  percentage?: number;
  pointsEarned?: number;
  averageTimePerQuestion?: number;
  // 🆕 NUEVAS PROPIEDADES PARA SOLUCIONAR EL BUG
  originalFailedQuestionsCount?: number;
  questionsStillFailed?: string[];
  // 🆕 NUEVA PROPIEDAD PARA REPETIR TEST
  originalQuestionIds?: string[];
}

interface PerformanceLevel {
  title: string;
  description: string;
  color: string;
  icon: React.ReactNode;
  bgColor: string;
}

function setSEO(title: string, description: string) {
  document.title = title;
  const meta = document.querySelector('meta[name="description"]') || document.createElement("meta");
  meta.setAttribute("name", "description");
  meta.setAttribute("content", description);
  document.head.appendChild(meta);
}

const getPerformanceLevel = (percentage: number): PerformanceLevel => {
  if (percentage >= 90) {
    return {
      title: "¡Excelente!",
      description: "Dominas completamente este tema",
      color: "text-green-600",
      icon: <Trophy className="h-6 w-6" />,
      bgColor: "bg-green-50 border-green-200"
    };
  } else if (percentage >= 75) {
    return {
      title: "¡Muy Bien!",
      description: "Tienes un buen dominio del tema",
      color: "text-blue-600",
      icon: <Award className="h-6 w-6" />,
      bgColor: "bg-blue-50 border-blue-200"
    };
  } else if (percentage >= 60) {
    return {
      title: "Bien",
      description: "Vas por buen camino, sigue practicando",
      color: "text-yellow-600",
      icon: <Target className="h-6 w-6" />,
      bgColor: "bg-yellow-50 border-yellow-200"
    };
  } else if (percentage >= 40) {
    return {
      title: "Puedes Mejorar",
      description: "Necesitas repasar algunos conceptos",
      color: "text-orange-600",
      icon: <TrendingUp className="h-6 w-6" />,
      bgColor: "bg-orange-50 border-orange-200"
    };
  } else {
    return {
      title: "Sigue Estudiando",
      description: "Te recomendamos repasar este tema",
      color: "text-red-600",
      icon: <AlertCircle className="h-6 w-6" />,
      bgColor: "bg-red-50 border-red-200"
    };
  }
};

const getEncouragementMessage = (percentage: number, mode: string, remainingQuestions?: number): string => {
  if (mode === "practice") {
    if (percentage >= 80) {
      return "¡Excelente! Has mejorado significativamente en tus preguntas falladas.";
    } else if (percentage >= 60) {
      return "Buen progreso. Sigue practicando para dominar completamente estos temas.";
    } else {
      return "No te desanimes. La práctica constante es la clave del éxito.";
    }
  } else {
    if (remainingQuestions !== undefined && remainingQuestions <= 0) {
      return "¡Increíble! Has completado todas las preguntas de este tema correctamente. ¡Eres un experto!";
    } else if (percentage >= 80) {
      return "¡Impresionante! Tienes un excelente dominio de este tema.";
    } else if (percentage >= 60) {
      return "¡Bien hecho! Estás en el camino correcto hacia el dominio del tema.";
    } else {
      return "Cada error es una oportunidad de aprender. ¡No te rindas!";
    }
  }
};

export default function Results() {
  const navigate = useNavigate();
  const location = useLocation() as { state?: ResultsState };
  
  // 🎯 OBTENER TEMA_ID DE LA URL COMO BACKUP
  const urlParams = new URLSearchParams(window.location.search);
  const urlTemaId = urlParams.get('tema');
  
  const {
    score = 0,
    total = 10,
    mode = "test",
    timeSpent,
    questionsCorrect = [],
    questionsIncorrect = [],
    remainingQuestionsInTopic = 0,
    academiaId,
    temaId,
    percentage: providedPercentage,
    pointsEarned = 0,
    averageTimePerQuestion = 0,
    originalFailedQuestionsCount = 0,
    questionsStillFailed = [],
    originalQuestionIds = []
  } = location.state || {};

  // 🎯 USAR TEMA_ID DE URL COMO BACKUP
  const finalTemaId = temaId || urlTemaId;

  // 🎯 NUEVA LÓGICA: Detectar si viene de análisis por temas
  const isFromTopicAnalysis = originalFailedQuestionsCount > 0;

  useEffect(() => {
    setSEO(
      "Resultados del Quiz | Academy Quiz", 
      `Has completado el ${mode === "practice" ? "modo práctica" : "test"} con ${score} aciertos de ${total} preguntas.`
    );
  }, [score, total, mode]);

  const percentage = useMemo(() => 
    providedPercentage || (total > 0 ? Math.round((score / total) * 100) : 0), 
    [score, total, providedPercentage]
  );

  const performance = useMemo(() => 
    getPerformanceLevel(percentage), 
    [percentage]
  );

  const encouragementMessage = useMemo(() => 
    getEncouragementMessage(percentage, mode, remainingQuestionsInTopic), 
    [percentage, mode, remainingQuestionsInTopic]
  );

  // 🔧 FIX: Usar las preguntas que realmente siguen falladas, no calcular incorrectCount
  const actualFailedCount = mode === "practice" && originalFailedQuestionsCount 
    ? questionsStillFailed.length // Preguntas que siguen falladas después de esta sesión
    : total - score; // Para modo test normal, usar el cálculo tradicional

  const shouldShowPracticeButton = mode === "test" && (
    (originalFailedQuestionsCount > 0 && questionsStillFailed.length > 0) || // Modo práctica con errores restantes
    (originalFailedQuestionsCount === 0 && actualFailedCount > 0) // Modo test normal con nuevos errores
  );

  // NUEVA LÓGICA: Determinar si mostrar botón "Continuar con 10 más"
  const canContinueWithMore = useMemo(() => {
    return mode === "test" && 
           academiaId && 
           temaId && 
           remainingQuestionsInTopic !== undefined && 
           remainingQuestionsInTopic > 0 &&
           !isFromTopicAnalysis; // No mostrar si viene de análisis por temas
  }, [mode, academiaId, temaId, remainingQuestionsInTopic, isFromTopicAnalysis]);

  // 🆕 NUEVA FUNCIÓN: Repetir el mismo test de análisis por temas
  const handleRepeatTopicTest = () => {
    console.log("🔄 REPETIR TEST - Debug:");
    console.log("- academiaId:", academiaId);
    console.log("- temaId:", temaId);
    console.log("- finalTemaId:", finalTemaId);
    console.log("- originalFailedQuestionsCount:", originalFailedQuestionsCount);
    console.log("- questionsStillFailed:", questionsStillFailed);
    console.log("- originalQuestionIds:", originalQuestionIds);

    // 🎯 SIMPLIFICADO: Solo necesitamos temaId y las preguntas originales
    if (finalTemaId && originalQuestionIds && originalQuestionIds.length > 0) {
      // Opción 1: Si aún hay preguntas falladas específicas de esta sesión
      if (questionsStillFailed && questionsStillFailed.length > 0) {
        const questionIds = questionsStillFailed.join(',');
        console.log("🔄 Opción 1: Repetir con preguntas que siguen falladas:", questionIds);
        window.location.href = `/quiz?mode=practice&tema=${finalTemaId}&questions=${questionIds}`;
      }
      // Opción 2: Repetir con las preguntas originales del análisis
      else {
        const questionIds = originalQuestionIds.join(',');
        console.log("🔄 Opción 2: Repetir con preguntas originales:", questionIds);
        window.location.href = `/quiz?mode=practice&tema=${finalTemaId}&questions=${questionIds}`;
      }
    } 
    // Fallback: Si tenemos academiaId y temaId, hacer test normal
    else if (academiaId && finalTemaId) {
      console.log("🔄 Opción 3: Test normal del tema");
      window.location.href = `/quiz?mode=test&academia=${academiaId}&tema=${finalTemaId}`;
    }
    // Error: No tenemos suficientes datos
    else {
      console.log("🔄 ERROR: Faltan datos necesarios");
      console.log("- Necesitamos: finalTemaId Y originalQuestionIds");
      console.log("- O al menos: academiaId Y finalTemaId");
      
      // Como último recurso, ir al análisis por temas
      navigate("/analisis-temas");
    }
  };

  // NUEVA FUNCIÓN: Continuar con más preguntas del mismo tema (para tests normales)
  const handleContinueWithMore = () => {
    if (academiaId && temaId) {
      navigate(`/quiz?mode=test&academia=${academiaId}&tema=${temaId}`);
    }
  };

  // If no state data, redirect to home
  useEffect(() => {
    if (!location.state) {
      navigate("/", { replace: true });
    }
  }, [location.state, navigate]);

  if (!location.state) {
    return null;
  }

  return (
    <main className="min-h-screen p-4 flex items-center justify-center bg-background">
      <div className="w-full max-w-2xl space-y-6">
        
        {/* Header with Back Button */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          <Badge variant="outline" className="px-3 py-1">
            <BookOpen className="h-3 w-3 mr-1" />
            {mode === "practice" ? "Modo Práctica" : "Modo Test"}
          </Badge>
        </div>

        {/* NUEVO: Banner de completado total si aplica */}
        {remainingQuestionsInTopic !== undefined && remainingQuestionsInTopic <= 0 && mode === "test" && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center space-x-3 text-green-700">
                <CheckCircle className="h-6 w-6" />
                <div className="text-center">
                  <p className="font-semibold">¡Tema Completado!</p>
                  <p className="text-sm">Has respondido correctamente todas las preguntas de este tema</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Main Results Card */}
        <Card className="w-full">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className={`p-4 rounded-full ${performance.bgColor} border-2`}>
                <div className={performance.color}>
                  {performance.icon}
                </div>
              </div>
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-bold">
              {performance.title}
            </CardTitle>
            <p className="text-muted-foreground text-base">
              {performance.description}
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Score Display */}
            <div className="text-center space-y-4">
              <div className="space-y-2">
                <div className="text-4xl sm:text-6xl font-bold">
                  <span className="text-primary">{score}</span>
                  <span className="text-2xl sm:text-3xl text-muted-foreground">/{total}</span>
                </div>
                <div className="space-y-2">
                  <Progress value={percentage} className="h-3" />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>0%</span>
                    <span className="font-medium">{percentage}%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-600">{score}</div>
                <div className="text-sm text-green-700">Correctas</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="text-2xl font-bold text-red-600">{actualFailedCount}</div>
                <div className="text-sm text-red-700">Incorrectas</div>
              </div>
            </div>

            {/* NUEVA: Stats adicionales si están disponibles */}
            {(pointsEarned > 0 || averageTimePerQuestion > 0) && (
              <div className="grid grid-cols-2 gap-4">
                {pointsEarned > 0 && (
                  <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-2xl font-bold text-blue-600">{pointsEarned}</div>
                    <div className="text-sm text-blue-700">Puntos</div>
                  </div>
                )}
                {averageTimePerQuestion > 0 && (
                  <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-2xl font-bold text-purple-600">{averageTimePerQuestion}s</div>
                    <div className="text-sm text-purple-700">Promedio</div>
                  </div>
                )}
              </div>
            )}

            {/* NUEVA: Información de progreso del tema */}
            {remainingQuestionsInTopic !== undefined && mode === "test" && !isFromTopicAnalysis && (
              <div className="bg-muted/30 p-4 rounded-lg border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-blue-700">Progreso del Tema</p>
                    <p className="text-sm text-muted-foreground">
                      {remainingQuestionsInTopic > 0 
                        ? `Quedan ${remainingQuestionsInTopic} preguntas por dominar`
                        : "¡Has dominado todas las preguntas de este tema!"
                      }
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600">
                      {remainingQuestionsInTopic > 0 ? remainingQuestionsInTopic : "✓"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Mode Badge */}
            <div className="flex justify-center">
              <div className="text-center text-sm text-muted-foreground">
                Completado el {new Date().toLocaleDateString('es-ES')}
              </div>
            </div>

            {/* Encouragement Message */}
            <div className="bg-muted/30 p-4 rounded-lg border-l-4 border-primary">
              <p className="text-sm text-center italic">
                {encouragementMessage}
              </p>
            </div>

            {/* Time Spent (if available) */}
            {timeSpent && (
              <div className="text-center text-sm text-muted-foreground">
                Tiempo empleado: {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons - NUEVA LÓGICA SEGÚN ORIGEN */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {/* NUEVA: Lógica condicional según origen */}
              {isFromTopicAnalysis ? (
                // 🎯 BOTONES PARA ANÁLISIS POR TEMAS
                <>
                  <Button 
                    onClick={() => navigate("/analisis-temas")}
                    className="w-full"
                    size="lg"
                    variant="default"
                  >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Ver Análisis por Temas
                  </Button>
                  
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button 
                      onClick={handleRepeatTopicTest}
                      variant="outline"
                      className="w-full"
                      size="sm"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Repetir Test
                    </Button>
                    
                    <Button 
                      onClick={() => navigate("/")}
                      variant="outline"
                      className="w-full"
                      size="sm"
                    >
                      <Home className="mr-2 h-4 w-4" />
                      Inicio
                    </Button>
                  </div>

                  {/* Mostrar info sobre preguntas restantes si las hay */}
                  {questionsStillFailed.length > 0 && (
                    <div className="text-center text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                      <span>📚 Aún tienes {questionsStillFailed.length} pregunta{questionsStillFailed.length > 1 ? 's' : ''} de este tema para practicar</span>
                    </div>
                  )}
                </>
              ) : (
                // 🔄 BOTONES PARA TESTS NORMALES (lógica original)
                <>
                  {/* NUEVA: Botón "Continuar con 10 más" */}
                  {canContinueWithMore && (
                    <Button 
                      onClick={handleContinueWithMore}
                      className="w-full"
                      size="lg"
                      variant="default"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Continuar con 10 más ({remainingQuestionsInTopic} restantes)
                    </Button>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button 
                      onClick={() => navigate("/")}
                      variant={canContinueWithMore ? "outline" : "default"}
                      className="w-full"
                      size="lg"
                    >
                      <Home className="mr-2 h-4 w-4" />
                      Ir al Inicio
                    </Button>
                    
                    <Button 
                      onClick={() => navigate("/test-setup")}
                      variant="outline"
                      className="w-full"
                      size="lg"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Nuevo Test
                    </Button>
                  </div>

                  {/* Practice Button (if there are incorrect answers and it's test mode) */}
                  {shouldShowPracticeButton && (
                    <Button 
                      onClick={() => navigate("/practice")}
                      variant="secondary"
                      className="w-full"
                      size="lg"
                    >
                      <BookOpen className="mr-2 h-4 w-4" />
                      {originalFailedQuestionsCount > 0 
                        ? `Seguir Practicando (${questionsStillFailed.length} restantes)`
                        : `Practicar Preguntas Falladas (${actualFailedCount})`
                      }
                    </Button>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Additional Stats (if available) */}
        {(questionsCorrect.length > 0 || questionsIncorrect.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detalles del Quiz</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {questionsCorrect.length > 0 && (
                <div>
                  <h4 className="font-medium text-green-600 mb-2">
                    Preguntas Correctas ({questionsCorrect.length})
                  </h4>
                  <div className="space-y-1">
                    {questionsCorrect.slice(0, 3).map((q, index) => (
                      <p key={index} className="text-sm text-muted-foreground truncate">
                        • {q}
                      </p>
                    ))}
                    {questionsCorrect.length > 3 && (
                      <p className="text-sm text-muted-foreground">
                        ... y {questionsCorrect.length - 3} más
                      </p>
                    )}
                  </div>
                </div>
              )}

              {questionsIncorrect.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-600 mb-2">
                    Preguntas a Repasar ({questionsIncorrect.length})
                  </h4>
                  <div className="space-y-1">
                    {questionsIncorrect.slice(0, 3).map((q, index) => (
                      <p key={index} className="text-sm text-muted-foreground truncate">
                        • {q}
                      </p>
                    ))}
                    {questionsIncorrect.length > 3 && (
                      <p className="text-sm text-muted-foreground">
                        ... y {questionsIncorrect.length - 3} más
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            {remainingQuestionsInTopic !== undefined && remainingQuestionsInTopic <= 0 
              ? "¡Has dominado este tema completamente!" 
              : "¡Sigue practicando para mejorar tus resultados!"
            }
          </p>
        </div>
      </div>
    </main>
  );
}
