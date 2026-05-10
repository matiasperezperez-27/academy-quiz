import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, X, AlertTriangle, CheckCircle2, Loader2, RotateCcw, Copy, Check, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useParteOptions } from '@/hooks/useParteOptions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { ProfesorAcademia } from '@/hooks/useProfesorData';

const REQUIRED_COLS = [
  'pregunta_texto', 'opcion_a', 'opcion_b', 'opcion_c', 'opcion_d',
  'solucion_letra', 'explicacion_a', 'explicacion_b', 'explicacion_c', 'explicacion_d',
];
const VALID_LETRAS = ['A', 'B', 'C', 'D'];
const BASE_PROMPT = `Genera una tabla de preguntas tipo test basadas en el contenido de los documentos cargados.

⚠️ IMPORTANTE: La tabla debe contener EXACTAMENTE estas 10 columnas y NINGUNA MÁS.
No añadas columnas de Fuente, Dificultad, Referencia ni ninguna otra:

pregunta_texto | opcion_a | opcion_b | opcion_c | opcion_d | solucion_letra | explicacion_a | explicacion_b | explicacion_c | explicacion_d

━━━━━━━━━━━━━━━━━━━━━━━━━
REGLAS OBLIGATORIAS POR COLUMNA
━━━━━━━━━━━━━━━━━━━━━━━━━

pregunta_texto
→ Enunciado completo y claro. No revela ni insinúa la respuesta. Entre 80 y 280 caracteres.

opcion_a / opcion_b / opcion_c / opcion_d
→ Cuatro opciones de respuesta. EXACTAMENTE UNA es correcta.
→ Las tres incorrectas deben ser plausibles y relacionadas con el tema (nada de respuestas obviamente falsas o absurdas).
→ No repitas la misma idea en dos opciones distintas.
→ Adapta la longitud al tipo de pregunta:
   • Plazos, valores numéricos, términos técnicos, nombres propios o clasificaciones: opciones cortas y precisas.
   • Definiciones reglamentarias, procedimientos o afirmaciones completas: opciones más descriptivas.

solucion_letra
→ Escribe ÚNICAMENTE la letra mayúscula de la opción correcta: A, B, C o D.
→ Sin puntos, sin paréntesis, sin texto adicional. Solo la letra.

explicacion_a / explicacion_b / explicacion_c / explicacion_d
→ Para la opción CORRECTA (la que coincide con solucion_letra):
   Mínimo 200 caracteres, máximo 380 caracteres. Justificación detallada que incluya
   la referencia normativa o técnica específica (Ley, Real Decreto, Reglamento UE,
   artículo concreto...) cuando el contenido lo permita.
→ Para cada opción INCORRECTA:
   Máximo 110 caracteres. Frase concisa indicando en qué falla esa opción o en qué se diferencia de la correcta.

━━━━━━━━━━━━━━━━━━━━━━━━━
CANTIDAD, DIFICULTAD Y FORMATO
━━━━━━━━━━━━━━━━━━━━━━━━━

Genera 20 preguntas con esta distribución:
- 7 básicas (definiciones, conceptos fundamentales)
- 7 intermedias (aplicación de normativa, procedimientos concretos)
- 6 avanzadas (casos complejos, excepciones, comparativas entre figuras similares)

Varía el formato siguiendo el estilo de examen de oposición pública:
- Normativa con plazo o valor: "Según la Ley X / el Real Decreto X, ¿cuál es el plazo...?"
- Afirmación correcta: "Indique cuál de las siguientes afirmaciones es correcta"
- Negación: "¿Cuál de los siguientes términos NO se corresponde con...?"
- Definición reglamentaria: "Se define X como:" / "De acuerdo con el Reglamento X, X es:"
- Aplicación técnica: rangos, límites, clasificaciones o requisitos concretos del material

Cubre distintos aspectos del material. No repitas el mismo concepto en más de una pregunta.`;

const LETRA_COLOR: Record<string, string> = {
  A: 'border-blue-400 text-blue-600 dark:text-blue-400',
  B: 'border-teal-400 text-teal-600 dark:text-teal-400',
  C: 'border-violet-400 text-violet-600 dark:text-violet-400',
  D: 'border-orange-400 text-orange-600 dark:text-orange-400',
};

