import { useEffect, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2, XCircle, ArrowLeft, Home, Loader2 } from "lucide-react";
import { useQuiz, QuizMode } from "@/hooks/useQuiz"; // Asegúrate de que QuizMode se exporte desde el hook
import { ExitConfirmationDialog, useExitConfirmation } from "@/components/ExitConfirmationDialog";

// --- Helpers (Sin cambios) ---

function setSEO(title: string, description: string) {
  document.title = title;
  const meta = document.querySelector('meta[name="description"]') || document.createElement("meta");
  meta.setAttribute("name", "description");
  meta.setAttribute("content", description);
  document.head.appendChild(meta);
}

// --- Componente Principal ---

export default function Quiz() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  // Obtenemos los parámetros para inicializar el hook
  const mode = (params.get("mode") as QuizMode) || "test";
  const academiaId = params.get("academia");
  const temaId = params.get("tema");

  // El hook `useQuiz` ahora es la única fuente de verdad para la lógica del quiz.
  const {
    questions,
    currentIndex,
    score,
    selectedAnswer,
    isRevealed,
    isLoading,
    isAnswering,
    submitAnswer,
    nextQuestion,
    completeQuiz,
    progress,
    currentQuestion,
    answerOptions,
    isFinished,
  } = useQuiz(mode, academiaId, temaId);

  const {
    isOpen: isExitDialogOpen,
    showConfirmation: showExitConfirmation,
    handleConfirm: handleExitConfirm,
    handleClose: handleExitClose,
  } = useExitConfirmation();

  useEffect(() => {
    setSEO("Quiz | Academy Quiz", "Responde a las preguntas una por una y mejora tu puntuación.");
  }, []);

  // --- Manejadores de eventos que usan funciones del hook ---

  const handleGoBack = useCallback(() => {
    // La lógica de confirmación se basa en el estado del hook
    if (currentIndex > 0) {
      showExitConfirmation(() => navigate(-1));
    } else {
      navigate(-1);
    }
  }, [currentIndex, showExitConfirmation, navigate]);

  const handleGoHome = useCallback(() => {
    if (currentIndex > 0) {
      showExitConfirmation(() => navigate("/"));
    } else {
      navigate("/");
    }
  }, [currentIndex, showExitConfirmation, navigate]);

  const handleAnswer = useCallback(async (selectedLetter: string) => {
    await submitAnswer(selectedLetter);

    // El timeout permanece para dar feedback visual al usuario
    setTimeout(async () => {
      if (isFinished) {
        // Al finalizar, completamos la sesión y navegamos a los resultados
        const finalStats = await completeQuiz();
        navigate("/results", {
          state: {
            score: finalStats?.correctAnswers ?? score,
            total: finalStats?.totalQuestions ?? questions.length,
            mode,
          },
        });
      } else {
        // Si no ha terminado, simplemente pasamos a la siguiente pregunta
        nextQuestion();
      }
    }, 2000); // 2 segundos para ver el resultado

  }, [submitAnswer, isFinished, completeQuiz, navigate, mode, score, questions.length, nextQuestion]);


  // --- Renderizado de Estados (Cargando y sin preguntas) ---

  if (isLoading) {
    return (
      <main className="min-h-screen p-4 flex items-center justify-center bg-background">
        <Card className="w-full max-w-2xl">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto" />
              <p className="text-muted-foreground">Preparando tu quiz...</p>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!currentQuestion) {
    return (
      <main className="min-h-screen p-4 flex items-center justify-center bg-background">
        <Card className="w-full max-w-2xl">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center space-y-4">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">No se encontraron preguntas. Es posible que ya hayas practicado todas tus preguntas falladas.</p>
              <Button onClick={() => navigate("/")}>Volver al inicio</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }
  
  // --- Renderizado del Quiz ---

  return (
    <main className="min-h-screen p-4 flex items-center justify-center bg-background">
      <div className="w-full max-w-2xl space-y-4">
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

        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Pregunta {currentIndex + 1} de {questions.length}</span>
            <span>Aciertos: {score}</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>

        <Card className="w-full">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg sm:text-xl">
              <span className="text-primary">#{currentIndex + 1}</span>
              <span className="ml-2 text-base text-muted-foreground">
                {mode === "practice" ? "Modo Práctica" : "Test"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="p-4 bg-muted/30 rounded-lg border-l-4 border-primary">
                <p className="text-base sm:text-lg leading-relaxed whitespace-pre-wrap break-words">
                  {currentQuestion.pregunta_texto}
                </p>
              </div>
              
              {currentQuestion.parte && (
                <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md inline-block">
                  Parte: {currentQuestion.parte}
                </div>
              )}
            </div>

            <div className="space-y-3">
              {answerOptions.map((option) => {
                const isSelected = selectedAnswer === option.key;
                const isCorrect = isRevealed && currentQuestion.solucion_letra?.toUpperCase() === option.key;
                const isWrong = isRevealed && isSelected && !isCorrect;
                
                return (
                  <Button
                    key={option.key}
                    variant={isCorrect ? "default" : isWrong ? "destructive" : "outline"}
                    className={`
                      w-full p-4 h-auto min-h-[3rem] text-left justify-start relative
                      transition-all duration-200 hover:scale-[1.02]
                      ${isCorrect ? "bg-green-600 hover:bg-green-700 text-white shadow-lg" : ""}
                      ${isWrong ? "bg-red-600 hover:bg-red-700 text-white" : ""}
                      ${!isRevealed && isSelected ? "ring-2 ring-primary" : ""}
                    `}
                    onClick={() => handleAnswer(option.key)}
                    disabled={isRevealed || isAnswering}
                  >
                    <div className="flex items-start gap-3 w-full">
                      <div className={`
                        flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                        ${isCorrect ? "bg-white text-green-600" : 
                          isWrong ? "bg-white text-red-600" : 
                          "bg-primary text-primary-foreground"}
                      `}>
                        {option.key}
                      </div>
                      
                      <span className="flex-1 text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words text-left">
                        {option.text}
                      </span>
                      
                      {isRevealed && (
                        <div className="flex-shrink-0">
                          {isCorrect ? <CheckCircle2 className="h-5 w-5 text-white" /> : isWrong ? <XCircle className="h-5 w-5 text-white" /> : null}
                        </div>
                      )}
                    </div>
                  </Button>
                );
              })}
            </div>

            {isRevealed && (
              <div className="pt-4 border-t">
                <div className={`
                  flex items-center gap-2 text-sm font-medium
                  ${selectedAnswer === currentQuestion.solucion_letra?.toUpperCase() 
                    ? "text-green-600" 
                    : "text-red-600"
                  }
                `}>
                  {selectedAnswer === currentQuestion.solucion_letra?.toUpperCase() ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      ¡Correcto!
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4" />
                      Incorrecto. La respuesta correcta es: {currentQuestion.solucion_letra}
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {isRevealed && (
          <div className="text-center text-sm text-muted-foreground">
            {isFinished
              ? "Finalizando quiz..." 
              : "Siguiente pregunta en breve..."}
          </div>
        )}

        <ExitConfirmationDialog
          isOpen={isExitDialogOpen}
          onClose={handleExitClose}
          onConfirm={handleExitConfirm}
          currentQuestion={currentIndex}
          totalQuestions={questions.length}
          score={score}
        />
      </div>
    </main>
  );
}
