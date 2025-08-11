import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

function setSEO(title: string, description: string) {
  document.title = title;
  const meta = document.querySelector('meta[name="description"]') || document.createElement("meta");
  meta.setAttribute("name", "description");
  meta.setAttribute("content", description);
  document.head.appendChild(meta);
}

type Pregunta = {
  id: string;
  pregunta_texto: string;
  opcion_a: string;
  opcion_b: string;
  opcion_c?: string | null;
  opcion_d?: string | null;
  solucion_letra: string; // 'A' | 'B' | 'C' | 'D'
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Quiz() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const mode = params.get("mode") || "test"; // 'test' | 'practice'
  const academiaId = params.get("academia");
  const temaId = params.get("tema");

  const [questions, setQuestions] = useState<Pregunta[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSEO("Quiz | Academy Quiz", "Responde a las preguntas una por una y mejora tu puntuación.");
  }, []);

  useEffect(() => {
    async function load() {
      try {
        if (mode === "test") {
          if (!academiaId || !temaId) {
            toast({ title: "Falta selección", description: "Elige academia y tema antes de empezar." });
            navigate("/test-setup", { replace: true });
            return;
          }
          const { data, error } = await supabase.rpc("get_random_preguntas", {
            p_academia_id: academiaId,
            p_tema_id: temaId,
            p_limit: 10,
          });
          if (error) throw error;
          setQuestions((data as any) || []);
        } else {
          // practice mode
          const { data: falladas, error: e1 } = await supabase
            .from("preguntas_falladas")
            .select("pregunta_id")
            .eq("user_id", user!.id);
          if (e1) throw e1;
          const ids = (falladas || []).map((f: any) => f.pregunta_id);
          if (!ids.length) {
            toast({ title: "Sin preguntas falladas", description: "¡Nada que practicar!" });
            navigate("/", { replace: true });
            return;
          }
          const { data: preguntas, error: e2 } = await supabase
            .from("preguntas")
            .select("*")
            .in("id", ids);
          if (e2) throw e2;
          setQuestions(shuffle((preguntas as any) || []));
        }
      } catch (err: any) {
        toast({ title: "Error", description: err.message });
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, academiaId, temaId, user?.id]);

  const current = useMemo(() => questions[index], [questions, index]);
  const total = questions.length || 10;

  const handleAnswer = async (letter: string) => {
    if (!current || revealed) return;
    setSelected(letter);
    const correct = current.solucion_letra?.toUpperCase() === letter.toUpperCase();

    if (correct) {
      setScore((s) => s + 1);
      // If practicing, remove from falladas
      if (mode === "practice" && user) {
        await supabase
          .from("preguntas_falladas")
          .delete()
          .eq("user_id", user.id)
          .eq("pregunta_id", current.id);
      }
    } else {
      // If incorrect during test, record as fallada
      if (mode === "test" && user) {
        await supabase
          .from("preguntas_falladas")
          .upsert(
            { user_id: user.id, pregunta_id: current.id },
            { onConflict: "user_id,pregunta_id", ignoreDuplicates: true }
          );
      }
    }

    setRevealed(true);
    setTimeout(() => {
      setRevealed(false);
      setSelected(null);
      if (index + 1 >= questions.length) {
        navigate("/results", { state: { score: correct ? score + 1 : score, total } });
      } else {
        setIndex((i) => i + 1);
      }
    }, 1600);
  };

  if (loading) return null;
  if (!current) return null;

  const options = [
    { key: "A", text: current.opcion_a },
    { key: "B", text: current.opcion_b },
    ...(current.opcion_c ? [{ key: "C", text: current.opcion_c }] : []),
    ...(current.opcion_d ? [{ key: "D", text: current.opcion_d }] : []),
  ];

  return (
    <main className="min-h-screen p-4 flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Pregunta {index + 1} de {total}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-base">{current.pregunta_texto}</p>
          <div className="grid gap-3">
            {options.map((opt) => {
              const isPicked = selected === opt.key;
              const isCorrect = revealed && current.solucion_letra?.toUpperCase() === opt.key;
              const isWrong = revealed && isPicked && !isCorrect;
              return (
                <Button
                  key={opt.key}
                  variant="secondary"
                  className={
                    isCorrect
                      ? "bg-primary text-primary-foreground"
                      : isWrong
                      ? "bg-destructive text-destructive-foreground"
                      : ""
                  }
                  onClick={() => handleAnswer(opt.key)}
                  disabled={revealed}
                >
                  {opt.key}. {opt.text}
                </Button>
              );
            })}
          </div>
          <div className="text-sm text-muted-foreground text-right">Aciertos: {score}</div>
        </CardContent>
      </Card>
    </main>
  );
}
