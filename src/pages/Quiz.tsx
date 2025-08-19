import { useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2, XCircle, ArrowLeft, Home, ArrowRight, Target, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ExitConfirmationDialog, useExitConfirmation } from "@/components/ExitConfirmationDialog";
import { useQuiz } from "@/hooks/useQuiz";

function setSEO(title: string, description: string) {
  document.title = title;
  const meta = document.querySelector('meta[name="description"]') || document.createElement("meta");
  meta.setAttribute("name", "description");
  meta.setAttribute("content", description);
  document.head.appendChild(meta);
}

type QuizMode = "test" | "practice";

export default function Quiz() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  
  const mode: QuizMode = (params.get("mode") as QuizMode) || "test";
  const academiaId = params.get("academia");
  const temaId = params.get("tema");
  const questionsParam = params.get("questions");

  // 🔧 FIX: Memoizar specificQuestionIds para evitar recreación
  const specificQuestionIds = useMemo(() => {
    if (!questionsParam) return undefined;
    const ids = questionsParam.split(',').filter(id => id.length > 0);
    return ids.length > 0 ? ids : undefined;
  }, [questionsParam]); // Solo cambia si questionsParam cambia

  // USE THE QUIZ HOOK!
  const quiz = useQuiz(mode, academiaId, temaId, specificQuestionIds);

  const {
    isOpen: isExitDialogOpen,
    showConfirmation: showExitConfirmation,
    handleConfirm: handleExitConfirm,
    handleClose: handleExitClose,
  } = useExitConfirmation();

  useEffect(() => {
    setSEO("Quiz | Academy Quiz", "Responde a las preguntas una por una y mejora tu puntuación.");
  }, []);

  // Handle navigation errors
  useEffect(() => {
    if (!user) {
      console.log("Esperando autenticación del usuario...");
      return;
    }

    if (mode === "test" && (!academiaId || !temaId)) {
      toast({ 
        title: "Parámetros faltantes", 
        description: "Se requiere seleccionar academia y tema.",
        variant: "destructive"
      });
      navigate("/test-setup", { replace: true });
    }
  }, [user, mode, academiaId, temaId, navigate, toast]);

  // Handle back navigation with confirmation
  const handleGoBack = useCallback(() => {
    if (quiz.currentIndex > 0 || quiz.score > 0) {
      showExitConfirmation(async () => {
        // Mark session as abandoned if exiting mid-quiz
        if (quiz.sessionId && !quiz.isFinished) {
          await quiz.completeQuiz(); // This will mark it as incomplete
        }
        navigate(-1);
      });
    } else {
      navigate(-1);
    }
  }, [quiz, showExitConfirmation, navigate]);

  // Handle home navigation with confirmation
  const handleGoHome = useCallback(() => {
    if (quiz.currentIndex > 0 || quiz.score > 0) {
      showExitConfirmation(async () => {
        // Mark session as abandoned if exiting mid-quiz
        if (quiz.sessionId && !quiz.isFinished) {
          await quiz.completeQuiz(); // This will mark it as incomplete
        }
        navigate("/");
      });
    } else {
      navigate("/");
    }
  }, [quiz, showExitConfirmation, navigate]);

  // Handle answer selection
  const handleAnswer = useCallback(async (selectedLetter: string) => {
    if (quiz.isRevealed || quiz.isAnswering) return;

    const isCorrect = await quiz.submitAnswer(selectedLetter);
    
    // Si es incorrecto, no avanzamos automáticamente - el usuario debe hacer clic en "Siguiente"
  }, [quiz]);

  // Handle manual next question (for incorrect answers)
  const handleNextQuestion = useCallback(async () => {
    if (quiz.isFinished) {
      // 🔧 FIX: Si es la última pregunta, completar el quiz manualmente
      console.log("🎯 Última pregunta - completando quiz manualmente...");
      
      // Complete the quiz session in database
      const quizStats = await quiz.completeQuiz();
      
      if (quizStats) {
        navigate("/results", { 
          state: { 
            score: quizStats.correctAnswers,
            total: quizStats.totalQuestions,
            mode,
            percentage: quizStats.percentage,
            pointsEarned: quizStats.pointsEarned,
            averageTimePerQuestion: quizStats.averageTimePerQuestion,
            remainingQuestionsInTopic: quizStats.remainingQuestionsInTopic,
            academiaId: quiz.currentAcademiaId,
            temaId: quiz.currentTemaId,
            originalFailedQuestionsCount: quizStats.originalFailedQuestionsCount,
            questionsStillFailed: quizStats.questionsStillFailed,
            originalQuestionIds: quiz.specificQuestionIds
          },
          replace: true
        });
      } else {
        // Fallback
        navigate("/results", { 
          state: { 
            score: quiz.score,
            total: quiz.questions.length,
            mode,
            academiaId: quiz.currentAcademiaId,
            temaId: quiz.currentTemaId,
            originalFailedQuestionsCount: quiz.specificQuestionIds?.length || 0,
            questionsStillFailed: [],
            originalQuestionIds: quiz.specificQuestionIds
          },
          replace: true
        });
      }
      return;
    }
    
    // Si no es la última pregunta, continuar normalmente
    quiz.nextQuestion();
  }, [quiz, mode, navigate]);

  // Determinar si mostrar el botón "Siguiente"
