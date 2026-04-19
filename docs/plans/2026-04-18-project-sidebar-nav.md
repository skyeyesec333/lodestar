# Project detail: split into per-section routes + left sidebar

**Date:** 2026-04-18
**Status:** Proposed
**Scope:** Replace the 2,156-line single-scroll project detail page with a nested route structure + a persistent left sidebar (inspired by the Orbit dashboard reference image). One route per section. Each route fetches only its own data.

## Context

`src/app/(dashboard)/projects/[slug]/page.tsx` currently renders all nine sections of a project on one page:

```
section-executive-summary   (Summary)
section-collaborators       (Team)
section-overview            (Overview)
section-concept             (Concept)
section-stakeholders        (Parties)
section-capital             (Capital)
section-workplan            (Workplan)
section-documents           (Evidence)
section-execution           (Execution)
```

Three real problems:

1. **Scroll fatigue.** The user has to scroll through 2,100+ lines of content to reach Execution.
2. **Cold-load cost.** Every visit fires ~20 parallel DB queries (stakeholders, docs, meetings, funders, covenants, tranches, requirements, activity, heatmap, members, approvals, risks, milestones, document requests, comments, watchers, concept, external evidence, share links, EPC bids). Even if the user only wanted to look at Capital, they pay for all of it.
3. **Scroll-spy dead weight.** `src/components/projects/ProjectNav.tsx` is defined (a 432-line floating left rail with dot-timeline scroll-spy) but **not imported anywhere**. `SectionSubNav` is used in two places (inside Workplan for readiness/gap, inside Execution for meetings/activity/pm/timeline) — those stay as intra-section sub-nav.

The 9 section labels in the user's brief (SUMMARY / TEAM / OVERVIEW / CONCEPT / PARTIES / CAPITAL / WORKPLAN / EVIDENCE / EXECUTION) match `PROJECT_SECTIONS` in `src/components/projects/projectSections.ts` exactly — no taxonomy work needed.

## Recommended architecture

Nested App Router routes with a shared layout that owns the sidebar and the (memoized) project fetch.

```
src/app/(dashboard)/projects/[slug]/
├── layout.tsx            ← NEW: sidebar shell, fetches project metadata + access once
├── page.tsx              ← keep path, slim to Summary dashboard
├── overview/page.tsx     ← NEW
├── concept/page.tsx      ← NEW
├── team/page.tsx         ← NEW
├── parties/page.tsx      ← NEW
├── capital/page.tsx      ← NEW
├── workplan/page.tsx     ← NEW
├── evidence/page.tsx     ← NEW
└── execution/page.tsx    ← NEW

src/components/projects/
├── ProjectSidebar.tsx    ← NEW
└── projectSections.ts    ← expand: add `href`, `icon` per section

src/lib/db/projects.ts
└── exports `getCachedProjectBySlug` (React.cache-wrapped)  ← NEW
```

**Per-page data fetches** (what the current monster page pulls, split):

| Route | Fetches (reuses existing helpers) |
|-------|-----------------------------------|
| `/projects/[slug]` (Summary) | project, readiness/gate status, upcoming milestones, overdue action items, activity-feed (10 most recent), covenant health rollup, financing risk |
| `/overview` | project (cached), deal config, deal parties (metadata-only) |
| `/concept` | project (cached), `ProjectConcept`, gate review snapshot |
| `/team` | project (cached), project members, resolved Clerk names, collaborators, approvals, share links |
| `/parties` | project (cached), stakeholders, funder relationships, requirements (only for health derivation in the stakeholder graph), deal parties |
| `/capital` | project (cached), debt tranches, funder relationships, covenants, EPC bids |
| `/workplan` | project (cached), requirements, gate review, timeline risks, gap analysis, applicability suggestions, stale assignments |
| `/evidence` | project (cached), documents, document requests, external evidence, expiry timeline |
| `/execution` | project (cached), meetings, action items, activity feed, activity heatmap, milestones, weekly drift data |

The Summary route alone goes from ~20 queries → ~6. A user who only checks Capital pays for 4 queries instead of 20.

**Shared project fetch memoization.** The layout needs project metadata for the sidebar header (name, stage, readiness, slug). Each child page also needs the same project. Wrap `getProjectBySlug` in `React.cache()` so both calls hit the same single DB read within one request:

```ts
// src/lib/db/projects.ts
import { cache } from "react";
export const getCachedProjectBySlug = cache(getProjectBySlug);
```

## Sidebar design (adapted from the Orbit reference)

### Visual anatomy

