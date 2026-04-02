# Lodestar Feature Expansion Plan — 2026-04-01

## Overview

Seven tranches covering taxonomy additions, schema changes, UI quick wins, portfolio analytics, CP workflow, AI enhancements, and covenant monitoring. Tranches A and B must run first (A is pure constants, B is schema). C through G can run in parallel once B is done.

| Tranche | Scope | Depends on |
|---|---|---|
| A | Taxonomy additions + Blended Finance deal type | — |
| B | Schema: DebtTranche, Covenant, Document expiry, FunderCondition extensions | A |
| C | UI quick wins: bulk status update, doc expiry alerts, LOI projection widget | B |
| D | Portfolio analytics dashboard | — |
| E | CP satisfaction workflow | B |
| F | AI enhancements: EXIM sources, deal-type gap analysis, meeting linkage | A |
| G | Post-close covenant monitoring panel | B |

---

## Tranche A — Taxonomy Additions

### Summary
Add new requirement items to all five existing taxonomies (EXIM, DFI, IFC, Commercial, PE) and create a new Blended Finance / Concessional deal type with its own taxonomy. Pure static constants — no schema changes except adding `blended_finance` to the `DealType` enum.

### Files to create
- `/src/lib/blended/requirements.ts` — new Blended Finance taxonomy

### Files to modify

**`prisma/schema.prisma`**
- Add `blended_finance` to the `DealType` enum after `private_equity`.

**`/src/lib/exim/requirements.ts`**
Add the following to the named category arrays. Assign `sortOrder` values that don't collide with existing items (check existing max sortOrder per category first).

> Note: `cls_eligibility` already exists in EXIM permits. Do NOT add a duplicate.

1. `application_fee_loi_fee` — category: `"corporate"`, phaseRequired: `"loi"`, isLoiCritical: `false`, weight: `50`, sortOrder: (after existing corporate items). Description: "Confirm LOI application fee has been submitted or waived."
2. `exim_exposure_fee_term_sheet` — category: `"financial"`, phaseRequired: `"final_commitment"`, isLoiCritical: `false`, weight: `75`. Description: "EXIM exposure fee term sheet received and modeled in financial projections."
3. `us_content_certification_formal` — category: `"financial"`, phaseRequired: `"loi"`, isLoiCritical: `true`, weight: `150`. Description: "Formal US content certification (distinct from EPC's content analysis report) submitted to EXIM confirming >51% US content."
4. `tied_aid_analysis` — category: `"studies"`, phaseRequired: `"loi"`, isLoiCritical: `false`, weight: `75`. Description: "Tied aid / grant analysis completed where sovereign counterparty is involved."
5. `market_flex_terms` — category: `"financial"`, phaseRequired: `"final_commitment"`, isLoiCritical: `false`, weight: `50`. Description: "Market flex terms agreed with any co-lending commercial banks in the syndication."

**`/src/lib/dfi/requirements.ts`**
Add (check for existing items first — `dfi_esms`, `dfi_sep`, `dfi_rap`, `dfi_ghg` may already exist; skip any that do):
1. `dfi_country_strategy_alignment` — category: `"corporate"`, phaseRequired: `"board_approval"`, isPrimaryGate: `false`, weight: `75`. Description: "Memo demonstrating alignment with the DFI's country strategy and sector priorities."
2. `dfi_hipso_indicators` — category: `"financial"`, phaseRequired: `"board_approval"`, isPrimaryGate: `false`, weight: `75`. Description: "HIPSO/HIPSO-aligned development impact indicators agreed with DFI."
3. `dfi_carbon_footprint_baseline` — category: `"environmental_social"`, phaseRequired: `"board_approval"`, isPrimaryGate: `false`, weight: `100`. Description: "Carbon footprint and GHG baseline measurement (distinct from GHG quantification study)."

**`/src/lib/ifc/requirements.ts`**
Mirror the three DFI additions using the IFC naming convention:
1. `ifc_country_strategy_alignment`
2. `ifc_hipso_indicators`
3. `ifc_carbon_baseline`

