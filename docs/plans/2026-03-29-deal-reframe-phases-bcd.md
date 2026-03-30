# Deal Reframe -- Phases B, C, D

> Architecture brief produced 2026-03-29.
> Covers Capital Stack Visualization, Deal Parties with Obligations, and Configurable Deal Milestones.

---

## PHASE B -- Capital Stack Visualization

### 1. Recommended approach

Replace the top of `FunderWorkspace` with a new `CapitalStackBar` client component rendered above the existing funder card list. The bar uses **CSS flexbox** (not SVG) -- flexbox is simpler to implement, naturally responsive, handles text labels inside segments, and integrates with the existing CSS-variable color system without a separate SVG coordinate space.

**Design decisions:**

| Question | Decision | Rationale |
|---|---|---|
| How to handle funders with no `amountUsdCents` | Show a separate "Unallocated" gray zone beneath the main bar, listing funders without amounts as text chips. They are excluded from the proportional bar since they have no sizing data. | Mixing zero-width and proportional segments creates confusing visuals. |
| Commitment status per tranche | Each segment gets a subtle pattern overlay or opacity treatment: full opacity for `committed`/`term_sheet`, 60% opacity for `due_diligence`/`initial_contact`/`identified`, and a strikethrough pattern for `declined`. A small status dot or label appears on hover/focus. | Avoids adding a second dimension to the bar; keeps the visual clean. |
| Open CP count per tranche | A small badge at the bottom-right of each segment showing the count of open `FunderCondition` rows (status `open` or `in_progress`). Rendered as a tiny pill below the segment. | CPs are critical context -- showing them inline prevents context-switching. |
| New component or inline | New `CapitalStackBar` component in `src/components/projects/`. FunderWorkspace imports and renders it at the top. | Keeps FunderWorkspace from growing further; the bar is reusable (e.g. dashboard summary). |