const shouldShowNextButton = quiz.isRevealed && !quiz.isAnswering;


  // Si está cargando o esperando usuario
  if (quiz.isLoading || !user) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-indigo-600/5 to-purple-600/5 dark:from-blue-400/5 dark:via-indigo-400/5 dark:to-purple-400/5"></div>
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-indigo-600/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-400/20 to-purple-600/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
          
          <div className="relative p-4 sm:p-6 flex items-center justify-center min-h-screen">
            <Card className="backdrop-blur-sm bg-white/95 dark:bg-gray-800/95 shadow-xl border border-gray-200/50 dark:border-gray-700/50 w-full max-w-2xl">
              <CardContent className="flex items-center justify-center p-8 sm:p-12">
                <div className="text-center space-y-6">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400/20 to-indigo-600/20 blur-xl"></div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-gray-600 dark:text-gray-400 font-medium">
                      {!user ? "Verificando autenticación..." : "Cargando preguntas..."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    );
  }

  if (!quiz.currentQuestion) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-indigo-600/5 to-purple-600/5 dark:from-blue-400/5 dark:via-indigo-400/5 dark:to-purple-400/5"></div>
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-indigo-600/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-400/20 to-purple-600/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
          
          <div className="relative p-4 sm:p-6 flex items-center justify-center min-h-screen">
            <Card className="backdrop-blur-sm bg-white/95 dark:bg-gray-800/95 shadow-xl border border-gray-200/50 dark:border-gray-700/50 w-full max-w-2xl">
              <CardContent className="flex items-center justify-center p-8 sm:p-12">
                <div className="text-center space-y-6 max-w-md">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 rounded-full flex items-center justify-center">
                    <AlertCircle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-gray-600 dark:text-gray-400 font-medium">No se encontraron preguntas disponibles.</p>
                  </div>
                  <Button 
                    onClick={() => navigate("/")} 
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 h-12 px-8 rounded-xl font-semibold"
                  >
                    Volver al inicio
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    );
  }

