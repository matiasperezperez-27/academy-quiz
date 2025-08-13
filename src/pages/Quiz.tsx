import { useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2, XCircle, ArrowLeft, Home, ArrowRight } from "lucide-react";
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

  // Handle quiz completion
  useEffect(() => {
    const handleCompletion = async () => {
      if (quiz.isFinished && quiz.isRevealed) {
        // Complete the quiz session in database
        const quizStats = await quiz.completeQuiz();
        
        console.log("🎯 NAVEGANDO A RESULTS CON:");
        console.log("- quizStats:", quizStats);
        console.log("- originalFailedQuestionsCount:", quizStats?.originalFailedQuestionsCount);
        console.log("- questionsStillFailed:", quizStats?.questionsStillFailed);
        console.log("- specificQuestionIds:", quiz.specificQuestionIds);
        
        if (quizStats) {
          // Navigate to results with complete stats including remaining questions
          navigate("/results", { 
            state: { 
              score: quizStats.correctAnswers,
              total: quizStats.totalQuestions,
              mode,
              percentage: quizStats.percentage,
              pointsEarned: quizStats.pointsEarned,
              averageTimePerQuestion: quizStats.averageTimePerQuestion,
              // INFORMACIÓN para continuar con más preguntas
              remainingQuestionsInTopic: quizStats.remainingQuestionsInTopic,
              academiaId: quiz.currentAcademiaId,
              temaId: quiz.currentTemaId,
              // 🎯 NUEVA INFO PARA DETECTAR ORIGEN
              originalFailedQuestionsCount: quizStats.originalFailedQuestionsCount,
              questionsStillFailed: quizStats.questionsStillFailed
            },
            replace: true
          });
        } else {
          // Fallback if completion fails
          navigate("/results", { 
            state: { 
              score: quiz.score,
              total: quiz.questions.length,
              mode,
              academiaId: quiz.currentAcademiaId,
              temaId: quiz.currentTemaId,
              // 🎯 FALLBACK PARA DETECTAR ORIGEN
              originalFailedQuestionsCount: quiz.specificQuestionIds?.length || 0,
              questionsStillFailed: []
            },
            replace: true
          });
        }
      }
    };

    handleCompletion();
  }, [quiz.isFinished, quiz.isRevealed, quiz, mode, navigate]);

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
    
    // NUEVA LÓGICA: Solo auto-advance si es correcto
    if (isCorrect && !quiz.isFinished) {
      setTimeout(() => {
        quiz.nextQuestion();
      }, 1500); // Menos tiempo para respuestas correctas
    }
    // Si es incorrecto, no avanzamos automáticamente - el usuario debe hacer clic en "Siguiente"
  }, [quiz]);

  // Handle manual next question (for incorrect answers)
  const handleNextQuestion = useCallback(() => {
    if (quiz.isFinished) {
      // Si es la última pregunta, se manejará por el useEffect de completion
      return;
    }
    quiz.nextQuestion();
  }, [quiz]);

  // Determinar si mostrar el botón "Siguiente"
  const shouldShowNextButton = quiz.isRevealed && !quiz.isAnswering && (
    (quiz.selectedAnswer !== quiz.currentQuestion?.solucion_letra?.toUpperCase()) || // Respuesta incorrecta
    quiz.isFinished // Última pregunta
  );

  // Si está cargando o esperando usuario
  if (quiz.isLoading || !user) {
    return (
      <main className="min-h-screen p-4 flex items-center justify-center bg-background">
        <Card className="w-full max-w-2xl">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">
                {!user ? "Verificando autenticación..." : "Cargando preguntas..."}
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!quiz.currentQuestion) {
    return (
      <main className="min-h-screen p-4 flex items-center justify-center bg-background">
        <Card className="w-full max-w-2xl">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center space-y-4">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">No se encontraron preguntas disponibles.</p>
              <Button onClick={() => navigate("/")}>Volver al inicio</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 flex items-center justify-center bg-background">
      <div className="w-full max-w-2xl space-y-4">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGoBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGoHome}
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Inicio
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Pregunta {quiz.currentIndex + 1} de {quiz.questions.length}</span>
            <div className="flex items-center gap-4">
              <span>Aciertos: {quiz.score}</span>
              {quiz.remainingQuestions !== undefined && (
                <span className="text-xs bg-muted px-2 py-1 rounded">
                  Restantes: {Math.max(0, quiz.remainingQuestions - quiz.score)}
                </span>
              )}
            </div>
          </div>
          <Progress value={quiz.progress} className="w-full" />
        </div>

        {/* Main Quiz Card */}
        <Card className="w-full">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg sm:text-xl">
              <span className="text-primary">#{quiz.currentIndex + 1}</span>
              <span className="ml-2 text-base text-muted-foreground">
                {mode === "practice" ? "Modo Práctica" : "Test"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Question Text */}
            <div className="space-y-3">
              <div className="p-4 bg-muted/30 rounded-lg border-l-4 border-primary">
                <p className="text-base sm:text-lg leading-relaxed whitespace-pre-wrap break-words">
                  {quiz.currentQuestion.pregunta_texto}
                </p>
              </div>
              
              {/* Part info if available */}
              {quiz.currentQuestion.parte && (
                <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md inline-block">
                  Parte: {quiz.currentQuestion.parte}
                </div>
              )}
            </div>

            {/* Answer Options */}
            <div className="space-y-3">
              {quiz.answerOptions.map((option) => {
                const isSelected = quiz.selectedAnswer === option.key;
                const isCorrect = quiz.isRevealed && quiz.currentQuestion.solucion_letra?.toUpperCase() === option.key;
                const isWrong = quiz.isRevealed && isSelected && !isCorrect;
                
                return (
                  <Button
                    key={option.key}
                    variant={isCorrect ? "default" : isWrong ? "destructive" : "outline"}
                    className={`
                      w-full p-4 h-auto min-h-[3rem] text-left justify-start relative
                      transition-all duration-200 hover:scale-[1.02]
                      ${isCorrect ? "bg-green-600 hover:bg-green-700 text-white shadow-lg" : ""}
                      ${isWrong ? "bg-red-600 hover:bg-red-700 text-white" : ""}
                      ${!quiz.isRevealed && isSelected ? "ring-2 ring-primary" : ""}
                    `}
                    onClick={() => handleAnswer(option.key)}
                    disabled={quiz.isRevealed || quiz.isAnswering}
                  >
                    <div className="flex items-start gap-3 w-full">
                      {/* Option Letter */}
                      <div className={`
                        flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                        ${isCorrect ? "bg-white text-green-600" : 
                          isWrong ? "bg-white text-red-600" : 
                          "bg-primary text-primary-foreground"}
                      `}>
                        {option.key}
                      </div>
                      
                      {/* Option Text */}
                      <span className="flex-1 text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words text-left">
                        {option.text}
                      </span>
                      
                      {/* Status Icon */}
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

            {/* Answer Status */}
            {quiz.isRevealed && (
              <div className="pt-4 border-t">
                <div className={`
                  flex items-center gap-2 text-sm font-medium
                  ${quiz.selectedAnswer === quiz.currentQuestion.solucion_letra?.toUpperCase() 
                    ? "text-green-600" 
                    : "text-red-600"
                  }
                `}>
                  {quiz.selectedAnswer === quiz.currentQuestion.solucion_letra?.toUpperCase() ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      ¡Correcto! +10 puntos
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4" />
                      Incorrecto. La respuesta correcta es: {quiz.currentQuestion.solucion_letra}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* NUEVO: Botón Siguiente para respuestas incorrectas */}
            {shouldShowNextButton && (
              <div className="pt-4 border-t">
                <Button 
                  onClick={handleNextQuestion}
                  className="w-full"
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
          </CardContent>
        </Card>

        {/* Navigation hint */}
        {quiz.isRevealed && !shouldShowNextButton && (
          <div className="text-center text-sm text-muted-foreground">
            {quiz.isFinished
              ? "Finalizando quiz..." 
              : "Siguiente pregunta en breve..."}
          </div>
        )}

        {/* Session ID Debug (solo en desarrollo) */}
        {import.meta.env.DEV && (
          <div className="text-xs text-muted-foreground text-center">
            Session ID: {quiz.sessionId || 'No session'} | User: {user?.id?.substring(0, 8) || 'No user'}
            {quiz.remainingQuestions !== undefined && ` | Remaining: ${quiz.remainingQuestions}`}
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
    </main>
  );
}