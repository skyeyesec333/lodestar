# Lodestar — Claude Code Context

## What this app does
Lodestar is an infrastructure project lifecycle management platform
for sponsors pursuing US EXIM Bank project finance. It tracks every
stakeholder, meeting, document, and milestone from initial concept
through Letter of Interest submission and Financial Close.

The core metaphor: a live readiness score that tells the project
owner exactly how close they are to a submittable EXIM data room,
at all times.

## Domain vocabulary
- **Project owner / sponsor** — the company developing the infrastructure asset
- **EPC** — Engineering, Procurement & Construction contractor (must be American for EXIM; >51% US content)
- **Off-taker** — entity contractually obligated to purchase the project's output (power, water, etc.)
- **LOI** — EXIM Letter of Interest, the first formal EXIM milestone
- **Final Commitment** — EXIM's binding financing approval, follows LOI
- **CP / Condition Precedent** — a gating requirement that must be satisfied before the next phase
- **Data room** — structured document repository assembled for lender/EXIM review
- **Readiness score** — percentage of EXIM-required artifacts that are in substantially final or executed form
- **Substantially final form** — EXIM's standard: contracts must be near-executed, not summaries or outlines
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

## Current build phase
**Phase 1 — Alpha product.**
The repo is past pure foundation work. It now includes an authenticated dashboard,
project detail workflows, meetings, documents, requirements tracking, timeline UI,
and an embedded assistant.

Current planning stance:
- Runtime product scope is still EXIM-first.
- Strategy may broaden beyond EXIM, but that is a product-planning decision, not
  an implemented domain abstraction yet.
- Prefer strengthening the current readiness spine before introducing a multi-program
  taxonomy layer.
