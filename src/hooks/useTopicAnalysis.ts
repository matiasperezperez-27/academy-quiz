// ========================================
// HOOK COMPLETO PARA ANÁLISIS POR TEMAS - VERSIÓN FINAL
// ========================================

import { useState, useEffect, useCallback } from "react";
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
  
  // Campos adicionales para el sistema de confianza
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

      // 🎯 PASO 1: Obtener TODAS las preguntas únicas que el usuario ha respondido
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

      console.log('🔍 TOTAL DE RESPUESTAS:', preguntasRespondidasRaw?.length || 0);

      // 🎯 PASO 2: Agrupar por PREGUNTA ÚNICA para eliminar duplicados
      const preguntasUnicasMap = new Map();

      preguntasRespondidasRaw?.forEach(answer => {
        const preguntaId = answer.pregunta_id;
        const pregunta = answer.preguntas;
        
        // Si es la primera vez que vemos esta pregunta, la agregamos
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
        
        // Actualizar estado de la pregunta
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
        
        // Mantener la respuesta más reciente
        if (new Date(answer.answered_at) > new Date(preguntaUnica.ultimaRespuesta)) {
          preguntaUnica.ultimaRespuesta = answer.answered_at;
        }
      });

      console.log('🎯 PREGUNTAS ÚNICAS RESPONDIDAS:', preguntasUnicasMap.size);

      // 🎯 PASO 3: Obtener TODOS los temas que el usuario ha tocado
      const temasRespondidos = [...new Set(Array.from(preguntasUnicasMap.values()).map(p => p.tema_id))];
      console.log('📚 TEMAS RESPONDIDOS:', temasRespondidos.length);

      // 🎯 PASO 4: Obtener el TOTAL de preguntas por tema del temario completo
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

      // Contar preguntas totales por tema
      const conteoTemario = new Map();
      const infoTemas = new Map();

      totalPreguntasPorTema?.forEach(pregunta => {
        const temaId = pregunta.tema_id;
        
        // Contar total de preguntas del tema
        conteoTemario.set(temaId, (conteoTemario.get(temaId) || 0) + 1);
        
        // Guardar info del tema
        if (!infoTemas.has(temaId)) {
          infoTemas.set(temaId, {
            tema_nombre: pregunta.temas.nombre,
            academia_id: pregunta.temas.academia_id,
            academia_nombre: pregunta.temas.academias.nombre
          });
        }
      });

      console.log('📊 CONTEO DEL TEMARIO:', Object.fromEntries(conteoTemario));

      // 🎯 PASO 5: Agrupar preguntas únicas por tema
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
        
        // 🎯 CONTAR PREGUNTA ÚNICA (cada pregunta cuenta solo 1 vez)
        tema.preguntasUnicasRespondidas++;
        
        if (preguntaUnica.tieneAlMenosUnAcierto) {
          tema.preguntasConAcierto++;
        } else {
          tema.preguntasSoloErrores++;
        }
        
        // Agregar sesiones
        preguntaUnica.sesiones.forEach(s => tema.sesionesTotales.add(s));
        tema.scoresAcumulados.push(...preguntaUnica.scores);
        
        // Actualizar última actividad
        if (!tema.ultimaActividad || new Date(preguntaUnica.ultimaRespuesta) > new Date(tema.ultimaActividad)) {
          tema.ultimaActividad = preguntaUnica.ultimaRespuesta;
        }
      });

      // 🎯 PASO 6: Obtener preguntas falladas actuales (para práctica dirigida)
      const { data: preguntasFalladas, error: falladasError } = await supabase
        .from('preguntas_falladas')
        .select(`
          pregunta_id,
          preguntas!inner(tema_id)
        `)
        .eq('user_id', user.id);

      if (falladasError) throw falladasError;

      // Agrupar preguntas falladas por tema
      const falladasPorTema = new Map();
      preguntasFalladas?.forEach(fallada => {
        const temaId = fallada.preguntas.tema_id;
        if (!falladasPorTema.has(temaId)) {
          falladasPorTema.set(temaId, []);
        }
        falladasPorTema.get(temaId).push(fallada.pregunta_id);
      });

      // 🎯 PASO 7: Generar estadísticas finales corregidas
      const estadisticasFinales = Array.from(statsPorTema.values()).map(tema => {
        const preguntasUnicasRespondidas = tema.preguntasUnicasRespondidas;
        const preguntasConAcierto = tema.preguntasConAcierto;
        const totalPreguntasTemario = tema.totalPreguntasEnTemario;
        const preguntasPendientes = Math.max(0, totalPreguntasTemario - preguntasUnicasRespondidas);
        
        // 🎯 PORCENTAJE DE DOMINIO (preguntas con acierto / preguntas respondidas)
        const porcentajeDominio = preguntasUnicasRespondidas > 0 
          ? Math.round((preguntasConAcierto / preguntasUnicasRespondidas) * 100) 
          : 0;
        
        // 🎯 PROGRESO DEL TEMARIO (preguntas respondidas / total del temario)
        const progresoTemario = totalPreguntasTemario > 0 
          ? Math.round((preguntasUnicasRespondidas / totalPreguntasTemario) * 100) 
          : 0;
        
        // Días sin repasar
        const diasSinRepasar = tema.ultimaActividad 
          ? Math.floor((new Date().getTime() - new Date(tema.ultimaActividad).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        const preguntasFalladasIds = falladasPorTema.get(tema.tema_id) || [];

        // 🎯 LOGGING PARA DEBUG
        console.log(`\n📈 TEMA: ${tema.tema_nombre}`);
        console.log(`   🎯 Preguntas únicas respondidas: ${preguntasUnicasRespondidas}`);
        console.log(`   ✅ Preguntas con acierto: ${preguntasConAcierto}`);
        console.log(`   ❌ Preguntas solo errores: ${tema.preguntasSoloErrores}`);
        console.log(`   📚 Total en temario: ${totalPreguntasTemario}`);
        console.log(`   ⏳ Preguntas pendientes: ${preguntasPendientes}`);
        console.log(`   🎯 Porcentaje dominio: ${porcentajeDominio}%`);
        console.log(`   📊 Progreso temario: ${progresoTemario}%`);
        console.log(`   🚨 Preguntas falladas: ${preguntasFalladasIds.length}`);

        return {
          tema_id: tema.tema_id,
          tema_nombre: tema.tema_nombre,
          academia_id: tema.academia_id,
          academia_nombre: tema.academia_nombre,
          
          // 🎯 VALORES CORREGIDOS
          total_respondidas: preguntasUnicasRespondidas,        // ✅ Preguntas únicas del temario respondidas
          total_correctas: preguntasConAcierto,                 // ✅ Preguntas con al menos 1 acierto
          total_incorrectas: tema.preguntasSoloErrores,         // ✅ Preguntas que solo tienen errores
          porcentaje_acierto: porcentajeDominio,                // ✅ % de dominio de las respondidas
          
          // 🎯 NUEVOS CAMPOS PARA EL PROGRESO DEL TEMARIO
          total_preguntas_temario: totalPreguntasTemario,       // ✅ Total de preguntas del tema completo
          preguntas_pendientes: preguntasPendientes,            // ✅ Preguntas que faltan por hacer
          progreso_temario: progresoTemario,                    // ✅ % de completitud del temario
          
          nivel_dominio: getNivelDominio(porcentajeDominio, tema.sesionesTotales.size, diasSinRepasar),
          ultima_respuesta: tema.ultimaActividad,
          preguntas_falladas_ids: preguntasFalladasIds,
          
          // Campos adicionales
          intentos_totales: tema.sesionesTotales.size,
          ultimos_intentos: tema.scoresAcumulados.slice(-5).map(s => Math.round(s)),
          dias_sin_repasar: diasSinRepasar
        };
      });

      console.log('\n🎉 RESUMEN FINAL:');
      estadisticasFinales.forEach(tema => {
        console.log(`${tema.tema_nombre}: ${tema.total_respondidas}/${tema.total_preguntas_temario} (${tema.progreso_temario}%) - Dominio: ${tema.porcentaje_acierto}%`);
      });

      // Obtener academias para filtros
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

  // 🔄 FUNCIÓN PARA REINICIAR PROGRESO DE UN TEMA ESPECÍFICO
  const resetSpecificTopicData = useCallback(async (temaId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      // 1. Obtener IDs de preguntas del tema
      const { data: preguntasIds, error: preguntasError } = await supabase
        .from('preguntas')
        .select('id')
        .eq('tema_id', temaId);

      if (preguntasError) throw preguntasError;

      const questionIds = preguntasIds?.map(p => p.id) || [];

      if (questionIds.length === 0) {
        throw new Error('No se encontraron preguntas para este tema');
      }

      console.log(`🗑️ Reiniciando tema ${temaId}, ${questionIds.length} preguntas`);

      // 2. Eliminar respuestas del usuario para estas preguntas
      const { error: answersError } = await supabase
        .from('user_answers')
        .delete()
        .eq('user_id', user.id)
        .in('pregunta_id', questionIds);

      if (answersError) {
        console.warn('Error eliminando respuestas:', answersError);
      }

      // 3. Eliminar preguntas falladas
      const { error: falladasError } = await supabase
        .from('preguntas_falladas')
        .delete()
        .eq('user_id', user.id)
        .in('pregunta_id', questionIds);

      if (falladasError) {
        console.warn('Error eliminando preguntas falladas:', falladasError);
      }

      // 4. Eliminar sesiones del tema
      const { error: sessionsError } = await supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', user.id)
        .eq('tema_id', temaId);

      if (sessionsError) {
        console.warn('Error eliminando sesiones:', sessionsError);
      }

      console.log('✅ Progreso del tema reiniciado exitosamente');
      return true;
    } catch (error) {
      console.error('Error in resetSpecificTopicData:', error);
      return false;
    }
  }, [user]);

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
    refreshData: loadTopicAnalysis,
    resetSpecificTopicData
  };
}

