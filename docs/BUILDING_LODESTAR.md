# Building Lodestar — A Journey Document

*For Bryan, future Claude sessions, and Codex. Written at the close of a long context window.*

---

## What we built

Lodestar began as an EXIM Bank project finance tracker and became something more ambitious: a universal infrastructure deal lifecycle platform that knows the difference between how IFC board approval works, how a commercial bank credit committee thinks, and how a PE fund's investment committee makes decisions.

This document is a record of how that happened, what we learned, and what future builders of this codebase should know.

---

## The arc of development

### Phase 1 — Foundation

The earliest version was EXIM-first by design. The schema had a single requirements taxonomy (43 items across 6 categories), a readiness score, and a project detail page showing all the key EXIM-specific milestones: LOI countdown, LOI blocker items, US content certification, CLS clearance.

The product metaphor was clear from the start: a live score that tells the sponsor how far they are from a submittable EXIM data room.

### Phase 2 — CRM and collaboration groundwork

Before expanding to multiple deal types, we built the operational layer: stakeholder graph, meetings log with AI extraction, document panel, EPC bids, funder workspace, deal parties, milestones, and a Gantt chart with AI-predicted completion windows.

A full collaboration layer was added: comments with @mentions, approval/signoff badges, watchers, activity feed.

The key pattern established here: **Result<T, AppError>** for all async operations. No raw try/catch in components. No unbounded Prisma queries. Every query has explicit `select`. This pattern made the codebase resilient — when DB columns are missing, errors surface cleanly rather than crashing silently.

### Phase 3 — The EXIM hardcoding problem

As the codebase grew, EXIM-specific language had crept into every corner:
- Stage labels said "Pre-LOI", "LOI Submitted", "LOI Approved"
- The readiness gauge was labeled "EXIM Deal Readiness"
- The tour guide mentioned LOI dates and EXIM data room in every step
- The requirements heading said "EXIM Deal Workplan"

The fix was systematic: add `dealType` to the Prisma schema, thread `isExim = project.dealType === "exim_project_finance"` from the project page down through every component as a prop, and gate all EXIM-specific UI behind that boolean.

**The lesson:** Don't hardcode the name of a specific program into UI strings until you're certain the product will never support other programs. In infrastructure finance, it will always support other programs.

### Phase 4 — Non-EXIM onboarding

The new deal flow assumed every deal was EXIM. We restructured it with a `DealTypeScreen` as the first step — five options with clear descriptions of what each program involves. EXIM deals continue to the eligibility screen and full EXIM wizard. All other deal types skip the eligibility screen and go directly to a simplified wizard where EXIM-specific fields (cover type, environmental category, target LOI date) are hidden.

The wizard itself became deal-type-aware via `isExim` prop, showing or hiding fields as appropriate.

### Phase 5 — Domain research (the Opus sessions)

This was the most unusual part of the build. We had a working platform for EXIM deals but no requirements taxonomies for the other three programs. Rather than guess at what IFC boards, commercial bank credit committees, or PE investment committees require, we ran three dedicated Opus research sessions to generate authoritative taxonomies from domain knowledge.

Each session asked: *"For [program type], what are all the documents, contracts, studies, and approvals a sponsor needs? Structure by category. Note which items gate the primary approval milestone and who owns each."*

The output was not just a list — it was a structured comparison against EXIM, showing which items were the same, which were different, and why. This turned out to be essential for building the checklist correctly.

**The lesson:** Some tasks require domain knowledge that coding models don't have at the depth needed for a production data room checklist. Opus's knowledge of IFC Performance Standards, Equator Principles, and PE IC processes was the raw material. The coding work was then encoding that knowledge into TypeScript constants that the platform could use.

**The model selection insight:** Use Opus for taxonomy research (generating requirements from domain knowledge). Use Sonnet for all implementation work. They are different tools for different jobs — Opus is not "better at coding," it's better at synthesizing authoritative domain knowledge.

### Phase 6 — Taxonomy encoding and the unified router

The three taxonomies (DFI, Commercial Bank, PE) were encoded as TypeScript files following the same `RequirementDef` shape. The IFC taxonomy was also expanded from its thin ~20-item state to a full ~55-item taxonomy covering all eight IFC Performance Standards.

The architecture decision: a single unified router at `src/lib/requirements/index.ts` that takes a `DealType` string and returns the correct `RequirementDef[]`. This kept the scoring engine, DB layer, and UI components free of deal-type branching — they just call `getRequirementsForDealType(dealType)` and get back a list of requirements in a known shape.

**The lesson about shared interfaces:** The four taxonomies use different phase names (loi/final_commitment vs. board_approval/financial_close vs. credit_approval/cp_to_close vs. screening/ic_approval). Don't try to unify these into one enum — that forces artificial equivalences. Instead, let each taxonomy use its own phase strings and provide a `ProgramConfig` that maps those strings to display labels. The shape is shared; the values are program-specific.

### Phase 7 — The 404 incident

After implementing all four taxonomies, every project page showed a 404.

The debugging process was instructive:

1. TypeScript compiled clean — no type errors
2. The dev server logs showed `notFound()` being thrown from `middleware.ts:7` — this was a **red herring**. It was `auth.protect()` rejecting an unauthenticated test curl request, not the project page.
3. The real cause: `projectFullSelect` included `dealType: true`, but the `dealType` column didn't exist in the live Supabase database yet. Prisma threw a database error, `getProjectBySlug` returned `{ ok: false }`, and the page called `notFound()`.