**`/src/lib/commercial/requirements.ts`**
Add five items to the `covenant` phase (or as `post_close` if that phase exists):
1. `cb_dscr_compliance_cert` — category: `"financial"`, phaseRequired: `"covenant"`, isPrimaryGate: `false`, weight: `75`. Description: "Quarterly DSCR compliance certificate delivered to agent bank."
2. `cb_financial_statements_delivery` — category: `"financial"`, phaseRequired: `"covenant"`, isPrimaryGate: `false`, weight: `75`. Description: "Audited annual and management quarterly financial statements delivered per covenant schedule."
3. `cb_insurance_renewal_confirmation` — category: `"insurance"`, phaseRequired: `"covenant"`, isPrimaryGate: `false`, weight: `50`. Description: "Annual insurance renewal confirmation provided to agent bank."
4. `cb_change_of_control_consent` — category: `"corporate"`, phaseRequired: `"cp_to_close"`, isPrimaryGate: `false`, weight: `75`. Description: "Change of control consent clause confirmed with lender group."
5. `cb_mac_notification` — category: `"corporate"`, phaseRequired: `"covenant"`, isPrimaryGate: `false`, weight: `50`. Description: "Material adverse change notification obligation documented and tracked."

**`/src/lib/pe/requirements.ts`**
Add five items:
1. `pe_management_references` — category: `"corporate"`, phaseRequired: `"ic_approval"`, isPrimaryGate: `false`, weight: `75`. Description: "Management team reference checks completed."
2. `pe_comparable_transactions` — category: `"financial"`, phaseRequired: `"ic_approval"`, isPrimaryGate: `false`, weight: `100`. Description: "Comparable transaction analysis prepared for IC memo."
3. `pe_lp_mandate_compliance` — category: `"corporate"`, phaseRequired: `"screening"`, isPrimaryGate: `false`, weight: `75`. Description: "Formal LP mandate compliance memo confirming deal fits fund mandate." (distinct from `pe_mandate_check` which is the initial informal check)
4. `pe_esg_baseline` — category: `"environmental_social"`, phaseRequired: `"ic_approval"`, isPrimaryGate: `false`, weight: `75`. Description: "ESG baseline assessment completed per fund policy."
5. `pe_exit_strategy_memo` — category: `"corporate"`, phaseRequired: `"ic_approval"`, isPrimaryGate: `true`, weight: `125`. Description: "Exit strategy memo modeling multiple exit paths (trade sale, IPO, refinance)."

**`/src/lib/blended/requirements.ts`** (new file)
Follow the DFI pattern using `RequirementDef` from `../requirements/types`. Define phases locally: `["application", "concessional_approval", "financial_close"]`. Minimum 20 requirements across categories. The five required items plus supporting requirements:

Required items:
1. `bl_donor_grant_agreement` — contracts, concessional_approval, isPrimaryGate: `true`, weight: `200`
2. `bl_concessional_window_approval` — corporate, concessional_approval, isPrimaryGate: `true`, weight: `200`
3. `bl_first_loss_term_sheet` — financial, concessional_approval, isPrimaryGate: `true`, weight: `175`
4. `bl_additionality_memo` — studies, concessional_approval, isPrimaryGate: `true`, weight: `150`
5. `bl_results_framework` — financial, concessional_approval, isPrimaryGate: `false`, weight: `100`

Also include standard project finance items adapted for blended context (EPC contract, offtake, environmental assessment, corporate docs, etc.) to make the taxonomy complete enough to score.

Export: `BLENDED_REQUIREMENTS`, `BLENDED_REQUIREMENTS_BY_ID`, `BLENDED_PRIMARY_GATE_IDS`, `BLENDED_TOTAL_WEIGHT`.

**`/src/lib/requirements/index.ts`**
- Import `BLENDED_REQUIREMENTS` from `@/lib/blended/requirements`.
- Add `"blended_finance"` case to `getRequirementsForDealType` returning `[...BLENDED_REQUIREMENTS]`.
- Add `blended_finance` entry to `PROGRAM_CONFIGS`:
  ```ts
  blended_finance: {
    label: "Blended / Concessional Finance",
    primaryGateLabel: "Concessional Approval",
    phaseLabels: {
      application: "Application",
      concessional_approval: "Concessional Approval",
      financial_close: "Financial Close",
    },
    hasBlockerColumn: true,
  }
  ```

**`/src/lib/requirements/types.ts`**
- Add `"blended_finance"` to the `DealTypeValue` union.
- Add blended phases to `AnyPhase` union: `"application" | "concessional_approval"`.

**`prisma/seed.ts`**
- Add upserts for the 5 new EXIM requirement IDs (the others are in-memory constants).

### Implementation steps
1. Check existing max `sortOrder` per category in each taxonomy file before adding.
2. Add new items to EXIM, DFI, IFC, Commercial, PE taxonomy files.
3. Create `/src/lib/blended/requirements.ts`.
4. Add `blended_finance` to `DealType` enum in schema.
5. Update `/src/lib/requirements/types.ts`.
6. Update `/src/lib/requirements/index.ts`.
7. Run `npx prisma migrate dev --name add-blended-finance-deal-type`.
8. Update `prisma/seed.ts` and run `npx prisma db seed`.
9. Update `CATEGORY_ORDER` in `RequirementsChecklist.tsx` if new categories are introduced.
10. Verify `computeReadiness("blended_finance", ...)` scores correctly.

