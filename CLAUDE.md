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
- **Without layout** (fullscreen): `/auth`, `/quiz`, `/results`, `/admin`, `/profesor`
- **With `MainLayout`** (bottom nav bar): `/`, `/stats`, `/ranking`, `/test-setup`, `/practice`, `/analisis-temas`

All routes except `/auth`, `/admin`, and `/profesor` are wrapped in `<ProtectedRoute>`. The `/admin` and `/profesor` routes manage their own auth + role check internally (same pattern: `useEffect` with 500ms delay).

### Data model (Supabase)

Core hierarchy: `academias` → `temas` → `preguntas`

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

Verification fields added to `preguntas`:
- `verificada` (boolean, default false) — approved by a professor
- `rechazada` (boolean, default false) — rejected by a professor
- `verificada_por` (uuid → profiles) — who verified it
- `verificada_at` (timestamptz) — when it was verified
- `verificacion_notas` (text) — reviewer notes
- `creada_por` (uuid → profiles) — who created it (professors)

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
| `get_profesor_academias(p_profesor_id)` | Assigned academias with verification progress counters |
| `get_preguntas_para_verificar(p_profesor_id, p_academia_id, p_tema_id, p_estado, p_limit, p_offset)` | Paginated questions for review. `p_estado`: `'pendiente'` \| `'verificada'` \| `'rechazada'`. Returns `total_count` via window function. |
| `verificar_pregunta(p_profesor_id, p_pregunta_id, p_accion, p_notas)` | Approve or reject a question. `p_accion`: `'verificar'` \| `'rechazar'` |
| `upsert_pregunta(p_profesor_id, p_pregunta_id?, ...)` | Create or edit a question. Editing resets verification fields. |
| `crear_tema(p_profesor_id, p_academia_id, p_nombre)` | Create a new tema scoped to an assigned academia |
| `get_profesor_student_stats(p_profesor_id, p_academia_id?)` | Per-student accuracy, sessions, puntos for the professor's academias |
| `get_profesor_topic_stats(p_profesor_id, p_academia_id?)` | Per-topic avg accuracy and student count |

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

1. User selects academia + tema in `TestSetup` (`/test-setup`)
2. Navigates to `/quiz?mode=test&academia=<id>&tema=<id>`
3. `useQuiz` calls `start_quiz_session` → loads questions via `get_smart_preguntas`
4. Each answer calls `record_answer` RPC + updates `preguntas_falladas`
5. On finish, `complete_quiz_session` RPC returns final stats
6. Navigates to `/results` with stats via router state

### Profesor panel (`/profesor`)

Six-tab dashboard at `src/pages/Profesor.tsx`. Access requires `is_user_profesor` = true (role `profesor` or `admin`) + entries in `profesor_academias`.

| Tab | Component | Purpose |
|-----|-----------|---------|
| Inicio | `ProfesorStats` + `ProfesorAcademias` | KPI cards + academia list with verification progress bars |
| Verificar | `VerificacionPreguntas` | Review pending/verified/rejected questions with inline edit dialog + approve/reject |
| Preguntas | `GestionPreguntas` | CRUD questions via Dialog form |
| Temas | `GestionTemas` | Create new temas per academia |
| Exámenes | `CrearExamen` + `ExamenForm` | 3-step stepper: basic info → select verified questions → review & create |
| Alumnos | `EstadisticasEstudiantes` | Per-student and per-topic accuracy tables |

Admin panel (`/admin`) includes a **Gestión de Profesores** section (`ProfesorManager`) to assign/remove the `profesor` role and manage `profesor_academias` assignments.

**Select empty-value convention**: Radix UI prohibits `value=""` in `<SelectItem>`. Use `"__all__"` as the sentinel for "all/none selected" and convert to `undefined` before passing to RPCs/queries.

**Verification edit flow**: `VerificacionPreguntas` includes a pencil icon per question that opens a Dialog pre-filled with all editable fields (parte, pregunta_texto, opciones A-D, solucion_letra). Saving calls `upsert_pregunta` which resets `verificada/rechazada` to false — the question returns to pending and must be re-verified. Academia and tema are not editable from this view.

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
- Components use glassmorphism patterns: `backdrop-blur-sm bg-white/80`, gradient borders, and shadow utilities.
- Profesor panel uses **teal** color scheme (`text-teal-500`, `bg-teal-600`) to distinguish from the orange admin panel.
- New RPC calls use `supabase.rpc('name' as any, { ... })` to bypass strict TypeScript types until `types.ts` is regenerated.