```
┌──────────────────────────┐
│  ← Portfolio             │  ← back link, DM Mono tiny
│  Kisongo Thermal Power   │  ← project name, DM Serif Display 15px
│  CONCEPT · 29% ready     │  ← stage chip + readiness pill, DM Mono 9px
├──────────────────────────┤
│  ⌘K  Search projects…    │  ← triggers existing global CommandPalette
├──────────────────────────┤
│  PLAN                    │  ← group header, DM Mono 9px muted
│  □  Summary       (active)
│  ○  Overview
│  ○  Concept
│                          │
│  PEOPLE                  │
│  ○  Team
│  ○  Parties
│                          │
│  FINANCE                 │
│  ○  Capital
│                          │
│  DELIVERY                │
│  ○  Workplan  [3]        ← badge = open blockers
│  ○  Evidence  [!]        ← alert badge = expiring docs
│  ○  Execution            │
└──────────────────────────┘
```

- **Width:** 220px fixed on `≥ 1024px`, collapses to a horizontal scrollable chip strip below a slim header on `< 1024px`.
- **Theming:** reuses CSS variables (`--bg-card`, `--border`, `--ink`, `--ink-muted`, `--teal`, `--accent`) — works on every theme, parchment through obsidian. **Not hard-dark** like the Orbit reference; the reference is a style guide for layout and hierarchy, not for colors.
- **Active state:** filled pill using `color-mix(in srgb, var(--teal) 12%, transparent)` background, teal left border accent (2px), ink label.
- **Hover state:** bg goes to `color-mix(in srgb, var(--ink) 4%, transparent)`; 150ms house-curve transition.
- **Icons:** `lucide-react` (already installed). One per section:
  - Summary → `LayoutDashboard`
  - Overview → `FileText`
  - Concept → `Lightbulb`
  - Team → `Users`
  - Parties → `Network`
  - Capital → `Landmark`
  - Workplan → `ListChecks`
  - Evidence → `FolderOpen`
  - Execution → `GanttChart`
