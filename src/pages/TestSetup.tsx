import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Play, BookOpen, GraduationCap, BarChart3,
  AlertCircle, CheckCircle2, Clock, Target,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

type Option = { id: string; nombre: string };

interface TopicProgress {
  totalQuestions: number;
  answeredQuestions: number;
  progressPercentage: number;
  pendingQuestions: number;
}

function progressColor(pct: number) {
  if (pct >= 80) return { bar: 'bg-teal-500', text: 'text-teal-600 dark:text-teal-400', border: 'border-l-teal-400' };
  if (pct >= 50) return { bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', border: 'border-l-amber-400' };
  return { bar: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', border: 'border-l-blue-400' };
}

export default function TestSetup() {
  const { user }   = useAuth();
  const { toast }  = useToast();
  const navigate   = useNavigate();
  const [searchParams] = useSearchParams();
  const presetTemaId   = searchParams.get("tema") ?? "";

  const [academias, setAcademias]             = useState<Option[]>([]);
  const [temas, setTemas]                     = useState<Option[]>([]);
  const [academiaId, setAcademiaId]           = useState("");
  const [temaId, setTemaId]                   = useState("");
  const [loadingAcademias, setLoadingAcademias] = useState(true);
  const [loadingTemas, setLoadingTemas]       = useState(false);
  const [questionCount, setQuestionCount]     = useState(0);
  const [topicProgress, setTopicProgress]     = useState<TopicProgress | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(false);

  // Load academias
  useEffect(() => {
    (async () => {
      try {
        setLoadingAcademias(true);
        const { data, error } = await supabase.from("academias").select("id, nombre").order("nombre");
        if (error) throw error;
        setAcademias(data ?? []);
      } catch {
        toast({ title: "Error", description: "No se pudieron cargar las academias.", variant: "destructive" });
      } finally {
        setLoadingAcademias(false);
      }
    })();
  }, []);

  // If ?tema= param, resolve its academia
  useEffect(() => {
    if (!presetTemaId || academias.length === 0) return;
    (async () => {
      const { data } = await supabase
        .from("temas").select("id, academia_id").eq("id", presetTemaId).single();
      if (data) setAcademiaId(data.academia_id);
    })();
  }, [presetTemaId, academias.length]);

  // Load temas when academia changes
  useEffect(() => {
    if (!academiaId) {
      setTemas([]); setTemaId(""); setQuestionCount(0); setTopicProgress(null);
      return;
    }
    (async () => {
      try {
        setLoadingTemas(true);
        const { data, error } = await supabase
          .from("temas")
          .select("id, nombre, preguntas!inner(id)")
          .eq("academia_id", academiaId)
          .order("nombre");
        if (error) throw error;
        const list = (data ?? []) as Option[];
        setTemas(list);
        if (presetTemaId && list.find((t: Option) => t.id === presetTemaId)) {
          setTemaId(presetTemaId);
        } else {
          setTemaId(""); setQuestionCount(0); setTopicProgress(null);
        }
      } catch {
        toast({ title: "Error", description: "No se pudieron cargar los temas.", variant: "destructive" });
      } finally {
        setLoadingTemas(false);
      }
    })();
  }, [academiaId]);

  // Load question count + user progress when tema changes
  useEffect(() => {
    if (!academiaId || !temaId) { setQuestionCount(0); setTopicProgress(null); return; }
    (async () => {
      const { count } = await supabase
        .from("preguntas").select("*", { count: "exact", head: true })
        .eq("academia_id", academiaId).eq("tema_id", temaId);
      const total = count ?? 0;
      setQuestionCount(total);
      if (total > 0 && user) {
        setLoadingProgress(true);
        const { data: answered } = await supabase
          .from("user_answers")
          .select("pregunta_id, preguntas!inner(tema_id)")
          .eq("user_id", user.id)
          .eq("preguntas.tema_id", temaId);
        const unique = new Set((answered ?? []).map((a: any) => a.pregunta_id)).size;
        const pct = total > 0 ? Math.round((unique / total) * 100) : 0;
        setTopicProgress({ totalQuestions: total, answeredQuestions: unique, progressPercentage: pct, pendingQuestions: Math.max(0, total - unique) });
        setLoadingProgress(false);
      } else {
        setTopicProgress(null);
      }
    })();
  }, [academiaId, temaId, user]);

  const canStart         = Boolean(academiaId && temaId && questionCount > 0);
  const selectedAcademia = academias.find(a => a.id === academiaId);
  const selectedTema     = temas.find(t => t.id === temaId);
  const pc               = topicProgress ? progressColor(topicProgress.progressPercentage) : null;

  return (
    <div className="max-w-2xl mx-auto px-4 pb-24 space-y-4">

      {/* Header */}
      <div className="pt-2">
        <h1 className="text-xl font-bold">Nuevo Test</h1>
        <p className="text-xs text-muted-foreground">Elige academia y tema para empezar</p>
      </div>

      {/* Selectors */}
      <div className="rounded-xl border bg-card p-4 space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Academia</label>
          </div>
          <Select value={academiaId} onValueChange={setAcademiaId} disabled={loadingAcademias}>
            <SelectTrigger className="w-full h-10 rounded-lg text-sm">
              <SelectValue placeholder={loadingAcademias ? "Cargando..." : "Selecciona una academia"} />
            </SelectTrigger>
            <SelectContent>
              {academias.map(a => <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tema</label>
          </div>
          <Select value={temaId} onValueChange={setTemaId} disabled={!academiaId || loadingTemas}>
            <SelectTrigger className="w-full h-10 rounded-lg text-sm">
              <SelectValue placeholder={
                !academiaId    ? "Primero selecciona una academia"
                : loadingTemas ? "Cargando temas..."
                :                "Selecciona un tema"
              } />
            </SelectTrigger>
            <SelectContent>
              {temas.map(t => <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Topic progress */}
      {temaId && questionCount > 0 && (
        loadingProgress ? (
          <div className="rounded-xl border bg-card px-4 py-3 flex items-center gap-2">
            <div className="h-4 w-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            <span className="text-xs text-muted-foreground">Cargando tu progreso...</span>
          </div>
        ) : topicProgress ? (
          <div className={`rounded-xl border border-l-4 ${pc?.border} bg-card px-4 py-3 space-y-2`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tu progreso</span>
              </div>
              <span className={`text-sm font-bold ${pc?.text}`}>{topicProgress.progressPercentage}%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${pc?.bar} transition-all duration-500`} style={{ width: `${topicProgress.progressPercentage}%` }} />
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{topicProgress.answeredQuestions} de {topicProgress.totalQuestions} respondidas</span>
              {topicProgress.pendingQuestions === 0
                ? <span className="text-teal-600 dark:text-teal-400 font-medium">Completado</span>
                : <span>{topicProgress.pendingQuestions} pendientes</span>
              }
            </div>
          </div>
        ) : null
      )}

      {/* Warnings */}
      {academiaId && temaId && questionCount === 0 && (
        <div className="rounded-xl border border-l-4 border-l-red-400 bg-card px-4 py-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">No hay preguntas en este tema. Elige otro.</p>
        </div>
      )}
      {questionCount > 0 && questionCount < 10 && (
        <div className="rounded-xl border border-l-4 border-l-amber-400 bg-card px-4 py-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Este tema tiene solo {questionCount} pregunta{questionCount !== 1 ? 's' : ''} — el test las usará todas.
          </p>
        </div>
      )}

      {/* Summary */}
      {canStart && selectedAcademia && selectedTema && (
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resumen del test</p>
          <div className="divide-y">
            {[
              { label: 'Academia',  value: selectedAcademia.nombre },
              { label: 'Tema',      value: selectedTema.nombre },
              { label: 'Preguntas', value: `${Math.min(questionCount, 10)} de ${questionCount} disponibles` },
              { label: 'Duración',  value: '5 – 10 minutos aprox.' },
            ].map((r, i) => (
              <div key={i} className="flex justify-between py-2 first:pt-0 last:pb-0">
                <span className="text-xs text-muted-foreground">{r.label}</span>
                <span className="text-xs font-semibold text-right max-w-[60%] truncate">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty hint */}
      {!academiaId && (
        <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          <Target className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm mb-3">Selecciona una academia y un tema para empezar</p>
          <div className="flex justify-center gap-4">
            {[
              { icon: Clock,        text: '10 preguntas' },
              { icon: CheckCircle2, text: 'Selección inteligente' },
              { icon: BarChart3,    text: 'Estadísticas al final' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-1 text-[11px]">
                <item.icon className="h-3.5 w-3.5" />
                {item.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <Button
        className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl"
        disabled={!canStart}
        onClick={() => navigate(`/quiz?mode=test&academia=${academiaId}&tema=${temaId}`)}
      >
        <Play className="mr-2 h-4 w-4" />
        {!academiaId          ? 'Selecciona una academia'
          : !temaId           ? 'Selecciona un tema'
          : questionCount === 0 ? 'Sin preguntas disponibles'
          : 'Comenzar Test'}
      </Button>

      <button
        className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
        onClick={() => navigate("/practice")}
      >
        ¿Tienes preguntas falladas? Ir a Modo Práctica
      </button>
    </div>
  );
}
