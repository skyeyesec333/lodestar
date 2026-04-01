# Lodestar Workspace Execution Plan

Date: 2026-03-30

Companion documents:
- `docs/plans/2026-03-30-lodestar-workspace-architecture.md`
- `docs/BUILDING_LODESTAR.md`

## Goal

Move Lodestar from a section-heavy project detail page into a workspace-based deal platform without forcing a root schema rewrite first.

This document is the bridge from architecture to execution.

It defines:
- the target IA that should be built first
- what can ship without schema changes
- what needs a later data-model migration
- the first implementation tranche
- the point at which planning is complete enough to begin execution

---

## Decisions Locked In

These should now be treated as settled unless a new constraint appears:

1. `Project` remains the root object for now.
2. Lodestar will expose six first-class workspaces:
   - Concept
   - Parties
   - Capital
   - Workplan
   - Evidence
   - Execution
3. `Beacon` is the cross-workspace intelligence layer, not a peer workspace.
4. Onboarding becomes concept-first and program-second.
5. EXIM-specific logic becomes a program module, not the universal default.
6. Phase 1 and Phase 2 should avoid schema churn where possible.

---

## Target Navigation

Inside a deal, the target left/nav model should be:

1. Overview
2. Concept
3. Parties
4. Capital
5. Workplan
6. Evidence
7. Execution

Utility surfaces:
- Beacon
- Tour
- Collaborators / Access
- Settings

### Current-to-target mapping

- `Overview` stays, but becomes more universal.
- `Access` moves out of the main section stack and becomes a utility panel near Overview/Settings.
- `Deal Parties`, `EPC`, and stakeholder graph move under `Parties`.
- `Funders` moves under `Capital`.
- `Deal Readiness`, `Deal Gap`, and checklist logic move under `Workplan` and `Execution` depending on context.
- `Data Room` becomes `Evidence`.
- `Deal Meetings` and `Deal Activity` move under `Execution`.
- PM signal boards also live under `Execution`, not as a floating parallel band forever.

---

## Workspace Landing Pages

These are the target “above the fold” compositions for each workspace.

### Overview

Purpose:
Cross-workspace operating summary.

Above the fold:
- stage + next gate
- country / sector / capex / owner / target close
- gate review card
- top blockers
- workspace pulse cards
- recent movement

Should not be EXIM-first.

### Concept

Purpose:
Frame the deal before it becomes a machine of requirements.

Above the fold:
- concept summary
- sponsor thesis
- why this project / why now
- target structure
- known unknowns
- concept decision status
- next 5 actions

### Parties

Purpose:
Understand and manage people and institutions.

Above the fold:
- stakeholder graph
- critical roles present / missing
- key institutions
- stale relationships
- owner map

### Capital

Purpose:
Manage the financing route and counterparties.

Above the fold:
- financing path
- deal type / program path
- next capital gate
- funder pipeline
- open conditions
- cover/structure details when relevant

### Workplan

Purpose:
Canonical source of what must be done.

Above the fold:
- gate blockers
- readiness/gate status
- critical requirement queue
- unassigned items
- top owner pressure
- requirement list entry point

### Evidence

Purpose:
Bind proof to the workplan.

Above the fold:
- document coverage summary
- missing evidence queue
- linked vs unlinked artifacts
- latest uploads / requests
- approval/review state

### Execution

Purpose:
Run the deal and decide if it can advance.

Above the fold:
- weekly drift
- meetings and recent actions
- stage/gate review
- timeline
- activity stream
- PM signals

---

## What Can Be Built Without Schema Changes

These should form the first delivery tranche.

1. Reframe the deal shell around workspace labels and groupings.
2. Add a true `Concept` workspace shell and placeholder surface.
3. Make the Overview universal rather than EXIM-heavy.
4. Move/rename current sections under the new workspace model.
5. Replace the current “Advance” behavior conceptually with a gate-review surface in UI, even if the deeper gate logic comes later.
6. Rewrite onboarding order and copy using the current `createProject` path.
7. Make Beacon workspace-aware at the UI/context layer.
8. Make tour, nav labels, and overview copy deal-type-aware and stage-aware.

This work mainly touches:
- `src/app/(dashboard)/projects/[slug]/page.tsx`
- `src/components/projects/ProjectNav.tsx`
- `src/components/projects/TourGuide.tsx`
- `src/components/projects/OnboardingWizard.tsx`
- `src/components/projects/NewProjectPage.tsx`
- `src/components/projects/DealTypeScreen.tsx`
- `src/components/projects/ReadinessGauge.tsx`
- `src/components/projects/StageStepper.tsx`
- `src/components/beacon/BeaconPanel.tsx`

---

## What Requires Later Schema / Data Changes

These should not block the first UI/IA tranche.

1. Generic requirement-definition persistence
The biggest current tension is that app routing supports multiple deal types, but persistence still leans on `EximRequirement`.

2. True generic “undecided” mode
`other` should stop falling through to PE-like semantics.

3. Strong gate-condition persistence
If stage advancement becomes formally gated by requirements, approvals, owners, and evidence, the app may need explicit gate-rule definitions and gate-review state.

4. Potential concept-object expansion
If `Concept` becomes collaborative and long-lived, it may eventually deserve richer persisted sub-objects instead of just project-level fields.

5. Wider collaboration targets
If comments/watchers/approvals need to attach to more surfaces, the current target enums and action layer will need extension.

---

## Phased Rollout

## Phase 1 — Workspace Shell Reframe

Objective:
Make the current deal page read like a workspace-based product without changing the root model.

