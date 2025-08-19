import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Home, Play, BookOpen, Users, Target, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

function setSEO(title: string, description: string) {
  document.title = title;
  const meta = document.querySelector('meta[name="description"]') || document.createElement("meta");
  meta.setAttribute("name", "description");
  meta.setAttribute("content", description);
  document.head.appendChild(meta);
}

type Option = { 
  id: string; 
  nombre: string;
  _count?: { preguntas: number }; // Para mostrar cantidad de preguntas
};

// 🆕 NUEVO: Interface para el progreso del tema
interface TopicProgress {
  totalQuestions: number;
  answeredQuestions: number;
  progressPercentage: number;
  pendingQuestions: number;
}

const TestSetup = () => {
  const { user } = useAuth();
  const [academias, setAcademias] = useState<Option[]>([]);
  const [temas, setTemas] = useState<Option[]>([]);
  const [academiaId, setAcademiaId] = useState<string>("");
  const [temaId, setTemaId] = useState<string>("");
  const [loadingAcademias, setLoadingAcademias] = useState(true);
  const [loadingTemas, setLoadingTemas] = useState(false);
  const [questionCount, setQuestionCount] = useState<number>(0);
  
  // 🆕 NUEVO: Estado para el progreso del tema
  const [topicProgress, setTopicProgress] = useState<TopicProgress | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    setSEO("Nuevo Test | Academy Quiz", "Elige academia y tema para comenzar un test de 10 preguntas aleatorias.");
  }, []);

  // Load academias on mount
  useEffect(() => {
    const loadAcademias = async () => {
      try {
        setLoadingAcademias(true);
        const { data, error } = await supabase
          .from("academias")
          .select("id, nombre")
          .order("nombre");

        if (error) throw error;
        setAcademias((data || []) as Option[]);
      } catch (err: any) {
        console.error("Error loading academias:", err);
        toast({ 
          title: "Error", 
          description: "No se pudieron cargar las academias.",
          variant: "destructive"
        });
      } finally {
        setLoadingAcademias(false);
      }
    };

    loadAcademias();
  }, [toast]);

  // Load temas when academia changes
  useEffect(() => {
    if (!academiaId) {
      setTemas([]);
      setTemaId("");
      setQuestionCount(0);
      setTopicProgress(null); // 🆕 NUEVO: Reset progress
      return;
    }

    const loadTemas = async () => {
      try {
        setLoadingTemas(true);
const { data, error } = await supabase
  .from("temas")
  .select(`
    id, 
    nombre,
    preguntas!inner(id)
  `)
  .eq("academia_id", academiaId)
  .order("nombre");

        if (error) throw error;
        setTemas((data || []) as Option[]);
        setTemaId(""); // Reset tema selection
        setQuestionCount(0);
        setTopicProgress(null); // 🆕 NUEVO: Reset progress
      } catch (err: any) {
        console.error("Error loading temas:", err);
        toast({ 
          title: "Error", 
          description: "No se pudieron cargar los temas.",
          variant: "destructive"
        });
      } finally {
        setLoadingTemas(false);
      }
    };

    loadTemas();
  }, [academiaId, toast]);

  // 🆕 NUEVA FUNCIÓN: Obtener progreso del tema
  const loadTopicProgress = async (temaId: string) => {
    if (!user || !temaId) {
      setTopicProgress(null);
      return;
    }

    try {
      setLoadingProgress(true);

      // 1. Obtener total de preguntas del tema
      const { count: totalQuestions, error: totalError } = await supabase
        .from("preguntas")
        .select("*", { count: "exact", head: true })
        .eq("tema_id", temaId);

      if (totalError) throw totalError;

      // 2. Obtener preguntas únicas respondidas por el usuario en este tema
      const { data: answeredQuestions, error: answeredError } = await supabase
        .from("user_answers")
        .select(`
          pregunta_id,
          preguntas!inner(tema_id)
        `)
        .eq("user_id", user.id)
        .eq("preguntas.tema_id", temaId);

      if (answeredError) throw answeredError;

      // 3. Obtener preguntas únicas (sin duplicados)
      const uniqueAnsweredQuestions = new Set(
        (answeredQuestions || []).map(answer => answer.pregunta_id)
      );

      const answeredCount = uniqueAnsweredQuestions.size;
      const total = totalQuestions || 0;
      const progressPercentage = total > 0 ? Math.round((answeredCount / total) * 100) : 0;
      const pendingQuestions = Math.max(0, total - answeredCount);

      setTopicProgress({
        totalQuestions: total,
        answeredQuestions: answeredCount,
        progressPercentage,
        pendingQuestions
      });

    } catch (err: any) {
      console.error("Error loading topic progress:", err);
      setTopicProgress(null);
    } finally {
      setLoadingProgress(false);
    }
  };

  // Load question count and progress when tema changes
  useEffect(() => {
    if (!academiaId || !temaId) {
      setQuestionCount(0);
      setTopicProgress(null);
      return;
    }

    const loadQuestionData = async () => {
      try {
        // Cargar total de preguntas para el contador existente
        const { count, error } = await supabase
          .from("preguntas")
          .select("*", { count: "exact", head: true })
          .eq("academia_id", academiaId)
          .eq("tema_id", temaId);

        if (error) throw error;
        const totalQuestions = count || 0;
        setQuestionCount(totalQuestions);

        // 🆕 NUEVO: Solo cargar progreso si hay preguntas disponibles
        if (totalQuestions > 0) {
          await loadTopicProgress(temaId);
        } else {
          setTopicProgress(null);
        }
        
      } catch (err: any) {
        console.error("Error loading question data:", err);
        setQuestionCount(0);
        setTopicProgress(null);
      }
    };

    loadQuestionData();
  }, [academiaId, temaId, user]);

  // 🆕 NUEVA FUNCIÓN: Obtener color de progreso
  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'from-blue-500 to-indigo-600';
    if (percentage >= 70) return 'from-green-500 to-emerald-600';
    if (percentage >= 50) return 'from-yellow-500 to-orange-500';
    return 'from-orange-500 to-red-500';
  };

  const canStart = useMemo(() => {
    return Boolean(academiaId && temaId && questionCount > 0);
  }, [academiaId, temaId, questionCount]);

  const selectedAcademia = useMemo(() => {
    return academias.find(a => a.id === academiaId);
  }, [academias, academiaId]);

  const selectedTema = useMemo(() => {
    return temas.find(t => t.id === temaId);
  }, [temas, temaId]);

  const handleStartTest = () => {
    if (!canStart) return;
    navigate(`/quiz?mode=test&academia=${academiaId}&tema=${temaId}`);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="relative">
        {/* Hero background with decorative elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-indigo-600/5 to-purple-600/5 dark:from-blue-400/5 dark:via-indigo-400/5 dark:to-purple-400/5"></div>
        <div className="absolute top-0 left-0 w-72 h-72 bg-gradient-to-br from-blue-400/20 to-indigo-600/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-indigo-400/20 to-purple-600/20 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
        
        <div className="relative p-6">
          <div className="max-w-2xl mx-auto space-y-8">
        
            {/* Header premium con glassmorphism */}
            <div className="flex items-center justify-between p-6 backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 rounded-2xl shadow-xl shadow-gray-500/10 border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/")}
                  className="flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors rounded-xl px-3 py-2"
                >
                  <ArrowLeft className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Volver al Inicio</span>
                </Button>
                <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300 dark:via-gray-600 to-transparent"></div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Nuevo Test
                  </h1>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="flex items-center gap-2 h-10 px-4 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 border border-gray-200 dark:border-gray-700 rounded-xl transition-all duration-200 hover:shadow-md"
              >
                <Home className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </Button>
            </div>

            {/* Main Setup Card with premium effects */}
            <Card className="backdrop-blur-sm bg-white/95 dark:bg-gray-800/95 shadow-xl shadow-gray-500/10 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-2xl transition-all duration-300">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-gray-200/50 dark:border-gray-700/50">
                <CardTitle className="text-xl flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                    <BookOpen className="h-6 w-6 text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent font-bold">
                    Configuración del Test
                  </span>
                </CardTitle>
              </CardHeader>
          
              <CardContent className="p-8 space-y-8">
                {/* Academia Selection with premium styling */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg">
                      <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <label className="text-base font-semibold text-gray-700 dark:text-gray-200">Academia</label>
                  </div>
                  <Select 
                    value={academiaId} 
                    onValueChange={setAcademiaId}
                    disabled={loadingAcademias}
                  >
                    <SelectTrigger className="w-full rounded-xl border-gray-200/50 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-all duration-200">
                  <SelectValue 
                    placeholder={
                      loadingAcademias 
                        ? "Cargando academias..." 
                        : "Selecciona una academia"
                    } 
                  />
                </SelectTrigger>
                <SelectContent>
                  {academias.map((academia) => (
                    <SelectItem key={academia.id} value={academia.id}>
                      {academia.nombre}
                    </SelectItem>
                  ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tema Selection with premium styling */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg">
                      <BookOpen className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <label className="text-base font-semibold text-gray-700 dark:text-gray-200">Tema</label>
                  </div>
                  <Select 
                    value={temaId} 
                    onValueChange={setTemaId} 
                    disabled={!academiaId || loadingTemas}
                  >
                    <SelectTrigger className="w-full rounded-xl border-gray-200/50 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-all duration-200">
                  <SelectValue 
                    placeholder={
                      !academiaId 
                        ? "Primero selecciona una academia"
                        : loadingTemas 
                        ? "Cargando temas..." 
                        : "Selecciona un tema"
                    } 
                  />
                </SelectTrigger>
                <SelectContent>
                  {temas.map((tema) => (
                    <SelectItem key={tema.id} value={tema.id}>
                      {tema.nombre}
                    </SelectItem>
                  ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 🆕 NUEVO: Progreso del Tema con premium design */}
                {topicProgress && !loadingProgress && questionCount > 0 && (
                  <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/50 dark:from-blue-900/30 dark:to-indigo-900/20 p-6 rounded-xl border border-blue-200/50 dark:border-blue-700/50 shadow-lg shadow-blue-500/5">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg">
                          <BarChart3 className="h-5 w-5 text-white" />
                        </div>
                        <h4 className="font-bold text-base text-blue-800 dark:text-blue-200">Tu Progreso en este Tema</h4>
                      </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground flex items-center gap-1">
                        📚 Preguntas Respondidas
                        {topicProgress.pendingQuestions > 0 && (
                          <span className="text-blue-600 dark:text-blue-400 font-medium">
                            ({topicProgress.pendingQuestions} pendientes)
                          </span>
                        )}
                      </span>
                      <span className="font-bold text-sm">
                        {topicProgress.answeredQuestions}/{topicProgress.totalQuestions}
                      </span>
                    </div>
                    
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 shadow-inner">
                      <div 
                        className={cn(
                          "h-2.5 rounded-full transition-all duration-500 ease-out shadow-sm bg-gradient-to-r",
                          getProgressColor(topicProgress.progressPercentage)
                        )}
                        style={{ width: `${topicProgress.progressPercentage}%` }}
                      />
                    </div>
                    
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">
                        {topicProgress.progressPercentage}% completado
                      </span>
                      <span className="text-muted-foreground">
                        {topicProgress.pendingQuestions === 0 ? (
                          <span className="text-green-600 dark:text-green-400 font-medium">
                            ✅ Tema completado
                          </span>
                        ) : (
                          `${topicProgress.pendingQuestions} por hacer`
                        )}
                      </span>
                    </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Loading Progress Indicator with premium design */}
                {loadingProgress && temaId && questionCount > 0 && (
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 p-5 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                      <span className="font-medium">Cargando progreso...</span>
                    </div>
                  </div>
                )}

                {/* Question Count Info with premium styling */}
                {questionCount > 0 && (
                  <div className="bg-gradient-to-r from-emerald-50/50 to-blue-50/30 dark:from-emerald-900/10 dark:to-blue-900/10 p-4 rounded-xl border border-emerald-200/50 dark:border-emerald-700/50 shadow-sm">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400 font-medium">Preguntas disponibles:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base">{questionCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="text-gray-600 dark:text-gray-400 font-medium">Test incluirá:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {Math.min(questionCount, 10)} preguntas
                      </span>
                    </div>
                  </div>
                )}

                {/* Warning if not enough questions with premium styling */}
                {questionCount > 0 && questionCount < 10 && (
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200/50 dark:border-yellow-700/50 p-5 rounded-xl shadow-lg shadow-yellow-500/5">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                      ⚠️ Este tema tiene menos de 10 preguntas. El test incluirá {questionCount} pregunta{questionCount !== 1 ? 's' : ''}.
                    </p>
                  </div>
                )}

                {/* No questions warning with premium styling */}
                {academiaId && temaId && questionCount === 0 && (
                  <div className="bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border border-red-200/50 dark:border-red-700/50 p-5 rounded-xl shadow-lg shadow-red-500/5">
                    <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                      ❌ No hay preguntas disponibles para este tema. Selecciona otro tema.
                    </p>
                  </div>
                )}

                {/* Selection Summary with premium design */}
                {selectedAcademia && selectedTema && questionCount > 0 && (
                  <div className="bg-gradient-to-r from-emerald-50/80 to-blue-50/50 dark:from-emerald-900/20 dark:to-blue-900/20 p-6 rounded-xl border border-emerald-200/50 dark:border-emerald-700/50 shadow-lg shadow-emerald-500/5">
                    <h4 className="font-bold text-base mb-3 text-emerald-800 dark:text-emerald-200">Resumen del Test:</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400 font-medium">Academia:</span> <span className="font-semibold text-gray-800 dark:text-gray-200">{selectedAcademia.nombre}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400 font-medium">Tema:</span> <span className="font-semibold text-gray-800 dark:text-gray-200">{selectedTema.nombre}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400 font-medium">Preguntas:</span> <span className="font-semibold text-blue-600 dark:text-blue-400">{Math.min(questionCount, 10)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400 font-medium">Duración estimada:</span> <span className="font-semibold text-emerald-600 dark:text-emerald-400">5-10 minutos</span></div>
                    </div>
                  </div>
                )}

                {/* Start Test Button with gradient effects */}
                <Button
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 h-14 rounded-xl font-semibold text-base"
                  size="lg"
                  disabled={!canStart}
                  onClick={handleStartTest}
                >
                  <Play className="mr-3 h-5 w-5" />
                  {!academiaId 
                    ? "Selecciona una academia" 
                    : !temaId 
                    ? "Selecciona un tema"
                    : questionCount === 0
                    ? "Sin preguntas disponibles"
                    : "Comenzar Test"
                  }
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions with premium styling */}
            <div className="text-center space-y-3">
              <p className="text-base text-gray-600 dark:text-gray-400 font-medium">¿Ya tienes preguntas falladas?</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/practice")}
                className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 border border-gray-200 dark:border-gray-700 rounded-xl transition-all duration-200 hover:shadow-md font-medium"
              >
                Practicar Preguntas Falladas
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default TestSetup;
