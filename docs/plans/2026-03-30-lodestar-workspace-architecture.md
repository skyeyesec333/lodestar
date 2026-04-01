# Lodestar Workspace Architecture

Date: 2026-03-30

## Purpose

Define how Lodestar should evolve from a project-detail page with many sections into a workspace-based deal platform that:

- supports EXIM and non-EXIM deals cleanly
- gives each major area a structured operating surface
- makes room for agent-assisted synthesis and collaboration
- avoids turning every subsection into a full product unto itself

This document is intentionally product-first and implementation-aware.

---

## Core Thesis

Lodestar should keep a single `Project` as the root record, but the product should present that project as a workspace shell with six first-class workspaces inside it:

1. Concept
2. Parties
3. Capital
4. Workplan
5. Evidence
6. Execution

`Beacon` should be the intelligence layer across those workspaces, not a seventh peer workspace.

This keeps the domain model stable while making the UI, onboarding, and agent model much more coherent.

---

## Design Principles

1. A deal is one root object.
All collaboration, documents, meetings, requirements, and stage gating stay attached to one `Project`.

2. Workspaces should be operational, not decorative.
Each workspace must answer a clear question:
- Concept: should this deal exist?
- Parties: who matters?
- Capital: how does it get financed?
- Workplan: what must get done?
- Evidence: what proves it?
- Execution: are we moving, and can we advance?

3. Deal type shapes workspaces, not the shell.
EXIM, DFI, commercial, and PE should alter labels, objects, and checks inside workspaces, but not create four totally different apps.

4. Agents should operate inside workspace context.
Each workspace needs structured context and clear allowed actions so Beacon and future agents can synthesize, review, and draft next steps without free-floating confusion.

5. Not every section deserves full workspace status.
Only major domains become workspaces. Subsections stay subordinate.

---

## Target Workspace Model

### 1. Concept Workspace

Purpose:
Define the project before it becomes a checklist.

Key questions:
- What is the opportunity?
- Why now?
- Why this sponsor / asset / market?
- Is this financeable?
- Should this become an active deal?

Core objects:
- project summary
- sponsor thesis
- asset overview
- target structure
- rough capex
- concept risks
- known unknowns
- decision status: incubate / pursue / hold / kill

Outputs:
- concept note
- initial go/no-go
- initial next actions
- candidate financing path

Agent role:
- summarize concept
- identify missing inputs
- suggest likely financing paths
- flag fatal flaws or inconsistencies

### 2. Parties Workspace

Purpose:
Model the human and institutional graph around the deal.

Key questions:
- Who matters?
- Who owns what?
- Who is missing?
- Which relationships are stale, blocked, or influential?

Core objects:
- stakeholders
- stakeholder roles
- organizations
- deal parties
- EPC contacts
- government counterparts
- sponsor team

Outputs:
- relationship map
- missing-role alerts
- ownership map
- contact strategy

Agent role:
- summarize party landscape
- identify missing counterparties
- detect stale relationships
- propose follow-up targets

### 3. Capital Workspace

Purpose:
Define and manage the financing path.

Key questions:
- What financing route are we pursuing?
- Which funders/capital providers are in play?
- What conditions or structure questions remain?
- What is the next financing gate?

Core objects:
- deal type
- program path
- cover type when relevant
- funder relationships
- funder conditions
- capital stack assumptions
- target milestones for financing process

Outputs:
- financing strategy
- funder pipeline
- condition tracker
- stage/gate framing

Agent role:
- compare financing paths
- summarize open conditions
- draft funder outreach prep
- identify structure inconsistencies

### 4. Workplan Workspace

Purpose:
Track the canonical list of what must be done.

Key questions:
- What is required?
- What is blocking the next gate?
- Who owns it?
- What should happen next?

Core objects:
- project requirements
- requirement owners
- action items
- approvals
- comments
- blockers
- readiness scoring inputs

Outputs:
- gate blockers
- owner pressure
- required next actions
- requirement-level status truth

