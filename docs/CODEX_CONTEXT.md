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
- `src/actions/project-concepts.ts`

**DB helpers:**
- `src/lib/db/portfolio.ts`
- `src/lib/db/covenants.ts`
- `src/lib/db/debt-tranches.ts`
- `src/lib/db/share-links.ts`
- `src/lib/db/external-evidence.ts`
- `src/lib/db/project-concepts.ts`
- `src/lib/db/notifications.ts`

**Components:**
- `src/components/projects/CovenantMonitoringPanel.tsx`
- `src/components/projects/FunderKanban.tsx`
- `src/components/projects/ResponsibilityMatrix.tsx` — wrap grid in `overflow: auto` + `minWidth: 620px`
- `src/components/projects/StageGateModal.tsx`
- `src/components/projects/ShareLinksPanel.tsx`
- `src/components/projects/ReadinessBreakdown.tsx`
- `src/components/projects/SectionSubNav.tsx` — `"use client"`, IntersectionObserver scroll-tracking pill nav
- `src/components/projects/FirstRunOverlay.tsx` — `"use client"`, detects `?new=1`, localStorage dismissal, **must be wrapped in `<Suspense>` at call site**
- `src/components/projects/SetupChecklist.tsx` — server component, returns `null` when all 5 items complete
- `src/components/projects/ProjectConceptPanel.tsx` — concept record editor/display
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
- `src/lib/projects/operating-metrics.ts`
- `src/lib/scoring/trendline.ts` — reconstructs readiness history from `RequirementNote.statusSnapshot`
- `src/lib/notifications/email.ts` — fire-and-forget pattern, `esc()` helper for XSS prevention

## Critical patterns

### Silent snapshot for trendline history
On every `updateRequirementStatus`, always call `addRequirementNote` with an empty string body to write a snapshot:
```typescript
await addRequirementNote({ projectRequirementId, note: "", statusSnapshot: newStatus });
```
In `fetchNotesMap`, filter `AND note != ''` so empty snapshots don't appear in the UI notes thread. The trendline uses all records; the UI shows only real notes.

### Suspense requirement for useSearchParams
Any `"use client"` component that calls `useSearchParams()` must be wrapped in `<Suspense>` at the server component call site:
```tsx
<Suspense fallback={null}>
  <FirstRunOverlay slug={project.slug} />
</Suspense>
```
Without this, Next.js 15 throws a build-time error.

### Email XSS prevention
All user-controlled values interpolated into HTML email bodies must go through `esc()`:
```typescript
function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
```
Apply at every interpolation site in `src/lib/notifications/email.ts`.

### Fire-and-forget email sends
Email sends must never block the mutation critical path:
```typescript
sendRequirementAssignedEmail({ ... }).then(() => {}).catch(() => {});
```

### excludeSelf notification filter
`getProjectNotifications` accepts `excludeSelf: boolean` (default `true`) to filter out the requesting user's own activity from the notification feed.

## API keys required

- `ANTHROPIC_API_KEY` — Claude API (required for all AI features)
- `RESEND_API_KEY` — email notifications via Resend (without this, email sends fail silently — the `catch(() => {})` swallows errors)
- `CLERK_SECRET_KEY` / `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — authentication
- `DATABASE_URL` — direct Supabase connection (port 5432) for Prisma
- `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — document storage

## Dev workflow notes

- Run `npx tsc --noEmit` to type-check — must pass with zero errors before committing
- Run `npx vitest run` for tests
- Schema changes: use `DATABASE_URL=[direct connection port 5432] npx prisma db push` — the pooler URL (port 6543) silently fails for DDL
- If you edit files while the dev server is running, restart it — stale module cache causes false 500s
- `prisma db pull` will overwrite manually added models — avoid it, or manually restore additions afterward
- New project redirect should use `router.push(\`/projects/${slug}?new=1\`)` to trigger `FirstRunOverlay`