### Gotchas
- `cls_eligibility` already exists. Do not duplicate.
- `commercial/requirements.ts` may use `insurance` and `construction` categories not in EXIM's list — check `CATEGORY_ORDER` in RequirementsChecklist.
- `@@unique([category, sortOrder])` on `EximRequirement` — new EXIM items must have unique `(category, sortOrder)` pairs.
- Non-EXIM items are in-memory only; no DB seeding needed for them.

---

## Tranche B — Schema Additions

### Summary
Three new Prisma models (`DebtTranche`, `Covenant`), two new fields on `Document`, and extensions to `FunderCondition`. All monetary values in integer cents/bps.

### Files to create
- `/src/lib/db/debt-tranches.ts`
- `/src/lib/db/covenants.ts`
- `/src/actions/debt-tranches.ts`
- `/src/actions/covenants.ts`

### Files to modify

**`prisma/schema.prisma`**

1. Add to `Document` model:
```prisma
expiresAt              DateTime?
expiryAlertDismissedAt DateTime?
```

2. Add to `FunderCondition` model:
```prisma
evidenceDocumentId  String?
satisfiedByUserId   String?
evidenceDocument    Document? @relation(fields: [evidenceDocumentId], references: [id], onDelete: SetNull)
```
Add `@@index([evidenceDocumentId])` to `FunderCondition`.
Add `funderConditions FunderCondition[]` reverse relation to `Document` model.

3. New enums:
```prisma
enum DebtTrancheType {
  senior_secured
  mezzanine
  equity_bridge
  subordinated
  concessional
  first_loss
}

enum DebtTrancheStatus {
  term_sheet
  committed
  drawn
  repaid
}

enum CovenantType {
  financial
  operational
  informational
  reporting
}

enum CovenantFrequency {
  monthly
  quarterly
  semi_annual
  annual
  one_time
}

enum CovenantStatus {
  active
  satisfied
  waived
  breached
}
```

4. New model `DebtTranche`:
```prisma
model DebtTranche {
  id              String            @id @default(cuid())
  projectId       String
  funderId        String?
  name            String
  type            DebtTrancheType
  amountUsdCents  BigInt
  tenorYears      Int?
  interestRateBps Int?
  drawSchedule    Json?
  status          DebtTrancheStatus @default(term_sheet)
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  project            Project              @relation(fields: [projectId], references: [id], onDelete: Cascade)
  funderRelationship FunderRelationship?  @relation(fields: [funderId], references: [id], onDelete: SetNull)

  @@index([projectId, type])
  @@index([projectId, status])
  @@map("debt_tranches")
}
```
Add `debtTranches DebtTranche[]` to `Project` and `FunderRelationship` models.

5. New model `Covenant`:
```prisma
model Covenant {
  id              String            @id @default(cuid())
  projectId       String
  funderId        String?
  title           String
  covenantType    CovenantType
  frequency       CovenantFrequency
  nextDueAt       DateTime?
  lastSatisfiedAt DateTime?
  status          CovenantStatus    @default(active)
  notes           String?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  project            Project              @relation(fields: [projectId], references: [id], onDelete: Cascade)
  funderRelationship FunderRelationship?  @relation(fields: [funderId], references: [id], onDelete: SetNull)

  @@index([projectId, status])
  @@index([projectId, nextDueAt])
  @@index([funderId])
  @@map("covenants")
}
```
Add `covenants Covenant[]` to `Project` and `FunderRelationship` models.

**`/src/lib/db/debt-tranches.ts`** (new)
Follow `/src/lib/db/funders.ts` pattern:
- `getProjectDebtTranches(projectId)` — select all tranches ordered by type
- `addDebtTranche(data)` — create
- `updateDebtTranche(id, data)` — update
- `removeDebtTranche(id)` — delete

**`/src/lib/db/covenants.ts`** (new)
- `getProjectCovenants(projectId)` — returns all covenants with funder name joined
- `addCovenant(data)` — create
- `updateCovenant(id, data)` — update
- `markCovenantSatisfied(id, userId)` — sets `lastSatisfiedAt`, advances `nextDueAt` based on `frequency`
- `getOverdueCovenants(projectId)` — `nextDueAt < now()` AND `status === "active"`
- `removeCovenant(id)` — delete

