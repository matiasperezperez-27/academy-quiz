import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Play, BookOpen, GraduationCap, AlertCircle, CheckCircle2, Layers, Globe,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Scope = "all" | "academia" | "tema";

interface FailedItem {
  pregunta_id: string;
  academia_id: string;
  tema_id: string;
}

interface Option {
  id: string;
  nombre: string;
  count: number;
}

export default function Practice() {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [scope,      setScope]      = useState<Scope>("all");
  const [falladas,   setFalladas]   = useState<FailedItem[]>([]);
  const [academias,  setAcademias]  = useState<Option[]>([]);
  const [temas,      setTemas]      = useState<Option[]>([]);
  const [academiaId, setAcademiaId] = useState("");
  const [temaId,     setTemaId]     = useState("");
  const [loading,    setLoading]    = useState(true);

  // ── Load all failed questions with metadata ──────────────────────────────
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("preguntas_falladas")
          .select("pregunta_id, preguntas!inner(academia_id, tema_id)")
          .eq("user_id", user.id);

        const items: FailedItem[] = (data || []).map((f: any) => ({
          pregunta_id: f.pregunta_id,
          academia_id: f.preguntas.academia_id,
          tema_id:     f.preguntas.tema_id,
        }));
        setFalladas(items);

        // Derive academias with counts
        const acadMap = new Map<string, number>();
        items.forEach(f => acadMap.set(f.academia_id, (acadMap.get(f.academia_id) || 0) + 1));

        if (acadMap.size > 0) {
          const { data: acadData } = await supabase
            .from("academias")
            .select("id, nombre")
            .in("id", [...acadMap.keys()])
            .order("nombre");

          setAcademias((acadData || []).map((a: any) => ({
            id:     a.id,
            nombre: a.nombre,
            count:  acadMap.get(a.id) || 0,
          })));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // ── Load temas when academia changes ─────────────────────────────────────
  useEffect(() => {
    if (!academiaId || falladas.length === 0) { setTemas([]); setTemaId(""); return; }

    const temaMap = new Map<string, number>();
    falladas
      .filter(f => f.academia_id === academiaId)
      .forEach(f => temaMap.set(f.tema_id, (temaMap.get(f.tema_id) || 0) + 1));

    if (temaMap.size === 0) { setTemas([]); return; }

    supabase
      .from("temas")
      .select("id, nombre")
      .in("id", [...temaMap.keys()])
      .order("nombre")
      .then(({ data }) => {
        setTemas((data || []).map((t: any) => ({
          id:     t.id,
          nombre: t.nombre,
          count:  temaMap.get(t.id) || 0,
        })));
      });
  }, [academiaId, falladas]);

  // ── Derived counts ────────────────────────────────────────────────────────
  const currentCount = useMemo(() => {
    if (scope === "all")      return falladas.length;
    if (scope === "academia") return falladas.filter(f => f.academia_id === academiaId).length;
    return falladas.filter(f => f.tema_id === temaId).length;
  }, [scope, falladas, academiaId, temaId]);

  const canStart =
    currentCount > 0 &&
    (scope === "all" ||
     (scope === "academia" && !!academiaId) ||
     (scope === "tema" && !!academiaId && !!temaId));

  const handleStart = () => {
    let url = "/quiz?mode=practice";
    if (scope === "academia" && academiaId) url += `&academia=${academiaId}`;
    if (scope === "tema" && academiaId && temaId) url += `&academia=${academiaId}&tema=${temaId}`;
    navigate(url);
  };

  const selectedAcademia = academias.find(a => a.id === academiaId);
  const selectedTema     = temas.find(t => t.id === temaId);

  const btnLabel = (() => {
    if (!canStart) {
      if (scope === "all")     return "Sin preguntas falladas";
      if (!academiaId)         return "Selecciona una academia";
      if (scope === "tema" && !temaId) return "Selecciona un tema";
      return "Sin preguntas en este filtro";
    }
    return `Practicar ${currentCount} pregunta${currentCount !== 1 ? "s" : ""}`;
  })();

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Cargando tus preguntas falladas...</p>
        </div>
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (falladas.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 pb-24 space-y-4">
        <div className="pt-2">
          <h1 className="text-xl font-bold">Modo Práctica</h1>
          <p className="text-xs text-muted-foreground">Repasa tus preguntas falladas</p>
        </div>
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-teal-500 opacity-60" />
          <p className="text-sm font-medium mb-1">Sin preguntas falladas</p>
          <p className="text-xs">¡Enhorabuena! No tienes preguntas pendientes de repasar.</p>
          <button
            className="mt-4 text-xs text-teal-600 dark:text-teal-400 hover:underline"
            onClick={() => navigate("/test-setup")}
          >
            Hacer un test nuevo
          </button>
        </div>
      </div>
    );
  }

  // ── Main UI ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 pb-24 space-y-4">

      {/* Header */}
      <div className="pt-2">
        <h1 className="text-xl font-bold">Modo Práctica</h1>
        <p className="text-xs text-muted-foreground">Elige qué preguntas quieres repasar</p>
      </div>

      {/* Scope selector */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Ámbito de práctica
        </p>
        <div className="grid grid-cols-3 gap-2">
          {([
            { key: "all",      label: "Todas",         Icon: Globe,         desc: `${falladas.length} falladas` },
            { key: "academia", label: "Por academia",  Icon: GraduationCap, desc: `${academias.length} academia${academias.length !== 1 ? "s" : ""}` },
            { key: "tema",     label: "Por tema",      Icon: BookOpen,      desc: "Tema específico" },
          ] as const).map(({ key, label, Icon, desc }) => {
            const active = scope === key;
            return (
              <button
                key={key}
                onClick={() => { setScope(key); setAcademiaId(""); setTemaId(""); }}
                className={`rounded-xl border px-3 py-3 text-left transition-all ${
                  active
                    ? "border-teal-400 bg-teal-50 dark:bg-teal-900/20"
                    : "border-gray-200 dark:border-gray-700 bg-card hover:bg-muted/40"
                }`}
              >
                <Icon className={`h-4 w-4 mb-1.5 ${active ? "text-teal-600 dark:text-teal-400" : "text-muted-foreground"}`} />
                <p className={`text-xs font-semibold leading-tight ${active ? "text-teal-700 dark:text-teal-300" : "text-foreground"}`}>
                  {label}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters (conditional) */}
      {(scope === "academia" || scope === "tema") && (
        <div className="rounded-xl border bg-card p-4 space-y-4">
          {/* Academia selector */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Academia</label>
            </div>
            <Select value={academiaId} onValueChange={v => { setAcademiaId(v); setTemaId(""); }}>
              <SelectTrigger className="w-full h-10 rounded-lg text-sm">
                <SelectValue placeholder="Selecciona una academia" />
              </SelectTrigger>
              <SelectContent>
                {academias.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nombre}
                    <span className="ml-2 text-xs text-muted-foreground">· {a.count} falladas</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tema selector (only for "tema" scope) */}
          {scope === "tema" && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tema</label>
              </div>
              <Select value={temaId} onValueChange={setTemaId} disabled={!academiaId || temas.length === 0}>
                <SelectTrigger className="w-full h-10 rounded-lg text-sm">
                  <SelectValue placeholder={
                    !academiaId        ? "Primero selecciona una academia"
                    : temas.length === 0 ? "Sin temas con falladas"
                    :                   "Selecciona un tema"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {temas.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nombre}
                      <span className="ml-2 text-xs text-muted-foreground">· {t.count} falladas</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* Count card */}
      {(scope === "all" || (scope === "academia" && academiaId) || (scope === "tema" && temaId)) && (
        <div className={`rounded-xl border border-l-4 px-4 py-3 bg-card flex items-center justify-between ${
          currentCount > 0 ? "border-l-teal-400" : "border-l-red-400"
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
              currentCount > 0
                ? "bg-teal-100 dark:bg-teal-900/40"
                : "bg-red-100 dark:bg-red-900/40"
            }`}>
              {currentCount > 0
                ? <Layers className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                : <AlertCircle className="h-3.5 w-3.5 text-red-500" />
              }
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">
                {scope === "all"     ? "Todas las falladas"
                : scope === "academia" && selectedAcademia ? selectedAcademia.nombre
                : selectedTema      ? selectedTema.nombre
                : "Selección actual"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {currentCount > 0 ? "preguntas listas para practicar" : "sin preguntas en este filtro"}
              </p>
            </div>
          </div>
          <span className={`text-2xl font-bold tabular-nums ${
            currentCount > 0 ? "text-teal-600 dark:text-teal-400" : "text-red-500"
          }`}>
            {currentCount}
          </span>
        </div>
      )}

      {/* CTA */}
      <button
        className={`w-full h-12 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
          canStart
            ? "bg-teal-600 hover:bg-teal-700 text-white"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        }`}
        disabled={!canStart}
        onClick={handleStart}
      >
        <Play className="h-4 w-4" />
        {btnLabel}
      </button>

      <button
        className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
        onClick={() => navigate("/test-setup")}
      >
        ¿Prefieres un test nuevo? Ir a configuración
      </button>
    </div>
  );
}
