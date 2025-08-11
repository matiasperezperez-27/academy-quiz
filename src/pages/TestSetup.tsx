import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

function setSEO(title: string, description: string) {
  document.title = title;
  const meta = document.querySelector('meta[name="description"]') || document.createElement("meta");
  meta.setAttribute("name", "description");
  meta.setAttribute("content", description);
  document.head.appendChild(meta);
}

type Option = { id: string; nombre: string };

const TestSetup = () => {
  const [academias, setAcademias] = useState<Option[]>([]);
  const [temas, setTemas] = useState<Option[]>([]);
  const [academiaId, setAcademiaId] = useState<string>("");
  const [temaId, setTemaId] = useState<string>("");
  const [loadingTemas, setLoadingTemas] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    setSEO("Nuevo Test | Academy Quiz", "Elige academia y tema para comenzar un test de 10 preguntas aleatorias.");
  }, []);

  useEffect(() => {
    supabase
      .from("academias")
      .select("id,nombre")
      .order("nombre")
      .then(({ data, error }) => {
        if (error) {
          toast({ title: "Error", description: error.message });
          return;
        }
        setAcademias((data || []) as any);
      });
  }, [toast]);

  useEffect(() => {
    if (!academiaId) {
      setTemas([]);
      setTemaId("");
      return;
    }
    setLoadingTemas(true);
    supabase
      .from("temas")
      .select("id,nombre")
      .eq("academia_id", academiaId)
      .order("nombre")
      .then(({ data, error }) => {
        setLoadingTemas(false);
        if (error) {
          toast({ title: "Error", description: error.message });
          return;
        }
        setTemas((data || []) as any);
      });
  }, [academiaId, toast]);

  const canStart = useMemo(() => Boolean(academiaId && temaId), [academiaId, temaId]);

  return (
    <main className="min-h-screen p-4 flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Selecciona tu Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2">Academia</p>
            <Select value={academiaId} onValueChange={setAcademiaId}>
              <SelectTrigger>
                <SelectValue placeholder="Elige una academia" />
              </SelectTrigger>
              <SelectContent>
                {academias.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="mb-2">Tema</p>
            <Select value={temaId} onValueChange={setTemaId} disabled={!academiaId || loadingTemas}>
              <SelectTrigger>
                <SelectValue placeholder={loadingTemas ? "Cargando temas..." : "Elige un tema"} />
              </SelectTrigger>
              <SelectContent>
                {temas.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full"
            disabled={!canStart}
            onClick={() => navigate(`/quiz?mode=test&academia=${academiaId}&tema=${temaId}`)}
          >
            Empezar Test
          </Button>
        </CardContent>
      </Card>
    </main>
  );
};

export default TestSetup;
