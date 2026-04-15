import { useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, XCircle, ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ExitConfirmationDialog, useExitConfirmation } from "@/components/ExitConfirmationDialog";
import { useQuiz, Pregunta } from "@/hooks/useQuiz";

type QuizMode = "test" | "practice";

// ── Answer option button ──────────────────────────────────────────────────────
function OptionButton({
  optKey, text, explanation, isRevealed, isSelected, isCorrect, isWrong, disabled, onClick,
}: {
  optKey: string; text: string; explanation?: string | null;
  isRevealed: boolean; isSelected: boolean; isCorrect: boolean; isWrong: boolean;
  disabled: boolean; onClick: () => void;
}) {
  let containerCls = "w-full text-left rounded-xl border border-l-4 px-4 py-3 transition-all duration-150 ";
  let keyBg        = "bg-muted text-muted-foreground ";

  if (!isRevealed) {
    if (isSelected) {
      containerCls += "border-l-teal-400 bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800";
      keyBg         = "bg-teal-600 text-white ";
    } else {
      containerCls += "border-l-gray-200 dark:border-l-gray-700 bg-card hover:border-l-gray-400 hover:bg-muted/40 cursor-pointer";
    }
  } else if (isCorrect) {
    containerCls += "border-l-teal-400 bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800";
    keyBg         = "bg-teal-600 text-white ";
  } else if (isWrong) {
    containerCls += "border-l-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
    keyBg         = "bg-red-500 text-white ";
  } else {
    containerCls += "border-l-gray-200 dark:border-l-gray-700 bg-card opacity-50";
  }

  return (
    <button className={containerCls} onClick={onClick} disabled={disabled}>
      <div className="flex items-start gap-3">
        <span className={`flex-shrink-0 w-7 h-7 rounded-full ${keyBg} flex items-center justify-center text-xs font-bold mt-0.5`}>
          {optKey}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words font-medium text-foreground">
            {text}
          </p>
          {isRevealed && explanation && (
            <p className={`mt-1.5 text-xs leading-relaxed ${
              isCorrect ? "text-teal-700 dark:text-teal-300"
              : isWrong ? "text-red-700 dark:text-red-300"
              : "text-muted-foreground"
            }`}>
              {explanation}
            </p>
          )}
        </div>
        {isRevealed && (isCorrect || isWrong) && (
          <div className="flex-shrink-0 mt-0.5">
            {isCorrect
              ? <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              : <XCircle className="h-4 w-4 text-red-500" />
            }
          </div>
        )}
      </div>
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Quiz() {
  const { user }  = useAuth();
  const { toast } = useToast();
  const navigate  = useNavigate();
  const location  = useLocation();
  const params    = new URLSearchParams(location.search);

  const mode: QuizMode = (params.get("mode") as QuizMode) || "test";
  const academiaId     = params.get("academia");
  const temaId         = params.get("tema");
  const questionsParam = params.get("questions");

  const specificQuestionIds = useMemo(() => {
    if (!questionsParam) return undefined;
    const ids = questionsParam.split(",").filter(id => id.length > 0);
    return ids.length > 0 ? ids : undefined;
  }, [questionsParam]);

  const quiz = useQuiz(mode, academiaId, temaId, specificQuestionIds);

  const {
    isOpen: isExitDialogOpen,
    showConfirmation: showExitConfirmation,
    handleConfirm: handleExitConfirm,
    handleClose: handleExitClose,
  } = useExitConfirmation();

  useEffect(() => {
    if (!user) return;
    if (mode === "test" && (!academiaId || !temaId)) {
      toast({ title: "Parametros faltantes", description: "Se requiere academia y tema.", variant: "destructive" });
      navigate("/test-setup", { replace: true });
    }
  }, [user, mode, academiaId, temaId, navigate, toast]);

  const handleGoBack = useCallback(() => {
    if (quiz.currentIndex > 0 || quiz.score > 0) {
      showExitConfirmation(async () => {
        if (quiz.sessionId && !quiz.isFinished) await quiz.completeQuiz();
        navigate(-1);
      });
    } else {
      navigate(-1);
    }
  }, [quiz, showExitConfirmation, navigate]);

  const handleAnswer = useCallback(async (letter: string) => {
    if (quiz.isRevealed || quiz.isAnswering) return;
    await quiz.submitAnswer(letter);
  }, [quiz]);

  const handleNext = useCallback(async () => {
    if (quiz.isFinished) {
      const s = await quiz.completeQuiz();
      if (s) {
        navigate("/results", {
          state: {
            score: s.correctAnswers, total: s.totalQuestions, mode,
            percentage: s.percentage, pointsEarned: s.pointsEarned,
            averageTimePerQuestion: s.averageTimePerQuestion,
            remainingQuestionsInTopic: s.remainingQuestionsInTopic,
            academiaId: quiz.currentAcademiaId, temaId: quiz.currentTemaId,
            originalFailedQuestionsCount: s.originalFailedQuestionsCount,
            questionsStillFailed: s.questionsStillFailed,
            originalQuestionIds: quiz.specificQuestionIds,
          },
          replace: true,
        });
      } else {
        navigate("/results", {
          state: {
            score: quiz.score, total: quiz.questions.length, mode,
            academiaId: quiz.currentAcademiaId, temaId: quiz.currentTemaId,
            originalFailedQuestionsCount: quiz.specificQuestionIds?.length || 0,
            questionsStillFailed: [], originalQuestionIds: quiz.specificQuestionIds,
          },
          replace: true,
        });
      }
      return;
    }
    quiz.nextQuestion();
  }, [quiz, mode, navigate]);

  const shouldShowNext  = quiz.isRevealed && !quiz.isAnswering;
  const isCorrectAnswer = quiz.selectedAnswer === quiz.currentQuestion?.solucion_letra?.toUpperCase();
  const progressPct     = quiz.questions.length > 0
    ? Math.round((quiz.currentIndex / quiz.questions.length) * 100) : 0;

  // Loading
  if (quiz.isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">
            {!user ? "Verificando sesion..." : "Cargando preguntas..."}
          </p>
        </div>
      </div>
    );
  }

  // No questions
  if (!quiz.currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
            <AlertCircle className="h-7 w-7 text-amber-500" />
          </div>
          <p className="text-sm text-muted-foreground">No se encontraron preguntas disponibles.</p>
          <Button onClick={() => navigate("/")} className="bg-teal-600 hover:bg-teal-700">
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Top bar with progress */}
      <div className="flex-shrink-0 border-b bg-card">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={handleGoBack}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Salir</span>
          </button>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {mode === "practice" ? "Practica" : "Test"} · {quiz.currentIndex + 1} de {quiz.questions.length}
              </span>
              <span className="flex items-center gap-1 font-semibold text-teal-600 dark:text-teal-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {quiz.score} aciertos
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-teal-500 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3 pb-28">

          {/* Question card */}
          <div className="rounded-xl border border-l-4 border-l-blue-400 bg-card px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                <BookOpen className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                {quiz.currentQuestion.parte && (
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    {quiz.currentQuestion.parte}
                  </p>
                )}
                <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words font-medium">
                  {quiz.currentQuestion.pregunta_texto}
                </p>
              </div>
            </div>
          </div>

          {/* Answer options */}
          <div className="space-y-2">
            {quiz.answerOptions.map((option) => {
              const isSelected = quiz.selectedAnswer === option.key;
              const isCorrect  = quiz.isRevealed && quiz.currentQuestion!.solucion_letra?.toUpperCase() === option.key;
              const isWrong    = quiz.isRevealed && isSelected && !isCorrect;
              const explanation = quiz.currentQuestion![`explicacion_${option.key.toLowerCase()}` as keyof Pregunta] as string | null;
              return (
                <OptionButton
                  key={option.key}
                  optKey={option.key}
                  text={option.text}
                  explanation={explanation}
                  isRevealed={quiz.isRevealed}
                  isSelected={isSelected}
                  isCorrect={isCorrect}
                  isWrong={isWrong}
                  disabled={quiz.isRevealed || quiz.isAnswering}
                  onClick={() => handleAnswer(option.key)}
                />
              );
            })}
          </div>

          {/* Result feedback */}
          {quiz.isRevealed && (
            <div className={`rounded-xl border border-l-4 px-4 py-3 flex items-center gap-3 ${
              isCorrectAnswer
                ? "border-l-teal-400 bg-teal-50 dark:bg-teal-900/20"
                : "border-l-red-400 bg-red-50 dark:bg-red-900/20"
            }`}>
              {isCorrectAnswer
                ? <CheckCircle2 className="h-5 w-5 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                : <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              }
              <p className={`text-sm font-semibold ${
                isCorrectAnswer ? "text-teal-700 dark:text-teal-300" : "text-red-700 dark:text-red-300"
              }`}>
                {isCorrectAnswer
                  ? "Correcto! +10 puntos"
                  : `Incorrecto - La correcta era la opcion ${quiz.currentQuestion.solucion_letra?.toUpperCase()}`
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Sticky "Next" button */}
      {shouldShowNext && (
        <div className="flex-shrink-0 border-t bg-card/95 backdrop-blur-sm">
          <div className="max-w-2xl mx-auto px-4 py-3">
            <Button
              onClick={handleNext}
              className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl"
              disabled={quiz.isAnswering}
            >
              {quiz.isFinished ? (
                "Ver Resultados"
              ) : (
                <>Siguiente Pregunta <ArrowRight className="ml-2 h-4 w-4" /></>
              )}
            </Button>
          </div>
        </div>
      )}

      <ExitConfirmationDialog
        isOpen={isExitDialogOpen}
        onClose={handleExitClose}
        onConfirm={handleExitConfirm}
        currentQuestion={quiz.currentIndex}
        totalQuestions={quiz.questions.length}
        score={quiz.score}
      />
    </div>
  );
}
