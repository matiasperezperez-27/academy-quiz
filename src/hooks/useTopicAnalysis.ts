// ========================================
// HOOK ANÁLISIS POR TEMAS - VERSIÓN SIMPLIFICADA Y SEGURA
// ========================================

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface TopicStats {
  tema_id: string;
  tema_nombre: string;
  academia_id: string;
  academia_nombre: string;
  total_respondidas: number;              // Preguntas únicas respondidas
  total_correctas: number;                // Preguntas con al menos 1 acierto
  total_incorrectas: number;              // Preguntas que solo tienen errores
  porcentaje_acierto: number;             // % de dominio de las respondidas
  nivel_dominio: 'Dominado' | 'Casi Dominado' | 'En Progreso' | 'Necesita Práctica';
  ultima_respuesta: string | null;
  preguntas_falladas_ids: string[];
  
  // Campos para progreso del temario
  total_preguntas_temario: number;        // Total de preguntas del tema completo
  preguntas_pendientes: number;           // Preguntas que faltan por hacer
  progreso_temario: number;               // % de completitud del temario
  
  // Campos adicionales
  intentos_totales: number;
  ultimos_intentos: number[];
  dias_sin_repasar: number;
}

export interface TopicAnalysisFilters {
  academia_id?: string;
  ordenar_por: 'nombre' | 'porcentaje_asc' | 'porcentaje_desc' | 'total_desc' | 'incorrectas_desc';
  solo_con_errores: boolean;
}

// Función auxiliar para determinar nivel de dominio
const getNivelDominio = (porcentaje: number, intentos: number, diasSinRepasar: number): TopicStats['nivel_dominio'] => {
  if (porcentaje >= 90 && intentos >= 2) return 'Dominado';
  if (porcentaje >= 80 && intentos >= 3) return 'Casi Dominado';
  if (porcentaje >= 70) return 'En Progreso';
  return 'Necesita Práctica';
};

