// src/hooks/useQuestionSelection.ts
// ========================================
// HOOK PARA SELECCIÓN INTELIGENTE DE PREGUNTAS
// Sistema de prioridades para evitar repeticiones
// ========================================

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface SmartPregunta {
  id: string;
  academia_id: string;
  tema_id: string;
  parte?: string | null;
  pregunta_texto: string;
  opcion_a: string;
  opcion_b: string;
  opcion_c?: string | null;
  opcion_d?: string | null;
  solucion_letra: string;
  created_at: string;
  priority_level: number;
  days_since_correct: number;
  times_answered: number;
}

export interface QuestionSelectionConfig {
  daysThreshold: number;           // Días para considerar una pregunta "antigua"
  includeFailedQuestions: boolean; // Incluir preguntas falladas
  prioritizeNeverAnswered: boolean; // Priorizar preguntas nunca respondidas
  enableSmartSelection: boolean;   // Usar selección inteligente vs. aleatoria
}

export interface QuestionSelectionResult {
  questions: SmartPregunta[];
  metadata: {
    failedQuestions: number;
    neverAnswered: number;
    oldCorrect: number;
    totalAvailable: number;
    selectionMethod: 'smart' | 'random' | 'specific';
  };
}

const DEFAULT_CONFIG: QuestionSelectionConfig = {
  daysThreshold: 30,
  includeFailedQuestions: true,
  prioritizeNeverAnswered: true,
  enableSmartSelection: true,
};

