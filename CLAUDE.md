# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Vite)
npm run build     # Production build
npm run build:dev # Dev build
npm run lint      # ESLint
npm run preview   # Preview production build
```

No test runner is configured.

## Architecture

**Stack**: Vite + React 18 + TypeScript + shadcn/ui + Tailwind CSS + Supabase + TanStack Query + Recharts

**Supabase project**: `https://pakyheklnfpwibyahmcg.supabase.co`
Generated types are at `src/integrations/supabase/types.ts` — run `mcp__supabase__generate_typescript_types` to regenerate after schema changes.

### Routing structure

Two layout modes defined in `src/App.tsx`:
- **Without layout** (fullscreen): `/auth`, `/results`, `/admin`
- **With `MainLayout`** (bottom nav bar): `/`, `/stats`, `/ranking`, `/test-setup`, `/practice`, `/analisis-temas`, `/profesor`, `/quiz`

All routes except `/auth` and `/admin` are wrapped in `<ProtectedRoute>`. The `/admin` route manages its own auth + role check internally. `/profesor` uses `useProfesor` hook internally for role gating but is inside `MainLayout` + `ProtectedRoute`.

`hideNavRoutes` in `MainLayout.tsx` = `['/auth', '/results', '/admin']` — bottom nav is visible on all other routes including `/quiz` and `/profesor`.

### Data model (Supabase)

Core hierarchy: `academias` → `temas` → `preguntas`

**Academia types:**
- `es_biblioteca BOOLEAN` — `true` for the 3 legacy academias (JCLM, LICEO, LINCE), which serve as a read-only question bank. `false` for professor-owned academias (e.g. Academia Yeray).
- `propietario_id UUID` — points to the professor who owns the academia.
- Biblioteca academias are hidden from students in `/test-setup` and `/practice` (filtered with `.eq('es_biblioteca', false)`). Professors see them only in the Banco tab.

User data tables:
- `profiles` — puntos, username, role (`user` | `admin` | `profesor`)
- `user_sessions` — quiz sessions (mode: `test` | `practice`), has `academia_id` and `tema_id`
- `user_answers` — per-answer records linked to sessions
- `preguntas_falladas` — legacy failed question tracking
- `user_pregunta_status` — per-question status per user
- `user_preferences` — preferred academia/tema, theme, etc.

Profesor-specific tables:
- `profesor_academias` — maps professors to academias they can manage (`profesor_id`, `academia_id`, `assigned_at`, `assigned_by`)
- `examenes` — exams created by professors (`nombre`, `academia_id`, `creado_por`, `duracion_minutos`, `activo`)
- `examen_preguntas` — junction table linking exams to questions (`examen_id`, `pregunta_id`, `orden`)

**Bank/clone fields added to `preguntas`:**
- `pregunta_origen_id UUID` — points to the original question when this row is a clone from the banco. NULL = created from scratch.
- `modificada_por_ia BOOLEAN` — true if the question text/options were rewritten by the AI rewrite function at least once.

Verification fields added to `preguntas`:
- `verificada` (boolean, default false) — approved by a professor
- `rechazada` (boolean, default false) — rejected by a professor
- `verificada_por` (uuid → profiles) — who verified it
- `verificada_at` (timestamptz) — when it was verified
- `verificacion_notas` (text) — reviewer notes
- `creada_por` (uuid → profiles) — who created it (professors)

Explanation fields added to `preguntas` (AI-generated, may be null):
- `explicacion_a` (text) — explanation for option A
- `explicacion_b` (text) — explanation for option B
- `explicacion_c` (text) — explanation for option C
- `explicacion_d` (text) — explanation for option D

These are shown in the quiz UI after the user answers. The correct option shows a detailed explanation (~350 chars); distractors show a brief note on why they are wrong. Loaded via `enrichWithExplanations()` in `useQuiz.ts` (1 extra query per session, merged into the question objects).

### Roles

The app has three roles in `profiles.role`:
- `user` — regular student, default role
- `admin` — full platform access, visible in `/admin`. Admins also have access to `/profesor` (handled by `is_user_profesor` returning true for admins).
- `profesor` — content management access, visible in `/profesor`. Scoped to assigned academias via `profesor_academias`.

