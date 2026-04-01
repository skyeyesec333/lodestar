# Lodestar

Infrastructure project lifecycle management for sponsors pursuing project finance — from first concept through financial close.

Lodestar tracks every requirement, stakeholder, meeting, document, and milestone for deals across four financing programs: US EXIM Bank project finance, multilateral/bilateral DFI financing (IFC, AfDB, DFC), commercial bank project finance, and private equity / sponsor finance. The core product is a live readiness score that tells the project owner exactly how close they are to the primary approval milestone at all times.

---

## What it does

- **Requirements checklist** — 43–75 items per deal type, weighted by importance, tracked through five status stages (not started → in progress → draft → substantially final → executed)
- **Readiness gauge** — weighted score in basis points updated on every status change, with a per-category breakdown
- **Blocker panel** — surfaces items that gate the primary approval milestone (LOI for EXIM, board approval for DFI, credit approval for commercial bank, IC approval for PE)
- **Gantt / timeline** — AI-predicted completion windows per item, based on current status and target date
- **Stakeholder graph** — tracks all organizations and individuals (EPC, off-taker, lender, government) and their roles
- **Documents** — upload and link documents to specific requirements; tracks coverage gaps
- **Meetings log** — record every stakeholder meeting, extract action items, link to requirements
- **Gap analysis** — Claude-powered streaming analysis of the deal's current gaps and recommended next steps
- **Beacon AI panel** — embedded AI assistant with deal-type-aware context for ad-hoc questions
- **Collaboration** — comments, approvals, watchers, @mentions, and activity feed
- **PM signals** — CriticalPathBoard, DocumentCoverageMap, OwnershipLoadBoard, WeeklyDriftPanel

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, server components by default) |
| Language | TypeScript (strict mode, no `any`) |
| Database | PostgreSQL via Prisma ORM |
| Auth | Clerk |
| AI | Anthropic Claude API — Sonnet 4.6 for in-app features |
| Storage | Supabase Storage (document uploads) |
| UI | Tailwind CSS + custom design system |
| Testing | Vitest |

---

## Deal types supported

| Deal Type | Primary Gate | Items | Key Framework |
|-----------|-------------|-------|---------------|
| `exim_project_finance` | LOI Submission | 43 | EXIM procedures, >51% US content |
| `development_finance` | Board Approval | ~55 | IFC Performance Standards PS1–8 |
| `commercial_finance` | Credit Approval | ~56 | Equator Principles, MLA credit committee |
| `private_equity` | IC Approval | ~54 | Fund mandate, LP obligations |

---

## Architecture

### Rules
- All Claude API calls go through `src/lib/ai/` — never call the API directly from components or routes
- All database access goes through `src/lib/db/` — never import Prisma client outside this directory
- Domain TypeScript types live in `src/types/` — imported everywhere, defined nowhere else
- No business logic in React components — components call server actions or API routes only
- Server actions live in `src/actions/` — one file per domain entity
- Prefer server components; use `"use client"` only when interactivity requires it
- All Prisma queries must include explicit `select` — no unbounded `.findMany()` without field selection
- Every API route validates input with Zod before touching the database
- Errors bubble up as typed `Result<T, AppError>` — no raw `try/catch` in components
- All monetary/percentage values stored as integers (basis points or integer %) — no floats in DB

### Requirements taxonomy
Each deal type has a static requirements file:
- `src/lib/exim/requirements.ts` — EXIM (source of truth, legacy shape)
- `src/lib/ifc/requirements.ts` — IFC/DFI
- `src/lib/commercial/requirements.ts` — Commercial bank project finance
- `src/lib/pe/requirements.ts` — Private equity / sponsor finance

All four expose the same `RequirementDef` shape (or are adapted to it). The unified router at `src/lib/requirements/index.ts` resolves the correct taxonomy for any `DealType` value.

### Directory structure
```
src/
  app/                        # Next.js App Router pages
    api/                      # API route handlers
    (dashboard)/              # Authenticated app routes
  actions/                    # Server actions (one per domain entity)
  components/
    projects/                 # Project detail, onboarding, PM signals
    stakeholders/             # Stakeholder graph, deal party checklist
    requirements/             # Checklist, blocker panel
    meetings/                 # Meetings log
    documents/                # Document panel
    collaboration/            # Comments, approvals, watchers
    beacon/                   # AI assistant panel
    ui/                       # Shared UI components
  lib/
    ai/                       # Claude API wrapper, prompts, chat, document review
    db/                       # Prisma client singleton and query helpers
    exim/                     # EXIM requirements taxonomy (source of truth)
    ifc/                      # IFC requirements taxonomy
    dfi/                      # Generic DFI requirements taxonomy
    commercial/               # Commercial bank requirements taxonomy
    pe/                       # PE/sponsor finance requirements taxonomy
    requirements/             # Unified router (index.ts) and shared types (types.ts)
    scoring/                  # Readiness score calculation
    experts/                  # Expert directory
    notifications/            # Email
    storage/                  # Supabase storage client
  types/                      # Shared TypeScript domain types
prisma/
  schema.prisma
  seed.ts
docs/
  plans/                      # Implementation plans
  agents/                     # Agent lane definitions
```

---

## Local development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in: DATABASE_URL, DIRECT_DATABASE_URL, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
# CLERK_SECRET_KEY, ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

# Generate Prisma client
npx prisma generate

# Run dev server
npm run dev
```

---

## Database migrations

This project does **not** use `prisma/migrations/`. Migrations are written as plain SQL and run manually in the Supabase SQL Editor using the **direct connection** (port 5432, not the pooler on port 6543).

The most recent migration is `migration_wip_hybrid.sql` in the project root. It is idempotent and safe to re-run.

**Why direct connection?** Supabase's connection pooler (port 6543) blocks DDL statements. All `CREATE TABLE`, `ALTER TABLE`, and `CREATE TYPE` statements must be run through the direct connection.

---

## Key domain vocabulary

- **LOI** — EXIM Letter of Interest, the first formal EXIM milestone
- **Final Commitment** — EXIM's binding financing approval, follows LOI
- **Board Approval** — DFI's equivalent of LOI + Final Commitment combined
- **Credit Approval** — Commercial bank credit committee approval
- **IC Approval** — PE investment committee approval
- **Readiness score** — weighted percentage of required artifacts in substantially final or executed form
- **Substantially final** — EXIM/DFI standard: contracts near-executed, not summaries
- **IFC PS1–8** — IFC Performance Standards, the DFI E&S framework
- **Equator Principles** — commercial bank E&S framework, adopted by major PF banks
- **EPC** — Engineering, Procurement & Construction contractor
- **Off-taker** — entity purchasing the project's output (power, water, etc.)
- **CAPEX** — Capital Expenditure, total construction cost
- **DSCR** — Debt Service Coverage Ratio (must be ≥ 1.2–1.3x for lenders)
- **LTA** — Lender's Technical Advisor, independent engineer appointed by the lender
- **DSRA** — Debt Service Reserve Account
- **MLA** — Mandated Lead Arranger (commercial bank structuring the deal)
- **CTA** — Common Terms Agreement (master loan document in syndicated deals)
- **FPIC** — Free Prior and Informed Consent (required under IFC PS7 for indigenous peoples)
- **ERR** — Economic Rate of Return (required by DFIs to justify development impact)