return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="relative">
        {/* Hero background with decorative elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-indigo-600/5 to-purple-600/5 dark:from-blue-400/5 dark:via-indigo-400/5 dark:to-purple-400/5"></div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-indigo-600/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-400/20 to-purple-600/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
        
        <div className="relative p-4 sm:p-6">
          <div className="w-full max-w-4xl mx-auto space-y-6">
            {/* Header premium con glassmorphism */}
            <div className="flex items-center justify-between p-4 sm:p-6 backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 rounded-2xl shadow-xl shadow-gray-500/10 border border-gray-200/50 dark:border-gray-700/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGoBack}
                className="flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors rounded-xl px-3 py-2"
              >
                <ArrowLeft className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Volver</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGoHome}
                className="flex items-center gap-2 h-10 px-4 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 border border-gray-200 dark:border-gray-700 rounded-xl transition-all duration-200 hover:shadow-md"
              >
                <Home className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Inicio</span>
              </Button>
            </div>

            {/* Progress Bar premium (SIN EL SPAN "RESTANTES") */}
            <div className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                      <Target className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-medium">
                      Pregunta {quiz.currentIndex + 1} de {quiz.questions.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded">
                        <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
                      </div>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        Aciertos: {quiz.score}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="relative">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 shadow-inner">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
                      style={{ width: `${quiz.progress}%` }}
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-full pointer-events-none"></div>
                </div>
              </div>
            </div>

            {/* CONTENIDO DEL QUIZ (SIN EL <Card>) */}
            <div className="p-6 sm:p-8 space-y-8">
              {/* Question Text with premium design */}
              <div className="space-y-6">
                <div className="p-6 bg-gradient-to-r from-blue-50/80 to-indigo-50/50 dark:from-blue-900/30 dark:to-indigo-900/20 rounded-2xl border border-blue-200/50 dark:border-blue-700/50 shadow-lg shadow-blue-500/5">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg flex-shrink-0">
                      <BookOpen className="h-5 w-5 text-white" />
                    </div>
                    <p className="text-base sm:text-lg leading-relaxed whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200 font-medium">
                      {quiz.currentQuestion.pregunta_texto}
                    </p>
                  </div>
                </div>
                
                {/* Part info if available with premium styling */}
                {quiz.currentQuestion.parte && (
                  <div className="flex justify-center">
                    <div className="text-xs text-gray-600 dark:text-gray-400 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 font-medium">
                      Parte: {quiz.currentQuestion.parte}
                    </div>
                  </div>
                )}
              </div>

              {/* Answer Options with premium gradient effects */}
              <div className="space-y-4">
                {quiz.answerOptions.map((option) => {
                  const isSelected = quiz.selectedAnswer === option.key;
                  const isCorrect = quiz.isRevealed && quiz.currentQuestion.solucion_letra?.toUpperCase() === option.key;
                  const isWrong = quiz.isRevealed && isSelected && !isCorrect;
                  
                  return (
                    <Button
                      key={option.key}
                      variant={isCorrect ? "default" : isWrong ? "destructive" : "outline"}
                      className={`
                        w-full p-4 sm:p-6 h-auto min-h-[4rem] text-left justify-start relative
                        transition-all duration-300 hover:scale-[1.02] rounded-2xl shadow-lg hover:shadow-xl
                        ${isCorrect ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-green-500/20" : ""}
                        ${isWrong ? "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-red-500/20" : ""}
                        ${!quiz.isRevealed && isSelected ? "ring-2 ring-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20" : ""}
                        ${!quiz.isRevealed && !isSelected ? "bg-gradient-to-r from-white to-blue-50/30 dark:from-gray-800 dark:to-blue-900/10 hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 border border-gray-200 dark:border-gray-700" : ""}
                      `}
                      onClick={() => handleAnswer(option.key)}
                      disabled={quiz.isRevealed || quiz.isAnswering}
                    >
                      <div className="flex items-start gap-4 w-full">
                        <div className={`
                          flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg
                          ${isCorrect ? "bg-white text-green-600" : 
                            isWrong ? "bg-white text-red-600" : 
                            "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"}
                        `}>
                          {option.key}
                        </div>
                        
                        <span className="flex-1 text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words text-left font-medium">
                          {option.text}
                        </span>
                        
                        {quiz.isRevealed && (
                          <div className="flex-shrink-0">
                            {isCorrect ? (
                              <CheckCircle2 className="h-5 w-5 text-white" />
                            ) : isWrong ? (
                              <XCircle className="h-5 w-5 text-white" />
                            ) : null}
                          </div>
                        )}
                      </div>
                    </Button>
                  );
                })}
              </div>

              {/* Answer Status with premium styling */}
              {quiz.isRevealed && (
                <div className="pt-6 border-t border-gray-200/50 dark:border-gray-700/50">
                  <div className={`
                    flex items-center gap-3 text-base font-semibold p-4 rounded-xl
                    ${quiz.selectedAnswer === quiz.currentQuestion.solucion_letra?.toUpperCase() 
                      ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 text-green-700 dark:text-green-300 border border-green-200/50 dark:border-green-700/50" 
                      : "bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 text-red-700 dark:text-red-300 border border-red-200/50 dark:border-red-700/50"
                    }
                  `}>
                    {quiz.selectedAnswer === quiz.currentQuestion.solucion_letra?.toUpperCase() ? (
                      <>
                        <div className="p-1 bg-green-500 rounded-full">
                          <CheckCircle2 className="h-4 w-4 text-white" />
                        </div>
                        ¡Correcto! +10 puntos
                      </>
                    ) : (
                      <>
                        <div className="p-1 bg-red-500 rounded-full">
                          <XCircle className="h-4 w-4 text-white" />
                        </div>
                        Incorrecto. La respuesta correcta es: {quiz.currentQuestion.solucion_letra}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Botón Siguiente con gradient effects */}
              {shouldShowNextButton && (
                <div className="pt-6 border-t border-gray-200/50 dark:border-gray-700/50">
                  <Button 
                    onClick={handleNextQuestion}
                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 h-12 sm:h-14 rounded-xl font-semibold text-base"
                    size="lg"
                    disabled={quiz.isAnswering}
                  >
                    {quiz.isFinished ? (
                      "Ver Resultados"
                    ) : (
                      <>
                        Siguiente Pregunta
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Navigation hint with premium styling */}
            {quiz.isRevealed && !shouldShowNextButton && (
              <div className="text-center">
                <div className="inline-block px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200/50 dark:border-blue-700/50">
                  <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                    {quiz.isFinished
                      ? "Finalizando quiz..." 
                      : "Siguiente pregunta en breve..."}
                  </span>
                </div>
              </div>
            )}

            {/* Exit Confirmation Dialog */}
            <ExitConfirmationDialog
              isOpen={isExitDialogOpen}
              onClose={handleExitClose}
              onConfirm={handleExitConfirm}
              currentQuestion={quiz.currentIndex}
              totalQuestions={quiz.questions.length}
              score={quiz.score}
            />
          </div>
        </div>
      </div>
    </main>
  );
}