interface ParsedRow {
  idx: number;
  pregunta_texto: string;
  opcion_a: string;
  opcion_b: string;
  opcion_c: string;
  opcion_d: string;
  solucion_letra: string;
  explicacion_a: string;
  explicacion_b: string;
  explicacion_c: string;
  explicacion_d: string;
  warnings: string[];
  valid: boolean;
}

interface Props {
  profesorId: string;
  academias: ProfesorAcademia[];
}

export default function ImportarPreguntas({ profesorId, academias }: Props) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [topicContext, setTopicContext] = useState('');
  const [copied, setCopied] = useState(false);

  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [columnError, setColumnError] = useState<string | null>(null);

  const propias = academias.filter(a => !a.es_biblioteca);
  const parteOptions = useParteOptions(propias.map(a => a.academia_id));
  const [academiaId, setAcademiaId] = useState('');
  const [temas, setTemas] = useState<{ id: string; nombre: string }[]>([]);
  const [temaId, setTemaId] = useState('');
  const [parteKey, setParteKey] = useState('__none__');
  const [parteNew, setParteNew] = useState('');

  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, errors: 0 });
  const [importDone, setImportDone] = useState(false);

  useEffect(() => {
    if (propias.length === 1 && !academiaId) setAcademiaId(propias[0].academia_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propias.length]);

  useEffect(() => {
    if (!academiaId) { setTemas([]); setTemaId(''); return; }
    supabase
      .from('temas')
      .select('id, nombre')
      .eq('academia_id', academiaId)
      .order('nombre')
      .then(({ data }) => { setTemas((data as { id: string; nombre: string }[]) || []); setTemaId(''); });
  }, [academiaId]);

  const parseFile = (file: File) => {
    setFileName(file.name);
    setRows([]);
    setColumnError(null);
    setImportDone(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });

        if (!json.length) { setColumnError('El archivo está vacío.'); return; }

        const missing = REQUIRED_COLS.filter(c => !(c in json[0]));
        if (missing.length) {
          setColumnError(`Columnas obligatorias no encontradas: ${missing.join(', ')}`);
          return;
        }

        setRows(json.map((row, i) => {
          const sol = String(row.solucion_letra ?? '').trim().toUpperCase();
          const warnings: string[] = [];
          if (!VALID_LETRAS.includes(sol)) warnings.push(`Solución "${row.solucion_letra}" no válida`);
          if (!String(row.pregunta_texto ?? '').trim()) warnings.push('Sin enunciado');
          return {
            idx: i + 1,
            pregunta_texto: String(row.pregunta_texto ?? '').trim(),
            opcion_a: String(row.opcion_a ?? '').trim(),
            opcion_b: String(row.opcion_b ?? '').trim(),
            opcion_c: String(row.opcion_c ?? '').trim(),
            opcion_d: String(row.opcion_d ?? '').trim(),
            solucion_letra: sol,
            explicacion_a: String(row.explicacion_a ?? '').trim(),
            explicacion_b: String(row.explicacion_b ?? '').trim(),
            explicacion_c: String(row.explicacion_c ?? '').trim(),
            explicacion_d: String(row.explicacion_d ?? '').trim(),
            warnings,
            valid: VALID_LETRAS.includes(sol) && !!String(row.pregunta_texto ?? '').trim(),
          };
        }));
      } catch {
        setColumnError('No se pudo leer el archivo. Asegúrate de que es un .xlsx válido.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) parseFile(f);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f?.name.endsWith('.xlsx')) parseFile(f);
  };

  const reset = () => {
    setFileName(null);
    setRows([]);
    setColumnError(null);
    setImportDone(false);
    setProgress({ done: 0, total: 0, errors: 0 });
    setParteKey('__none__');
    setParteNew('');
  };

  const buildPrompt = () => {
    const header = topicContext.trim()
      ? `Enfoca las preguntas específicamente sobre: ${topicContext.trim()}\n\n`
      : '';
    return header + BASE_PROMPT;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(buildPrompt());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const parteValue = parteKey === '__none__' ? null
    : parteKey === '__new__' ? (parteNew.trim() || null)
    : parteKey;
  const validRows = rows.filter(r => r.valid);
  const warnRows = rows.filter(r => r.warnings.length > 0);
  const skipCount = rows.length - validRows.length;
  const canImport = validRows.length > 0 && !!temaId && !importing && !importDone;

  const handleImport = async () => {
    if (!canImport || !user) return;
    setImporting(true);
    setProgress({ done: 0, total: validRows.length, errors: 0 });

    let errors = 0;
    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        const { data: newId, error } = await supabase.rpc('upsert_pregunta' as any, {
          p_profesor_id: profesorId,
          p_pregunta_id: null,
          p_academia_id: academiaId,
          p_tema_id: temaId,
          p_parte: parteValue,
          p_pregunta_texto: row.pregunta_texto,
          p_opcion_a: row.opcion_a,
          p_opcion_b: row.opcion_b,
          p_opcion_c: row.opcion_c || null,
          p_opcion_d: row.opcion_d || null,
          p_solucion_letra: row.solucion_letra,
          p_pregunta_origen_id: null,
          p_modificada_por_ia: false,
        });
        if (error) throw error;

        const hasExp = row.explicacion_a || row.explicacion_b || row.explicacion_c || row.explicacion_d;
        if (newId && hasExp) {
          await supabase.rpc('update_explicaciones_pregunta' as any, {
            p_profesor_id: profesorId,
            p_pregunta_id: newId as string,
            p_explicacion_a: row.explicacion_a || null,
            p_explicacion_b: row.explicacion_b || null,
            p_explicacion_c: row.explicacion_c || null,
            p_explicacion_d: row.explicacion_d || null,
          });
        }
      } catch {
        errors++;
      }
      setProgress({ done: i + 1, total: validRows.length, errors });
    }

    setImporting(false);
    setImportDone(true);
    const ok = validRows.length - errors;
    if (errors === 0) toast.success(`${ok} preguntas importadas correctamente`);
    else toast.warning(`${ok} importadas, ${errors} con error`);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pb-24 space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-l-4 border-l-teal-400 bg-card p-4">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-teal-500" />
          Importar preguntas desde Excel (NotebookLM)
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Sube el archivo .xlsx generado por NotebookLM. La columna Fuente y cualquier extra se ignoran automáticamente.
        </p>
      </div>

      {/* Prompt section */}
      <div className="rounded-xl border border-l-4 border-l-blue-400 bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-blue-500" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Prompt para NotebookLM
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Pega este prompt en <span className="font-medium text-foreground">Personalizar tabla de datos</span> de NotebookLM. Escribe el tema primero para que el prompt se ajuste automáticamente.
        </p>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">
            ¿Sobre qué quieres las preguntas?{' '}
            <span className="text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <Input
            value={topicContext}
            onChange={e => setTopicContext(e.target.value)}
            placeholder="ej. contratos administrativos, procedimiento sancionador, derecho penal..."
            className="h-9"
          />
        </div>

        <textarea
          readOnly
          value={buildPrompt()}
          className="w-full h-48 text-[11px] font-mono bg-muted/40 border rounded-lg p-3 resize-none text-foreground leading-relaxed overflow-y-auto focus:outline-none"
        />

        <Button
          className={cn(
            'w-full h-10 gap-2 transition-colors',
            copied
              ? 'bg-teal-600 hover:bg-teal-700 text-white'
              : 'border-blue-400 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30'
          )}
          variant="outline"
          onClick={handleCopy}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? '¡Copiado! Pégalo en NotebookLM' : 'Copiar prompt'}
        </Button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="flex-1 h-px bg-border" />
        <span className="uppercase tracking-wider font-medium">Importar Excel generado</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Upload zone */}
      {!fileName && (
        <div
          className="border-2 border-dashed border-muted rounded-xl p-10 text-center cursor-pointer hover:border-teal-400 hover:bg-teal-500/5 transition-colors"
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
        >
          <Upload className="h-9 w-9 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium">Toca para seleccionar archivo</p>
          <p className="text-xs text-muted-foreground mt-1">o arrastra aquí · Solo .xlsx</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* File badge */}
      {fileName && !importDone && (
        <div className="rounded-xl border bg-card p-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileSpreadsheet className="h-4 w-4 text-teal-500 shrink-0" />
            <span className="text-sm font-medium truncate">{fileName}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={reset} disabled={importing}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Column error */}
      {columnError && (
        <div className="rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/30 p-4 flex gap-2 text-sm text-red-700 dark:text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          {columnError}
        </div>
      )}

      {/* Config + preview */}
      {rows.length > 0 && !importDone && (
        <>
          {/* Destino */}
          <div className="rounded-xl border border-l-4 border-l-teal-400 bg-card p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Destino</p>

            {propias.length > 1 ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Academia</Label>
                <Select value={academiaId} onValueChange={setAcademiaId} disabled={importing}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecciona academia..." />
                  </SelectTrigger>
                  <SelectContent>
                    {propias.map(a => (
                      <SelectItem key={a.academia_id} value={a.academia_id}>{a.academia_nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : propias.length === 1 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Academia:</span>
                <span className="font-semibold">{propias[0].academia_nombre}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Tema <span className="text-red-500">*</span>
              </Label>
              <Select value={temaId} onValueChange={setTemaId} disabled={!academiaId || importing}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={!academiaId ? 'Selecciona academia primero' : 'Selecciona tema...'} />
                </SelectTrigger>
                <SelectContent>
                  {temas.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Parte <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Select value={parteKey} onValueChange={setParteKey} disabled={importing}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Sin parte específica" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin parte específica</SelectItem>
                  {parteOptions.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                  <SelectItem value="__new__">+ Nueva parte...</SelectItem>
                </SelectContent>
              </Select>
              {parteKey === '__new__' && (
                <Input
                  value={parteNew}
                  onChange={e => setParteNew(e.target.value)}
                  placeholder="Escribe el nombre de la nueva parte..."
                  className="h-9"
                  disabled={importing}
                  autoFocus
                />
              )}
            </div>
          </div>

          {/* Stats bar */}
          <div className="rounded-xl border bg-card p-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <span className="flex items-center gap-1 font-medium text-teal-600 dark:text-teal-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {validRows.length} listas para importar
            </span>
            {warnRows.length > 0 && (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                {warnRows.length} con aviso
              </span>
            )}
            {skipCount > 0 && (
              <span className="flex items-center gap-1 text-red-500">
                <X className="h-3.5 w-3.5" />
                {skipCount} omitidas (inválidas)
              </span>
            )}
          </div>

          {/* Preview list */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vista previa</p>
            <div className="rounded-xl border divide-y bg-card max-h-72 overflow-y-auto">
              {rows.map(row => (
                <div
                  key={row.idx}
                  className={cn(
                    'flex items-start gap-2 px-3 py-2 text-xs',
                    !row.valid && 'opacity-40'
                  )}
                >
                  <span className="text-muted-foreground w-5 shrink-0 pt-0.5 tabular-nums">{row.idx}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'shrink-0 h-5 px-1.5 text-[10px] font-bold',
                      VALID_LETRAS.includes(row.solucion_letra)
                        ? LETRA_COLOR[row.solucion_letra]
                        : 'border-red-400 text-red-500'
                    )}
                  >
                    {VALID_LETRAS.includes(row.solucion_letra) ? row.solucion_letra : '?'}
                  </Badge>
                  <span className="flex-1 min-w-0 leading-snug line-clamp-2 text-foreground">
                    {row.pregunta_texto || <em className="text-muted-foreground">Sin enunciado</em>}
                  </span>
                  {row.warnings.length > 0 && (
                    <AlertTriangle
                      className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5"
                      title={row.warnings.join(' · ')}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Progress or import button */}
          {importing ? (
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Importando preguntas...
                </span>
                <span className="tabular-nums">{progress.done} / {progress.total}</span>
              </div>
              <Progress value={progress.total ? (progress.done / progress.total) * 100 : 0} className="h-2" />
              {progress.errors > 0 && (
                <p className="text-xs text-red-500">{progress.errors} con error</p>
              )}
            </div>
          ) : (
            <Button
              className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-medium"
              onClick={handleImport}
              disabled={!canImport}
            >
              {!temaId
                ? 'Selecciona un tema para continuar'
                : `Importar ${validRows.length} preguntas${skipCount > 0 ? ` · ${skipCount} omitidas` : ''}`}
            </Button>
          )}
        </>
      )}

      {/* Done summary */}
      {importDone && (
        <div className="rounded-xl border border-l-4 border-l-teal-400 bg-card p-6 text-center space-y-4">
          <CheckCircle2 className="h-10 w-10 text-teal-500 mx-auto" />
          <div>
            <p className="font-semibold text-base">
              {progress.total - progress.errors} preguntas importadas
            </p>
            {progress.errors > 0 && (
              <p className="text-sm text-red-500 mt-1">{progress.errors} no pudieron importarse</p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Ya están disponibles en la pestaña Preguntas y en el quiz.
            </p>
          </div>
          <Button variant="outline" className="gap-2" onClick={reset}>
            <RotateCcw className="h-4 w-4" />
            Nueva importación
          </Button>
        </div>
      )}
    </div>
  );
}