Role checks use RPCs (`is_user_admin`, `is_user_profesor`) via `useAdmin` and `useProfesor` hooks. `is_user_profesor` returns true for both `profesor` AND `admin` roles.

### Key Supabase RPC functions

**Quiz (student-facing):**
| Function | Purpose |
|---|---|
| `get_smart_preguntas` | Smart question selection with priority levels |
| `get_random_preguntas` | Fallback random selection |
| `start_quiz_session` | Creates a session, returns session UUID |
| `record_answer` | Records each answer during quiz |
| `complete_quiz_session` | Finalizes session, returns stats JSON |
| `get_user_stats` | Aggregate user statistics |
| `get_topic_analysis` | Per-topic breakdown for a user |
| `get_user_rankings` | Leaderboard data |

**Admin:**
| Function | Purpose |
|---|---|
| `is_user_admin` | Role check (`user_id uuid → boolean`) |
| `get_admin_stats` | Platform-wide stats |
| `get_users_list` | List all users with activity data |
| `reset_user_progress` | Clear a user's progress |

**Profesor (all SECURITY DEFINER, validate `profesor_academias` access internally):**
| Function | Purpose |
|---|---|
| `is_user_profesor(p_user_id)` | Role check — true for `profesor` and `admin` |
| `get_profesor_stats(p_profesor_id)` | Dashboard totals: academias, temas, preguntas, verificadas, pendientes, estudiantes |
| `get_profesor_academias(p_profesor_id)` | Assigned academias with verification progress counters. Returns `es_biblioteca`, `importadas` (clones in own academia), `verificadas_importadas`. |
| `get_preguntas_para_verificar(p_profesor_id, p_academia_id, p_tema_id, p_estado, p_limit, p_offset)` | Paginated questions for review. `p_estado`: `'pendiente'` \| `'verificada'` \| `'rechazada'`. Returns `total_count` via window function. Filters `es_biblioteca = false` — banco questions never appear here. |
| `verificar_pregunta(p_profesor_id, p_pregunta_id, p_accion, p_notas)` | Approve or reject a question. `p_accion`: `'verificar'` \| `'rechazar'`. Rejecting a cloned question **deletes it** (the banco original is never touched — can be re-imported). |
| `upsert_pregunta(p_profesor_id, p_pregunta_id?, ...)` | Create or edit a question. Verification resets to pending **only** when `p_modificada_por_ia = true`. Manual edits (e.g. tema change) keep current verification status. |
| `get_banco_tema_import_stats(p_profesor_id, p_banco_academia_id)` | Per-tema import progress for a biblioteca academia from the professor's view. Returns `tema_id, tema_nombre, total, importadas, verificadas`. |
| `crear_tema(p_profesor_id, p_academia_id, p_nombre)` | Create a new tema scoped to an assigned academia |
| `renombrar_tema(p_profesor_id, p_tema_id, p_nuevo_nombre)` | Rename a tema (validates profesor_academias ownership) |
| `eliminar_tema(p_profesor_id, p_tema_id)` | Delete a tema and all its preguntas (cascade, validates ownership) |
| `get_profesor_student_stats(p_profesor_id, p_academia_id?)` | Per-student accuracy, sessions, puntos for the professor's academias |
| `get_profesor_topic_stats(p_profesor_id, p_academia_id?)` | Per-topic avg accuracy and student count |
| `crear_academia_propietario(p_admin_id, p_nombre, p_propietario_id)` | Admin-only: creates a non-biblioteca academia and assigns it to a professor |
| `clonar_pregunta(p_profesor_id, p_pregunta_origen_id, p_destino_academia_id, p_destino_tema_id)` | Clone a banco question into the professor's own academia. Sets `pregunta_origen_id`, copies all fields including explanations. Returns new UUID. |
| `get_preguntas_banco(p_profesor_id, p_academia_id?, p_tema_id?, p_solo_no_importadas?, p_limit, p_offset)` | Paginated list of biblioteca questions with `ya_importada` flag per row. |

### Smart question selection priority

Used by `get_smart_preguntas` (called inside `useQuiz` and `useQuestionSelection`):
1. **Priority 1** — failed questions (preguntas_falladas)
2. **Priority 2** — never answered questions
3. **Priority 3** — correctly answered >30 days ago
4. **Excluded** — correctly answered within the last 30 days

