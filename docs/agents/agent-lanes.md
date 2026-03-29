# Agent Lanes

Last updated: 2026-03-29

Purpose: keep Claude and Codex work coordinated in git so active lanes, red flags, and safe files are visible from any machine.

## Rules

- Update this file before starting any substantial multi-file task.
- Update it again when a task is handed off, paused, or completed.
- Use exact file paths.
- Mark scopes as `safe`, `shared`, or `red-flag`.
- Keep durable architecture context in `CLAUDE.md`; keep active coordination here.

## Active Lanes

| Owner | Scope | Files | Lane | Status |
|---|---|---|---|---|
| Claude | Project detail composition, core deal workflow surfaces | `src/app/(dashboard)/projects/[slug]/page.tsx` | red-flag | active / unfinished |
| Claude | Core readiness and workbench flows | `src/components/requirements/RequirementsChecklist.tsx`, `src/components/documents/DocumentPanel.tsx`, `src/components/meetings/MeetingsLog.tsx`, `src/components/stakeholders/StakeholderPanel.tsx`, `src/components/projects/FunderWorkspace.tsx`, `src/components/projects/GanttChart.tsx`, `src/components/projects/MilestonePanel.tsx` | red-flag | active / overlap-sensitive |
| Codex | Shell UX and safe compaction lane | `src/app/(dashboard)/layout.tsx`, `src/components/ui/ThemeSwitcher.tsx`, `src/components/ui/SearchBar.tsx`, `src/components/chat/ChatWidget.tsx`, `src/app/(dashboard)/projects/page.tsx`, `src/components/projects/ProjectsStageGridClient.tsx`, `src/app/(dashboard)/experts/page.tsx`, `src/components/experts/ExpertsMarketplaceClient.tsx`, `src/components/experts/ExpertCard.tsx` | safe | active |
| Codex | Isolated detail-page presentation tweaks only | `src/components/projects/ProjectNav.tsx`, `src/components/projects/CollaboratorsPanel.tsx`, `src/components/projects/ActivityFeed.tsx`, `src/components/projects/GapAnalysis.tsx`, `src/components/requirements/LoiBlockersPanel.tsx` | shared | active / presentation-only |

## Shared Red Flags

- Do not change section ordering or composition in `src/app/(dashboard)/projects/[slug]/page.tsx` without explicit coordination.
- Do not change mutation behavior or data flow in requirements, documents, meetings, stakeholders, funders, milestones, or timeline components as part of UI cleanup.
- Treat `src/components/projects/GanttChart.tsx` as red-flag except for narrowly-scoped presentation fixes.
- Keep all Prisma/schema work out of Codex unless explicitly requested and coordinated.

## Safe Files

- `src/components/ui/ThemeSwitcher.tsx`
- `src/components/ui/SearchBar.tsx`
- `src/components/chat/ChatWidget.tsx`
- `src/app/(dashboard)/projects/page.tsx`
- `src/components/projects/ProjectsStageGridClient.tsx`
- `src/app/(dashboard)/experts/page.tsx`
- `src/components/experts/ExpertsMarketplaceClient.tsx`
- `src/components/experts/ExpertCard.tsx`

## Shared But Careful

- `src/components/projects/ProjectNav.tsx`
- `src/components/projects/CollaboratorsPanel.tsx`
- `src/components/projects/ActivityFeed.tsx`
- `src/components/projects/GapAnalysis.tsx`
- `src/components/requirements/LoiBlockersPanel.tsx`

Rule: presentation and compaction changes only. Avoid contract changes, new props that require project page rewiring, or anything that changes server action behavior.

## Recent Decisions

- Deal page should become summary-first: status and blockers at the top, work surfaces in the middle, history/admin lower.
- Safe Codex work should focus on compaction and progressive disclosure, not page-level composition changes.
- Theme switching has been condensed into a dropdown palette selector.
- Portfolio and expert-marketplace filters should prefer client-side interactions for fast toggles.

## Recently Completed

- `src/components/projects/CollaboratorsPanel.tsx`
  Summary-first header, collapsed invite form, tighter member rows, compact export action.
- `src/components/projects/ActivityFeed.tsx`
  Preview-first activity panel with latest events shown first and inline reveal for the rest.
- `src/components/projects/GapAnalysis.tsx`
  Compact idle state plus summary-first completed output with inline narrative expand.
- `src/components/projects/ProjectNav.tsx`
  Grouped labels and calmer visual hierarchy without changing section ids.
- `src/components/requirements/LoiBlockersPanel.tsx`
  Preview-first blocker panel with inline expand and return-jump behavior.
- `src/components/ui/SearchBar.tsx`
  Lighter top-nav search control and more compact dropdown treatment.

## Next Safe Queue

1. Compact `src/components/projects/MilestonePanel.tsx` without changing milestone CRUD behavior
2. Make `src/components/projects/ProjectEditForm.tsx` collapsed by default behind a summary row
3. Preview-first `src/components/projects/DailyPriorityWidget.tsx` if it grows too tall
4. Cosmetic-only `src/components/projects/GanttChart.tsx` polish if explicitly coordinated
5. Continue header/search/marketplace shell polish
