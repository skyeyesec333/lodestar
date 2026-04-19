# UX Framework Rollout Plan

**Date:** 2026-04-18
**Status:** Proposed
**Scope:** Adopt a small, opinionated set of UI libraries to close the biggest UX gaps without fragmenting the stack.
**Out of scope (deferred):** All AI-surface work — Vercel AI SDK, assistant-ui, Beacon streaming rewrite. Revisit when AI budget/capacity returns.

---

## Guiding principles

1. **One library per concern.** We already have Framer Motion; we will not add a second animation runtime. We will not mix Recharts + Nivo for the same chart type.
2. **Client-only libs dynamic-import.** Preserve App Router server-component defaults. Every new client-only component mounts via `next/dynamic({ ssr: false })` when its payload is large (globe, charts) or it touches `window` on init.
3. **Theme tokens stay authoritative.** Libraries must inherit `var(--teal)`, `var(--gold)`, `var(--accent)`, DM Mono, and the house curve `cubic-bezier(0.16, 1, 0.3, 1)`. No shipped library default colors.
4. **Delete before you ship.** Every phase that introduces a lib must delete the hand-rolled equivalent in the same PR. No parallel implementations.
5. **Effort ranges are calendar days for one engineer working on it mostly full-time.**

---

## Sequenced phases

### Phase 0 — Foundations (0.5 day)

Baseline conveniences the later phases assume.