The fix was a SQL migration. But getting the migration there was its own journey:

- `prisma migrate diff --from-url` — removed in new Prisma versions, use `--from-config-datasource`
- `prisma migrate diff --to-schema-datamodel` — also removed, use `--to-schema`
- Connecting to Supabase's pooler for DDL — **this hangs silently**. Always use the direct connection (port 5432) for DDL statements.
- Running terminal commands in the Supabase SQL Editor — the SQL editor runs SQL, not shell commands.

**The lesson about database errors and 404s:** In Next.js App Router with the `Result<T>` pattern, database errors don't throw to the error boundary — they get caught, become `{ ok: false }`, and the page code maps that to `notFound()`. A 404 on a page that clearly exists usually means the DB query failed, not that the record is missing. Always check for missing columns/tables as the first hypothesis.

**The lesson about Supabase migrations:** No `prisma/migrations/` directory exists in this project. All migrations are plain SQL run manually in the Supabase SQL Editor. The pattern is:
- Generate a diff with `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`
- For column renames (not just additions): add column nullable → UPDATE to copy data → ALTER COLUMN SET NOT NULL → DROP old column
- Wrap everything in `IF NOT EXISTS` and `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$` for idempotency

### Phase 8 — Shipping

The final session cleaned up the feature branch. Everything from months of work on `wip/hybrid-sync` was merged to `main` in a single `--no-ff` merge commit and the branch deleted.

---

## Patterns to remember

### The isExim pattern
```typescript
const isExim = project.dealType === "exim_project_finance";
// Then gate everything EXIM-specific behind this flag
{isExim && <LoiCountdown />}
{isExim && <EpcBidsPanel />}
```

This is the right level of granularity. Don't try to abstract "deal type behaviors" into a config object — just use a boolean at the component level.

### The Result pattern
```typescript
const result = await getProjectBySlug(slug, userId);
if (!result.ok) notFound();
const project = result.value;
```

Every async DB operation returns `Result<T, AppError>`. This means errors are always typed, always handled, and never silently swallowed.

### The taxonomy router pattern
```typescript
// Bad: switch statement everywhere
if (dealType === "exim") { use EXIM_REQUIREMENTS }
else if (dealType === "dfi") { use DFI_REQUIREMENTS }

// Good: single router called once
const requirements = getRequirementsForDealType(project.dealType);
```

The router handles the branching once. Everything downstream is just `RequirementDef[]`.

### The computeReadiness extension pattern
The scoring engine was extended without breaking existing EXIM code:
```typescript
export function computeReadiness(
  statuses: RequirementInput[],
  dealType?: string  // optional — defaults to EXIM
): ReadinessResult
```

Optional parameters with sensible defaults allow gradual migration of callers.

### The Prisma select discipline
Every query has an explicit `select`. This matters for two reasons:
1. BigInt fields (`capexUsdCents`) can't cross the server/client boundary — `select` lets you exclude or `Number()` convert them
2. Missing columns in the DB surface immediately as TypeScript errors when using explicit selects, rather than silently returning undefined

### The direct connection rule
DDL in Supabase always needs the direct connection URL. The pooler (port 6543) silently hangs on schema changes. In `prisma.config.ts`, use `DIRECT_DATABASE_URL` for migrations.

---

## What Codex should know picking this up

1. **The schema is ahead of the DB.** The Prisma schema is the source of truth. When a new column or table is added, a migration SQL file needs to be written and run manually in Supabase SQL Editor. `migration_wip_hybrid.sql` in the project root shows the current pattern.

2. **Four taxonomies, one interface.** All requirements data flows through `RequirementDef` from `src/lib/requirements/types.ts`. The deal-type-specific files are static constants. Changes to requirements go in the taxonomy files, not in the scoring engine or UI.

3. **The readiness score is cached.** `projects.cachedReadinessScore` is updated on every `updateRequirementStatus` action call. It is not computed on read. If you add a new deal type or change weights, existing projects won't update their score until a requirement status is next changed.

4. **No AI calls in components or routes.** All Claude API calls go through `src/lib/ai/`. The `anthropic` client is instantiated once in `src/lib/ai/client.ts`.

5. **The phase labels are program-specific.** `getProgramConfig(dealType).phaseLabels` maps the phase string values used in each taxonomy to display strings. The `StageStepper` component already handles EXIM vs. generic stages — extend the same pattern for DFI/commercial/PE when building out their stage steppers.

6. **The collaboration tables are in the DB but lightly used in the UI.** Comments, approvals, and watchers are wired end-to-end but the UI components are present without being deeply integrated into the main workflow. This is intentional — they were built to be there when needed.

7. **Beacon replaced ChatWidget.** The old `ChatWidget` component still exists but the project detail page uses `BeaconProvider` + `BeaconPanel`. Beacon has deal-type-aware context built in.

---

## The meta-lesson

The most important thing about building Lodestar is knowing what kind of problem you're solving at each step.

When you're generating a requirements taxonomy for IFC deals, you're doing domain research. That requires deep knowledge of infrastructure finance, IFC Performance Standards, and project finance law. Use the model that's best at that.

When you're encoding that taxonomy as TypeScript constants and wiring them into the scoring engine, you're doing implementation work. Use the model that's most productive at coding.

When you hit a 404, don't assume the code is wrong. First check the database.

When you hit a migration error, check whether you're on the pooler or the direct connection.

When a feature branch gets long, merge it and start fresh. Branches are not meant to be permanent.

---

*Built session by session, context window by context window. The code knows what it is.*