Deliverables:
- new nav grouping
- Overview reframe
- `Concept` workspace scaffold
- section regrouping
- EXIM-neutral top surface
- deal-type-aware labels

Success criteria:
- a user can explain the app in workspaces, not scattered sections
- non-EXIM deals no longer feel like second-class citizens on the front page

## Phase 2 — Onboarding Reframe

Objective:
Make the front door match the new workspace model.

Deliverables:
- concept-first intake
- program selection second
- EXIM eligibility moved into program module position
- review screen aligned with generated workspaces

Success criteria:
- the onboarding can create a useful workspace before all financing assumptions are known
- EXIM is not the implicit default mental model

## Phase 3 — Gate Review Model

Objective:
Replace simplistic stage advancement with explicit gate review UX.

Deliverables:
- `Advance Check` or `Review Gate`
- clear blocked/ready state
- top missing conditions
- next gate language by deal type

Success criteria:
- PMs cannot “advance by vibes”
- the product clearly states why a deal is or is not ready

## Phase 4 — Requirements Abstraction and Persistence Cleanup

Objective:
Bring persistence into alignment with the multi-program product model.

Deliverables:
- generic requirement-definition strategy
- generalized joins where EXIM assumptions still leak
- seed/migration cleanup

Success criteria:
- non-EXIM deal types have first-class persistence rather than app-layer adaptation

## Phase 5 — Workspace-Native Beacon

Objective:
Make Beacon the operating intelligence layer for the new shell.

Deliverables:
- workspace-aware prompts
- workspace-aware default tabs/starters
- context payloads tied to active workspace

Success criteria:
- Beacon feels embedded in the workspace model, not bolted on

---

## Recommended First Implementation Tranche

This is the tranche that should actually be built next.

### Tranche A — UI/IA Reframe

Scope:
- add `Concept` to nav and page shell
- regroup current sections under new workspace labels
- rework overview to be deal-type-neutral
- move access/collaboration out of the main content hierarchy
- relabel `Data Room` as `Evidence`
- fold PM signals conceptually into `Execution`

Why first:
- highest product leverage
- no schema rewrite required
- immediately improves EXIM and non-EXIM coherence

### Tranche B — Onboarding Reorder

Scope:
- concept-first step
- financing/program second
- EXIM eligibility as module
- review page aligned to generated workspaces

Why second:
- prevents the front door from fighting the shell
- still mostly UI flow and action wiring

### Tranche C — Gate Review UI

Scope:
- replace `Advance` language
- add gate-review card
- start with heuristic checks if necessary

Why third:
- it is a product correctness issue
- but it depends on the shell being clearer first

---

## File-Level Execution Map

### Primary files for Tranche A

- `src/app/(dashboard)/projects/[slug]/page.tsx`
- `src/components/projects/ProjectNav.tsx`
- `src/components/projects/TourGuide.tsx`
- `src/components/projects/ReadinessGauge.tsx`
- `src/components/projects/StageStepper.tsx`
- `src/components/projects/WeeklyDriftPanel.tsx`
- `src/components/projects/CriticalPathBoard.tsx`
- `src/components/projects/DocumentCoverageMap.tsx`
- `src/components/projects/OwnershipLoadBoard.tsx`

### Primary files for Tranche B

- `src/components/projects/NewProjectPage.tsx`
- `src/components/projects/DealTypeScreen.tsx`
- `src/components/projects/OnboardingWizard.tsx`
- `src/components/projects/EximEligibilityScreen.tsx`
- `src/actions/projects.ts`
- `src/lib/db/projects.ts`

### Primary files for Tranche C

- `src/components/projects/StageStepper.tsx`
- `src/components/projects/ReadinessGauge.tsx`
- `src/components/projects/MilestonePanel.tsx`
- `src/lib/scoring/index.ts`
- possibly new gate-evaluation helpers under `src/lib/`

### Primary files for later persistence work

- `prisma/schema.prisma`
- `prisma/seed.ts`
- `src/lib/requirements/index.ts`
- `src/lib/db/requirements.ts`
- `src/actions/requirements.ts`
- `src/lib/db/funders.ts`
- SQL migration files in project root / `docs/migrations`

---

## Risks to Watch

1. UI reframe without naming discipline
If labels are changed ad hoc, the app will become less coherent, not more.

2. Onboarding reorder without data discipline
If the flow changes but the persisted defaults still assume EXIM, confusion will remain.

3. Gate review without explicit criteria
If `Advance` becomes `Review Gate` but the checks are vague, users will distrust it.

4. Schema migration too early
The taxonomy persistence issue is real, but it should not block the shell/onboarding reframe.

---

## Planning Exit Criteria

Planning should be considered complete enough to start execution when all of the following are true:

1. The six-workspace model is accepted.
2. `Project` staying as the root object for the first implementation tranche is accepted.
3. The first delivery tranche is agreed to be UI/IA-first.
4. Onboarding is agreed to become concept-first and program-second.
5. EXIM eligibility is agreed to become a module, not the default front door.
6. Gate review is agreed to replace naive stage advancement in principle, even if the enforcement deepens later.

As of this document, those criteria are met unless a new product constraint is introduced.

That means planning is now sufficiently mature to begin execution on:

- Tranche A — Workspace Shell Reframe
- immediately followed by Tranche B — Onboarding Reorder

---

## Recommended Next Step

Begin implementation with a concrete `Tranche A` build plan:

1. add `Concept` workspace scaffold
2. regroup nav and page sections
3. rewrite Overview as universal gate summary
4. move access to utility chrome
5. relabel `Data Room` to `Evidence`
6. move PM signals under `Execution`

At that point, the product shell will finally match the architecture.