Note: the quiz RPCs do NOT filter by `verificada`. All questions are available to students regardless of verification status.

### Business logic hooks

**Student/quiz hooks:**
- `src/hooks/useQuiz.ts` — core quiz state machine. Manages question loading, `submitAnswer`, `nextQuestion`, `completeQuiz`. Uses refs to prevent infinite re-render loops when parameters change.
- `src/hooks/useQuestionSelection.ts` — standalone hook exposing `selectQuestions`, with fallback from smart → random selection.
- `src/hooks/useAuth.tsx` — thin wrapper around Supabase auth state.
- `src/hooks/useUnifiedStats.ts`, `useAdvancedStats.ts`, `useTopicAnalysis.ts` — stats data fetching for dashboard/stats pages.

**Role hooks:**
- `src/hooks/useAdmin.ts` — checks `is_user_admin` RPC, guards admin routes.
- `src/hooks/useProfesor.ts` — checks `is_user_profesor` RPC, guards `/profesor` route.

**Profesor data hooks:**
- `src/hooks/useProfesorData.ts` — fetches `get_profesor_stats` + `get_profesor_academias`. Returns `{ stats, academias, loading, refresh }`.
- `src/hooks/useVerificacion.ts` — wraps `get_preguntas_para_verificar` + `verificar_pregunta`. Returns `{ preguntas, loading, total, cargar, verificar }`.
- `src/hooks/useGestionPreguntas.ts` — wraps `upsert_pregunta` + direct `preguntas` table query. Returns `{ preguntas, loading, saving, cargar, guardar }`.
- `src/hooks/useExamenes.ts` — direct queries on `examenes` + `examen_preguntas` tables. Returns `{ examenes, loading, saving, cargar, crear, toggleActivo }`.
- `src/hooks/useProfesorStudentStats.ts` — fetches `get_profesor_student_stats` + `get_profesor_topic_stats`. Returns `{ studentStats, topicStats, loading, cargar }`.

### Quiz flow

**Test mode:**
1. User selects academia + tema in `TestSetup` (`/test-setup`). Supports `?tema=<id>` URL param for pre-selection (resolves academia automatically).
2. Navigates to `/quiz?mode=test&academia=<id>&tema=<id>`
3. `useQuiz` calls `start_quiz_session` → loads questions via `get_smart_preguntas`
4. Each answer calls `record_answer` RPC + updates `preguntas_falladas`
5. On finish, `complete_quiz_session` RPC returns final stats
6. Navigates to `/results` with stats via router state

**Practice mode:**
1. `/practice` shows a scope selector: **Todas** / **Por academia** / **Por tema**
   - Loads all `preguntas_falladas` for the user + joins `preguntas` to get `academia_id`/`tema_id`
   - Derives available academias/temas with live falladas counts
   - Shows count card updating in real time per scope
2. Navigates to `/quiz?mode=practice[&academia=<id>][&tema=<id>]`
3. `useQuiz` in practice mode fetches all fallada IDs, then queries `preguntas` filtered by `academia_id`/`tema_id` if provided
4. Correct answers remove the question from `preguntas_falladas`; wrong answers are kept

### Profesor panel (`/profesor`)

Seven-tab dashboard at `src/pages/Profesor.tsx`. Access requires `is_user_profesor` = true (role `profesor` or `admin`) + entries in `profesor_academias`.

| Tab | Component | Purpose |
|-----|-----------|---------|
| Inicio | `ProfesorStats` + `ProfesorAcademias` | KPI cards + academia list with verification progress bars |
| Verificar | `VerificacionPreguntas` | Review pending/verified/rejected questions with inline edit + approve/reject. Shows origin badges (📚 banco, 🤖 IA). |
| Banco | `BancoPreguntas` | Browse biblioteca questions, import (clone) into own academia, AI rewrite button. |
| Preguntas | `GestionPreguntas` | CRUD questions via Dialog form |
| Temas | `GestionTemas` | Create / rename / delete temas per academia. Delete warns that all preguntas in the tema will also be deleted. |
| Exámenes | `CrearExamen` + `ExamenForm` | 3-step stepper: basic info → select verified questions → review & create |
| Alumnos | `EstadisticasEstudiantes` | Per-student and per-topic accuracy tables |

