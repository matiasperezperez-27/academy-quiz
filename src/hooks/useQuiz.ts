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
  sessionId: string | null;
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
  pointsEarned: number;
}

export interface UserStats {
  total_sessions: number;
  completed_sessions: number;
  total_questions_answered: number;
  total_correct_answers: number;
  overall_accuracy_percentage: number;
  current_failed_questions: number;
  best_session_score_percentage: number;
  last_activity: string | null;
  points: number;
}

const initialState: QuizState = {
  sessionId: null,
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

  // Load questions and start session
  const loadQuestions = useCallback(async () => {
    if (!user) {
      console.error("No user found");
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true }));
      console.log("Loading questions for mode:", mode, "user:", user.id);

      if (mode === "test") {
        if (!academiaId || !temaId) {
          throw new Error("Se requiere seleccionar academia y tema para el modo test");
        }

        // FIXED: Added p_user_id parameter!
        console.log("Starting quiz session with params:", {
          p_user_id: user.id,
          p_academia_id: academiaId,
          p_tema_id: temaId,
          p_mode: mode
        });

        const { data: sessionId, error: sessionError } = await supabase
          .rpc("start_quiz_session", {
            p_user_id: user.id,  // FIXED: Added this parameter
            p_academia_id: academiaId,
            p_tema_id: temaId,
            p_mode: mode
          });

        if (sessionError) {
          console.error("Session creation error:", sessionError);
          throw sessionError;
        }

        console.log("Session created:", sessionId);

        // Get random questions
        const { data: questions, error: questionsError } = await supabase
          .rpc("get_random_preguntas", {
            p_academia_id: academiaId,
            p_tema_id: temaId,
            p_limit: 10,
          });

        if (questionsError) throw questionsError;
        if (!questions || questions.length === 0) {
          throw new Error("No se encontraron preguntas para esta academia y tema");
        }

        console.log("Questions loaded:", questions.length);

        setState(prev => ({ 
          ...prev, 
          sessionId,
          questions: questions as Pregunta[], 
          isLoading: false,
          startTime: Date.now()
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

        // FIXED: Added p_user_id parameter for practice mode too!
        console.log("Starting practice session for user:", user.id);
        
        const { data: sessionId, error: sessionError } = await supabase
          .rpc("start_quiz_session", {
            p_user_id: user.id,  // FIXED: Added this parameter
            p_academia_id: preguntas[0]?.academia_id || null,
            p_tema_id: preguntas[0]?.tema_id || null,
            p_mode: mode
          });

        if (sessionError) {
          console.warn("No se pudo crear sesión para práctica:", sessionError);
          // Continue without session for practice mode
        } else {
          console.log("Practice session created:", sessionId);
        }

        setState(prev => ({ 
          ...prev, 
          sessionId: sessionId || null,
          questions: shuffle(preguntas as Pregunta[] || []), 
          isLoading: false,
          startTime: Date.now()
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
      throw err;
    }
  }, [mode, academiaId, temaId, user, toast]);

  // Handle answer submission using RPC function
  const submitAnswer = useCallback(async (selectedLetter: string): Promise<boolean> => {
    if (!user || state.isRevealed || state.isAnswering || !state.questions[state.currentIndex]) {
      return false;
    }

    const currentQuestion = state.questions[state.currentIndex];
    const timeSpent = Math.round((Date.now() - state.startTime) / 1000);

    setState(prev => ({ ...prev, isAnswering: true, selectedAnswer: selectedLetter }));

    try {
      let isCorrect = false;

      if (state.sessionId) {
        // Use RPC function to record answer
        console.log("Recording answer:", {
          session: state.sessionId,
          question: currentQuestion.id,
          answer: selectedLetter,
          time: timeSpent
        });

        const { data: rpcResult, error } = await supabase
          .rpc("record_answer", {
            p_session_id: state.sessionId,
            p_pregunta_id: currentQuestion.id,
            p_selected_answer: selectedLetter,
            p_time_spent_seconds: timeSpent
          });

        if (error) {
          console.error("Error in RPC record_answer:", error);
          // Fallback to manual logic
          isCorrect = currentQuestion.solucion_letra?.toUpperCase() === selectedLetter.toUpperCase();
        } else {
          isCorrect = rpcResult as boolean;
          console.log("Answer recorded, is correct:", isCorrect);
        }
      } else {
        // Manual logic when no session
        console.log("No session, using manual logic");
        isCorrect = currentQuestion.solucion_letra?.toUpperCase() === selectedLetter.toUpperCase();
        
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
      }

      // Record answer locally
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
        isAnswering: false,
      }));

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
      startTime: Date.now(), // Reset timer for next question
    }));
  }, []);

  // Complete quiz session
  const completeQuiz = useCallback(async (): Promise<QuizStats | null> => {
    try {
      console.log("Completing quiz, session:", state.sessionId);
      let finalStats: QuizStats;

      if (state.sessionId) {
        // Use RPC function to complete session
        const { data: stats, error } = await supabase
          .rpc("complete_quiz_session", {
            p_session_id: state.sessionId
          });

        if (error) {
          console.error("Error in RPC complete_quiz_session:", error);
          // Fallback to manual calculation
          finalStats = getManualStats();
        } else {
          console.log("Session completed, stats:", stats);
          finalStats = {
            totalQuestions: stats.total_questions || state.questions.length,
            correctAnswers: stats.correct_answers || state.score,
            incorrectAnswers: stats.incorrect_answers || (state.answers.length - state.score),
            percentage: stats.score_percentage || 0,
            averageTimePerQuestion: state.answers.length > 0 
              ? Math.round(state.answers.reduce((sum, a) => sum + a.timeSpent, 0) / state.answers.length)
              : 0,
            questionsAnswered: state.answers.length,
            pointsEarned: stats.points_earned || (state.score * 10),
          };
        }
      } else {
        // Manual calculation
        console.log("No session, using manual stats");
        finalStats = getManualStats();
        
        // Update points manually
        if (user && state.score > 0) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("puntos")
            .eq("id", user.id)
            .single();
          
          const currentPoints = profile?.puntos || 0;
          const newPoints = currentPoints + (state.score * 10);
          
          await supabase
            .from("profiles")
            .update({ puntos: newPoints })
            .eq("id", user.id);
          
          console.log("Points updated:", currentPoints, "->", newPoints);
        }
      }

      // Mark the quiz as finished in state
      setState(prev => ({ ...prev, sessionId: null }));

      return finalStats;
    } catch (err: any) {
      console.error("Error completing quiz:", err);
      toast({ 
        title: "Error", 
        description: "Hubo un problema al completar el quiz.",
        variant: "destructive"
      });
      return getManualStats();
    }
  }, [state, user, toast]);

  // Helper function for manual stats calculation
  const getManualStats = useCallback((): QuizStats => {
    return {
      totalQuestions: state.questions.length,
      correctAnswers: state.score,
      incorrectAnswers: state.answers.length - state.score,
      percentage: state.answers.length > 0 ? Math.round((state.score / state.answers.length) * 100) : 0,
      averageTimePerQuestion: state.answers.length > 0 
        ? Math.round(state.answers.reduce((sum, a) => sum + a.timeSpent, 0) / state.answers.length)
        : 0,
      questionsAnswered: state.answers.length,
      pointsEarned: state.score * 10,
    };
  }, [state]);

  // Check if quiz is finished
  const isQuizFinished = useCallback(() => {
    return state.currentIndex >= state.questions.length - 1 && state.answers.length === state.questions.length;
  }, [state]);

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
      pointsEarned: state.score * 10,
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
    completeQuiz,
    resetQuiz,
  };
}

// Hook for getting user statistics
export function useUserStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadStats = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log("Loading user stats for:", user.id);
      
      const { data, error } = await supabase
        .rpc("get_user_stats", {
          p_user_id: user.id
        });

      if (error) {
        console.error("Error loading stats:", error);
        throw error;
      }
      
      console.log("User stats loaded:", data);
      setStats(data as UserStats);
    } catch (err: any) {
      console.error("Error loading user stats:", err);
      toast({
        title: "Error",
        description: "No se pudieron cargar las estadísticas.",
        variant: "destructive"
      });
      
      // Set empty stats as fallback
      setStats({
        total_sessions: 0,
        completed_sessions: 0,
        total_questions_answered: 0,
        total_correct_answers: 0,
        overall_accuracy_percentage: 0,
        current_failed_questions: 0,
        best_session_score_percentage: 0,
        last_activity: null,
        points: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    loading,
    refreshStats: loadStats,
  };
}