Period advancement logic in `markCovenantSatisfied`:
- `monthly`: +30 days
- `quarterly`: +90 days
- `semi_annual`: +182 days
- `annual`: +365 days
- `one_time`: set `status = "satisfied"`, do not advance date

**`/src/actions/debt-tranches.ts`** (new)
`addDebtTranche`, `updateDebtTranche`, `removeDebtTranche` — follow `/src/actions/funders.ts` pattern with auth check and revalidatePath.

**`/src/actions/covenants.ts`** (new)
`addCovenant`, `updateCovenant`, `markCovenantSatisfied`, `removeCovenant`.

**`/src/lib/db/documents.ts`**
Update `DocumentRow` type and select shapes to include `expiresAt` and `expiryAlertDismissedAt`.

### Implementation steps
1. Add all enums, models, and fields to `prisma/schema.prisma`.
2. Run `npx prisma migrate dev --name add-debt-tranches-covenants-doc-expiry-cp-evidence`.
3. Create DB helpers and server actions for DebtTranche and Covenant.
4. Update `DocumentRow` type in `/src/lib/db/documents.ts`.

### Gotchas
- `BigInt` for `amountUsdCents` — serialize via `Number()` when passing to client; do not JSON-serialize BigInt directly.
- `drawSchedule Json?` — document expected shape in a comment: `Array<{ date: string; amountUsdCents: number }>`.
- `interestRateBps` is basis points (e.g., 350 = 3.50%).
- Combine with Tranche A's migration if running sequentially to produce one clean migration file.

---

## Tranche C — UI Quick Wins

### Summary
Three lightweight UI features: bulk requirement status update, document expiry alerts, and LOI readiness projection widget. High PM value, low complexity.

### Files to create
- `/src/components/requirements/BulkStatusBar.tsx`
- `/src/components/projects/LoiProjectionWidget.tsx`

### Files to modify

**1. Bulk Requirement Status Update**

`/src/actions/requirements.ts`
Add `bulkUpdateRequirementStatus` server action:
```ts
bulkUpdateRequirementStatus(input: {
  ids: string[],
  status: RequirementStatusValue,
  projectId: string
})
```
- Validate with Zod.
- Call `assertProjectAccess`.
- `db.projectRequirement.updateMany({ where: { id: { in: ids }, projectId }, data: { status } })`.
- Recompute readiness score once (single call to `computeReadiness`).
- Log one `requirement_bulk_status_changed` activity event with `{ count: ids.length, status }` payload.
- Call `revalidatePath`.

`/src/components/requirements/RequirementsChecklist.tsx`
- Add `selectedIds: Set<string>` state at top of component.
- Add a checkbox to each requirement row. Only show when `canEdit` is true.
- When `selectedIds.size > 0`, render `<BulkStatusBar>` (see below).

`/src/components/requirements/BulkStatusBar.tsx` (new)
Props: `selectedCount: number`, `onApply: (status: RequirementStatusValue) => void`, `onClear: () => void`.
- Sticky/fixed bar at bottom of the checklist.
- Shows: "{N} selected" label, status dropdown (all valid statuses), "Apply" button, "Clear" button.
- Calls `bulkUpdateRequirementStatus` via the passed `onApply` handler.

**2. Document Expiry Alerts**

`/src/actions/documents.ts`
Add `updateDocumentExpiry(documentId: string, expiresAt: Date | null)` server action.

`/src/components/documents/DocumentPanel.tsx`
- Read `expiresAt` from each document row.
- Compute days until expiry: `Math.floor((expiresAt - now) / 86400000)`.
- Show amber badge if `0 < days <= 60`, red badge if `days <= 0` (expired).
- Add an editable date field (inline, small) to set `expiresAt`. On change, call `updateDocumentExpiry`.

`/src/components/projects/LoiBlockersPanel.tsx`
- Add optional prop `expiringDocuments: Array<{ name: string; expiresAt: Date; requirementTitle: string }>`.
- If prop is provided and non-empty, render a warning block at top:
  > "{N} documents supporting LOI-critical requirements expire within 60 days."
  > List each with doc name, requirement title, days remaining.

`/src/app/(dashboard)/projects/[slug]/page.tsx`
- After fetching documents, compute `expiringDocuments`:
  - Filter documents where `expiresAt` is set, `expiresAt - now <= 60 days`.
  - Join against `loiBlockerRequirements` to check if the document supports an LOI-critical requirement.
- Pass to `<LoiBlockersPanel>`.

**3. LOI Readiness Projection Widget**