Admin panel (`/admin`) includes a **Gestión de Profesores** section (`ProfesorManager`) to assign/remove the `profesor` role and manage `profesor_academias` assignments, plus an **Academias de Profesores** section (`AcademiaManager`) to create new non-biblioteca academias and assign them to a professor.

**Select empty-value convention**: Radix UI prohibits `value=""` in `<SelectItem>`. Use `"__all__"` as the sentinel for "all/none selected" and convert to `undefined` before passing to RPCs/queries.

**Verification edit flow**: `VerificacionPreguntas` includes a pencil icon per question that opens `PreguntaFormDialog` pre-filled with all editable fields (parte, pregunta_texto, opciones A-D, solucion_letra, explicaciones A-D). Saving calls `upsert_pregunta` — verification resets to pending only if the save includes `p_modificada_por_ia = true` (i.e. AI rewrites). Plain manual edits (text, tema, etc.) preserve the current verification status. Academia is not editable from this view.

**Original banco comparison** (`VerificacionPreguntas` + `PreguntaFormDialog`):
- When the question list loads, all `pregunta_origen_id` values on the current page are batch-fetched in one query (fields: `pregunta_texto`, `opcion_a/b/c/d`, `solucion_letra`). Results are stored in an `originals: Record<string, OriginalPregunta>` map.
- Each cloned question card shows a "📚 Original del banco" toggle (blue) between the options grid and the verify/reject buttons. Clicking it expands a compact blue panel with the original text + options (correct answer highlighted green). Toggle state is a `Set<string>` so multiple cards can be open simultaneously.
- `PreguntaFormDialog` accepts an optional `originalPregunta` prop. When present, a collapsible "Original del banco" header appears above the form fields (collapsed by default, resets on dialog close), giving Yeray a reference while editing.

**Banco import flow** (`BancoPreguntas`):

*Single import:*
1. Professor selects source (biblioteca academia + tema chip) and destination (own academia + tema).
2. Click "Importar" → `clonar_pregunta` RPC creates a copy in the professor's academia with `pregunta_origen_id` set. Explanations are copied too.
3. `PreguntaFormDialog` opens pre-filled by fetching the full cloned row (including explanations).
4. Optional: click "🤖 Reescribir con IA" → calls `rewrite-question` edge function, then saves with `p_modificada_por_ia = true` (resets to pending).

*Batch import (up to 20 questions):*
1. Click "Selección múltiple" toggle in the filter header.
2. Click question cards (or their checkbox) to select up to `MAX_BATCH = 20`.
3. Floating bar at `bottom-20` shows count + two actions: **"Sin IA"** (plain clone) and **"Importar con IA"** (AI rewrite each).
4. Progress dialog (non-dismissable while processing): sequential processing with 600ms delay between AI requests; AI failure falls back to plain clone without aborting the batch.
5. Completion summary: ✅ saved count, ❌ error count, 🤖/📋 legend.
6. Tema chip stats refresh after the batch completes (`bancoTemasKey` increments).

**Source tema selector (Banco)**: Instead of a `<Select>` dropdown, temas are shown as a chip grid loaded via `get_banco_tema_import_stats`. Each chip shows an icon (⭕ 0 imported, 🔵 some imported, 🔄 all imported but none verified, ✅ some verified) + counts. Clicking a chip filters the question list to that tema.

**AI rewrite logic** (`supabase/functions/rewrite-question/`):
- Always rewrites `pregunta_texto`.
- Options **≤50 chars**: tagged `[MANTENER EXACTA]` — server also hard-restores them regardless of AI output.
- Options **>50 chars**: tagged `[REESCRIBIR]`. If the option's explanation is also >50 chars, it's passed as a reference hint so the AI understands the semantic meaning.
- Explanations are passed as context only — never returned, never modified. Client keeps originals.
- After AI response, client applies `shuffleOptions()` (`src/lib/shuffleOptions.ts`): Fisher-Yates shuffle of active options tracked by `origIdx` (not object reference), `solucion_letra` updated to match the correct option's new position. Explanations follow their options during shuffle.