- **Badges:** optional slot on each item for a count or dot alert. v1 ships with: Workplan shows open-blocker count, Evidence shows expiring-doc alert dot. Both computed from data already fetched for the top bar (OverdueBanner, FinancingRisk, etc.). Data pipeline: sidebar receives a small `sidebarSignals: { workplanBlockers: number; evidenceAlert: boolean }` prop from the layout.
- **Search row** is a button, not an input — clicking it opens the existing global `CommandPalette` (already bound to ⌘K). No new search. Trigger via a `window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))` — or, cleaner, refactor `CommandPalette` to expose an imperative `open()` via a shared context. Lean for the cleaner path (small hook, one ref).
- **Pro-options:** hide attribution. No "Favorites" section (Orbit has it; we don't have a pinning concept yet — leave it off).

### Active detection

```tsx
// inside ProjectSidebar (client component)
const pathname = usePathname();            // e.g. "/projects/kisongo-thermal/capital"
const active = pathname.split("/")[3] ?? "summary";
```

Items check `active === item.key` where `key` is one of `summary | overview | concept | team | parties | capital | workplan | evidence | execution`.

### Mobile (`< 1024px`)

Sidebar becomes a horizontal scrollable strip directly below the dashboard top nav — same items, same icons, same active state, but `flex-direction: row`, `overflow-x: auto`, snaps. No hamburger / drawer in v1 — simpler to ship, no a11y traps. Revisit if feedback requires.

## Section → component map

What moves where. I verified every section ID already exists on the current page, so this is largely a **relocation** not a rewrite.

| Route | Components that move in | Notes |
|-------|------------------------|-------|
| `/summary` (default) | `ExecutiveSummary`, `ReadinessGauge` (condensed), `GateBlockersPanel`, `OverdueActionItems`, `UpcomingMilestonesWidget`, `StageStepper`, `FinancingRiskBadge`, `CovenantHealthBadge`, `StatusReportButton`, `SetupChecklist` (if first-run) | This is a true dashboard — compact, links out to other sections |
| `/overview` | `ProjectEditForm`, stage metadata card, country/sector labels, target dates | Straight lift |
| `/concept` | `ProjectConceptPanel`, `ConceptBeaconBrief`, `DecisionDesk`, `gate review` snippets | Straight lift |
| `/team` | `CollaboratorsPanel`, `ShareLinksPanel`, `ApprovalsPanel`, member list w/ resolved Clerk names | Straight lift |
| `/parties` | `StakeholderPanel` (includes new xyflow graph), `FunderWorkspace` (Kanban + Funnel toggle), deal parties | Two big components already built — this route just mounts them |
| `/capital` | `CapitalStackBar`, `DebtTranchePanel`, `CovenantMonitoringPanel`, `FunderWorkspace`'s capital views, `ScenarioSimulator`, `EpcBidsPanel` | `FunderWorkspace` appears on both `/parties` and `/capital` — flag below |
| `/workplan` | `RequirementsChecklist`, `GapAnalysis`, `ReadinessBreakdown`, `CriticalPathBoard`, `WorkplanQueue`, `StaleAssignmentsPanel`, `ApplicabilitySuggestions`, `ResponsibilityMatrix`, `LoiProjectionWidget` | Heaviest section. Keeps its internal `SectionSubNav` for `readiness ↔ gap-analysis ↔ requirements` |
| `/evidence` | `DocumentPanel`, `DocumentRequestPanel`, `DocumentCoverageMap`, `ExpiryTimeline`, `EvidenceActionBoard` | Straight lift |
| `/execution` | `MeetingsLog`, `ActivityFeed`, `ActivityHeatmap`, `MilestonePanel`, `WeeklyDriftPanel`, `ExecutionCommitmentsBoard`, `GanttChart`, `TimelineRiskBadge` | Keeps its internal `SectionSubNav` for `meetings ↔ activity ↔ pm-signals ↔ timeline` |

### Shared mounts

Some components need to be reachable from multiple routes:

- **FunderWorkspace** — on `/parties` (Kanban of relationships) AND `/capital` (tranche context). Keep a single source of truth; mount on `/parties` as the primary home. Add a small cross-link card on `/capital` ("See full funder pipeline → /parties").
- **StakeholderGraph** (inside `StakeholderPanel`) — lives on `/parties` only. That's its natural home.
- **Beacon panel** (AI chat) — floats via `BeaconProvider` in the layout so it's available everywhere inside a project, unchanged.

## File-level changes

### New files

1. **`src/app/(dashboard)/projects/[slug]/layout.tsx`**
   - Server component. Calls `getCachedProjectBySlug` + auth/access check.
   - If not found → `notFound()`.
   - Renders:
     ```tsx
     <BeaconProvider projectId={project.id} projectSlug={project.slug} ...>
       <WorkspaceBeaconSync ... />
       <div className="ls-project-shell">
         <ProjectSidebar project={project} signals={sidebarSignals} />
         <div className="ls-project-main">{children}</div>
       </div>
     </BeaconProvider>
     ```
   - Calculates `sidebarSignals` from 2 cheap queries (blocker count + expiring doc count). Both ≤ 50ms.

2. **`src/components/projects/ProjectSidebar.tsx`** — client component. Uses `usePathname`. Renders groups, active state, icons, badges, collapsed mobile strip via CSS.

3. **`src/components/projects/ProjectSidebarMobile.css`** *(or extend `globals.css`)* — media-query-driven horizontal-scroll mobile strip.

4. **Eight new `page.tsx` files**, one per non-summary section. Each:
   - Server component.
   - Calls `getCachedProjectBySlug` (shares cache with the layout call).
   - Fetches its own data subset.
   - Returns only that section's JSX — no wrapper chrome, layout owns it.

### Edits

- **`src/app/(dashboard)/projects/[slug]/page.tsx`** — shrinks to Summary. Drops ~1,700 lines of other-section JSX + their imports. The rest of the content gets redistributed. This is the largest edit.
- **`src/lib/db/projects.ts`** — add `export const getCachedProjectBySlug = cache(getProjectBySlug);`.
- **`src/components/projects/projectSections.ts`** — add per-section `href`, `icon` (lucide name), `group`:
  ```ts
  export type NavSection = {
    key: "summary" | "overview" | "concept" | "team" | "parties" | "capital" | "workplan" | "evidence" | "execution";
    label: string;
    href: string;      // "/projects/[slug]/capital" template form
    icon: string;      // lucide name
    group: "plan" | "people" | "finance" | "delivery";
  };
  ```
- **`src/components/command/CommandPalette.tsx`** — export a small `useOpenCommandPalette()` hook so the sidebar's search button can trigger it without a synthetic keyboard event. Tiny addition.

### Deletions

- **`src/components/projects/ProjectNav.tsx`** — 432 lines, unused (verified by grep). Delete.
- All per-section JSX from the old `page.tsx` that has moved to a new route.

### Keep unchanged

- `SectionSubNav` — stays in place inside `/workplan` (readiness/gap/requirements) and `/execution` (meetings/activity/pm-signals/timeline).
- `Breadcrumbs` — already in dashboard layout, will auto-extend: "Projects > Kisongo Thermal > Capital". If it doesn't, minor edit.
- Dashboard top nav (`NavLinks`) — orthogonal; stays. Top nav = cross-app; sidebar = cross-section within a project.

## Migration plan — phased

Ten total routes. Doing all of it in one PR means a ~2,500-line diff and a coordinated cutover. Phase it so each phase is small, reviewable, and individually shippable.

### Phase 1 — Shell up (1 day)
- Add `layout.tsx` with sidebar + `getCachedProjectBySlug`.
- Build `ProjectSidebar` with all 9 items, active state, icons, badges.
- Delete `ProjectNav.tsx`.
- `page.tsx` stays as-is (still renders the whole monolith). The sidebar is alongside it.
- Mobile horizontal strip works.
- **Ships:** new navigation chrome; behavior identical to today when clicking anything other than the current route.

### Phase 2 — Move the cheap sections (1 day)
- Move `Overview`, `Concept`, `Team` to their own routes. Small data, small component sets.
- Delete their blocks from the monolith.
- Old `#section-overview` hash links still work because those IDs live inside the new route pages (keep the `id` attribute).
- **Ships:** three real routes with real performance wins on those sections.

### Phase 3 — Move the medium sections (2 days)
- Move `Parties`, `Capital`, `Evidence`.
- `FunderWorkspace` becomes a route-specific component on `/parties`; add a cross-link card on `/capital`.
- **Ships:** six routes done.

### Phase 4 — Move the heavy sections (2 days)
- Move `Workplan` and `Execution`. These bring the most dynamic imports and still-used `SectionSubNav` — preserve both.
- **Ships:** all section pages live.

### Phase 5 — Remake Summary as a dashboard (1–2 days)
- What remains in `page.tsx` becomes a true Summary: KPIs + at-a-glance gate status + "next actions" callouts linking to specific sub-sections.
- **Ships:** the whole feature.

**Total:** ~7 days of focused work. Risk contained per phase.

## Open questions (need answers before Phase 1)

1. **Sidebar grouping.** Flat list of 9, or clustered into 4 groups (Plan / People / Finance / Delivery) with muted group headers? Recommendation: clustered — the Orbit reference uses them and 9 flat items feels dense.
2. **Summary route content.** Dashboard-style (KPI tiles + jump-to-section CTAs, like the Orbit dashboard reference) or minimal-hub (just the project header and links)? Recommendation: dashboard-style — the Summary should pull the user's attention to *what's broken* without needing to click around.
3. **Badges on the sidebar.** Ship Workplan-blocker-count + Evidence-alert-dot in v1, or keep sidebar plain until Phase 5? Recommendation: ship in v1 — they're the single biggest "what do I click next" signal and cost ~2 extra cheap queries in the layout.
4. **Mobile behavior.** Horizontal scrollable strip (what this plan assumes) or a proper hamburger-triggered drawer? Recommendation: strip for v1 (simpler, no a11y trap), drawer later if feedback requires.

## Verification

- `npx tsc --noEmit` clean after each phase.
- `npm test` — 285 tests still pass (no tests directly touch this page).
- Browser (each phase):
  1. Click each sidebar item → URL changes → correct section renders → active state flips.
  2. Reload a section URL → deep link works (server-rendered).
  3. Open ⌘K from the sidebar's search row → palette opens.
  4. Resize to `< 1024px` → sidebar becomes horizontal chip strip, same active state.
  5. Badges: create a requirement blocker → Workplan item shows `[1]`; upload a doc with near-term expiry → Evidence item shows `[!]`.
  6. Theme-switch through every theme → sidebar contrasts correctly (especially dark themes where filled pill needs to remain readable).
- Performance: Lighthouse / devtools network on Capital route — confirm it fetches fewer than 8 DB queries and TTI < current page's.
- `grep -r "#section-" src/app/` after full migration — confirm all legacy anchor links still resolve (the `id` attributes move into their new route pages but keep the same string).

## Out of scope

- Search inside sidebar (global ⌘K owns that).
- "Favorites" / pinning (no data model for it).
- Side-drawer mobile behavior (strip covers v1).
- Moving Beacon / Tour / First-Run overlays — they stay in the layout, unchanged.
- Dashboard top-nav (`NavLinks`) — stays as-is.

---

## Immediate next step

Answer the four open questions, then Phase 1 starts.
