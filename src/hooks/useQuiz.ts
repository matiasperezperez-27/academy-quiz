import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export interface Pregunta {
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
}

export type QuizMode = "test" | "practice";

export interface QuizState {
  questions: Pregunta[];
  currentIndex: number;
  score: number;
  selectedAnswer: string | null;
  isRevealed: boolean;
  isLoading: boolean;
  isAnswering: boolean;
  startTime: number;
  answers: Array<{
    questionId: string;
    selectedAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    timeSpent: number;
  }>;
}

export interface QuizStats {
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  percentage: number;
  averageTimePerQuestion: number;
  questionsAnswered: number;
}

const initialState: QuizState = {
  questions: [],
  currentIndex: 0,
  score: 0,
  selectedAnswer: null,
  isRevealed: false,
  isLoading: true,
  isAnswering: false,
  startTime: Date.now(),
  answers: [],
};

function shuffle<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function useQuiz(mode: QuizMode, academiaId?: string | null, temaId?: string | null) {
  const [state, setState] = useState<QuizState>(initialState);
  const { user } = useAuth();
  const { toast } = useToast();

  // Reset quiz state
  const resetQuiz = useCallback(() => {
    setState({
      ...initialState,
      startTime: Date.now(),
    });
  }, []);

  // Load questions based on mode
  const loadQuestions = useCallback(async () => {
    if (!user) return;

    try {
      setState(prev => ({ ...prev, isLoading: true }));

      if (mode === "test") {
        if (!academiaId || !temaId) {
          throw new Error("Se requiere seleccionar academia y tema para el modo test");
        }

        const { data, error } = await supabase.rpc("get_random_preguntas", {
          p_academia_id: academiaId,
          p_tema_id: temaId,
          p_limit: 10,
        });

        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error("No se encontraron preguntas para esta academia y tema");
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
          throw new Error("No tienes preguntas falladas para practicar");
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
      throw err; // Re-throw to allow caller to handle
    }
  }, [mode, academiaId, temaId, user, toast]);

  // Handle answer submission
  const submitAnswer = useCallback(async (selectedLetter: string): Promise<boolean> => {
    if (!user || state.isRevealed || state.isAnswering || !state.questions[state.currentIndex]) {
      return false;
    }

    const currentQuestion = state.questions[state.currentIndex];
    const answerStartTime = Date.now();

    setState(prev => ({ ...prev, isAnswering: true, selectedAnswer: selectedLetter }));

    try {
      const isCorrect = currentQuestion.solucion_letra?.toUpperCase() === selectedLetter.toUpperCase();
      const timeSpent = Math.round((Date.now() - answerStartTime) / 1000);

      // Record answer
      const answerRecord = {
        questionId: currentQuestion.id,
        selectedAnswer: selectedLetter,
        correctAnswer: currentQuestion.solucion_letra,
        isCorrect,
        timeSpent,
      };

      setState(prev => ({
        ...prev,
        score: isCorrect ? prev.score + 1 : prev.score,
        answers: [...prev.answers, answerRecord],
        isRevealed: true,
      }));

      if (isCorrect && mode === "practice") {
        // Remove from failed questions if practicing and correct
        await supabase
          .from("preguntas_falladas")
          .delete()
          .eq("user_id", user.id)
          .eq("pregunta_id", currentQuestion.id);
      } else if (!isCorrect && mode === "test") {
        // Add to failed questions if test mode and incorrect
        await supabase
          .from("preguntas_falladas")
          .upsert(
            { user_id: user.id, pregunta_id: currentQuestion.id },
            { onConflict: "user_id,pregunta_id", ignoreDuplicates: true }
          );
      }

      return isCorrect;
    } catch (err: any) {
      console.error("Error processing answer:", err);
      toast({ 
        title: "Error", 
        description: "Hubo un problema al procesar la respuesta.",
        variant: "destructive"
      });
      setState(prev => ({ ...prev, isAnswering: false }));
      return false;
    }
  }, [user, state, mode, toast]);

  // Move to next question
  const nextQuestion = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentIndex: prev.currentIndex + 1,
      selectedAnswer: null,
      isRevealed: false,
      isAnswering: false,
    }));
  }, []);

  // Check if quiz is finished
  const isQuizFinished = useCallback(() => {
    return state.currentIndex >= state.questions.length - 1;
  }, [state.currentIndex, state.questions.length]);

  // Get current question
  const getCurrentQuestion = useCallback(() => {
    return state.questions[state.currentIndex] || null;
  }, [state.questions, state.currentIndex]);

  // Get quiz statistics
  const getStats = useCallback((): QuizStats => {
    const totalTime = Math.round((Date.now() - state.startTime) / 1000);
    const questionsAnswered = state.answers.length;
    
    return {
      totalQuestions: state.questions.length,
      correctAnswers: state.score,
      incorrectAnswers: questionsAnswered - state.score,
      percentage: questionsAnswered > 0 ? Math.round((state.score / questionsAnswered) * 100) : 0,
      averageTimePerQuestion: questionsAnswered > 0 ? Math.round(totalTime / questionsAnswered) : 0,
      questionsAnswered,
    };
  }, [state]);

  // Get progress percentage
  const getProgress = useCallback(() => {
    return state.questions.length > 0 ? ((state.currentIndex + 1) / state.questions.length) * 100 : 0;
  }, [state.currentIndex, state.questions.length]);

  // Get answer options for current question
  const getAnswerOptions = useCallback(() => {
    const currentQuestion = getCurrentQuestion();
    if (!currentQuestion) return [];
    
    return [
      { key: "A", text: currentQuestion.opcion_a },
      { key: "B", text: currentQuestion.opcion_b },
      ...(currentQuestion.opcion_c ? [{ key: "C", text: currentQuestion.opcion_c }] : []),
      ...(currentQuestion.opcion_d ? [{ key: "D", text: currentQuestion.opcion_d }] : []),
    ].filter(option => option.text && option.text.trim() !== "");
  }, [getCurrentQuestion]);

  // Auto-load questions when dependencies change
  useEffect(() => {
    if (user) {
      loadQuestions();
    }
  }, [user, loadQuestions]);

  return {
    // State
    ...state,
    
    // Computed values
    currentQuestion: getCurrentQuestion(),
    progress: getProgress(),
    answerOptions: getAnswerOptions(),
    stats: getStats(),
    isFinished: isQuizFinished(),
    
    // Actions
    loadQuestions,
    submitAnswer,
    nextQuestion,
    resetQuiz,
  };
}