`/src/components/projects/LoiProjectionWidget.tsx` (new)
Props:
```ts
{
  loiBlockerCount: number;
  recentVelocity: number;   // requirements completed per week (last 28 days)
  targetLoiDate: Date | null;
  dealType: string;
}
```
Logic:
- If `loiBlockerCount === 0`: show "On track — no blockers remaining."
- If `recentVelocity === 0`: show "Insufficient data — no completions in last 28 days."
- Else: `weeksToReady = Math.ceil(loiBlockerCount / recentVelocity)`. Show "~{N} weeks to {primaryGateLabel}."
- If `targetLoiDate` is set: compute projected ready date (`today + weeksToReady * 7`). Show "on schedule" (green) or "behind schedule by ~{N} weeks" (amber/red).
- The label "LOI" should use `PROGRAM_CONFIGS[dealType].primaryGateLabel` not hardcoded text.

`/src/app/(dashboard)/projects/[slug]/page.tsx`
- Compute velocity: count `activityEvents` where `eventType === "requirement_status_changed"` and `createdAt >= 28 days ago`. Divide by 4 for weekly rate.
- Render `<LoiProjectionWidget>` inside the `section-overview` div, below the readiness gauge.

### Implementation steps
1. Add `bulkUpdateRequirementStatus` to `/src/actions/requirements.ts`.
2. Create `/src/components/requirements/BulkStatusBar.tsx`.
3. Add checkbox + selection state to `RequirementsChecklist.tsx`.
4. Add `updateDocumentExpiry` to `/src/actions/documents.ts`.
5. Update `DocumentPanel.tsx` with expiry badges and editable date.
6. Update `LoiBlockersPanel.tsx` with expiring docs warning.
7. Create `/src/components/projects/LoiProjectionWidget.tsx`.
8. Update project detail page: compute velocity, pass expiring docs, render widget.

### Gotchas
- `bulkUpdateRequirementStatus` must recompute readiness once via `updateMany` then single score recalc — not N individual updates.
- Velocity of 0 → show "Insufficient data," not `Infinity`.
- `RequirementsChecklist` is ~1500+ lines. Manage bulk selection state at the component top level; pass down via props.
- Expiry badge colors should use existing CSS variables (`--gold-soft`, `--accent-soft`) not hardcoded hex.
- Document expiry depends on Tranche B (`expiresAt` field). Bulk update and LOI projection can be built independently.

---

## Tranche D — Portfolio Analytics Dashboard

### Summary
New top-level page at `/portfolio` showing aggregate metrics across all accessible projects. Adds a "Portfolio" nav link.

### Files to create
- `/src/app/(dashboard)/portfolio/page.tsx`
- `/src/lib/db/portfolio.ts`
- `/src/components/portfolio/ReadinessDistributionBar.tsx`
- `/src/components/portfolio/StagnantDealsTable.tsx`
- `/src/components/portfolio/UpcomingDeadlines.tsx`
- `/src/components/portfolio/VelocityLeaderboard.tsx`

### Files to modify

**`/src/app/(dashboard)/layout.tsx`**
Add a "Portfolio" `<Link>` to the nav. Style it identically to the existing "Projects" link. Position it between "Projects" and whatever follows.

**`/src/lib/db/portfolio.ts`** (new)
All queries accept `clerkUserId` and filter to projects the user owns or is a member of.

```ts
getPortfolioSummary(clerkUserId): Promise<{
  totalProjects: number;
  totalCapexUsdCents: bigint;
  readinessDistribution: { not_started: number; at_risk: number; progressing: number; ready: number };
}>

getProjectsByStage(clerkUserId): Promise<Array<{ stage: ProjectPhase; count: number }>>

getStagnantDeals(clerkUserId): Promise<Array<{
  id: string; name: string; slug: string;
  cachedReadinessScore: number;
  daysSinceLastActivity: number;
}>>
// Filter: cachedReadinessScore < 5000 AND latest requirement_status_changed event older than 14 days

getUpcomingDeadlines(clerkUserId): Promise<Array<{
  id: string; name: string; slug: string;
  targetLoiDate: Date; daysRemaining: number;
}>>
// Filter: targetLoiDate within next 90 days, sorted ascending

getVelocityLeaderboard(clerkUserId): Promise<Array<{
  id: string; name: string; slug: string;
  completionsLast30Days: number;
}>>
// Count requirement_status_changed events per project in last 30 days, top 10
```

