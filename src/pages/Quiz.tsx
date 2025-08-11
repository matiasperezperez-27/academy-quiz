import { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2, XCircle, ArrowLeft, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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

type Pregunta = {
  id: string;
  pregunta_texto: string;
  opcion_a: string;
  opcion_b: string;
  opcion_c?: string | null;
  opcion_d?: string | null;
  solucion_letra: string;
  tema_id?: string;
  academia_id?: string;
  parte?: string | null;
};

type QuizMode = "test" | "practice";

interface QuizState {
  questions: Pregunta[];
  currentIndex: number;
  score: number;
  selectedAnswer: string | null;
  isRevealed: boolean;
  isLoading: boolean;
  isAnswering: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function Quiz() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  
  const mode: QuizMode = (params.get("mode") as QuizMode) || "test";
  const academiaId = params.get("academia");
  const temaId = params.get("tema");

  const [state, setState] = useState<QuizState>({
    questions: [],
    currentIndex: 0,
    score: 0,
    selectedAnswer: null,
    isRevealed: false,
    isLoading: true,
    isAnswering: false,
  });

  const {
    isOpen: isExitDialogOpen,
    showConfirmation: showExitConfirmation,
    handleConfirm: handleExitConfirm,
    handleClose: handleExitClose,
  } = useExitConfirmation();

  useEffect(() => {
    setSEO("Quiz | Academy Quiz", "Responde a las preguntas una por una y mejora tu puntuación.");
  }, []);

  const loadQuestions = useCallback(async () => {
    if (!user) return;

    try {
      setState(prev => ({ ...prev, isLoading: true }));

      if (mode === "test") {
        if (!academiaId || !temaId) {
          toast({ 
            title: "Parámetros faltantes", 
            description: "Se requiere seleccionar academia y tema.",
            variant: "destructive"
          });
          navigate("/test-setup", { replace: true });
          return;
        }

        const { data, error } = await supabase.rpc("get_random_preguntas", {
          p_academia_id: academiaId,
          p_tema_id: temaId,
          p_limit: 10,
        });

        if (error) throw error;
        if (!data || data.length === 0) {
          toast({ 
            title: "Sin preguntas", 
            description: "No se encontraron preguntas para esta academia y tema.",
            variant: "destructive"
          });
          navigate("/test-setup", { replace: true });
          return;
        }

        setState(prev => ({ 
          ...prev, 
          questions: data as Pregunta[], 
          isLoading: false 
        }));

      } else { // practice mode
        const { data: falladas, error: e1 } = await supabase
          .from("preguntas_falladas")
          .select("pregunta_id")
          .eq("user_id", user.id);

        if (e1) throw e1;

        const preguntaIds = (falladas || []).map((f: any) => f.pregunta_id);
        
        if (preguntaIds.length === 0) {
          toast({ 
            title: "¡Excelente!", 
            description: "No tienes preguntas falladas para practicar." 
          });
          navigate("/", { replace: true });
          return;
        }

        const { data: preguntas, error: e2 } = await supabase
          .from("preguntas")
          .select("*")
          .in("id", preguntaIds);

        if (e2) throw e2;

        setState(prev => ({ 
          ...prev, 
          questions: shuffle(preguntas as Pregunta[] || []), 
          isLoading: false 
        }));
      }
    } catch (err: any) {
      console.error("Error loading questions:", err);
      toast({ 
        title: "Error de carga", 
        description: err.message || "No se pudieron cargar las preguntas.",
        variant: "destructive"
      });
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [mode, academiaId, temaId, user, toast, navigate]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const currentQuestion = useMemo(() => 
    state.questions[state.currentIndex], 
    [state.questions, state.currentIndex]
  );

  // Handle back navigation with confirmation
  const handleGoBack = useCallback(() => {
    if (state.currentIndex > 0 || state.score > 0) {
      showExitConfirmation(() => navigate(-1));
    } else {
      navigate(-1);
    }
  }, [state.currentIndex, state.score, showExitConfirmation, navigate]);

  // Handle home navigation with confirmation
  const handleGoHome = useCallback(() => {
    if (state.currentIndex > 0 || state.score > 0) {
      showExitConfirmation(() => navigate("/"));
    } else {
      navigate("/");
    }
  }, [state.currentIndex, state.score, showExitConfirmation, navigate]);

  const handleAnswer = useCallback(async (selectedLetter: string) => {
    if (!user || state.isRevealed || state.isAnswering || !currentQuestion) return;

    setState(prev => ({ ...prev, isAnswering: true, selectedAnswer: selectedLetter }));

    try {
      const isCorrect = currentQuestion.solucion_letra?.toUpperCase() === selectedLetter.toUpperCase();

      if (isCorrect) {
        setState(prev => ({ ...prev, score: prev.score + 1 }));
        
        // If practicing and correct, remove from failed questions
        if (mode === "practice") {
          await supabase
            .from("preguntas_falladas")
            .delete()
            .eq("user_id", user.id)
            .eq("pregunta_id", currentQuestion.id);
        }
      } else {
        // If test mode and incorrect, add to failed questions
        if (mode === "test") {
          await supabase
            .from("preguntas_falladas")
            .upsert(
              { user_id: user.id, pregunta_id: currentQuestion.id },
              { onConflict: "user_id,pregunta_id", ignoreDuplicates: true }
            );
        }
      }

      setState(prev => ({ ...prev, isRevealed: true }));

      // Auto-advance after showing result
      setTimeout(() => {
        if (state.currentIndex + 1 >= state.questions.length) {
          const finalScore = isCorrect ? state.score + 1 : state.score;
          navigate("/results", { 
            state: { 
              score: finalScore, 
              total: state.questions.length,
              mode 
            } 
          });
        } else {
          setState(prev => ({
            ...prev,
            currentIndex: prev.currentIndex + 1,
            selectedAnswer: null,
            isRevealed: false,
            isAnswering: false,
          }));
        }
      }, 2000);

    } catch (err: any) {
      console.error("Error processing answer:", err);
      toast({ 
        title: "Error", 
        description: "Hubo un problema al procesar la respuesta.",
        variant: "destructive"
      });
      setState(prev => ({ ...prev, isAnswering: false }));
    }
  }, [user, state, currentQuestion, mode, navigate, toast]);

  const progress = useMemo(() => 
    state.questions.length > 0 ? ((state.currentIndex + 1) / state.questions.length) * 100 : 0,
    [state.currentIndex, state.questions.length]
  );

  const options = useMemo(() => {
    if (!currentQuestion) return [];
    
    return [
      { key: "A", text: currentQuestion.opcion_a },
      { key: "B", text: currentQuestion.opcion_b },
      ...(currentQuestion.opcion_c ? [{ key: "C", text: currentQuestion.opcion_c }] : []),
      ...(currentQuestion.opcion_d ? [{ key: "D", text: currentQuestion.opcion_d }] : []),
    ].filter(option => option.text && option.text.trim() !== "");
  }, [currentQuestion]);

  if (state.isLoading) {
    return (
      <main className="min-h-screen p-4 flex items-center justify-center bg-background">
        <Card className="w-full max-w-2xl">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">Cargando preguntas...</p>
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
            <span>Pregunta {state.currentIndex + 1} de {state.questions.length}</span>
            <span>Aciertos: {state.score}</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>

        {/* Main Quiz Card */}
        <Card className="w-full">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg sm:text-xl">
              <span className="text-primary">#{state.currentIndex + 1}</span>
              <span className="ml-2 text-base text-muted-foreground">
                {mode === "practice" ? "Modo Práctica" : "Test"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Question Text - FIXED OVERFLOW ISSUE */}
            <div className="space-y-3">
              <div className="p-4 bg-muted/30 rounded-lg border-l-4 border-primary">
                <p className="text-base sm:text-lg leading-relaxed whitespace-pre-wrap break-words">
                  {currentQuestion.pregunta_texto}
                </p>
              </div>
              
              {/* Part info if available */}
              {currentQuestion.parte && (
                <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md inline-block">
                  Parte: {currentQuestion.parte}
                </div>
              )}
            </div>

            {/* Answer Options - FIXED OVERFLOW ISSUE */}
            <div className="space-y-3">
              {options.map((option) => {
                const isSelected = state.selectedAnswer === option.key;
                const isCorrect = state.isRevealed && currentQuestion.solucion_letra?.toUpperCase() === option.key;
                const isWrong = state.isRevealed && isSelected && !isCorrect;
                
                return (
                  <Button
                    key={option.key}
                    variant={isCorrect ? "default" : isWrong ? "destructive" : "outline"}
                    className={`
                      w-full p-4 h-auto min-h-[3rem] text-left justify-start relative
                      transition-all duration-200 hover:scale-[1.02]
                      ${isCorrect ? "bg-green-600 hover:bg-green-700 text-white shadow-lg" : ""}
                      ${isWrong ? "bg-red-600 hover:bg-red-700 text-white" : ""}
                      ${!state.isRevealed && isSelected ? "ring-2 ring-primary" : ""}
                    `}
                    onClick={() => handleAnswer(option.key)}
                    disabled={state.isRevealed || state.isAnswering}
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
                      
                      {/* Option Text - FIXED OVERFLOW */}
                      <span className="flex-1 text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words text-left">
                        {option.text}
                      </span>
                      
                      {/* Status Icon */}
                      {state.isRevealed && (
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
            {state.isRevealed && (
              <div className="pt-4 border-t">
                <div className={`
                  flex items-center gap-2 text-sm font-medium
                  ${state.selectedAnswer === currentQuestion.solucion_letra?.toUpperCase() 
                    ? "text-green-600" 
                    : "text-red-600"
                  }
                `}>
                  {state.selectedAnswer === currentQuestion.solucion_letra?.toUpperCase() ? (
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

        {/* Navigation hint */}
        {state.isRevealed && (
          <div className="text-center text-sm text-muted-foreground">
            {state.currentIndex + 1 >= state.questions.length 
              ? "Finalizando quiz..." 
              : "Siguiente pregunta en breve..."}
          </div>
        )}

        {/* Exit Confirmation Dialog */}
        <ExitConfirmationDialog
          isOpen={isExitDialogOpen}
          onClose={handleExitClose}
          onConfirm={handleExitConfirm}
          currentQuestion={state.currentIndex}
          totalQuestions={state.questions.length}
          score={state.score}
        />
      </div>
    </main>
  );
}