**No-amount fallback logic:**
- If ALL funders lack `amountUsdCents`, show a simplified "equal-width" bar where each funder gets the same width (a qualitative view) with a banner: "Add financing amounts to see proportional capital stack."
- If SOME funders have amounts: proportional bar for those with amounts, plus the "Unallocated" overflow section for those without.
- If no funders at all: show nothing (FunderWorkspace's existing empty state handles this).

### 2. SQL DDL

No schema changes needed. All data already exists on `funder_relationships.amount_usd_cents`, `funder_relationships.funder_type`, `funder_relationships.engagement_stage`, and `funder_conditions.status`.

### 3. Prisma model additions

None.

### 4. Files to create

#### `src/components/projects/CapitalStackBar.tsx`

```typescript
"use client";

type CapitalStackTranche = {
  relationshipId: string;
  organizationName: string;
  funderType: string;       // FunderType enum value
  engagementStage: string;  // FunderEngagementStage enum value
  amountUsdCents: number | null;
  openConditionCount: number;
};

type CapitalStackBarProps = {
  tranches: CapitalStackTranche[];
  capexUsdCents: number | null; // project-level CAPEX for context
};

export function CapitalStackBar({ tranches, capexUsdCents }: CapitalStackBarProps) { ... }
```

Rendering approach:
- Separate tranches into `withAmount` (sorted by funderType priority: exim, dfi, commercial_bank, equity, mezzanine, other) and `withoutAmount`.
- Compute total of `withAmount` amounts. Each segment gets `flex: <amount>` on a flexbox row.
- If `capexUsdCents` is set and total funded < capex, add a "Gap" segment in dashed border showing the unfunded portion.
- Each segment: background from `FUNDER_TYPE_COLOR` map, opacity based on engagement stage, org name label (truncated), amount label, and CP badge.
- Below the bar: chip list of `withoutAmount` funders.
- If all tranches lack amounts: equal-width segments with informational banner.

### 5. Files to modify

#### `src/components/projects/FunderWorkspace.tsx`
- Import `CapitalStackBar`.
- In the main render, before the funder card list, add:
  ```tsx
  <CapitalStackBar
    tranches={funders.map(f => ({
      relationshipId: f.id,
      organizationName: f.organizationName,
      funderType: f.funderType,
      engagementStage: f.engagementStage,
      amountUsdCents: f.amountUsdCents,
      openConditionCount: f.conditions.filter(c => c.status === "open" || c.status === "in_progress").length,
    }))}
    capexUsdCents={capexUsdCents}
  />
  ```
- Add `capexUsdCents` to FunderWorkspace props (passed from page).

#### `src/app/(dashboard)/projects/[slug]/page.tsx`
- Pass `capexUsdCents={project.capexUsdCents != null ? Number(project.capexUsdCents) : null}` to `FunderWorkspace`.

### 6. Ordering constraints

- `CapitalStackBar.tsx` must be created before `FunderWorkspace.tsx` is modified (import dependency).
- No schema migration needed, so this can land independently.

### 7. Risks and tradeoffs

- **Risk:** Very small tranches (< 2% of total) produce segments too narrow for labels. **Mitigation:** Set `min-width: 32px` on segments and use tooltip on hover for full details when truncated.
- **Risk:** Large number of funders (>8) makes the bar cluttered. **Mitigation:** Unlikely in practice (most deals have 3-5 tranches), but add horizontal scroll if needed.
- **Deferred:** Click-to-scroll-to-funder-card interaction (linking bar segment to card below). Nice but not MVP.
- **Deferred:** Dashboard-level aggregation of capital stacks across projects.

---

## PHASE C -- Deal Parties with Obligations

### 1. Recommended approach

Introduce a **`DealPartyType`** enum that is distinct from `StakeholderRoleType`. The existing `StakeholderRoleType` describes a person's job function (e.g. "legal_counsel" = a lawyer). `DealPartyType` describes an Organization's structural role in the deal (e.g. "epc_contractor" = the firm building the project). These are different axes: one Organization (deal party) has many Stakeholders (people) who may each have different `StakeholderRoleType` values.

The implementation adds a new `DealParty` join table linking an Organization to a Project with a `DealPartyType`. When a deal party is added, the system auto-assigns relevant EXIM requirements to that organization via `ProjectRequirement.responsibleOrganizationId`.

**Design decisions:**

| Question | Decision | Rationale |
|---|---|---|
| New field vs mapping from existing roles | New `DealParty` model + `DealPartyType` enum. Not a mapping from `StakeholderRoleType`. | Stakeholder roles are per-person; deal parties are per-organization. Different cardinality and semantics. A person can be "legal_counsel" without their firm being the "legal_counsel" deal party. |
| How party presence triggers requirement assignment | A static mapping `DEAL_PARTY_REQUIREMENT_MAP` in `src/lib/exim/deal-parties.ts` maps each `DealPartyType` to an array of requirement IDs. When a deal party is created, a server action iterates the mapped requirements and sets `responsibleOrganizationId` on the corresponding `ProjectRequirement` rows (only if currently null -- no overwrite). | Keeps the mapping declarative and in one place; leverages existing `responsibleOrganizationId` field. |
| How to show missing deal parties | A "Deal Party Checklist" at the top of the upgraded StakeholderPanel shows all `DealPartyType` values with green check / red X for whether each has been assigned an Organization. Missing parties show the count of requirements that would be auto-assigned if filled. | Makes gaps immediately visible; drives the user toward completeness. |

**Deal party types and requirement mapping:**

```typescript
export const DEAL_PARTY_TYPES = [
  "epc_contractor",        // → epc_contract, epc_subcontracts, us_content_report
  "offtake_counterparty",  // → offtake_agreement
  "senior_lender",         // → term_sheet, security_package, intercreditor_agreement
  "mezzanine_lender",      // → (none auto-assigned, but tracked)
  "equity_sponsor",        // → shareholder_agreement, sponsor_support_agreement
  "legal_counsel_host",    // → legal_opinion_host
  "legal_counsel_us",      // → legal_opinion_us, fcpa_compliance
  "government_authority",  // → host_government_approval, implementation_agreement
  "environmental_consultant", // → esia, esmp
  "independent_engineer",  // → independent_engineer_report, feasibility_study
  "insurance_broker",      // → insurance_program
  "exim_officer",          // → loi_application, cls_eligibility
] as const;
```

### 2. SQL DDL

```sql
-- New enum for deal party structural roles
CREATE TYPE "DealPartyType" AS ENUM (
  'epc_contractor',
  'offtake_counterparty',
  'senior_lender',
  'mezzanine_lender',
  'equity_sponsor',
  'legal_counsel_host',
  'legal_counsel_us',
  'government_authority',
  'environmental_consultant',
  'independent_engineer',
  'insurance_broker',
  'exim_officer'
);

-- Join table: which organizations hold structural deal roles on which projects
CREATE TABLE deal_parties (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  party_type  "DealPartyType" NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (project_id, organization_id, party_type)
);

CREATE INDEX idx_deal_parties_project ON deal_parties(project_id, party_type);
CREATE INDEX idx_deal_parties_org ON deal_parties(organization_id);
```

### 3. Prisma model additions

```prisma
enum DealPartyType {
  epc_contractor
  offtake_counterparty
  senior_lender
  mezzanine_lender
  equity_sponsor
  legal_counsel_host
  legal_counsel_us
  government_authority
  environmental_consultant
  independent_engineer
  insurance_broker
  exim_officer
}

model DealParty {
  id             String        @id @default(cuid())
  projectId      String
  organizationId String
  partyType      DealPartyType
  notes          String?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  project      Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [organizationId], references: [id])

  @@unique([projectId, organizationId, partyType])
  @@index([projectId, partyType])
  @@index([organizationId])
  @@map("deal_parties")
}
```

Add relation arrays to existing models:
- `Project`: add `dealParties DealParty[]`
- `Organization`: add `dealParties DealParty[]`

### 4. Files to create

#### `src/lib/exim/deal-parties.ts`
Static mapping constant `DEAL_PARTY_REQUIREMENT_MAP: Record<DealPartyType, string[]>` and `DEAL_PARTY_LABELS: Record<DealPartyType, string>`. Also exports `REQUIRED_DEAL_PARTIES: DealPartyType[]` (the subset considered structurally mandatory for any EXIM deal).

#### `src/lib/db/deal-parties.ts`
Query helpers: `getProjectDealParties(projectId)`, `addDealParty(...)`, `removeDealParty(...)`. The `addDealParty` function also calls the auto-assignment logic.

#### `src/actions/deal-parties.ts`
Server actions: `addDealPartyAction`, `removeDealPartyAction`. On add, after inserting the `DealParty` row, iterate `DEAL_PARTY_REQUIREMENT_MAP[partyType]` and update matching `ProjectRequirement` rows to set `responsibleOrganizationId` where it is currently null.

#### `src/components/stakeholders/DealPartyChecklist.tsx`

```typescript
type DealPartyChecklistProps = {
  projectId: string;
  slug: string;
  dealParties: DealPartyRow[];
  organizations: { id: string; name: string }[];
};
```

Renders a grid of all `DealPartyType` values. For each: shows the assigned organization name (green) or "Not assigned" (red muted), plus the count of requirements that map to it. "Add" button opens inline org picker.

### 5. Files to modify

#### `prisma/schema.prisma`
- Add `DealPartyType` enum.
- Add `DealParty` model.
- Add `dealParties DealParty[]` relation to `Project` and `Organization`.

#### `src/components/stakeholders/StakeholderPanel.tsx`
- Import and render `DealPartyChecklist` above the existing stakeholder contact list.
- Accept `dealParties` and `organizations` as new props.
- Section header changes from "Stakeholders" to "Deal Parties & Contacts" (or keep both as sub-sections).

#### `src/app/(dashboard)/projects/[slug]/page.tsx`
- Fetch deal parties via `getProjectDealParties(project.id)` in the `Promise.all` block.
- Pass `dealParties` and `organizations` to `StakeholderPanel`.

#### `src/types/index.ts`
- Re-export `DealPartyType` from `@prisma/client`.

### 6. Ordering constraints

1. Schema migration must land first (enum + table creation).
2. `src/lib/exim/deal-parties.ts` (static mapping) -- no dependencies.
3. `src/lib/db/deal-parties.ts` -- depends on schema + mapping.
4. `src/actions/deal-parties.ts` -- depends on db layer.
5. `DealPartyChecklist.tsx` -- depends on types + actions.
6. `StakeholderPanel.tsx` modifications -- depends on DealPartyChecklist.
7. Page integration -- last.

### 7. Risks and tradeoffs

- **Risk:** Auto-assigning `responsibleOrganizationId` could overwrite manual assignments if the guard is wrong. **Mitigation:** Only set when currently null; never overwrite existing assignments.
- **Risk:** The `DealPartyType` enum is specific to EXIM deals. If the product broadens to IFC/DFC, the enum needs extending. **Mitigation:** Acceptable for Phase 1; the enum is in the DB and can be extended via migration.
- **Risk:** One organization might hold multiple deal party types (e.g. a DFI is both senior_lender and equity_sponsor). The unique constraint is `(project, org, partyType)` so this is supported.
- **Deferred:** Automatic stakeholder-to-deal-party inference (e.g. if someone with `StakeholderRoleType.epc_contact` is added, suggest their org as `epc_contractor` deal party). This is a UX enhancement, not structural.
- **Deferred:** Requirement de-assignment when a deal party is removed. For safety, removing a deal party should NOT null out `responsibleOrganizationId` on requirements (data loss risk). A separate "reassign" flow handles that.

---

## PHASE D -- Configurable Deal Milestones

### 1. Recommended approach

Add a new **`DealMilestone` table** (not JSON on the project, not reusing `ActivityEvent`). Milestones are first-class entities with their own lifecycle.

**Design decisions:**

| Question | Decision | Rationale |
|---|---|---|
| Schema approach | New `deal_milestones` table. Not JSON (can't index/query). Not `ActivityEvent` (events are immutable log entries; milestones are mutable targets). | Milestones need due dates, completion tracking, ordering, and template-based creation. A dedicated table is cleanest. |
| Fixed stage stepper stays or goes | **Stays.** The `ProjectPhase` enum stage stepper represents the EXIM lifecycle gate (a formal, non-negotiable sequence). Custom milestones run in parallel as user-defined workplan items. The stage stepper is the "official" track; milestones are the "operational" track. | EXIM phases are regulatory; users should not be able to reorder or skip them. Milestones are flexible planning tools. |
| Pre-populated templates | A static `MILESTONE_TEMPLATES` constant in `src/lib/exim/milestone-templates.ts`, keyed by a template slug (e.g. `"exim_power"`, `"exim_mining"`, `"ifc_general"`). When creating a project or on-demand, the user picks a template and the system bulk-creates milestone rows. Templates define name, default relative offset from project creation (in days), and optional linked `ProjectPhase`. | Keeps templates versioned in code; easy to add new ones. |
| Interaction with readiness score | **Milestones do NOT affect the readiness score.** The readiness score is strictly driven by EXIM requirement statuses. Milestones are an orthogonal planning/tracking tool. However, a milestone can optionally link to a `ProjectPhase` to indicate "this milestone should be done before advancing to phase X." | Clean separation of concerns. Readiness = document completeness. Milestones = schedule management. |
| UI approach | **Timeline view** integrated into the existing GanttChart section. Milestones render as diamond markers on the Gantt timeline. Additionally, a standalone "Milestones" checklist panel (above or below the Gantt) shows them as a sortable checklist with target dates and completion toggles. | Leverages existing timeline infrastructure. Checklist provides quick-scan view. |

### 2. SQL DDL

```sql
CREATE TABLE deal_milestones (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,

  -- Optional link to the EXIM phase this milestone gates.
  -- If set, this milestone is conceptually "should be done before entering this phase."
  linked_phase    "ProjectPhase",

  target_date     DATE,
  completed_at    TIMESTAMPTZ,
  completed_by    TEXT,           -- Clerk user ID

  sort_order      INT NOT NULL DEFAULT 0,
  created_by      TEXT NOT NULL,  -- Clerk user ID
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deal_milestones_project ON deal_milestones(project_id, sort_order);
CREATE INDEX idx_deal_milestones_target ON deal_milestones(project_id, target_date);
```

### 3. Prisma model additions

```prisma
model DealMilestone {
  id           String        @id @default(cuid())
  projectId    String
  name         String
  description  String?
  linkedPhase  ProjectPhase?
  targetDate   DateTime?     @db.Date
  completedAt  DateTime?
  completedBy  String?
  sortOrder    Int           @default(0)
  createdBy    String
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId, sortOrder])
  @@index([projectId, targetDate])
  @@map("deal_milestones")
}
```

Add to `Project` model: `milestones DealMilestone[]`.

### 4. Files to create

#### `src/lib/exim/milestone-templates.ts`

```typescript
export type MilestoneTemplateDef = {
  name: string;
  description?: string;
  linkedPhase?: string;       // ProjectPhase value
  offsetDays: number;         // relative to project creation / LOI target
  sortOrder: number;
};

export type MilestoneTemplate = {
  slug: string;
  label: string;
  description: string;
  milestones: MilestoneTemplateDef[];
};

export const MILESTONE_TEMPLATES: readonly MilestoneTemplate[] = [
  {
    slug: "exim_power",
    label: "EXIM Power Project",
    description: "Standard milestone set for an EXIM-backed power generation project.",
    milestones: [
      { name: "NDA Executed with EPC", offsetDays: 14, sortOrder: 1 },
      { name: "Feasibility Study Commissioned", linkedPhase: "concept", offsetDays: 30, sortOrder: 2 },
      { name: "EPC RFP Issued", offsetDays: 60, sortOrder: 3 },
      { name: "ESIA Consultant Engaged", offsetDays: 45, sortOrder: 4 },
      { name: "Financial Advisor Engaged", offsetDays: 60, sortOrder: 5 },
      { name: "EPC Bids Received", offsetDays: 120, sortOrder: 6 },
      { name: "EPC Contractor Selected", linkedPhase: "pre_loi", offsetDays: 150, sortOrder: 7 },
      { name: "Draft PPA Negotiated", linkedPhase: "pre_loi", offsetDays: 180, sortOrder: 8 },
      { name: "Preliminary ESIA Complete", linkedPhase: "pre_loi", offsetDays: 210, sortOrder: 9 },
      { name: "EXIM LOI Application Submitted", linkedPhase: "loi_submitted", offsetDays: 240, sortOrder: 10 },
      { name: "EXIM LOI Received", linkedPhase: "loi_approved", offsetDays: 300, sortOrder: 11 },
      { name: "Term Sheet Negotiated", linkedPhase: "pre_commitment", offsetDays: 360, sortOrder: 12 },
      { name: "Board Approval", linkedPhase: "pre_commitment", offsetDays: 390, sortOrder: 13 },
      { name: "EXIM Final Commitment", linkedPhase: "final_commitment", offsetDays: 420, sortOrder: 14 },
      { name: "Financial Close", linkedPhase: "financial_close", offsetDays: 480, sortOrder: 15 },
    ],
  },
  // Additional templates (exim_mining, ifc_general) can be added later.
];
```

#### `src/lib/db/milestones.ts`

Query helpers:
- `getProjectMilestones(projectId): Promise<Result<DealMilestoneRow[]>>`
- `createMilestone(projectId, data): Promise<Result<DealMilestoneRow>>`
- `updateMilestone(id, data): Promise<Result<DealMilestoneRow>>`
- `completeMilestone(id, clerkUserId): Promise<Result<DealMilestoneRow>>`
- `deleteMilestone(id): Promise<Result<void>>`
- `bulkCreateFromTemplate(projectId, templateSlug, anchorDate, clerkUserId): Promise<Result<number>>`

Row type:
```typescript
export type DealMilestoneRow = {
  id: string;
  name: string;
  description: string | null;
  linkedPhase: string | null;
  targetDate: Date | null;
  completedAt: Date | null;
  completedBy: string | null;
  sortOrder: number;
  createdAt: Date;
};
```

#### `src/actions/milestones.ts`

Server actions:
- `createMilestoneAction(projectId, slug, data)`
- `updateMilestoneAction(milestoneId, data)`
- `toggleMilestoneComplete(milestoneId)`
- `deleteMilestoneAction(milestoneId)`
- `applyMilestoneTemplate(projectId, slug, templateSlug, anchorDate)`
- `reorderMilestones(projectId, slug, orderedIds: string[])`

#### `src/components/projects/MilestonePanel.tsx`

```typescript
type MilestonePanelProps = {
  projectId: string;
  slug: string;
  initialMilestones: DealMilestoneRow[];
  currentPhase: string;
};
```

Renders:
- Header with "Milestones" title + "Apply Template" dropdown button.
- Sortable checklist: each row shows checkbox (complete toggle), name, target date, linked phase badge, and overdue indicator.
- Inline add form at bottom.
- Edit mode per row (click to expand: edit name, date, description, linked phase).

#### `src/components/projects/MilestoneDiamonds.tsx`

```typescript
type MilestoneDiamondsProps = {
  milestones: { id: string; name: string; targetDate: Date | null; completedAt: Date | null }[];
};
```

A small sub-component that renders diamond markers on the GanttChart timeline. Accepts milestones and the Gantt's date-to-pixel conversion function.

### 5. Files to modify

#### `prisma/schema.prisma`
- Add `DealMilestone` model.
- Add `milestones DealMilestone[]` relation to `Project`.

#### `src/app/(dashboard)/projects/[slug]/page.tsx`
- Import `getProjectMilestones` from `@/lib/db/milestones`.
- Add to the `Promise.all` data fetch.
- Render `MilestonePanel` between the StageStepper and the metadata row (or between timeline and requirements -- TBD based on visual hierarchy).
- Pass milestones to `GanttChart` for diamond marker rendering.

#### `src/components/projects/GanttChart.tsx`
- Accept optional `milestones` prop: `milestones?: { id: string; name: string; targetDate: Date | null; completedAt: Date | null }[]`.
- In the timeline rendering, overlay diamond markers at the x-position corresponding to each milestone's `targetDate`. Completed milestones get a filled diamond; incomplete get an outline diamond.
- Add milestone name labels on hover.

#### `src/types/index.ts`
- No new type exports needed (milestone types are local to `src/lib/db/milestones.ts`).

### 6. Ordering constraints

1. Schema migration must land first (table creation).
2. `src/lib/exim/milestone-templates.ts` -- no DB dependency, can land in parallel with migration.
3. `src/lib/db/milestones.ts` -- depends on schema.
4. `src/actions/milestones.ts` -- depends on db layer.
5. `MilestonePanel.tsx` -- depends on types + actions.
6. `MilestoneDiamonds.tsx` -- depends on milestone types.
7. `GanttChart.tsx` modifications -- depends on MilestoneDiamonds.
8. Page integration -- last.

Phase D can land independently of Phases B and C. No cross-phase dependencies.

### 7. Risks and tradeoffs

- **Risk:** Milestone `sortOrder` management on drag-and-drop reordering. **Mitigation:** Use gap-based ordering (sortOrder increments by 100) to allow inserts without full reorder. Only compact when gaps are exhausted.
- **Risk:** Templates produce milestones with relative offsets, but users may not have `targetLoiDate` set. **Mitigation:** `anchorDate` parameter defaults to project creation date; if `targetLoiDate` is set, offer that as the anchor.
- **Risk:** The GanttChart is already 933+ lines. Adding milestone diamonds increases complexity. **Mitigation:** `MilestoneDiamonds` is a separate component that receives the Gantt's coordinate system; the Gantt just renders it in the right layer.
- **Deferred:** Milestone dependency chains (milestone A must complete before B). Adds significant complexity for limited Phase 1 value.
- **Deferred:** Milestone notifications/reminders. Useful but orthogonal to the data model.
- **Deferred:** Milestone → requirement linkage (e.g. "EPC Contractor Selected" milestone triggers epc_contract requirement to move to in_progress). Powerful automation but needs careful UX design to avoid confusion with the deal party auto-assignment in Phase C.

---

## Cross-Phase Ordering

Phases B, C, and D are **independent** and can be developed in parallel. No phase depends on another. However, the recommended landing order is:

1. **Phase B (Capital Stack)** -- Smallest scope, no schema changes, highest visual impact. Ships in 1-2 days.
2. **Phase C (Deal Parties)** -- Schema change required, moderate scope. Ships in 3-4 days.
3. **Phase D (Milestones)** -- Schema change required, largest scope (templates, Gantt integration). Ships in 4-5 days.

If a single developer is working sequentially, B first gives an early win. C and D can be parallelized across two developers since they touch different parts of the schema and UI.
