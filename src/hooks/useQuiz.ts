// src/hooks/useQuiz.ts - VERSIÓN SIMPLIFICADA SIN BUCLES INFINITOS
// ========================================
// MANTIENE 100% COMPATIBILIDAD + SELECCIÓN INTELIGENTE BÁSICA
// ========================================

import { useState, useCallback, useEffect, useRef } from "react";
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
  // Campos de progreso
  currentAcademiaId?: string;
  currentTemaId?: string;
  remainingQuestions?: number;
  specificQuestionIds?: string[];
}

export interface QuizStats {
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  percentage: number;
  averageTimePerQuestion: number;
  questionsAnswered: number;
  pointsEarned: number;
  remainingQuestionsInTopic?: number;
  originalFailedQuestionsCount?: number;
  questionsStillFailed?: string[];
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
  remainingQuestions: 0,
};

function shuffle<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// 🆕 NUEVA FUNCIÓN: Selección inteligente directa con Supabase
async function getSmartQuestions(userId: string, academiaId: string, temaId: string, limit: number = 10) {
  console.log("🧠 Getting smart questions:", { userId, academiaId, temaId, limit });
  
  try {
    // Intentar usar la nueva función RPC si existe
    const { data: smartQuestions, error: smartError } = await supabase
      .rpc('get_smart_preguntas', {
        p_user_id: userId,
        p_academia_id: academiaId,
        p_tema_id: temaId,
        p_limit: limit,
        p_days_threshold: 30,
        p_include_failed: true
      });

    if (!smartError && smartQuestions && smartQuestions.length > 0) {
      console.log("✅ Smart selection successful:", smartQuestions.length, "questions");
      return {
        questions: smartQuestions,
        method: 'smart' as const
      };
    } else {
      console.warn("⚠️ Smart selection failed, falling back to random:", smartError);
    }
  } catch (err) {
    console.warn("⚠️ Smart selection error, falling back to random:", err);
  }

  // FALLBACK: Usar función random tradicional
  const { data: randomQuestions, error: randomError } = await supabase
    .rpc('get_random_preguntas', {
      p_academia_id: academiaId,
      p_tema_id: temaId,
      p_limit: limit
    });

  if (randomError) throw randomError;
  
  console.log("🎲 Random selection used:", randomQuestions?.length || 0, "questions");
  return {
    questions: randomQuestions || [],
    method: 'random' as const
  };
}

// Función simplificada - mantener compatibilidad con preguntas_falladas
async function updateQuestionStatus(userId: string, questionId: string, isCorrect: boolean) {
  console.log("Updating question status:", { userId, questionId, isCorrect });
  
  if (!isCorrect) {
    // Agregar a preguntas falladas si es incorrecta
    const { error } = await supabase
      .from("preguntas_falladas")
      .upsert(
        { user_id: userId, pregunta_id: questionId },
        { onConflict: "user_id,pregunta_id", ignoreDuplicates: true }
      );
      
    if (error) {
      console.error("Error adding to failed questions:", error);
    }
  }
  
  console.log("Question status updated successfully");
}

