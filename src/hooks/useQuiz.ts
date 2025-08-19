// src/hooks/useQuiz.ts - VERSIÓN MEJORADA CON SELECCIÓN INTELIGENTE
// ========================================
// MANTIENE 100% COMPATIBILIDAD + NUEVAS FUNCIONALIDADES
// ========================================

import { useState, useCallback, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useQuestionSelection, type SmartPregunta } from "@/hooks/useQuestionSelection";

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
  // 🆕 NUEVOS CAMPOS PARA SELECCIÓN INTELIGENTE
  selectionMetadata?: {
    failedQuestions: number;
    neverAnswered: number;
    oldCorrect: number;
    selectionMethod: 'smart' | 'random' | 'specific';
  };
  smartSelectionEnabled?: boolean;
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
  smartSelectionEnabled: true, // 🆕 Por defecto habilitado
};

// Función auxiliar para convertir SmartPregunta a Pregunta
function convertSmartPregunta(smartQ: SmartPregunta): Pregunta {
  return {
    id: smartQ.id,
    pregunta_texto: smartQ.pregunta_texto,
    opcion_a: smartQ.opcion_a,
    opcion_b: smartQ.opcion_b,
    opcion_c: smartQ.opcion_c,
    opcion_d: smartQ.opcion_d,
    solucion_letra: smartQ.solucion_letra,
    tema_id: smartQ.tema_id,
    academia_id: smartQ.academia_id,
    parte: smartQ.parte,
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
  
  // 🆕 NUEVO: Hook de selección inteligente
  const questionSelection = useQuestionSelection();

  // Reset quiz state
  const resetQuiz = useCallback(() => {
    setState({
      ...initialState,
      startTime: Date.now(),
    });
  }, []);

  // 🆕 NUEVO: Toggle selección inteligente
  const toggleSmartSelection = useCallback((enabled: boolean) => {
    setState(prev => ({ ...prev, smartSelectionEnabled: enabled }));
    questionSelection.setConfig(prev => ({ ...prev, enableSmartSelection: enabled }));
  }, [questionSelection]);

  // 🔧 MEJORADO: Load questions con selección inteligente
  const loadQuestions = useCallback(async () => {
    if (!user) {
      console.error("No user found");
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true }));
      console.log("🚀 Loading questions for mode:", mode, "user:", user.id);
      console.log("🚀 Smart selection enabled:", state.smartSelectionEnabled);

      let result;
      let sessionAcademiaId = academiaId;
      let sessionTemaId = temaId;

      // 🆕 USAR SELECCIÓN INTELIGENTE
      if (state.smartSelectionEnabled) {
        console.log("🧠 Using smart question selection");
        
        result = await questionSelection.selectQuestions(
          mode,
          academiaId,
          temaId,
          specificQuestionIds,
          10, // limit
          {
            daysThreshold: 30,
            includeFailedQuestions: true,
            enableSmartSelection: true
          }
        );

        // Si tenemos preguntas específicas, extraer academia y tema de la primera pregunta
        if (specificQuestionIds && result.questions.length > 0) {
          sessionAcademiaId = result.questions[0].academia_id;
          sessionTemaId = result.questions[0].tema_id;
        }

      } else {
        // 🔄 FALLBACK: Lógica tradicional
        console.log("🎲 Using traditional question selection");
        
        if (specificQuestionIds && specificQuestionIds.length > 0) {
          result = await questionSelection.getSpecificQuestions(specificQuestionIds);
          sessionAcademiaId = result.questions[0]?.academia_id;
          sessionTemaId = result.questions[0]?.tema_id;
        } else if (mode === "practice" && (!academiaId || !temaId)) {
          result = await questionSelection.getFailedQuestions(10);
        } else if (academiaId && temaId) {
          result = await questionSelection.getRandomQuestions(academiaId, temaId, 10);
        } else {
          throw new Error("Parámetros insuficientes para cargar preguntas");
        }
      }

      // Verificar que tenemos preguntas
      if (!result.questions || result.questions.length === 0) {
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

      // Convertir preguntas y actualizar estado
      const convertedQuestions = result.questions.map(convertSmartPregunta);

      setState(prev => ({ 
        ...prev, 
        sessionId,
        questions: convertedQuestions, 
        isLoading: false,
        startTime: Date.now(),
        specificQuestionIds: specificQuestionIds,
        currentAcademiaId: sessionAcademiaId,
        currentTemaId: sessionTemaId,
        remainingQuestions: result.metadata.totalAvailable,
        selectionMetadata: result.metadata // 🆕 METADATA DE SELECCIÓN
      }));

      console.log("✅ Questions loaded successfully:");
      console.log("- Total:", convertedQuestions.length);
      console.log("- Selection method:", result.metadata.selectionMethod);
      console.log("- Failed questions:", result.metadata.failedQuestions);
      console.log("- Never answered:", result.metadata.neverAnswered);
      console.log("- Old correct:", result.metadata.oldCorrect);

    } catch (err: any) {
      console.error("❌ Error loading questions:", err);
      toast({ 
        title: "Error de carga", 
        description: err.message || "No se pudieron cargar las preguntas.",
        variant: "destructive"
      });
      setState(prev => ({ ...prev, isLoading: false }));
      throw err;
    }
  }, [mode, academiaId, temaId, specificQuestionIds, user, toast, questionSelection, state.smartSelectionEnabled]);

  // Resto de funciones mantienen la misma lógica...
  // (submitAnswer, nextQuestion, completeQuiz, etc.)

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

  // Auto-load questions when dependencies change
  useEffect(() => {
    if (user) {
      loadQuestions();
    }
  }, [user, loadQuestions]);

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
    loadQuestions,
    submitAnswer,
    nextQuestion,
    completeQuiz,
    resetQuiz,
    
    // 🆕 NUEVAS FUNCIONALIDADES
    toggleSmartSelection,
    questionSelectionLoading: questionSelection.loading,
    questionSelectionConfig: questionSelection.config,
    setQuestionSelectionConfig: questionSelection.setConfig,
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



