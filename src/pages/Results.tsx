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
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="relative">
        {/* Hero background with decorative elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-indigo-600/5 to-purple-600/5 dark:from-blue-400/5 dark:via-indigo-400/5 dark:to-purple-400/5"></div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-indigo-600/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-400/20 to-purple-600/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
        
        <div className="relative p-4 sm:p-6">
          <div className="w-full max-w-4xl mx-auto space-y-8">
        
        {/* Header with premium styling */}
        <div className="flex items-center justify-between p-4 sm:p-6 backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 rounded-2xl shadow-xl shadow-gray-500/10 border border-gray-200/50 dark:border-gray-700/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors rounded-xl px-3 py-2"
          >
            <ArrowLeft className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Volver</span>
          </Button>
          <Badge 
            variant="outline" 
            className="px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-xl"
          >
            <BookOpen className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
            <span className="font-medium text-blue-700 dark:text-blue-300">
              {mode === "practice" ? "Modo Práctica" : "Modo Test"}
            </span>
          </Badge>
        </div>

        {/* Banner de completado con premium styling */}
        {remainingQuestionsInTopic !== undefined && remainingQuestionsInTopic <= 0 && mode === "test" && (
          <Card className="backdrop-blur-sm bg-gradient-to-r from-green-50/80 to-emerald-50/50 dark:from-green-900/30 dark:to-emerald-900/20 border border-green-200/50 dark:border-green-700/50 shadow-lg shadow-green-500/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center space-x-4 text-green-700 dark:text-green-300">
                <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full shadow-lg">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-lg">¡Tema Completado!</p>
                  <p className="text-sm font-medium">Has respondido correctamente todas las preguntas de este tema</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Main Results Card */}
        <Card className="backdrop-blur-sm bg-white/95 dark:bg-gray-800/95 shadow-2xl shadow-gray-500/20 border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-gray-200/50 dark:border-gray-700/50 text-center pb-6">
            <div className="flex justify-center mb-6">
              <div className={`p-6 rounded-full border-4 shadow-xl ${performance.bgColor} border-opacity-50`}>
                <div className={performance.color}>
                  {performance.icon}
                </div>
              </div>
            </div>
            <CardTitle className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {performance.title}
            </CardTitle>
            <p className="text-gray-600 dark:text-gray-400 text-lg font-medium mt-2">
              {performance.description}
            </p>
          </CardHeader>
          
          <CardContent className="p-8 space-y-8">
            {/* Score Display */}
            <div className="text-center space-y-6">
              <div className="space-y-4">
                <div className="relative">
                  <div className="text-6xl sm:text-8xl font-bold">
                    <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{score}</span>
                    <span className="text-3xl sm:text-4xl text-gray-400 dark:text-gray-500">/{total}</span>
                  </div>
                  {/* Efecto de brillo */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-indigo-600/20 rounded-full blur-3xl -z-10"></div>
                </div>
                
                <div className="space-y-4">
                  <div className="relative">
                    <Progress 
                      value={percentage}
                      className="h-4 rounded-full shadow-inner bg-gray-200 dark:bg-gray-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent rounded-full pointer-events-none"></div>
                  </div>
                  <div className="flex justify-between text-sm font-medium text-gray-600 dark:text-gray-400">
                    <span>0%</span>
                    <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent font-bold text-base">
                      {percentage}%
                    </span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center p-6 bg-gradient-to-r from-green-50/80 to-emerald-50/50 dark:from-green-900/30 dark:to-emerald-900/20 rounded-2xl border border-green-200/50 dark:border-green-700/50 shadow-lg shadow-green-500/5">
                <div className="flex items-center justify-center mb-2">
                  <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-lg">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">{score}</div>
                <div className="text-sm font-medium text-green-700 dark:text-green-300">Correctas</div>
              </div>
              
              <div className="text-center p-6 bg-gradient-to-r from-red-50/80 to-rose-50/50 dark:from-red-900/30 dark:to-rose-900/20 rounded-2xl border border-red-200/50 dark:border-red-700/50 shadow-lg shadow-red-500/5">
                <div className="flex items-center justify-center mb-2">
                  <div className="p-2 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg shadow-lg">
                    <AlertCircle className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">{actualFailedCount}</div>
                <div className="text-sm font-medium text-red-700 dark:text-red-300">Incorrectas</div>
              </div>
            </div>

            {/* Stats adicionales premium */}
            {(pointsEarned > 0 || averageTimePerQuestion > 0) && (
              <div className="grid grid-cols-2 gap-6">
                {pointsEarned > 0 && (
                  <div className="text-center p-6 bg-gradient-to-r from-blue-50/80 to-indigo-50/50 dark:from-blue-900/30 dark:to-indigo-900/20 rounded-2xl border border-blue-200/50 dark:border-blue-700/50 shadow-lg shadow-blue-500/5">
                    <div className="flex items-center justify-center mb-2">
                      <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg">
                        <Award className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{pointsEarned}</div>
                    <div className="text-sm font-medium text-blue-700 dark:text-blue-300">Puntos</div>
                  </div>
                )}
                {averageTimePerQuestion > 0 && (
                  <div className="text-center p-6 bg-gradient-to-r from-purple-50/80 to-pink-50/50 dark:from-purple-900/30 dark:to-pink-900/20 rounded-2xl border border-purple-200/50 dark:border-purple-700/50 shadow-lg shadow-purple-500/5">
                    <div className="flex items-center justify-center mb-2">
                      <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg shadow-lg">
                        <Trophy className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{averageTimePerQuestion}s</div>
                    <div className="text-sm font-medium text-purple-700 dark:text-purple-300">Promedio</div>
                  </div>
                )}
              </div>
            )}

            {/* Información de progreso del tema premium */}
            {remainingQuestionsInTopic !== undefined && mode === "test" && !isFromTopicAnalysis && (
              <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/50 dark:from-blue-900/30 dark:to-indigo-900/20 p-6 rounded-2xl border-l-4 border-blue-500 shadow-lg shadow-blue-500/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg">
                      <BarChart3 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-blue-700 dark:text-blue-300">Progreso del Tema</p>
                      <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                        {remainingQuestionsInTopic > 0 
                          ? `Quedan ${remainingQuestionsInTopic} preguntas por dominar`
                          : "¡Has dominado todas las preguntas de este tema!"
                        }
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
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
            <div className="bg-gradient-to-r from-purple-50/80 to-pink-50/50 dark:from-purple-900/30 dark:to-pink-900/20 p-6 rounded-2xl border-l-4 border-purple-500 shadow-lg shadow-purple-500/5">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg shadow-lg flex-shrink-0">
                  <Trophy className="h-5 w-5 text-white" />
                </div>
                <p className="text-sm text-center font-medium text-purple-700 dark:text-purple-300 italic leading-relaxed">
                  {encouragementMessage}
                </p>
              </div>
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
        <Card className="backdrop-blur-sm bg-white/95 dark:bg-gray-800/95 shadow-xl border border-gray-200/50 dark:border-gray-700/50">
          <CardContent className="pt-8">
            <div className="space-y-4">
              {/* NUEVA: Lógica condicional según origen */}
              {isFromTopicAnalysis ? (
                // 🎯 BOTONES PARA ANÁLISIS POR TEMAS
                <>
                  <Button 
                    onClick={() => navigate("/analisis-temas")}
                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 h-14 rounded-xl font-semibold text-base"
                    size="lg"
                  >
                    <BarChart3 className="mr-3 h-5 w-5" />
                    Ver Análisis por Temas
                  </Button>
                  
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Button 
                      onClick={handleRepeatTopicTest}
                      variant="outline"
                      className="w-full bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 border border-gray-200 dark:border-gray-700 rounded-xl transition-all duration-200 hover:shadow-md font-medium h-12"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Repetir Test
                    </Button>
                    
                    <Button 
                      onClick={() => navigate("/")}
                      variant="outline"
                      className="w-full bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 border border-gray-200 dark:border-gray-700 rounded-xl transition-all duration-200 hover:shadow-md font-medium h-12"
                    >
                      <Home className="mr-2 h-4 w-4" />
                      Inicio
                    </Button>
                  </div>

                  {/* Mostrar info sobre preguntas restantes si las hay */}
                  {questionsStillFailed.length > 0 && (
                    <div className="text-center text-sm bg-gradient-to-r from-amber-50/80 to-orange-50/50 dark:from-amber-900/30 dark:to-orange-900/20 border border-amber-200/50 dark:border-amber-700/50 p-4 rounded-xl shadow-lg shadow-amber-500/5">
                      <span className="font-medium text-amber-700 dark:text-amber-300">📚 Aún tienes {questionsStillFailed.length} pregunta{questionsStillFailed.length > 1 ? 's' : ''} de este tema para practicar</span>
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
                      className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 h-14 rounded-xl font-semibold text-base"
                      size="lg"
                    >
                      <Play className="mr-3 h-5 w-5" />
                      Continuar con 10 más ({remainingQuestionsInTopic} restantes)
                    </Button>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Button 
                      onClick={() => navigate("/")}
                      variant={canContinueWithMore ? "outline" : "default"}
                      className={canContinueWithMore 
                        ? "w-full bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 border border-gray-200 dark:border-gray-700 rounded-xl transition-all duration-200 hover:shadow-md font-medium h-12" 
                        : "w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 h-12 rounded-xl font-semibold"
                      }
                      size="lg"
                    >
                      <Home className="mr-2 h-4 w-4" />
                      Ir al Inicio
                    </Button>
                    
                    <Button 
                      onClick={() => navigate("/test-setup")}
                      variant="outline"
                      className="w-full bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 border border-gray-200 dark:border-gray-700 rounded-xl transition-all duration-200 hover:shadow-md font-medium h-12"
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
                      className="w-full bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-900/30 dark:hover:to-emerald-900/30 border border-green-200 dark:border-green-700 rounded-xl transition-all duration-200 hover:shadow-md font-medium h-12 text-green-700 dark:text-green-300"
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
          <Card className="backdrop-blur-sm bg-white/95 dark:bg-gray-800/95 shadow-xl border border-gray-200/50 dark:border-gray-700/50">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-900/20 dark:to-blue-900/20 border-b border-gray-200/50 dark:border-gray-700/50">
              <CardTitle className="text-lg font-bold bg-gradient-to-r from-gray-700 to-blue-600 bg-clip-text text-transparent flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Detalles del Quiz
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {questionsCorrect.length > 0 && (
                <div className="bg-gradient-to-r from-green-50/50 to-emerald-50/30 dark:from-green-900/20 dark:to-emerald-900/10 p-4 rounded-xl border border-green-200/50 dark:border-green-700/50">
                  <h4 className="font-bold text-green-700 dark:text-green-300 mb-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Preguntas Correctas ({questionsCorrect.length})
                  </h4>
                  <div className="space-y-2">
                    {questionsCorrect.slice(0, 3).map((q, index) => (
                      <p key={index} className="text-sm text-green-600 dark:text-green-400 truncate font-medium">
                        • {q}
                      </p>
                    ))}
                    {questionsCorrect.length > 3 && (
                      <p className="text-sm text-green-500 dark:text-green-400 italic">
                        ... y {questionsCorrect.length - 3} más
                      </p>
                    )}
                  </div>
                </div>
              )}

              {questionsIncorrect.length > 0 && (
                <div className="bg-gradient-to-r from-red-50/50 to-rose-50/30 dark:from-red-900/20 dark:to-rose-900/10 p-4 rounded-xl border border-red-200/50 dark:border-red-700/50">
                  <h4 className="font-bold text-red-700 dark:text-red-300 mb-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Preguntas a Repasar ({questionsIncorrect.length})
                  </h4>
                  <div className="space-y-2">
                    {questionsIncorrect.slice(0, 3).map((q, index) => (
                      <p key={index} className="text-sm text-red-600 dark:text-red-400 truncate font-medium">
                        • {q}
                      </p>
                    ))}
                    {questionsIncorrect.length > 3 && (
                      <p className="text-sm text-red-500 dark:text-red-400 italic">
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
      </div>
      </div> {/* <-- ESTE ES EL <div> QUE FALTABA */}
    </main>
  );
}
