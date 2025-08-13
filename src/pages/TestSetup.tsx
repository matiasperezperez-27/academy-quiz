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

// CAMBIO: La estructura del tipo Option se usará para almacenar el conteo
type Option = {
  id: string;
  nombre: string;
  // Hacemos el _count no opcional para los temas
  _count: { preguntas: number };
};

// CAMBIO: Tipo específico para academias, ya que no necesitan el conteo
type AcademiaOption = Omit<Option, '_count'>;

const TestSetup = () => {
  const [academias, setAcademias] = useState<AcademiaOption[]>([]);
  // CAMBIO: El estado de temas ahora será del tipo Option completo
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

  // Load academias on mount (Sin cambios aquí)
  useEffect(() => {
    const loadAcademias = async () => {
      try {
        setLoadingAcademias(true);
        const { data, error } = await supabase
          .from("academias")
          .select("id, nombre")
          .order("nombre");

        if (error) throw error;
        setAcademias((data || []) as AcademiaOption[]);
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

  // CAMBIO 1: Modificamos el useEffect que carga los temas para que también traiga el conteo de preguntas
  useEffect(() => {
    if (!academiaId) {
      setTemas([]);
      setTemaId("");
      setQuestionCount(0);
      return;
    }

    const loadTemasWithCount = async () => {
      try {
        setLoadingTemas(true);
        // La magia está aquí: `preguntas(count)` cuenta las preguntas relacionadas
        const { data, error } = await supabase
          .from("temas")
          .select("id, nombre, preguntas(count)")
          .eq("academia_id", academiaId)
          .order("nombre");

        if (error) throw error;

        // Transformamos los datos para que se ajusten a nuestro tipo Option
        const temasConConteo = (data || []).map(tema => ({
          id: tema.id,
          nombre: tema.nombre,
          // Supabase devuelve `preguntas` como un array, accedemos a su primer elemento
          _count: {
            preguntas: (tema.preguntas[0]?.count || 0) as number
          }
        }));
        
        setTemas(temasConConteo);
        setTemaId(""); // Reset tema selection
        setQuestionCount(0); // Reset count
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

    loadTemasWithCount();
  }, [academiaId, toast]);

  // ELIMINADO: Este useEffect ya no es necesario, lo borramos por completo.
  /*
  useEffect(() => {
    if (!academiaId || !temaId) {
      setQuestionCount(0);
      return;
    }
    const loadQuestionCount = async () => { ... };
    loadQuestionCount();
  }, [academiaId, temaId]);
  */

  // CAMBIO 2: Ahora, cuando cambia el temaId, simplemente actualizamos el contador desde los datos que ya tenemos.
  useEffect(() => {
    if (temaId) {
      const temaSeleccionado = temas.find(t => t.id === temaId);
      if (temaSeleccionado) {
        setQuestionCount(temaSeleccionado._count.preguntas);
      }
    } else {
      // Si se deselecciona el tema, reseteamos el contador
      setQuestionCount(0);
    }
  }, [temaId, temas]);


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

  // El resto del JSX no necesita cambios, ya que depende del estado `questionCount` que ahora se actualizará correctamente.
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
                    // CAMBIO 3: Mostramos el conteo en el desplegable, ¡un extra útil!
                    <SelectItem key={tema.id} value={tema.id}>
                      <div className="flex justify-between w-full">
                        <span>{tema.nombre}</span>
                        <span className="text-muted-foreground text-xs pr-2">
                          ({tema._count.preguntas} preg.)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Question Count Info (Esto ahora funcionará correctamente) */}
            {temaId && !loadingTemas && (
              <>
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
                {questionCount === 0 && (
                  <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                    <p className="text-sm text-red-800">
                      ❌ No hay preguntas disponibles para este tema. Selecciona otro.
                    </p>
                  </div>
                )}
              </>
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