Agent role:
- explain blockers
- propose next steps
- summarize workplan drift
- draft owner nudges or status summaries

### 5. Evidence Workspace

Purpose:
Bind real artifacts to the workplan.

Key questions:
- What evidence exists?
- What is still missing?
- Which critical items lack supporting files?
- Which files are weak, stale, or unreviewed?

Core objects:
- documents
- document versions
- document requests
- linked requirements
- document approvals
- coverage gaps

Outputs:
- evidence coverage
- missing-document queue
- linked/unlinked status
- review readiness

Agent role:
- summarize uploaded materials
- identify evidence gaps
- compare documents against requirement expectations
- draft request lists for missing evidence

### 6. Execution Workspace

Purpose:
Run the live deal.

Key questions:
- What changed?
- What is drifting?
- What is overdue?
- Can the deal advance?

Core objects:
- meetings
- meeting attendees
- activity feed
- milestones
- timeline / gantt
- stage/gate status
- weekly drift / PM signal boards

Outputs:
- operating pulse
- stage review
- schedule risk
- meeting-driven follow-up

Agent role:
- summarize week-over-week drift
- synthesize meetings into actions
- explain why the deal is or is not ready to advance
- propose a PM brief

---

## What Stays Secondary

These should remain modules inside workspaces, not top-level workspaces:

- EPC bids
- funder conditions
- collaborator access
- approvals
- watchers
- comments
- milestone detail

They matter, but they should live inside the nearest major workspace rather than competing with it.

---

## Navigation Tree

Recommended top navigation inside a deal:

1. Overview
2. Concept
3. Parties
4. Capital
5. Workplan
6. Evidence
7. Execution

Recommended supporting utilities:

- Beacon
- Tour
- Collaborators / Access
- Settings

Notes:

- `Overview` is not a full workspace. It is the cross-workspace summary shell.
- `Access` should move out of the main section stack and become utility chrome or a panel attached to Overview/Settings.
- `PM signals` should not stay a standalone nav item long-term; they belong inside `Execution` and partially `Workplan`.
- `Deal Gap` should be renamed or folded into `Workplan`.
- `Data Room` should be renamed to `Evidence` unless a user explicitly prefers the old term.

---

## Overview Surface

The deal front page should become a universal overview, not an EXIM-first page.

The overview should contain:

1. Top summary strip
- current stage
- next gate
- country
- sector
- capex
- primary owner
- target close
- deal risk

2. Gate review card
- next gate
- ready / blocked / at risk
- top blockers
- required approvals / missing evidence
- `Review Gate` CTA

3. Workspace pulse cards
- Concept
- Parties
- Capital
- Workplan
- Evidence
- Execution

4. Recent movement
- latest meetings
- latest activity
- key changes this week

Only EXIM deals should surface EXIM-specific labels such as:
- LOI
- EXIM cover
- CLS
- US content

Non-EXIM deals should instead see:
- board approval
- credit approval
- IC approval
- close readiness

---

## Stage and Gate Model

The app should stop treating `Advance` as a simple button.

Target model:

- `Advance Check`
- `Ready to Advance` or `Blocked`
- explicit gate conditions

Each deal type should define gate conditions for the next stage:

- readiness threshold
- zero critical blockers
- required approvals complete
- required evidence linked
- required owners assigned
- no overdue critical actions

The `Execution` workspace should own this.

The stage rail should become:
- smaller
- more contextual
- focused on current stage and next gate

Not every deal should narrate around LOI.

---

## Beacon Role

Beacon should become the workspace-aware agent surface.

Beacon modes should map to workspace context:

- Ask about this workspace
- Summarize blockers here
- Draft next actions here
- Explain what is missing here
- Review evidence here

Recommended tabs:

1. Assistant
2. Signals
3. Evidence

Beacon should know:
- current workspace
- project metadata
- deal type
- current stage
- workspace-specific objects in view

Beacon should not be an isolated floating novelty. It should be the synthesis layer attached to the active workspace.

