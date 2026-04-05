# Lodestar — Claude Code Context

## What this app does
Lodestar is an infrastructure project lifecycle management platform
for sponsors pursuing project finance across multiple programs:
US EXIM Bank, DFI/IFC, commercial bank project finance, and private equity.
It tracks every stakeholder, meeting, document, and milestone from
initial concept through key approval milestones and Financial Close.

The core metaphor: a live readiness score that tells the project
owner exactly how close they are to a submittable data room / gate package,
at all times.

## Domain vocabulary
- **Project owner / sponsor** — the company developing the infrastructure asset
- **EPC** — Engineering, Procurement & Construction contractor (must be American for EXIM; >51% US content)
- **Off-taker** — entity contractually obligated to purchase the project's output (power, water, etc.)
- **LOI** — EXIM Letter of Interest, the first formal EXIM milestone
- **Final Commitment** — EXIM's binding financing approval, follows LOI
- **CP / Condition Precedent** — a gating requirement that must be satisfied before the next phase
- **Data room** — structured document repository assembled for lender/EXIM review
- **Readiness score** — weighted percentage of required artifacts that are in substantially final or executed form; taxonomy is deal-type-specific
- **Substantially final form** — lender/program standard: contracts must be near-executed, not summaries or outlines; terminology originates with EXIM
- **Primary gate** — the program-agnostic term for LOI (EXIM), Board Approval (DFI), Credit Approval (commercial), or IC Approval (PE)
- **IDC** — Interest During Construction, a key financing cost EXIM models
- **CLS** — Country Limitation Schedule, EXIM's country-by-country eligibility rules
- **Political-only cover** — narrower EXIM guarantee covering only political risk, not commercial
- **Comprehensive cover** — full EXIM guarantee covering both political and commercial risk
- **Greenfield** — new project, not an expansion of an existing business (EXIM requirement)
- **CAPEX** — Capital Expenditure, the total project construction cost

## Tech stack
- **Framework**: Next.js 15 (App Router, server components by default)
- **Language**: TypeScript (strict mode, no `any`)
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: Clerk
- **AI**: Anthropic Claude API (`@anthropic-ai/sdk`) — Sonnet 4.6 for in-app features
- **Storage**: Supabase Storage (document uploads)
- **UI**: shadcn/ui + Tailwind CSS
- **Testing**: Vitest + React Testing Library

## Architecture rules
- All Claude API calls go through `/src/lib/ai/` — never call the API directly from components or route handlers
- All database access goes through `/src/lib/db/` — never import Prisma client outside this directory
- Domain TypeScript types live in `/src/types/` — imported everywhere, defined nowhere else
- EXIM requirements taxonomy lives in `/src/lib/exim/requirements.ts` as a static constant — it is the source of truth for all readiness scoring
- No business logic in React components — components call server actions or API routes only
- Server actions live in `/src/actions/` — one file per domain entity

## Directory structure
```
src/
  app/                        # Next.js App Router pages
    api/                      # API route handlers
    (dashboard)/              # Authenticated app routes
  actions/                    # Server actions (one per domain entity)
  components/
    projects/
    stakeholders/
    requirements/
    meetings/
    documents/
    ui/                       # shadcn/ui re-exports
  lib/
    ai/                       # Claude API wrapper and prompts
    db/                       # Prisma client singleton and query helpers
    exim/                     # EXIM requirements taxonomy (static data)
    scoring/                  # Readiness score calculation logic
  types/                      # Shared TypeScript domain types
prisma/
  schema.prisma
  seed.ts
docs/
  plans/                      # Claude Code plan mode output (committed)
```

## Naming conventions
- DB tables: `snake_case` plural (`projects`, `stakeholders`, `documents`)
- TypeScript interfaces: `PascalCase` (`Project`, `Stakeholder`, `EximRequirement`)
- Enums: `PascalCase` with string values (`RequirementStatus.SubstantiallyFinal`)
- API routes: `/api/[entity]/route.ts` or `/api/[entity]/[id]/route.ts`
- Components: `PascalCase` in domain subdirectory (`ProjectCard`, `ReadinessGauge`)
- Server actions: `camelCase` verb-first (`createProject`, `updateRequirementStatus`)
- Plan files: `YYYY-MM-DD-description.md` in `docs/plans/`

## Coding standards
- Prefer server components; use `"use client"` only when interactivity requires it
- All Prisma queries must include explicit `select` — no unbounded `.findMany()` without field selection
- Every API route must validate input with Zod before touching the database
- Errors bubble up as typed `Result<T, AppError>` — no raw `try/catch` in components
- All monetary/percentage values stored as integers (basis points or integer %) — no floats in DB

## New tables (Phase 1 additions)
- `debt_tranches` — stores debt tranche records per funder relationship
- `covenants` — financial covenant tracking per project/funder
- `project_share_links` — public share tokens for read-only project views
- `funder_relationships` / `funder_conditions` — lender pipeline and CPs

## New action files
- `src/actions/covenants.ts`
- `src/actions/external-evidence.ts`

## New DB helper files
- `src/lib/db/portfolio.ts`
- `src/lib/db/covenants.ts`
- `src/lib/db/debt-tranches.ts`
- `src/lib/db/share-links.ts`
- `src/lib/db/external-evidence.ts`

## Current build phase
**Phase 1 — Alpha product, multi-program aware.**
The repo has a complete authenticated dashboard, project detail workflows,
meetings, documents, requirements tracking, timeline UI, and an embedded assistant.
Multi-program taxonomy is live: EXIM, DFI/IFC, commercial bank, and PE each have
their own requirement set, phase labels, and gate config via `getProgramConfig()`.

Architecture rules for multi-program work:
- `getRequirementsForDealType(dealType)` — single router for all taxonomies
- `getProgramConfig(dealType)` — gate label, phase labels, hasBlockerColumn
- `getStageLabel(stage, dealType)` — ProjectPhase display name per program
- `getCategoryLabel(category)` — shared requirement category display name
- `computeReadiness(statuses, dealType)` — program-agnostic scoring
- `ProjectRequirementRow.isPrimaryGate` — renamed from `isLoiCritical`
- `capexUsdCents` is `number | null` on `Project`/`ProjectListItem` — converted at DB boundary