**`/src/app/(dashboard)/portfolio/page.tsx`** (new)
Server component. `Promise.all` over all five queries. Renders:
1. Summary row: total projects, total CAPEX (formatted), avg readiness %.
2. `<ReadinessDistributionBar>` — horizontal stacked bar with four color-coded segments.
3. Projects by stage — pill badges with counts.
4. `<StagnantDealsTable>` — project name (link), readiness %, days since activity.
5. `<UpcomingDeadlines>` — project name (link), target date, days remaining.
6. `<VelocityLeaderboard>` — project name (link), completion count.

### Implementation steps
1. Create `/src/lib/db/portfolio.ts` with all five query functions.
2. Create four presentation components in `/src/components/portfolio/`.
3. Create `/src/app/(dashboard)/portfolio/page.tsx`.
4. Add "Portfolio" nav link to `layout.tsx`.

### Gotchas
- `capexUsdCents` is `BigInt`. Sum in DB with raw SQL (`SELECT SUM(capex_usd_cents)`). Convert to `Number()` for display (acceptable for display; no arithmetic precision risk at display layer).
- Portfolio page must OR-join owner and member tables: `WHERE p.owner_clerk_id = $1 OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.clerk_user_id = $1)`.
- Stagnant deals requires finding latest activity per project — use a lateral join or window function in raw SQL for performance.
- Velocity leaderboard: `GROUP BY project_id, COUNT(*) WHERE event_type = 'requirement_status_changed' AND created_at >= NOW() - INTERVAL '30 days'`.
- Readiness distribution buckets: `not_started` = score < 2500, `at_risk` = 2500–4999, `progressing` = 5000–7499, `ready` = ≥ 7500.

---

## Tranche E — Condition Precedent Satisfaction Workflow

### Summary
Extend `FunderCondition` to track evidence documents and satisfaction audit trail. Add server actions for requesting evidence and confirming satisfaction. Update FunderWorkspace UI.

### Files to modify

**`prisma/schema.prisma`**
Already covered in Tranche B:
- `FunderCondition`: add `evidenceDocumentId String?`, `satisfiedByUserId String?`, relation to `Document`.
- `Document`: add `funderConditions FunderCondition[]` reverse relation.
- `@@index([evidenceDocumentId])` on `FunderCondition`.

**`/src/lib/db/funders.ts`**
- Update `FunderConditionRow` type to include `evidenceDocumentId`, `satisfiedByUserId`, `evidenceDocumentFilename` (join from Document).
- Update select queries to include new fields.
- Add `linkConditionEvidence(conditionId: string, documentId: string)`.
- Add `confirmConditionSatisfaction(conditionId: string, userId: string, evidenceDocumentId?: string)` — sets `status: "satisfied"`, `satisfiedAt: new Date()`, `satisfiedByUserId`, optionally `evidenceDocumentId`.

**`/src/actions/funders.ts`**
Add two new server actions:

`requestCpEvidence(input: { conditionId: string; assigneeStakeholderId: string; dueAt: Date })`:
- Fetch the condition to get `funderRelationshipId` → then `projectId`.
- Create a `DocumentRequest` record: `projectId`, `stakeholderId: assigneeStakeholderId`, `title: "Evidence for CP: {condition.description}"`, `dueAt`, `createdBy: userId`.
- Log activity event `cp_evidence_requested`.
- Return updated condition.

`confirmCpSatisfaction(input: { conditionId: string; evidenceDocumentId?: string })`:
- Call `confirmConditionSatisfaction` in DB layer.
- Log activity event `cp_satisfied` with condition title in payload.
- Revalidate path.

**`/src/components/projects/FunderWorkspace.tsx`**
In each condition row, add:
- "Request evidence" button: opens an inline form (stakeholder picker + due date). On submit, calls `requestCpEvidence`.
- "Mark satisfied" button: calls `confirmCpSatisfaction`. Shows confirmation dialog.
- When `status === "satisfied"`: show green checkmark icon, display `satisfiedByUserId` (resolve to name if possible) and `satisfiedAt` formatted as relative date.
- If `evidenceDocumentId` is set: show a small linked document badge with the filename.

### Implementation steps
1. Confirm Tranche B migration includes FunderCondition extensions.
2. Update `/src/lib/db/funders.ts` with new fields and functions.
3. Add `requestCpEvidence` and `confirmCpSatisfaction` to `/src/actions/funders.ts`.
4. Update `FunderWorkspace.tsx` UI.

### Gotchas
- `requestCpEvidence` must trace: `conditionId → FunderCondition.funderRelationshipId → FunderRelationship.projectId` to create the `DocumentRequest` correctly.
- `satisfiedByUserId` stores a Clerk user ID string. Display the user's name by cross-referencing `ProjectMember` records or using Clerk's user lookup. Keep this simple initially — showing the raw userId is acceptable if name lookup is complex.
- The "Mark satisfied" button should be disabled if `status !== "active"`.