**Verification dashboard**: `VerificacionPreguntas` shows a mini-dashboard split into two sections:
- **"Tu academia"**: one card per propia academia (es_biblioteca = false) with color-coded verification progress (teal ≥70%, amber 30-70%, red <30%) and a "Temas" toggle. Tema chips are clickable to set the filter. Stats loaded lazily, cached in component state.
- **"Progreso del banco"**: one card per biblioteca academia (JCLM, LICEO, LINCE) showing import progress (importadas / total) and verified count. Tema chips here are informational only (not clickable for filter). Stats loaded via `get_banco_tema_import_stats`.
- Filter selects only show propias academias. Context bar below shows live counts for the current scope.

**GestionPreguntas / GestionTemas**: Both components filter `academias` to `propias` (es_biblioteca = false) before rendering. If the professor has only one propia academia, the selector is replaced with a static label and the academia is auto-selected on mount.

### Mobile-first design

The app is designed to be used as a **mobile web app** (installable via browser, not a native app). All UI must work well on both mobile and desktop browsers.

- **Design mobile first**: start layouts for small screens, expand with `sm:`, `md:`, `lg:` breakpoints.
- The `MainLayout` includes a `BottomNavBar` for mobile navigation — this is the primary nav on small screens.
- Avoid hover-only interactions; all interactive elements must be accessible via tap.
- Touch targets should be at least 44px tall (`h-11` / `h-14`).
- Use `use-mobile.tsx` hook (`useIsMobile()`) when conditional rendering is needed per breakpoint.
- Fullscreen pages (`/quiz`, `/results`) use `min-h-screen` and are designed to fill the viewport without scrolling on mobile when possible.

### UI conventions

- All UI primitives are from shadcn/ui in `src/components/ui/` — do not modify these directly.
- Styling uses Tailwind utility classes with `cn()` from `src/lib/utils.ts` (clsx + tailwind-merge).
- Dark mode is managed by `ThemeContext` (wraps `next-themes`).
- Toast notifications: use `useToast` hook (shadcn) or `sonner` for imperative toasts.
- The app uses a **compact professional** design language across all pages (no glassmorphism blobs):
  - Section rows: `rounded-xl border border-l-4 border-l-{color}-400 bg-card`
  - Page containers: `max-w-2xl mx-auto px-4 pb-24 space-y-4`
  - KPI cells: `w-7 h-7 rounded-full {bg} flex items-center justify-center` + bold number + tiny label
  - Section headers: `text-xs font-semibold uppercase tracking-wider text-muted-foreground`
  - Progress bars: `h-1.5` thin bars, teal ≥80%, amber 50-79%, blue/red otherwise
- Color thresholds (consistent across all pages): teal ≥70-80%, amber 30-70%, red <30%
- Profesor panel uses **teal** color scheme (`text-teal-500`, `bg-teal-600`) to distinguish from the orange admin panel.
- New RPC calls use `supabase.rpc('name' as any, { ... })` to bypass strict TypeScript types until `types.ts` is regenerated. After schema changes, regenerate with `mcp__supabase__generate_typescript_types` and write to `src/integrations/supabase/types.ts`.
- Edge functions are deployed with `npx supabase functions deploy <name> --project-ref pakyheklnfpwibyahmcg`. Docker is not required (upload-only mode).

**Auto-resizing textareas**: shadcn `<Textarea>` has `min-h-[80px]` baked into its base class, which prevents the `scrollHeight` collapse trick from working. For textareas that must start at 1 line and grow to content (e.g. option fields in `PreguntaFormDialog`), use a plain `<textarea>` HTML element with `style={{ height: '34px' }}` as the initial inline style + `resize-none overflow-hidden`. Resize logic: (1) `useLayoutEffect` depending on `[open, ...values]` — fires before paint and handles initial load + AI-rewrite updates; (2) inline resize in `onChange` for immediate user feedback. Both use `el.style.height = '0'; el.style.height = el.scrollHeight + 'px'` (setting to `'0'` first forces a real collapse before measuring).

**Radix Select with truncated items**: To make `SelectItem` children use flex layout (for truncating long names + pinning a count to the right), add `className="[&>span:last-child]:flex [&>span:last-child]:w-full [&>span:last-child]:min-w-0 [&>span:last-child]:overflow-hidden [&>span:last-child]:items-center [&>span:last-child]:gap-2"` to `SelectItem`, and `className="w-[var(--radix-select-trigger-width)]"` to `SelectContent`. This targets the `SelectPrimitive.ItemText` span (which is the last child) without modifying the shadcn component.