function shuffle<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function useQuestionSelection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<QuestionSelectionConfig>(DEFAULT_CONFIG);

  /**
   * Selección inteligente usando el nuevo sistema de prioridades
   */
  const getSmartQuestions = useCallback(async (
    academiaId: string,
    temaId: string,
    limit: number = 10,
    customConfig?: Partial<QuestionSelectionConfig>
  ): Promise<QuestionSelectionResult> => {
    if (!user) throw new Error("Usuario no autenticado");

    const effectiveConfig = { ...config, ...customConfig };
    
    try {
      setLoading(true);
      console.log("🧠 Getting smart questions:", { 
        academiaId, 
        temaId, 
        limit, 
        config: effectiveConfig 
      });

      const { data, error } = await supabase.rpc('get_smart_preguntas', {
        p_user_id: user.id,
        p_academia_id: academiaId,
        p_tema_id: temaId,
        p_limit: limit,
        p_days_threshold: effectiveConfig.daysThreshold,
        p_include_failed: effectiveConfig.includeFailedQuestions
      });

      if (error) throw error;

      const questions = (data || []) as SmartPregunta[];
      
      // Calcular metadata
      const metadata = {
        failedQuestions: questions.filter(q => q.priority_level === 1).length,
        neverAnswered: questions.filter(q => q.priority_level === 2).length,
        oldCorrect: questions.filter(q => q.priority_level === 3).length,
        totalAvailable: questions.length,
        selectionMethod: 'smart' as const
      };

      console.log("🧠 Smart selection result:", metadata);

      return {
        questions: shuffle(questions), // Shuffle para evitar patrones
        metadata
      };

    } catch (err: any) {
      console.error("Error in smart question selection:", err);
      toast({
        title: "Error",
        description: "Error al seleccionar preguntas inteligentes. Usando método aleatorio.",
        variant: "destructive"
      });
      
      // Fallback a método aleatorio
      return await getRandomQuestions(academiaId, temaId, limit);
    } finally {
      setLoading(false);
    }
  }, [user, config, toast]);

  /**
   * Método aleatorio tradicional (fallback)
   */
  const getRandomQuestions = useCallback(async (
    academiaId: string,
    temaId: string,
    limit: number = 10
  ): Promise<QuestionSelectionResult> => {
    if (!user) throw new Error("Usuario no autenticado");

    try {
      console.log("🎲 Getting random questions (fallback):", { academiaId, temaId, limit });

      const { data, error } = await supabase.rpc('get_random_preguntas', {
        p_academia_id: academiaId,
        p_tema_id: temaId,
        p_limit: limit
      });

      if (error) throw error;

      const questions = (data || []).map(q => ({
        ...q,
        priority_level: 0,
        days_since_correct: 0,
        times_answered: 0
      })) as SmartPregunta[];

      return {
        questions,
        metadata: {
          failedQuestions: 0,
          neverAnswered: 0,
          oldCorrect: 0,
          totalAvailable: questions.length,
          selectionMethod: 'random' as const
        }
      };

    } catch (err: any) {
      console.error("Error in random question selection:", err);
      throw err;
    }
  }, [user]);

  /**
   * Obtener preguntas específicas por IDs (para análisis por temas)
   */
  const getSpecificQuestions = useCallback(async (
    questionIds: string[]
  ): Promise<QuestionSelectionResult> => {
    if (!user) throw new Error("Usuario no autenticado");

    try {
      setLoading(true);
      console.log("🎯 Getting specific questions:", questionIds);

      const { data, error } = await supabase
        .from('preguntas')
        .select('*')
        .in('id', questionIds);

      if (error) throw error;

      const questions = (data || []).map(q => ({
        ...q,
        priority_level: 1, // Todas son de alta prioridad en modo específico
        days_since_correct: 0,
        times_answered: 0
      })) as SmartPregunta[];

      return {
        questions: shuffle(questions),
        metadata: {
          failedQuestions: questions.length,
          neverAnswered: 0,
          oldCorrect: 0,
          totalAvailable: questions.length,
          selectionMethod: 'specific' as const
        }
      };

    } catch (err: any) {
      console.error("Error in specific question selection:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Obtener preguntas falladas tradicional (mantener compatibilidad)
   */
  const getFailedQuestions = useCallback(async (
    limit: number = 10
  ): Promise<QuestionSelectionResult> => {
    if (!user) throw new Error("Usuario no autenticado");

    try {
      setLoading(true);
      console.log("🔄 Getting failed questions (traditional):", { limit });

      // Obtener IDs de preguntas falladas
      const { data: falladas, error: falladasError } = await supabase
        .from("preguntas_falladas")
        .select("pregunta_id")
        .eq("user_id", user.id);

      if (falladasError) throw falladasError;

      const preguntaIds = (falladas || []).map(f => f.pregunta_id);
      
      if (preguntaIds.length === 0) {
        throw new Error("No hay preguntas falladas para practicar");
      }

      // Obtener las preguntas
      const { data: preguntas, error: preguntasError } = await supabase
        .from("preguntas")
        .select("*")
        .in("id", preguntaIds)
        .limit(limit);

      if (preguntasError) throw preguntasError;

      const questions = (preguntas || []).map(q => ({
        ...q,
        priority_level: 1,
        days_since_correct: 999,
        times_answered: 0
      })) as SmartPregunta[];

      return {
        questions: shuffle(questions),
        metadata: {
          failedQuestions: questions.length,
          neverAnswered: 0,
          oldCorrect: 0,
          totalAvailable: preguntaIds.length,
          selectionMethod: 'specific' as const
        }
      };

    } catch (err: any) {
      console.error("Error in failed question selection:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Método principal que decide qué estrategia usar
   */
  const selectQuestions = useCallback(async (
    mode: 'test' | 'practice',
    academiaId?: string,
    temaId?: string,
    specificQuestionIds?: string[],
    limit: number = 10,
    customConfig?: Partial<QuestionSelectionConfig>
  ): Promise<QuestionSelectionResult> => {
    
    // Si hay preguntas específicas, usarlas
    if (specificQuestionIds && specificQuestionIds.length > 0) {
      return await getSpecificQuestions(specificQuestionIds);
    }

    // Modo práctica tradicional
    if (mode === 'practice' && (!academiaId || !temaId)) {
      return await getFailedQuestions(limit);
    }

    // Modo test o práctica con academia/tema específicos
    if (academiaId && temaId) {
      const effectiveConfig = { ...config, ...customConfig };
      
      if (effectiveConfig.enableSmartSelection) {
        return await getSmartQuestions(academiaId, temaId, limit, customConfig);
      } else {
        return await getRandomQuestions(academiaId, temaId, limit);
      }
    }

    throw new Error("Parámetros insuficientes para seleccionar preguntas");
  }, [config, getSmartQuestions, getRandomQuestions, getSpecificQuestions, getFailedQuestions]);

  return {
    // Configuración
    config,
    setConfig,
    
    // Estado
    loading,
    
    // Métodos principales
    selectQuestions,
    
    // Métodos específicos
    getSmartQuestions,
    getRandomQuestions,
    getSpecificQuestions,
    getFailedQuestions,
  };
}