export function useTopicAnalysis() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [topicStats, setTopicStats] = useState<TopicStats[]>([]);
  const [academias, setAcademias] = useState<Array<{id: string; nombre: string}>>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TopicAnalysisFilters>({
    ordenar_por: 'porcentaje_asc',
    solo_con_errores: false
  });

  const loadTopicAnalysis = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      // 1. Obtener todas las respuestas del usuario
      const { data: preguntasRespondidasRaw, error: statsError } = await supabase
        .from('user_answers')
        .select(`
          pregunta_id,
          is_correct,
          answered_at,
          session_id,
          preguntas!inner(
            id,
            tema_id,
            academia_id,
            temas!inner(nombre),
            academias!inner(nombre)
          ),
          user_sessions(score_percentage)
        `)
        .eq('user_id', user.id);

      if (statsError) throw statsError;

      // 2. Agrupar por pregunta única para eliminar duplicados
      const preguntasUnicasMap = new Map();

      preguntasRespondidasRaw?.forEach(answer => {
        const preguntaId = answer.pregunta_id;
        const pregunta = answer.preguntas;
        
        if (!preguntasUnicasMap.has(preguntaId)) {
          preguntasUnicasMap.set(preguntaId, {
            pregunta_id: preguntaId,
            tema_id: pregunta.tema_id,
            academia_id: pregunta.academia_id,
            tema_nombre: pregunta.temas.nombre,
            academia_nombre: pregunta.academias.nombre,
            tieneAlMenosUnAcierto: false,
            ultimaRespuesta: answer.answered_at,
            totalIntentos: 0,
            sesiones: new Set(),
            scores: []
          });
        }

        const preguntaUnica = preguntasUnicasMap.get(preguntaId);
        
        if (answer.is_correct) {
          preguntaUnica.tieneAlMenosUnAcierto = true;
        }
        
        preguntaUnica.totalIntentos++;
        
        if (answer.session_id) {
          preguntaUnica.sesiones.add(answer.session_id);
        }
        
        if (answer.user_sessions?.score_percentage) {
          preguntaUnica.scores.push(answer.user_sessions.score_percentage);
        }
        
        if (new Date(answer.answered_at) > new Date(preguntaUnica.ultimaRespuesta)) {
          preguntaUnica.ultimaRespuesta = answer.answered_at;
        }
      });

      // 3. Obtener temas que el usuario ha respondido
      const temasRespondidos = [...new Set(Array.from(preguntasUnicasMap.values()).map(p => p.tema_id))];

      // 4. Obtener total de preguntas por tema
      const { data: totalPreguntasPorTema, error: totalError } = await supabase
        .from('preguntas')
        .select(`
          tema_id,
          temas!inner(
            nombre,
            academia_id,
            academias!inner(nombre)
          )
        `)
        .in('tema_id', temasRespondidos);

      if (totalError) throw totalError;

      // 5. Contar preguntas totales por tema
      const conteoTemario = new Map();
      const infoTemas = new Map();

      totalPreguntasPorTema?.forEach(pregunta => {
        const temaId = pregunta.tema_id;
        conteoTemario.set(temaId, (conteoTemario.get(temaId) || 0) + 1);
        
        if (!infoTemas.has(temaId)) {
          infoTemas.set(temaId, {
            tema_nombre: pregunta.temas.nombre,
            academia_id: pregunta.temas.academia_id,
            academia_nombre: pregunta.temas.academias.nombre
          });
        }
      });

      // 6. Agrupar preguntas únicas por tema
      const statsPorTema = new Map();

      Array.from(preguntasUnicasMap.values()).forEach(preguntaUnica => {
        const temaId = preguntaUnica.tema_id;
        
        if (!statsPorTema.has(temaId)) {
          const infoTema = infoTemas.get(temaId);
          statsPorTema.set(temaId, {
            tema_id: temaId,
            tema_nombre: infoTema?.tema_nombre || preguntaUnica.tema_nombre,
            academia_id: infoTema?.academia_id || preguntaUnica.academia_id,
            academia_nombre: infoTema?.academia_nombre || preguntaUnica.academia_nombre,
            preguntasUnicasRespondidas: 0,
            preguntasConAcierto: 0,
            preguntasSoloErrores: 0,
            ultimaActividad: null,
            sesionesTotales: new Set(),
            scoresAcumulados: [],
            totalPreguntasEnTemario: conteoTemario.get(temaId) || 0
          });
        }

        const tema = statsPorTema.get(temaId);
        tema.preguntasUnicasRespondidas++;
        
        if (preguntaUnica.tieneAlMenosUnAcierto) {
          tema.preguntasConAcierto++;
        } else {
          tema.preguntasSoloErrores++;
        }
        
        preguntaUnica.sesiones.forEach(s => tema.sesionesTotales.add(s));
        tema.scoresAcumulados.push(...preguntaUnica.scores);
        
        if (!tema.ultimaActividad || new Date(preguntaUnica.ultimaRespuesta) > new Date(tema.ultimaActividad)) {
          tema.ultimaActividad = preguntaUnica.ultimaRespuesta;
        }
      });

      // 7. Obtener preguntas falladas actuales
      const { data: preguntasFalladas, error: falladasError } = await supabase
        .from('preguntas_falladas')
        .select(`
          pregunta_id,
          preguntas!inner(tema_id)
        `)
        .eq('user_id', user.id);

      if (falladasError) throw falladasError;

      const falladasPorTema = new Map();
      preguntasFalladas?.forEach(fallada => {
        const temaId = fallada.preguntas.tema_id;
        if (!falladasPorTema.has(temaId)) {
          falladasPorTema.set(temaId, []);
        }
        falladasPorTema.get(temaId).push(fallada.pregunta_id);
      });

      // 8. Generar estadísticas finales
      const estadisticasFinales = Array.from(statsPorTema.values()).map(tema => {
        const preguntasUnicasRespondidas = tema.preguntasUnicasRespondidas;
        const preguntasConAcierto = tema.preguntasConAcierto;
        const totalPreguntasTemario = tema.totalPreguntasEnTemario;
        const preguntasPendientes = Math.max(0, totalPreguntasTemario - preguntasUnicasRespondidas);
        
        const porcentajeDominio = preguntasUnicasRespondidas > 0 
          ? Math.round((preguntasConAcierto / preguntasUnicasRespondidas) * 100) 
          : 0;
        
        const progresoTemario = totalPreguntasTemario > 0 
          ? Math.round((preguntasUnicasRespondidas / totalPreguntasTemario) * 100) 
          : 0;
        
        const diasSinRepasar = tema.ultimaActividad 
          ? Math.floor((new Date().getTime() - new Date(tema.ultimaActividad).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        const preguntasFalladasIds = falladasPorTema.get(tema.tema_id) || [];

        return {
          tema_id: tema.tema_id,
          tema_nombre: tema.tema_nombre,
          academia_id: tema.academia_id,
          academia_nombre: tema.academia_nombre,
          total_respondidas: preguntasUnicasRespondidas,
          total_correctas: preguntasConAcierto,
          total_incorrectas: tema.preguntasSoloErrores,
          porcentaje_acierto: porcentajeDominio,
          total_preguntas_temario: totalPreguntasTemario,
          preguntas_pendientes: preguntasPendientes,
          progreso_temario: progresoTemario,
          nivel_dominio: getNivelDominio(porcentajeDominio, tema.sesionesTotales.size, diasSinRepasar),
          ultima_respuesta: tema.ultimaActividad,
          preguntas_falladas_ids: preguntasFalladasIds,
          intentos_totales: tema.sesionesTotales.size,
          ultimos_intentos: tema.scoresAcumulados.slice(-5).map(s => Math.round(s)),
          dias_sin_repasar: diasSinRepasar
        };
      });

      // 9. Obtener academias para filtros
      const { data: academiasData } = await supabase
        .from('academias')
        .select('id, nombre')
        .order('nombre');

      setTopicStats(estadisticasFinales);
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

  // Función para reiniciar progreso de un tema
  const resetSpecificTopicData = useCallback(async (temaId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data: preguntasIds, error: preguntasError } = await supabase
        .from('preguntas')
        .select('id')
        .eq('tema_id', temaId);

      if (preguntasError) throw preguntasError;

      const questionIds = preguntasIds?.map(p => p.id) || [];
      if (questionIds.length === 0) return false;

      // Eliminar respuestas
      await supabase
        .from('user_answers')
        .delete()
        .eq('user_id', user.id)
        .in('pregunta_id', questionIds);

      // Eliminar preguntas falladas
      await supabase
        .from('preguntas_falladas')
        .delete()
        .eq('user_id', user.id)
        .in('pregunta_id', questionIds);

      // Eliminar sesiones
      await supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', user.id)
        .eq('tema_id', temaId);

      return true;
    } catch (error) {
      console.error('Error resetting topic:', error);
      return false;
    }
  }, [user]);

  // Aplicar filtros y ordenación
  const filteredStats = useCallback(() => {
    let filtered = [...topicStats];

    if (filters.academia_id) {
      filtered = filtered.filter(topic => topic.academia_id === filters.academia_id);
    }

    if (filters.solo_con_errores) {
      filtered = filtered.filter(topic => topic.total_incorrectas > 0);
    }

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
    refreshData: loadTopicAnalysis,
    resetSpecificTopicData
  };
}

// Funciones auxiliares exportadas
export const getNivelIcon = (nivel: string) => {
  switch (nivel) {
    case 'Dominado': return '🏆';
    case 'Casi Dominado': return '⭐';
    case 'En Progreso': return '📈';
    case 'Necesita Práctica': return '📚';
    default: return '❓';
  }
};

export const getNivelColor = (nivel: string) => {
  switch (nivel) {
    case 'Dominado': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    case 'Casi Dominado': return 'text-blue-600 bg-blue-100 border-blue-200';
    case 'En Progreso': return 'text-green-600 bg-green-100 border-green-200';
    case 'Necesita Práctica': return 'text-red-600 bg-red-100 border-red-200';
    default: return 'text-gray-600 bg-gray-100 border-gray-200';
  }
};