**Work**
- `npm install sonner` and mount `<Toaster />` in [src/app/layout.tsx](src/app/layout.tsx) (or dashboard layout if the marketing shell shouldn't toast).
- Replace the ad-hoc inline success/error strings in the highest-traffic forms: [src/components/requirements/RequirementsChecklist.tsx](src/components/requirements/RequirementsChecklist.tsx), [src/components/documents/DocumentPanel.tsx](src/components/documents/DocumentPanel.tsx), [src/components/meetings/MeetingsLog.tsx](src/components/meetings/MeetingsLog.tsx).
- Add a `src/lib/ui/toast.ts` wrapper that standardizes variants (`success`, `error`, `info`) and autoclose timing so components don't reach for `sonner` directly.

**Acceptance**
- Status changes, uploads, and meeting actions fire a toast instead of mutating inline panel state.
- No toast exceeds 4s default duration. Destructive actions get 6s + undo where applicable.

---

### Phase 1 — Keyboard-first navigation (3 days)

**Library:** `cmdk`

**Work**
- Install `cmdk`. Create `src/components/command/CommandPalette.tsx` as a client component mounted at the dashboard layout so `Cmd/Ctrl+K` is global.
- Index five domains by reusing existing server actions / db helpers (no new DB code):
  - Projects → [src/lib/db/projects.ts](src/lib/db/projects.ts) (list by name/slug)
  - Requirements → [src/lib/db/requirements.ts](src/lib/db/requirements.ts) (label + project slug)
  - Stakeholders → [src/lib/db/stakeholders.ts](src/lib/db/stakeholders.ts)
  - Meetings → [src/lib/db/meetings.ts](src/lib/db/meetings.ts)
  - Documents → [src/lib/db/documents.ts](src/lib/db/documents.ts)
- Single endpoint: `/api/command/search` that fan-outs with a Zod-validated `q` param, rate-limited 60/min (per `.claude/rules/api-routes.md`).
- Action commands (verb entries, not entity jumps):
  - "Mark requirement Substantially Final…" → opens a second page in the palette to pick the requirement
  - "Create action item…" → opens the existing action-item form prefilled
  - "Go to portfolio"
- Wire `react-hotkeys-hook` (optional, 2KB) or hand-roll the key listener — start hand-rolled.

**Acceptance**
- `Cmd+K` opens palette anywhere in the dashboard shell.
- Typing a project name jumps to its detail page in ≤200ms perceived.
- Two action commands land with keyboard-only confirmation.
- No server action is duplicated; palette only calls existing helpers.

---

### Phase 2 — Motion polish on existing surfaces (2 days)

**Library:** Framer Motion (already installed at `^12.38.0`) + View Transitions API (native).

**Work**
- Apply `layout` + `AnimatePresence` to the five "boards" so card reorder animates:
  - [src/components/projects/FunderKanban.tsx](src/components/projects/FunderKanban.tsx)
  - [src/components/projects/PortfolioTriageBoard.tsx](src/components/projects/PortfolioTriageBoard.tsx)
  - [src/components/projects/ExecutionCommitmentsBoard.tsx](src/components/projects/ExecutionCommitmentsBoard.tsx)
  - [src/components/projects/CriticalPathBoard.tsx](src/components/projects/CriticalPathBoard.tsx)
  - [src/components/projects/EvidenceActionBoard.tsx](src/components/projects/EvidenceActionBoard.tsx)
- Readiness gauge: animate the numeric label with a `motion` tween so it counts up in lockstep with the SVG arc. Preserve the existing `cubic-bezier(0.16, 1, 0.3, 1)` / 0.9s. Edit [src/components/projects/ReadinessGaugeClient.tsx](src/components/projects/ReadinessGaugeClient.tsx).
- Requirement status pill: 150ms color crossfade on status change in [src/components/requirements/RequirementsChecklist.tsx](src/components/requirements/RequirementsChecklist.tsx).
- View Transitions API on tab nav: enable `viewTransition: true` on `next/link` in [src/components/projects/SectionSubNav.tsx](src/components/projects/SectionSubNav.tsx) and add a minimal `::view-transition-old/new` CSS rule (150ms crossfade, respects `prefers-reduced-motion`).

**Acceptance**
- Cards visibly travel between board columns on status change.
- Gauge number and arc hit their target simultaneously.
- Tab switches inside a project no longer flash-rerender.
- No animation longer than 600ms. `prefers-reduced-motion` disables the view transitions CSS.

---

### Phase 3 — Chart foundation: Recharts (3–5 days)

**Library:** `recharts`

**Work**
- Install `recharts`. Add `src/components/charts/theme.ts` that reads CSS variables via `getComputedStyle(document.documentElement)` and returns a typed theme object (colors, fonts, grid stroke). Charts are client components, so this is safe.
- Migrate in order, deleting the hand-rolled SVG in the same PR:
  1. [src/components/projects/ReadinessTrendlineChart.tsx](src/components/projects/ReadinessTrendlineChart.tsx) (433 lines → target ~120)
  2. [src/components/portfolio/PortfolioTrendlineChart.tsx](src/components/portfolio/PortfolioTrendlineChart.tsx) (230 lines)
- **New:** DSCR-vs-covenant-floor trend inside [src/components/projects/CovenantMonitoringPanel.tsx](src/components/projects/CovenantMonitoringPanel.tsx). **Deferred** — verified during implementation (2026-04-18) that the `covenants` table has no observation history; it only tracks compliance status, due dates, and waivers. DSCR chart needs a new `covenant_observations` table (at minimum: `covenantId`, `observedAt`, `valueBps`, `floorBps`, `notes`). That schema + data-entry UI is its own feature and does not belong in this framework-rollout plan. Capture as separate follow-up plan once covenant ops workflow is in scope.
- Confirm bundle impact with `ANALYZE=1 next build`. Expect ~95 KB gz added; accept.

**Acceptance**
- Two old SVG chart components deleted.
- DSCR chart renders headroom band (floor → current) with tooltip.
- Dark/light theming works without component-level color props.

---

### Phase 4 — Workflow DnD on the Funder Kanban (4–5 days)

**Library:** `@dnd-kit/core` + `@dnd-kit/sortable`

**Work**
- Install `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.
- Add drag-to-reorder and drag-between-columns to [src/components/projects/FunderKanban.tsx](src/components/projects/FunderKanban.tsx). Wire drop to existing `updateFunderRelationshipStage` server action in [src/actions/funder-relationships.ts](src/actions/funder-relationships.ts) (verify exact path during implementation).
- Include keyboard sensor — not optional; finance B2B tool a11y expectation.
- Optimistic update via `useOptimistic` → rollback on action failure → `sonner` error toast (Phase 0 dependency).
- Out of scope for this phase: the other four boards. Port them one by one once the FunderKanban pattern is proven — they all share the same shape.

**Acceptance**
- A pointer or keyboard user can move a funder card from "Identified" to "Term Sheet" and the DB updates.
- Failed writes roll back with a clear toast.
- Screen-reader announcements fire on pick-up / drop (dnd-kit defaults + our own message strings).

---

### Phase 5 — Table standardization on portfolio (3–5 days, seeds a pattern)

**Library:** `@tanstack/react-table` v8 + `@tanstack/react-virtual`

**Work**
- Install both. Create `src/components/table/DataTable.tsx` — a thin wrapper over TanStack Table that ships column sort, column hide, resize, and optional virtualization behind a single typed prop API.
- First migration: **Pivoted to [UpcomingDeadlines](src/components/portfolio/UpcomingDeadlines.tsx) and [StagnantDealsTable](src/components/portfolio/StagnantDealsTable.tsx)** (2026-04-18). Verified during implementation that [DealComparisonTable](src/components/portfolio/DealComparisonTable.tsx) is a **metric-by-deal comparison matrix** (metrics are the rows, user-selected deals are the columns), not a standard sortable table. TanStack Table's sort/hide/resize apply to data columns, not dynamic deal-selection columns — it would add nothing there. The two migrated tables are 3–4 data columns each, already-used on the portfolio page, and establish the pattern on real finance data (readiness %, days-since-activity, target dates, days remaining).
- Persist column visibility + sort in `localStorage` keyed by `'lodestar.table.dealComparison'` (mirrors the saved-views pattern in [src/components/portfolio/PortfolioFilterBar.tsx](src/components/portfolio/PortfolioFilterBar.tsx)).
- Do **not** migrate `RequirementsChecklist` or `StakeholderPanel` in this phase — those are 2,000+ LOC rewrites that deserve their own plan.

**Acceptance**
- `DataTable` component exists with docs (JSDoc on exported props only — follow the "no comments you didn't change" rule elsewhere).
- Deal comparison table has sortable columns, hide/show, and export-to-CSV.
- Column state survives reload.

---

### Phase 6 — Nivo for finance-canonical charts (5–7 days)

**Library:** `@nivo/sankey`, `@nivo/funnel`, `@nivo/calendar` (per-module; do not install `nivo` umbrella).

**Work**
- Install the three modules individually.
- **Sources-and-Uses Sankey** — **Deferred** (verified 2026-04-18). The `Project` model has `capexUsdCents` only — no uses breakdown (no EPC / IDC / contingency / O&M fields, no `project_uses` table). Without at least 2 use nodes, a Sankey collapses to a bar and we already have `CapitalStackBar` for that. Capture as a separate follow-up: (a) `project_uses` table with `projectId`, `category` (enum: epc, idc, contingency, fees, reserves), `amountUsdCents`, (b) a data-entry UI in the project detail capital section. Sankey lands with that feature.
- **Funder pipeline funnel** as an alternate view on [src/components/projects/FunderKanban.tsx](src/components/projects/FunderKanban.tsx) — toggle button "Kanban | Funnel".
- **Activity heatmap** on project detail and `/portfolio`. Source: `activities` table (already populated via `recordActivity`). GitHub-style calendar — one year back.
- Apply the `src/components/charts/theme.ts` token bridge from Phase 3 so Nivo defaults don't leak.

**Acceptance**
- All three new charts rendered with tokens, not Nivo defaults.
- Bundle impact per chart is verified with build analyzer; each module is lazy-loaded via `next/dynamic` if it only renders in one tab.
- No module of `nivo` (umbrella) present in lockfile.

---

### Phase 7 — Geographic portfolio globe (2–3 days)

**Library:** `react-globe.gl` (Three.js under the hood; dynamic-imported)

**Work**
- Install `react-globe.gl` + `three`. Dynamic import only — `next/dynamic({ ssr: false })`.
- New component `src/components/portfolio/PortfolioGlobe.tsx` mounted on `/portfolio`, above or next to existing [src/components/portfolio/GeographyBreakdown.tsx](src/components/portfolio/GeographyBreakdown.tsx). Keep the text list — the globe is additive.
- Pins: one per project, colored by readiness score bucket. Hover shows project name + stage + readiness.
- Country polygon tint: EXIM Country Limitation Schedule eligibility. **Prerequisite:** add a static CLS map to [src/lib/exim/requirements.ts](src/lib/exim/requirements.ts) or a new sibling `src/lib/exim/cls.ts`. CLS is public EXIM data; extract from the most recent published schedule and cite the source date in the file.
- Lat/lon: derive from `countryCode` using a small static centroid table (`src/lib/geo/country-centroids.ts`). Do not call an external geocoder.

**Acceptance**
- Globe loads behind a dynamic import; initial `/portfolio` TTI is not measurably worse than pre-change (Lighthouse spot-check).
- CLS shading reflects the schedule constant; source date is visible in a footer note.
- Only mounts for users with ≥2 projects (single-project sponsors see the text list only — a globe with one pin is worse than text).

---

### Phase 8 — Realtime presence via Liveblocks (1 week + infra)

**Library:** `@liveblocks/client`, `@liveblocks/react`, `@liveblocks/node` (for auth)

**Scope** intentionally narrow — only presence + avatars. Threads migration of the existing `CommentThread` is a follow-up plan, not this phase.

**Work**
- Sign up for Liveblocks; confirm pricing at current MAU projection (flag to stakeholder before PR).
- Add `/api/liveblocks-auth` route that wraps Clerk session → Liveblocks JWT. Follow `.claude/rules/api-routes.md` (Zod, rate-limit, typed response).
- Wrap project detail layout in `<RoomProvider id={`project:${projectId}`}>`.
- Presence indicator component: avatar stack in project header showing who's currently viewing. Reuse existing user avatar component from [src/components/collaboration/CollaboratorsPanel.tsx](src/components/collaboration/CollaboratorsPanel.tsx) if shape compatible.
- **Do not** ship live cursors on Gantt in this phase — cursors on a 1,667-line hand-rolled SVG component is a trap. Revisit after any Gantt refactor.

**Acceptance**
- Two users on the same project see each other's avatars within 1s of joining.
- Signing out removes the avatar.
- No Liveblocks calls on any non-project route.
- Pricing tier documented in `docs/infrastructure.md` or equivalent.

---

## Deferred (AI budget required)

These are high-ROI but blocked on AI spend. Listed so they aren't forgotten.

- **Vercel AI SDK + `@ai-sdk/anthropic`** to replace [src/app/api/chat/route.ts](src/app/api/chat/route.ts) and [src/components/beacon/BeaconPanel.tsx](src/components/beacon/BeaconPanel.tsx). Current chat is NOT actually streaming Claude — it ships `buildFallbackChatAnswer` as one NDJSON `text-delta`. The "Beacon = NotionAI-style" vision is blocked on this swap.
- **assistant-ui** drop-in chrome on top of AI SDK.
- **Tool calls** from Beacon into existing server actions (`updateRequirementStatus`, `createActionItem`, `searchProject`).
- **Generative UI** (AI-rendered cards/widgets for readiness summaries, gap analyses).

When we pick this up, it's a 2–3 day self-contained phase. Keep the `src/lib/ai/` boundary rule — AI SDK lives behind that module, not in components.

Also deferred, non-AI:
- **Yjs/Tiptap collaborative editing** on Concept Beacon Brief and meeting notes. Wait until those surfaces prove they need multi-cursor editing; the CRDT ops cost isn't justified today.
- **TanStack Table migration of `RequirementsChecklist` and `StakeholderPanel`.** 2,000+ LOC each. Needs its own plan.
- **Porting the other four boards to `dnd-kit`.** Should follow quickly after Phase 4 proves the pattern, but deliberately not bundled into that phase.

---

## Explicitly skipped (and why)

| Rejected | Reason |
|---|---|
| Three.js / R3F for gauges, Gantt, or general 3D | Decoration, not comprehension. Hurts scan speed. |
| GSAP, React Spring, Motion One | Fragments the stack — Framer Motion already owns this concern. |
| AG Grid | 500KB + license fight with shadcn aesthetic. TanStack Table covers the 80% case cleanly. |
| CopilotKit | Redundant with AI SDK (when AI is on the table). |
| LangChain.js | Violates `src/lib/ai/` architecture rule; adds abstraction over a clean Anthropic client. |
| tldraw / Excalidraw | Niche vs. the real workflow gaps; revisit if a "deal structure diagram" feature ships. |
| React Grid Layout | Lodestar isn't widget-first; personalization is premature. |
| Mapbox + Deck.gl | react-globe.gl covers the executive-story use case at lower cost. Revisit if per-project site mapping becomes a requirement. |

---

## Sequencing summary

| Phase | Library | Effort | Blocked by |
|---|---|---|---|
| 0 | sonner | 0.5d | — |
| 1 | cmdk | 3d | 0 |
| 2 | Framer layout + View Transitions | 2d | 0 |
| 3 | Recharts | 3–5d | 0 |
| 4 | dnd-kit (FunderKanban) | 4–5d | 0 (nicer with 0) |
| 5 | TanStack Table (DealComparisonTable) | 3–5d | 0 |
| 6 | Nivo (3 modules) | 5–7d | 3 (shared theme) |
| 7 | react-globe.gl | 2–3d | — |
| 8 | Liveblocks presence | 5d + infra | 0 |

Phases 0–5 have no inter-phase dependencies beyond `sonner` and can be parallelized across engineers if capacity exists. Total linear calendar if one engineer ships everything: ~6 weeks; two engineers parallel: ~3.5 weeks.

---

## Open questions for the user

1. **Liveblocks pricing sign-off** — free tier covers alpha, but starter ($29/mo) kicks in around 100 MAU. Confirm before Phase 8.
2. **CLS data freshness** — the globe tint relies on a static CLS constant. Who owns updating it when EXIM publishes a new schedule? Quarterly cron, or manual?
3. **Recharts vs. visx for Gantt long-term** — not in this plan, but flag: when the 1,667-line `GanttChart.tsx` needs its next major feature, that's the forcing function for a visx migration. Should we pre-plan that now or wait?
