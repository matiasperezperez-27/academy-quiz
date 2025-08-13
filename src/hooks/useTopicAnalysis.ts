// src/hooks/useTopicAnalysis.ts
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface TopicStats {
  tema_id: string;
  tema_nombre: string;
  academia_id: string;
  academia_nombre: string;
  total_respondidas: number;
  total_correctas: number;
  total_incorrectas: number;
  porcentaje_acierto: number;
  nivel_dominio: 'Dominado' | 'Casi Dominado' | 'En Progreso' | 'Necesita Práctica';
  ultima_respuesta: string | null;
  preguntas_falladas_ids: string[];
  // NUEVAS PROPIEDADES para el sistema de confianza
  intentos_totales: number;
  ultimos_intentos: number[];
  dias_sin_repasar: number;
}

export interface TopicAnalysisFilters {
  academia_id?: string;
  ordenar_por: 'nombre' | 'porcentaje_asc' | 'porcentaje_desc' | 'total_desc' | 'incorrectas_desc';
  solo_con_errores: boolean;
}

export function useTopicAnalysis() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [topicStats, setTopicStats] = useState<TopicStats[]>([]);
  const [academias, setAcademias] = useState<Array<{id: string; nombre: string}>>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TopicAnalysisFilters>({
    ordenar_por: 'porcentaje_asc', // Mostrar primero los que necesitan más práctica
    solo_con_errores: false
  });

  const getNivelDominio = (porcentaje: number, intentos: number, diasSinRepasar: number): TopicStats['nivel_dominio'] => {
    // Sistema de Confianza Progresivo - CRITERIOS ACTUALIZADOS
    if (porcentaje >= 90 && intentos >= 2) return 'Dominado';
    if (porcentaje >= 80 && intentos >= 3) return 'Casi Dominado';
    if (porcentaje >= 70) return 'En Progreso';
    return 'Necesita Práctica';
  };

  const loadTopicAnalysis = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Consulta principal para obtener estadísticas por tema CON SESIONES
      const { data: rawStats, error: statsError } = await supabase
        .from('user_answers')
        .select(`
          is_correct,
          answered_at,
          session_id,
          preguntas!inner(
            id,
            tema_id,
            academia_id,
            temas!inner(
              nombre
            ),
            academias!inner(
              nombre
            )
          ),
          user_sessions!inner(
            created_at,
            score_percentage
          )
        `)
        .eq('user_id', user.id);

      if (statsError) throw statsError;

      // Obtener preguntas falladas para práctica dirigida
      const { data: preguntasFalladas, error: falladasError } = await supabase
        .from('preguntas_falladas')
        .select(`
          pregunta_id,
          preguntas!inner(
            tema_id,
            temas!inner(nombre),
            academias!inner(nombre)
          )
        `)
        .eq('user_id', user.id);

      if (falladasError) throw falladasError;

      const falladasSet = new Set((preguntasFalladas || []).map(f => f.pregunta_id));

      // Procesar datos por tema
      const statsMap = new Map<string, {
        tema_id: string;
        tema_nombre: string;
        academia_id: string;
        academia_nombre: string;
        correctas: number;
        incorrectas: number;
        ultima_respuesta: string | null;
        preguntas_falladas: Set<string>;
        sesiones: Set<string>;
        ultimas_sesiones_scores: number[];
      }>();

      rawStats?.forEach(answer => {
        const pregunta = answer.preguntas;
        const temaId = pregunta.tema_id;
        
        if (!statsMap.has(temaId)) {
          statsMap.set(temaId, {
            tema_id: temaId,
            tema_nombre: pregunta.temas.nombre,
            academia_id: pregunta.academia_id,
            academia_nombre: pregunta.academias.nombre,
            correctas: 0,
            incorrectas: 0,
            ultima_respuesta: null,
            preguntas_falladas: new Set(),
            sesiones: new Set(),
            ultimas_sesiones_scores: []
          });
        }

        const tema = statsMap.get(temaId)!;
        
        if (answer.is_correct) {
          tema.correctas++;
        } else {
          tema.incorrectas++;
          tema.preguntas_falladas.add(pregunta.id);
        }

        // Tracking de sesiones y scores
        if (answer.session_id) {
          tema.sesiones.add(answer.session_id);
          if (answer.user_sessions?.score_percentage !== null) {
            tema.ultimas_sesiones_scores.push(answer.user_sessions.score_percentage);
          }
        }

        // Actualizar última respuesta
        if (!tema.ultima_respuesta || new Date(answer.answered_at) > new Date(tema.ultima_respuesta)) {
          tema.ultima_respuesta = answer.answered_at;
        }

        // SOLO agregar de preguntas_falladas (para ser consistente con useQuiz)
        if (falladasSet.has(pregunta.id)) {
          tema.preguntas_falladas.add(pregunta.id);
        }
      });

      // Convertir a array final
      const processedStats: TopicStats[] = Array.from(statsMap.values()).map(tema => {
        const total = tema.correctas + tema.incorrectas;
        const porcentaje = total > 0 ? Math.round((tema.correctas / total) * 100) : 0;
        
        // Calcular días sin repasar
        const diasSinRepasar = tema.ultima_respuesta 
          ? Math.floor((new Date().getTime() - new Date(tema.ultima_respuesta).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        // Obtener últimos 5 scores de sesiones
        const ultimosScores = tema.ultimas_sesiones_scores
          .slice(-5) // Últimos 5
          .map(score => Math.round(score));

        const intentosTotales = tema.sesiones.size;
        
        return {
          tema_id: tema.tema_id,
          tema_nombre: tema.tema_nombre,
          academia_id: tema.academia_id,
          academia_nombre: tema.academia_nombre,
          total_respondidas: total,
          total_correctas: tema.correctas,
          total_incorrectas: tema.incorrectas,
          porcentaje_acierto: porcentaje,
          nivel_dominio: getNivelDominio(porcentaje, intentosTotales, diasSinRepasar),
          ultima_respuesta: tema.ultima_respuesta,
          preguntas_falladas_ids: Array.from(tema.preguntas_falladas),
          // NUEVOS CAMPOS
          intentos_totales: intentosTotales,
          ultimos_intentos: ultimosScores,
          dias_sin_repasar: diasSinRepasar
        };
      });

      // Obtener lista de academias para filtros
      const { data: academiasData } = await supabase
        .from('academias')
        .select('id, nombre')
        .order('nombre');

      setTopicStats(processedStats);
      setAcademias(academiasData || []);

    } catch (error: any) {
      console.error('Error loading topic analysis:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el análisis por temas.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Aplicar filtros y ordenación
  const filteredStats = useCallback(() => {
    let filtered = [...topicStats];

    // Filtrar por academia
    if (filters.academia_id) {
      filtered = filtered.filter(topic => topic.academia_id === filters.academia_id);
    }

    // Filtrar solo temas con errores
    if (filters.solo_con_errores) {
      filtered = filtered.filter(topic => topic.total_incorrectas > 0);
    }

    // Ordenar
    switch (filters.ordenar_por) {
      case 'nombre':
        filtered.sort((a, b) => a.tema_nombre.localeCompare(b.tema_nombre));
        break;
      case 'porcentaje_asc':
        filtered.sort((a, b) => a.porcentaje_acierto - b.porcentaje_acierto);
        break;
      case 'porcentaje_desc':
        filtered.sort((a, b) => b.porcentaje_acierto - a.porcentaje_acierto);
        break;
      case 'total_desc':
        filtered.sort((a, b) => b.total_respondidas - a.total_respondidas);
        break;
      case 'incorrectas_desc':
        filtered.sort((a, b) => b.total_incorrectas - a.total_incorrectas);
        break;
    }

    return filtered;
  }, [topicStats, filters]);

  useEffect(() => {
    loadTopicAnalysis();
  }, [loadTopicAnalysis]);

  return {
    topicStats: filteredStats(),
    academias,
    loading,
    filters,
    setFilters,
    refreshData: loadTopicAnalysis
  };
}