---

## Tranche F — AI Enhancements

### Summary
Three improvements to the AI layer: populate the EXIM official source stub, make gap analysis deal-type-aware, and add meeting action item to requirement linkage suggestions.

### Files to modify

**1. Official EXIM Source Integration**

`/src/lib/ai/app-knowledge.ts`
Add `EXIM_OFFICIAL_KNOWLEDGE: readonly AppKnowledgeEntry[]` array with entries for:
- Eligibility criteria: US nexus requirement, foreign content rules (51% / 85%)
- Environmental review thresholds: Category A (120-day disclosure), B (30-day), C (exempt)
- CLS overview: what it is, how to check eligibility, consequences of closure
- Exposure fee formula: risk-based pricing, sovereign vs. private obligor differences
- CTEP program: 10 strategic sectors, enhanced support terms
- MMIA program: domestic manufacturing, supply chain requirements

Each entry: `{ id, title, snippet, sourceType: "official_exim", url, aliases }`. URLs point to exim.gov. Include a `lastVerifiedAt` comment.

`/src/lib/ai/chat.ts`
- Import `EXIM_OFFICIAL_KNOWLEDGE`.
- Implement `searchOfficialEximSources(query: string)`: apply the same `scoreEntry` / TF-IDF scoring used in `searchKnowledgeBase`, run against `EXIM_OFFICIAL_KNOWLEDGE`. Return top 4 matches typed as `readonly ChatContextDocument[]`.
- Keep the async signature (returns `Promise<readonly ChatContextDocument[]>`) for future live API integration.

**2. Deal-Type-Aware Gap Analysis**

`/src/lib/ai/prompts.ts`
- Modify `buildGapAnalysisPrompt` to accept `dealType: string` parameter.
- Implement a `getGapAnalysisPersona(dealType)` helper that returns:
  - `exim_project_finance`: "expert in US EXIM Bank project finance" / "LOI submission"
  - `private_equity`: "expert in PE infrastructure investment committee processes" / "IC approval"
  - `development_finance`: "expert in DFI project finance appraisal" / "board approval"
  - `commercial_finance`: "expert in commercial bank project finance credit processes" / "credit committee approval"
  - `blended_finance`: "expert in blended finance structuring and donor coordination" / "concessional window approval"
  - default: falls back to EXIM framing
- Replace hardcoded "LOI" and EXIM references with the gated milestone label from `PROGRAM_CONFIGS[dealType].primaryGateLabel`.

`/src/components/projects/GapAnalysis.tsx`
- Pass `dealType={project.dealType}` to the gap analysis API call / prompt builder.

`/src/app/(dashboard)/projects/[slug]/page.tsx`
- Confirm `dealType` is passed through to `GapAnalysis`.

**3. Meeting Action Item Auto-Linkage**

`/src/lib/ai/meeting-extraction.ts` (or wherever extraction lives)
- After extracting action items from a meeting transcript, for each extracted action item:
  - Tokenize the action item title.
  - Score against all requirement `name` fields from `getRequirementsForDealType(project.dealType)`.
  - Use the same `tokenize` + overlap-count scoring already in `chat.ts`.
  - If score >= 3 matching tokens, set `suggestedRequirementId` on the extracted action item.
- Add `suggestedRequirementId?: string` to `ExtractedActionItem` type.

`/src/components/meetings/MeetingsLog.tsx`
- When rendering an action item that has `suggestedRequirementId`:
  - Resolve the requirement name from the project's requirement list.
  - Show a small prompt: "Link to '{requirementName}'?" with Accept and Dismiss buttons.
  - Accept: calls server action to update `ActionItem.projectRequirementId = suggestedRequirementId`.
  - Dismiss: hides the prompt (local state, not persisted).

### Implementation steps
1. Add `EXIM_OFFICIAL_KNOWLEDGE` entries in `app-knowledge.ts`.
2. Implement `searchOfficialEximSources` in `chat.ts`.
3. Add `dealType` param to `buildGapAnalysisPrompt` and implement branching.
4. Update `GapAnalysis.tsx` and project detail page to pass dealType.
5. Add keyword-overlap scoring to meeting extraction.
6. Add `suggestedRequirementId` to extracted action item type.
7. Update `MeetingsLog.tsx` with suggestion UI.