// ========================================
// HOOK PARA SISTEMA DE CELEBRACIONES
// ========================================

export function useCelebrationSystem(topicStats: TopicStats[]) {
  const [celebrationQueue, setCelebrationQueue] = useState<any[]>([]);
  const [currentCelebration, setCurrentCelebration] = useState<any>(null);
  const [processedTopics, setProcessedTopics] = useState<Set<string>>(new Set());

  // Detectar nuevos logros
  useEffect(() => {
    if (!topicStats.length) return;

    const newAchievements: any[] = [];

    topicStats.forEach(topic => {
      const topicKey = `${topic.tema_id}-${topic.progreso_temario}-${topic.porcentaje_acierto}`;
      
      if (processedTopics.has(topicKey)) return;

      // 🎉 COMPLETADO AL 100%
      if (topic.progreso_temario === 100 && topic.porcentaje_acierto === 100) {
        newAchievements.push({
          type: 'Dominado',
          topicId: topic.tema_id,
          topicName: topic.tema_nombre,
          accuracy: topic.porcentaje_acierto,
          attempts: topic.intentos_totales,
          previousLevel: 'En Progreso'
        });
      }
      // 🎯 PROGRESO SIGNIFICATIVO (opcional)
      else if (topic.progreso_temario >= 80 && topic.porcentaje_acierto >= 90) {
        newAchievements.push({
          type: 'Casi Dominado',
          topicId: topic.tema_id,
          topicName: topic.tema_nombre,
          accuracy: topic.porcentaje_acierto,
          attempts: topic.intentos_totales,
          previousLevel: 'En Progreso'
        });
      }

      setProcessedTopics(prev => new Set([...prev, topicKey]));
    });

    if (newAchievements.length > 0) {
      setCelebrationQueue(prev => [...prev, ...newAchievements]);
    }
  }, [topicStats, processedTopics]);

  // Procesar cola de celebraciones
  useEffect(() => {
    if (celebrationQueue.length > 0 && !currentCelebration) {
      const [nextCelebration, ...rest] = celebrationQueue;
      setCurrentCelebration(nextCelebration);
      setCelebrationQueue(rest);
    }
  }, [celebrationQueue, currentCelebration]);

  const dismissCurrentCelebration = () => {
    setCurrentCelebration(null);
  };

  const resetTopicFromCelebrations = (topicId: string) => {
    // Remover el tema de las celebraciones procesadas para que pueda celebrarse de nuevo
    setProcessedTopics(prev => {
      const newSet = new Set(prev);
      // Remover todas las entradas que contengan este topicId
      Array.from(newSet).forEach(key => {
        if (key.startsWith(topicId)) {
          newSet.delete(key);
        }
      });
      return newSet;
    });
  };

  return {
    currentCelebration,
    dismissCurrentCelebration,
    hasPendingCelebrations: celebrationQueue.length > 0,
    resetTopicFromCelebrations
  };
}

// ========================================
// FUNCIONES AUXILIARES EXPORTADAS
// ========================================

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

export const getRandomMotivationalMessage = (type: string): string => {
  const messages = {
    'Dominado': [
      "¡Increíble! Has demostrado un dominio excepcional. 🌟",
      "¡Excelencia pura! Este tema ya no tiene secretos para ti. 🚀",
      "¡Maestría alcanzada! Tu dedicación ha dado frutos. 🏆"
    ],
    'Casi Dominado': [
      "¡Excelente progreso! Solo un poco más y lo dominarás. 💪",
      "¡Impresionante! Estás en el camino correcto. ⭐",
      "¡Fantástico! La maestría está al alcance. 🎯"
    ]
  };
  
  const typeMessages = messages[type as keyof typeof messages];
  if (!typeMessages) return "¡Felicidades por tu progreso!";
  
  return typeMessages[Math.floor(Math.random() * typeMessages.length)];
};