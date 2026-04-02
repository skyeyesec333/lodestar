# Codex Context — Lodestar

## What this repo is

Lodestar is a Next.js 15 App Router app for infrastructure project finance sponsors. It tracks readiness for US EXIM Bank LOI submission — requirements, documents, stakeholders, meetings, milestones, funders. See `CLAUDE.md` for full domain vocabulary and architecture rules.

## Stack

- **Framework**: Next.js 15 App Router, server components by default
- **Language**: TypeScript strict mode — no `any`, no `as never`
- **Database**: PostgreSQL via Prisma ORM (PrismaClient + pg driver adapter)
- **Auth**: Clerk (`@clerk/nextjs`)
- **AI**: Anthropic Claude API via `@anthropic-ai/sdk` — all calls go through `src/lib/ai/`
- **Storage**: Supabase Storage
- **UI**: Tailwind CSS + shadcn/ui
- **Testing**: Vitest (node env, no RTL) — pure function tests only

## Hard architecture rules

- All DB access goes through `src/lib/db/` — never import Prisma client outside this directory
- All Claude API calls go through `src/lib/ai/` — never call the API directly from components or route handlers
- Server actions live in `src/actions/` — one file per domain entity, `"use server"` at top
- No business logic in React components — components call server actions or read props only
- Every Prisma query must include explicit `select` — no unbounded `.findMany()` without field selection
- Monetary values are stored as integers (basis points or cents) — never floats in the DB
- Errors bubble up as `Result<T>`: `{ ok: true, value: T } | { ok: false, error: { code: string, message: string } }`
- API routes validate input with Zod before touching the database

## Recent changes (do not regress these)

### WatchButton requires `slug` prop
`src/components/collaboration/WatchButton.tsx` now has `slug: string` as a required prop.
All three call sites have been updated:
- `src/components/documents/DocumentPanel.tsx`
- `src/components/meetings/MeetingsLog.tsx`
- `src/components/requirements/RequirementsChecklist.tsx`

Do not remove the `slug` prop or revert these call sites.

### Paginated return types
`getProjectActivity()` and `getProjectDocuments()` now return:
```ts
Result<{ items: T[]; nextCursor: string | null }>
```
All callers must use `.value.items`, not `.value` directly. Updated callers:
- `src/components/projects/ActivityFeed.tsx`
- `src/app/(dashboard)/projects/[slug]/page.tsx`
- `src/app/share/[token]/page.tsx`
- `src/app/api/projects/[slug]/export/route.ts`
- `src/actions/activity.ts`

### Rate limiting
`src/lib/rate-limit.ts` — in-memory sliding window rate limiter. Applied to:
- `src/app/api/chat/route.ts` — 20 req/min
- `src/app/api/gap-analysis/route.ts` — 10 req/min
- `src/app/api/meetings/extract/route.ts` — 10 req/min
- `src/app/api/search/route.ts` — 60 req/min

Do not remove the `checkRateLimit` calls from these routes.

### funders.ts is fully typed Prisma
`src/lib/db/funders.ts` was migrated from raw SQL (`$queryRaw`) to typed Prisma queries. Do not reintroduce `$queryRaw` here.

### Schema additions already pushed to DB
New tables: `debt_tranches`, `covenants`, `project_share_links`  
New fields on `Document`: `expiresAt DateTime?`, `expiryAlertDismissedAt DateTime?`  
New fields on `FunderCondition`: `evidenceDocumentId String?`, `satisfiedByUserId String?`

## New files added since last sync

**Actions:**
- `src/actions/covenants.ts`
- `src/actions/external-evidence.ts`

**DB helpers:**
- `src/lib/db/portfolio.ts`
- `src/lib/db/covenants.ts`
- `src/lib/db/debt-tranches.ts`
- `src/lib/db/share-links.ts`
- `src/lib/db/external-evidence.ts`

**Components:**
- `src/components/projects/CovenantMonitoringPanel.tsx`
- `src/components/projects/FunderKanban.tsx`
- `src/components/projects/ResponsibilityMatrix.tsx`
- `src/components/projects/StageGateModal.tsx`
- `src/components/projects/ShareLinksPanel.tsx`
- `src/components/projects/ReadinessBreakdown.tsx`
- `src/components/documents/ExpiryTimeline.tsx`
- `src/components/documents/VersionHistoryDrawer.tsx`
- `src/components/meetings/ExtractedInsightsPanel.tsx`
- `src/components/requirements/BulkStatusBar.tsx`
- `src/components/requirements/RequirementEvidenceUpload.tsx`
- `src/components/requirements/RequirementNotesQuickInput.tsx`

**Pages:**
- `src/app/(dashboard)/portfolio/page.tsx`
- `src/app/share/[token]/page.tsx` (public, no auth)

**Lib:**
- `src/lib/rate-limit.ts`
- `src/lib/projects/stage-gate.ts`

## Dev workflow notes

- Run `npx tsc --noEmit` to type-check — must pass with zero errors before committing
- Run `npx vitest run` for tests
- Schema changes: use `DATABASE_URL=[direct connection port 5432] npx prisma db push` — the pooler URL (port 6543) silently fails for DDL
- If you edit files while the dev server is running, restart it — stale module cache causes false 500s
- `prisma db pull` will overwrite manually added models — avoid it, or manually restore additions afterward