### Gotchas
- `searchOfficialEximSources` stub is already declared `async`. Keep that signature.
- `buildGapAnalysisPrompt` is called from `GapAnalysis.tsx` which passes `project` (already includes `dealType`). Minimal change needed on the component side.
- Meeting linkage suggestion is a UX hint only — `suggestedRequirementId` lives in-memory after extraction; only persisted if user accepts. No new DB field needed.
- Check whether meeting AI extraction is in `src/lib/ai/meeting-extraction.ts` or elsewhere before editing.

---

## Tranche G — Post-Close Covenant Monitoring Panel

### Summary
New section on the project detail page for monitoring ongoing funder covenants. Only visible for Commercial Bank and Blended Finance deals at `financial_close` stage.

### Files to create
- `/src/components/projects/CovenantMonitoringPanel.tsx`

### Files to modify

**`/src/lib/db/covenants.ts`** (created in Tranche B)
Ensure these functions exist:
- `getProjectCovenants(projectId)` — returns all covenants with funder name joined, sorted: overdue first, then upcoming.
- `markCovenantSatisfied(covenantId, userId)` — sets `lastSatisfiedAt`, advances `nextDueAt`, transitions `one_time` covenants to `satisfied`.
- `getOverdueCovenants(projectId)` — `nextDueAt < now()` AND `status === "active"`.

**`/src/actions/covenants.ts`** (created in Tranche B)
Ensure `markCovenantSatisfied` server action logs a `covenant_satisfied` activity event.

**`/src/components/projects/CovenantMonitoringPanel.tsx`** (new)
Props: `projectId: string`, `slug: string`, `covenants: CovenantRow[]`, `canEdit: boolean`.

Render:
- Table columns: Title | Funder | Type | Frequency | Next Due | Status | Actions
- Sort: overdue (nextDueAt < today, status = active) first in red; then upcoming sorted ascending by nextDueAt.
- "Mark satisfied" button per active row: calls `markCovenantSatisfied`. Optimistically updates display.
- "Request deliverable" button: creates a `DocumentRequest` linked to the covenant's funder. Reuses the DocumentRequest pattern from the documents section.
- Badge for `status`: active (neutral), satisfied (green), waived (muted), breached (red).

Period advancement in `markCovenantSatisfied` DB function:
```
monthly    → nextDueAt + 30 days
quarterly  → nextDueAt + 90 days
semi_annual → nextDueAt + 182 days
annual     → nextDueAt + 365 days
one_time   → status = "satisfied" (no date advance)
```

**`/src/app/(dashboard)/projects/[slug]/page.tsx`**
- Import `CovenantMonitoringPanel` and `getProjectCovenants`.
- Add to `Promise.all` data fetch.
- Render conditionally:
  ```tsx
  {(project.dealType === "commercial_finance" || project.dealType === "blended_finance") &&
   (project.stage === "financial_close") && (
    <section id="section-covenants">
      <CovenantMonitoringPanel ... />
    </section>
  )}
  ```
- Position: after `section-capital`, before `section-workplan`.

**`/src/components/projects/ProjectNav.tsx`**
- Add "Covenants" nav item, conditionally visible for Commercial/Blended deals at financial_close.

### Implementation steps
1. Confirm Tranche B created `Covenant` model and DB helpers.
2. Create `/src/components/projects/CovenantMonitoringPanel.tsx`.
3. Update project detail page to fetch covenants and conditionally render panel.
4. Update `ProjectNav.tsx` with conditional "Covenants" link.

### Gotchas
- `nextDueAt` date arithmetic: use `date-fns` (`addDays`, `addMonths`) if available in the project. Check `package.json`. If not installed, use plain `new Date(d.getTime() + days * 86400000)` — do NOT use `addMonths` manually as it breaks on Feb 28.
- One-time covenants set `status = "satisfied"` on mark, no date advance.
- The visibility condition checks `project.stage === "financial_close"`. `ProjectPhase` enum: `financial_close` is the final value — verify this matches the Prisma enum value exactly.
- Sort order: overdue rows first (sorted by how overdue, oldest first), then upcoming (sorted ascending by nextDueAt), then satisfied/waived at bottom.
- `CovenantMonitoringPanel` should handle empty state gracefully: "No covenants tracked yet. Add covenants for each funder relationship."

---

## Build Order Summary

```
1. Tranche A  (taxonomy + enum, migration 1)
2. Tranche B  (schema additions, migration 2 — can combine with A)
3. Parallel:
   - Tranche C  (depends on B for doc expiry field; bulk update and LOI widget can start earlier)
   - Tranche D  (no schema deps)
   - Tranche E  (depends on B for FunderCondition extensions)
   - Tranche F  (depends on A for blended_finance deal type in gap analysis)
   - Tranche G  (depends on B for Covenant model)
```