---

## Object Ownership by Workspace

Root object:
- `Project`

Reference objects:
- `Organization`
- `Stakeholder`

Workspace ownership:

- Concept
  - project narrative fields
  - concept risk fields
  - target structure / thesis fields

- Parties
  - stakeholder roles
  - deal parties
  - relationship state

- Capital
  - deal type
  - program path
  - funders
  - funder conditions
  - capital path metadata

- Workplan
  - project requirements
  - action items
  - requirement approvals
  - comments
  - owner assignments

- Evidence
  - documents
  - document requests
  - document approvals
  - coverage state

- Execution
  - meetings
  - activity
  - milestones
  - timeline
  - gate review state

Cross-workspace collaboration primitives:
- comments
- mentions
- watchers
- approvals
- activity attribution

These should stay globally consistent even if rendered in local workspace context.

---

## Onboarding Rewrite

### Current problem

The current flow is still too EXIM-shaped:

- deal type comes first
- EXIM eligibility is a privileged branch
- wizard copy still defaults to EXIM in multiple places
- older project form is legacy and EXIM-only

### Target onboarding flow

#### Step 1: Create Deal Workspace

Ask for:
- deal name
- country
- sector
- sponsor / lead entity
- one-sentence concept

#### Step 2: Concept Framing

Ask for:
- asset type / project description
- rough capex
- current maturity
- known unknowns
- target outcome

#### Step 3: Financing Path

Ask for:
- EXIM
- DFI / MDB
- commercial bank
- private equity
- undecided

#### Step 4: Program Module

Only if relevant:
- EXIM eligibility screen
- DFI-specific impact framing
- commercial bank covenant/readiness framing
- PE investment-case framing

#### Step 5: Seed Workspaces

The system provisions:
- workplan taxonomy
- evidence expectations
- stage/gate labels
- capital workspace defaults
- PM signals

### Consequences

- `DealType` becomes an important choice, but not the universal first impression.
- EXIM eligibility becomes a plug-in step.
- `other` should become `undecided` or a true generic mode, not a silent PE fallback.
- the onboarding should create a usable concept workspace immediately, even before financing path is fully decided.

---

## Architecture Implications

This architecture does not require a root schema rewrite immediately.

Near-term:
- keep `Project` as the root
- add concept fields and workspace-aware routing
- reorganize the UI around workspace boundaries
- move program-specific logic into workspace modules

Medium-term:
- replace EXIM-specific fallback assumptions in onboarding, tour, and overview
- define deal-type-specific gate rules in one place
- make Beacon workspace-aware

Long-term:
- consider a `WorkspaceSummary` / `WorkspaceHealth` derived model per workspace
- consider more explicit concept objects if the concept phase becomes collaborative and long-lived

---

## Implementation Sequence

### Phase 1 — Reframe the shell
- add `Concept` workspace
- rename/restructure nav
- make Overview universal rather than EXIM-first

### Phase 2 — Move sections under workspaces
- Parties absorbs stakeholders / deal parties / EPC
- Capital absorbs funders and financing strategy
- Workplan absorbs requirements / blockers / gap logic
- Evidence absorbs documents / coverage / data room logic
- Execution absorbs meetings / activity / PM signals / timeline

### Phase 3 — Rebuild onboarding
- concept-first
- financing-path second
- program modules third

### Phase 4 — Gate review model
- replace `Advance` with `Advance Check`
- deal-type-aware gate conditions
- execution-owned stage review

### Phase 5 — Agent operating model
- Beacon contextual by workspace
- section prompts and synthesis tuned per workspace

---

## Recommendation

Lodestar should become:

`A deal workspace platform with program-aware operating modules`

Not:

- an EXIM tracker with extra tabs
- a flat project detail page with many sections
- a separate app per financing program

The immediate next design move is:

1. add a real `Concept` workspace
2. make `Overview` deal-type-neutral
3. restructure nav around the six workspaces
4. rewrite onboarding to be concept-first and program-second