export function useQuiz(
  mode: QuizMode, 
  academiaId?: string | null, 
  temaId?: string | null, 
  specificQuestionIds?: string[]
) {
  const [state, setState] = useState<QuizState>(initialState);
  const { user } = useAuth();
  const { toast } = useToast();
  
  // 🔧 REF para controlar cargas y evitar bucles infinitos
  const lastLoadParamsRef = useRef<string>('');
  const isLoadingRef = useRef(false);

  // Reset quiz state
  const resetQuiz = useCallback(() => {
    setState({
      ...initialState,
      startTime: Date.now(),
    });
    lastLoadParamsRef.current = '';
    isLoadingRef.current = false;
  }, []);

  // 🔧 FUNCIÓN INTERNA: Load questions (sin useCallback para evitar bucles)
  const loadQuestions = async () => {
    if (!user || isLoadingRef.current) {
      return;
    }

    try {
      isLoadingRef.current = true;
      setState(prev => ({ ...prev, isLoading: true }));
      console.log("🚀 Loading questions for mode:", mode, "user:", user.id);

      let questions: any[] = [];
      let sessionAcademiaId = academiaId;
      let sessionTemaId = temaId;

      // 🆕 LÓGICA DE SELECCIÓN
      if (specificQuestionIds && specificQuestionIds.length > 0) {
        // Preguntas específicas (análisis por temas)
        console.log("🎯 Loading specific questions:", specificQuestionIds.length);
        
        const { data: specificQuestions, error: specificError } = await supabase
          .from("preguntas")
          .select("*")
          .in("id", specificQuestionIds);

        if (specificError) throw specificError;
        if (!specificQuestions || specificQuestions.length === 0) {
          throw new Error("No se encontraron las preguntas específicas solicitadas");
        }

        questions = shuffle(specificQuestions);
        sessionAcademiaId = questions[0]?.academia_id || null;
        sessionTemaId = questions[0]?.tema_id || null;

      } else if (mode === "practice") {
        // Modo práctica - preguntas falladas
        console.log("🔄 Loading failed questions for practice");
        
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
        questions = shuffle(preguntas || []);

      } else if (academiaId && temaId) {
        // Modo test - selección inteligente
        // NUEVO ORDEN DE PRIORIDADES:
        // 🔥 PRIORIDAD 1: Preguntas nunca respondidas (contenido nuevo)
        // 📚 PRIORIDAD 2: Preguntas falladas (reforzar debilidades)  
        // 🔄 PRIORIDAD 3: Preguntas correctas hace >30 días (repaso)
        // ❌ EXCLUIR: Preguntas correctas recientes (<30 días)
        console.log("🧠 Using smart selection for test mode");
        
        const result = await getSmartQuestions(user.id, academiaId, temaId, 10);
        questions = result.questions;
        
        console.log(`✅ Loaded ${questions.length} questions using ${result.method} selection`);

      } else {
        throw new Error("Parámetros insuficientes para cargar preguntas");
      }

      // Verificar que tenemos preguntas
      if (!questions || questions.length === 0) {
        throw new Error("No se encontraron preguntas disponibles");
      }

      // Crear sesión si es posible
      let sessionId = null;
      if (sessionAcademiaId && sessionTemaId) {
        try {
          const { data: sessionData, error: sessionError } = await supabase
            .rpc("start_quiz_session", {
              p_user_id: user.id,
              p_academia_id: sessionAcademiaId,
              p_tema_id: sessionTemaId,
              p_mode: mode
            });

          if (sessionError) {
            console.warn("Session creation failed:", sessionError);
          } else {
            sessionId = sessionData;
            console.log("✅ Session created:", sessionId);
          }
        } catch (err) {
          console.warn("Could not create session:", err);
        }
      }

      // Actualizar estado
      setState(prev => ({ 
        ...prev, 
        sessionId,
        questions: questions as Pregunta[], 
        isLoading: false,
        startTime: Date.now(),
        specificQuestionIds: specificQuestionIds,
        currentAcademiaId: sessionAcademiaId,
        currentTemaId: sessionTemaId,
        remainingQuestions: questions.length
      }));

      console.log("✅ Questions loaded successfully:", questions.length);

    } catch (err: any) {
      console.error("❌ Error loading questions:", err);
      toast({ 
        title: "Error de carga", 
        description: err.message || "No se pudieron cargar las preguntas.",
        variant: "destructive"
      });
      setState(prev => ({ ...prev, isLoading: false }));
    } finally {
      isLoadingRef.current = false;
    }
  };

  // 🔧 EFECTO CONTROLADO para cargar preguntas
  useEffect(() => {
    if (!user) return;

    const params = `${mode}-${academiaId}-${temaId}-${JSON.stringify(specificQuestionIds)}`;
    
    if (lastLoadParamsRef.current !== params) {
      lastLoadParamsRef.current = params;
      console.log("🔄 Parameters changed, loading questions...");
      loadQuestions();
    }
  }, [user, mode, academiaId, temaId, JSON.stringify(specificQuestionIds)]);

  // Handle answer submission - MANTENIDO IGUAL
  const submitAnswer = useCallback(async (selectedLetter: string): Promise<boolean> => {
    if (!user || state.isRevealed || state.isAnswering || !state.questions[state.currentIndex]) {
      return false;
    }

    const currentQuestion = state.questions[state.currentIndex];
    const timeSpent = Math.round((Date.now() - state.startTime) / 1000);

    setState(prev => ({ ...prev, isAnswering: true, selectedAnswer: selectedLetter }));

    try {
      const isCorrect = currentQuestion.solucion_letra?.toUpperCase() === selectedLetter.toUpperCase();

      // Actualizar estado de la pregunta
      await updateQuestionStatus(user.id, currentQuestion.id, isCorrect);

      // Registrar en sesión si existe
      if (state.sessionId) {
        console.log("Recording answer in session:", {
          session: state.sessionId,
          question: currentQuestion.id,
          answer: selectedLetter,
          time: timeSpent
        });

        const { error } = await supabase
          .rpc("record_answer", {
            p_session_id: state.sessionId,
            p_pregunta_id: currentQuestion.id,
            p_selected_answer: selectedLetter,
            p_time_spent_seconds: timeSpent
          });

        if (error) {
          console.error("Error in RPC record_answer:", error);
        }
      }

      // Lógica legacy para preguntas_falladas
      if (mode === "practice") {
        if (isCorrect) {
          // Remove from failed questions if practicing and correct
          await supabase
            .from("preguntas_falladas")
            .delete()
            .eq("user_id", user.id)
            .eq("pregunta_id", currentQuestion.id);
        }
      } else if (mode === "test" && !isCorrect) {
        // Add to failed questions if test mode and incorrect
        await supabase
          .from("preguntas_falladas")
          .upsert(
            { user_id: user.id, pregunta_id: currentQuestion.id },
            { onConflict: "user_id,pregunta_id", ignoreDuplicates: true }
          );
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

  // Move to next question - MANTENIDO IGUAL
  const nextQuestion = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentIndex: prev.currentIndex + 1,
      selectedAnswer: null,
      isRevealed: false,
      isAnswering: false,
      startTime: Date.now(),
    }));
  }, []);

  // Complete quiz session - MANTENIDO IGUAL
  const completeQuiz = useCallback(async (): Promise<QuizStats | null> => {
    try {
      console.log("🔍 COMPLETING QUIZ:");
      console.log("- sessionId:", state.sessionId);
      console.log("- questions.length:", state.questions.length);
      console.log("- answers.length:", state.answers.length);
      console.log("- score:", state.score);
      console.log("- specificQuestionIds:", state.specificQuestionIds);

      let finalStats: QuizStats;

      if (state.sessionId) {
        const { data: stats, error } = await supabase
          .rpc("complete_quiz_session", {
            p_session_id: state.sessionId
          });

        if (error) {
          console.error("Error in RPC complete_quiz_session:", error);
          finalStats = getManualStats();
        } else {
          const statsData = stats as any;
          finalStats = {
            totalQuestions: statsData?.total_questions || state.questions.length,
            correctAnswers: statsData?.correct_answers || state.score,
            incorrectAnswers: statsData?.incorrect_answers || (state.answers.length - state.score),
            percentage: statsData?.score_percentage || 0,
            averageTimePerQuestion: state.answers.length > 0 
              ? Math.round(state.answers.reduce((sum, a) => sum + a.timeSpent, 0) / state.answers.length)
              : 0,
            questionsAnswered: state.answers.length,
            pointsEarned: statsData?.points_earned || (state.score * 10),
            remainingQuestionsInTopic: state.remainingQuestions ? state.remainingQuestions - state.score : 0,
            originalFailedQuestionsCount: state.specificQuestionIds?.length || 0,
            questionsStillFailed: state.answers.filter(a => !a.isCorrect).map(a => a.questionId)
          };
        }
      } else {
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

  // Helper function for manual stats calculation - MANTENIDO IGUAL
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
      remainingQuestionsInTopic: state.remainingQuestions ? state.remainingQuestions - state.score : 0,
      originalFailedQuestionsCount: state.specificQuestionIds?.length || 0,
      questionsStillFailed: state.answers.filter(a => !a.isCorrect).map(a => a.questionId)
    };
  }, [state]);

  // Funciones auxiliares - MANTENIDAS IGUALES
  const isQuizFinished = useCallback(() => {
    return state.currentIndex >= state.questions.length - 1 && state.answers.length === state.questions.length;
  }, [state]);

  const getCurrentQuestion = useCallback(() => {
    return state.questions[state.currentIndex] || null;
  }, [state.questions, state.currentIndex]);

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
      remainingQuestionsInTopic: state.remainingQuestions ? state.remainingQuestions - state.score : 0,
      originalFailedQuestionsCount: state.specificQuestionIds?.length || 0,
      questionsStillFailed: state.answers.filter(a => !a.isCorrect).map(a => a.questionId)
    };
  }, [state]);

  const getProgress = useCallback(() => {
    return state.questions.length > 0 ? ((state.currentIndex + 1) / state.questions.length) * 100 : 0;
  }, [state.currentIndex, state.questions.length]);

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

  return {
    // State original
    ...state,
    
    // Computed values
    currentQuestion: getCurrentQuestion(),
    progress: getProgress(),
    answerOptions: getAnswerOptions(),
    stats: getStats(),
    isFinished: isQuizFinished(),
    
    // Actions originales
    loadQuestions: useCallback(() => loadQuestions(), []), // Wrapper para compatibilidad
    submitAnswer,
    nextQuestion,
    completeQuiz,
    resetQuiz,
  };
}

// Hook for getting user statistics - MANTENIDO IGUAL
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
      setStats(data as unknown as UserStats);
    } catch (err: any) {
      console.error("Error loading user stats:", err);
      toast({
        title: "Error",
        description: "No se pudieron cargar las estadísticas.",
        variant: "destructive"
      });
      
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



