import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Home, Play, BookOpen, Users, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

const TestSetup = () => {
  const [academias, setAcademias] = useState<Option[]>([]);
  const [temas, setTemas] = useState<Option[]>([]);
  const [academiaId, setAcademiaId] = useState<string>("");
  const [temaId, setTemaId] = useState<string>("");
  const [loadingAcademias, setLoadingAcademias] = useState(true);
  const [loadingTemas, setLoadingTemas] = useState(false);
  const [questionCount, setQuestionCount] = useState<number>(0);
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
      return;
    }

    const loadTemas = async () => {
      try {
        setLoadingTemas(true);
        const { data, error } = await supabase
          .from("temas")
          .select("id, nombre")
          .eq("academia_id", academiaId)
          .order("nombre");

        if (error) throw error;
        setTemas((data || []) as Option[]);
        setTemaId(""); // Reset tema selection
        setQuestionCount(0);
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

  // Load question count when tema changes
  useEffect(() => {
    if (!academiaId || !temaId) {
      setQuestionCount(0);
      return;
    }

    const loadQuestionCount = async () => {
      try {
        const { count, error } = await supabase
          .from("preguntas")
          .select("*", { count: "exact", head: true })
          .eq("academia_id", academiaId)
          .eq("tema_id", temaId);

        if (error) throw error;
        setQuestionCount(count || 0);
      } catch (err: any) {
        console.error("Error loading question count:", err);
        setQuestionCount(0);
      }
    };

    loadQuestionCount();
  }, [academiaId, temaId]);

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
    <main className="min-h-screen p-4 flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6">
        
        {/* Header with Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al Inicio
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
          </Button>
        </div>

        {/* Title Section */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-3 bg-primary/10 rounded-full">
              <Target className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Nuevo Test</h1>
          <p className="text-muted-foreground text-sm">
            Selecciona la academia y tema para comenzar
          </p>
        </div>

        {/* Main Setup Card */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Configuración del Test
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Academia Selection */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <label className="text-sm font-medium">Academia</label>
              </div>
              <Select 
                value={academiaId} 
                onValueChange={setAcademiaId}
                disabled={loadingAcademias}
              >
                <SelectTrigger className="w-full">
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

            {/* Tema Selection */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <label className="text-sm font-medium">Tema</label>
              </div>
              <Select 
                value={temaId} 
                onValueChange={setTemaId} 
                disabled={!academiaId || loadingTemas}
              >
                <SelectTrigger className="w-full">
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

            {/* Question Count Info */}
            {questionCount > 0 && (
              <div className="bg-muted/30 p-3 rounded-lg border border-muted">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Preguntas disponibles:</span>
                  <span className="font-medium text-primary">{questionCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Test incluirá:</span>
                  <span className="font-medium">
                    {Math.min(questionCount, 10)} preguntas
                  </span>
                </div>
              </div>
            )}

            {/* Warning if not enough questions */}
            {questionCount > 0 && questionCount < 10 && (
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ Este tema tiene menos de 10 preguntas. El test incluirá {questionCount} pregunta{questionCount !== 1 ? 's' : ''}.
                </p>
              </div>
            )}

            {/* No questions warning */}
            {academiaId && temaId && questionCount === 0 && (
              <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                <p className="text-sm text-red-800">
                  ❌ No hay preguntas disponibles para este tema. Selecciona otro tema.
                </p>
              </div>
            )}

            {/* Selection Summary */}
            {selectedAcademia && selectedTema && questionCount > 0 && (
              <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                <h4 className="font-medium text-sm mb-2">Resumen del Test:</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div><strong>Academia:</strong> {selectedAcademia.nombre}</div>
                  <div><strong>Tema:</strong> {selectedTema.nombre}</div>
                  <div><strong>Preguntas:</strong> {Math.min(questionCount, 10)}</div>
                  <div><strong>Duración estimada:</strong> 5-10 minutos</div>
                </div>
              </div>
            )}

            {/* Start Test Button */}
            <Button
              className="w-full"
              size="lg"
              disabled={!canStart}
              onClick={handleStartTest}
            >
              <Play className="mr-2 h-4 w-4" />
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

        {/* Quick Actions */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">¿Ya tienes preguntas falladas?</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/practice")}
            className="text-sm"
          >
            Practicar Preguntas Falladas
          </Button>
        </div>
      </div>
    </main>
  );
};

export default TestSetup;
