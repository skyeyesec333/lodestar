# Lodestar — EXIM Domain Ingestion & Normalization

Date: 2026-03-28
Status: Architecture analysis — not application code
Inputs: requirements.ts, schema.prisma, scoring/index.ts, types/*, research memos ×3, groundwork brief v2

---

## 1. Current Taxonomy Assessment

### What is strong

The taxonomy in `src/lib/exim/requirements.ts` does several things well:

1. **It exists as a typed, static, auditable constant.** The readonly arrays and derived maps (`REQUIREMENTS_BY_ID`, `LOI_CRITICAL_IDS`, `TOTAL_WEIGHT`) mean scoring, seeding, and UI all consume one truth. This is a genuine architectural advantage most early-stage products skip.

2. **The `phaseRequired` / `isLoiCritical` split models a real EXIM gate.** LOI is the first real milestone; Final Commitment is the second. Distinguishing which requirements block LOI versus which can wait until FC is correct practice. EXIM's own application guidance structures submissions this way.

3. **Category decomposition is reasonable.** The six categories (contracts, financial, studies, permits, corporate, environmental_social) align with how EXIM and most project-finance practitioners organize diligence workstreams. They are close to the actual data-room table of contents.

4. **Weights create graduated importance.** EPC Contract (200), Offtake Agreement (200), US Content Report (200), ESIA (200), Financial Model (200) are correctly identified as the heaviest items. The 50–200 range gives enough spread for the scoring function to differentiate projects meaningfully.

5. **The scoring function is simple, deterministic, and tested.** `STATUS_FRACTIONS` × `weight` is easy to audit, easy to explain to users, and easy to extend. The LOI-blocker list is derived, not separately maintained.

### What is structurally weak

1. **The taxonomy is document-centric, not evidence-centric.** Each requirement is modeled as "a document that must exist at a certain maturity." But EXIM readiness is not a document checklist — it is an evidence graph. Example: the "Financial Model" requirement assumes one artifact, but EXIM actually needs the model *plus* the assumptions book *plus* the sensitivity analysis *plus* the independent model audit. The current structure cannot express "this requirement is satisfied by a *set* of related evidence items, each with its own maturity."

2. **No sub-requirements or decomposition.** The 36-item flat list is workable at LOI level but breaks down at FC level. Consider `security_package`: this is actually 6–10 distinct instruments (share pledge, account control agreement, assignment of contracts, assignment of insurance, mortgage/charge over assets, direct agreements with each counterparty). A sponsor tracking readiness needs to know *which* pieces of the security package are done, not just whether "security package" is collectively in progress.

3. **No sector-conditional applicability.** `supply_agreement` says "Can be waived for renewables" in the description, but the taxonomy has no structured way to express this. The result is that every project gets 36 identical requirements regardless of sector. A wind project shows a fuel-supply-agreement requirement with weight 100 that must be manually waived, polluting the readiness score.

4. **No owner or responsible-party field.** Requirements are things the *project* must satisfy, but they are *produced by* specific counterparties: the EPC contractor produces the US-content certification, local counsel produces the host-country legal opinion, the environmental consultant produces the ESIA. The taxonomy has no concept of "who is responsible for this." Ownership lives only in the ad-hoc `DocumentRequest` model, which is optional and disconnected.

5. **No dependency or sequencing.** Some requirements have hard prerequisites: you cannot have a meaningful financial model without the EPC contract price; you cannot have the security package without the credit agreement. The taxonomy models these as independent items with independent weights. There is no way to express "X cannot meaningfully advance past draft until Y reaches substantially_final."

6. **The `waived` status is overloaded.** Waiver means two different things: (a) the requirement does not apply to this project type (renewables don't need fuel supply agreements), and (b) EXIM has explicitly waived a requirement that *would* normally apply. These have different implications for scoring and for audit trail. Currently both are `waived` with an optional `waiverReason` string.

7. **No versioning or effective-date concept.** If EXIM changes its requirements (as it has with CTEP, critical minerals, and OECD modernization), there is no way to know which version of the taxonomy a project was assessed against. Projects started in 2025 may have different requirements than projects started in 2027. The current design assumes the taxonomy is eternal.

### What major EXIM readiness concepts are missing

| Missing concept | Why it matters | Where it would attach |
|---|---|---|
| **US Content evidence bundle** | US content is not one report — it is the EPC contract's content schedule + subcontractor certifications + shipping documentation + Exporter's Certificate. EXIM's content policy page lists specific evidence items. | Financial category, linked to `epc_contract` |
| **Environmental categorization (A/B/C)** | EXIM's environmental review scope depends on the project's environmental category. Category A requires full ESIA disclosed 120 days before Board vote. Category C may need nothing. The current taxonomy treats all projects identically. | `environmental_social` category or project-level metadata |
| **Independent financial model audit** | EXIM's credit team builds their own model but requires an independent model audit for large transactions. This is distinct from the sponsor's financial model. | Financial category |
| **Country-risk / CLS check** | Whether the project country is open, restricted, or closed on the CLS is a binary gate that precedes all other work. Not a "document" but an eligibility determination. | Permits or a new `eligibility` category |
| **EXIM application form itself** | The LOI application, Preliminary Information Memo (PIM), and supporting submission materials are not currently tracked. | Process & milestones |
| **Intercreditor / co-financing documentation** | For multi-lender deals (EXIM + DFI + commercial bank), the ICA is a required closing document. The taxonomy has no concept of co-financing documentation. | Financial or contracts category |
| **FCPA / anti-corruption certification** | EXIM's own policies page lists FCPA compliance as a distinct requirement. Currently folded into KYC/AML but they are separate processes. | Corporate category |
| **Tax opinion / structure memorandum** | Host-country tax structure and withholding-tax analysis. Common FC requirement. | Studies or financial category |
| **Resource assessment (P50/P90)** | For renewable projects, the independent energy yield assessment is as important as the IE report. Currently not in taxonomy. | Studies category, sector-conditional |

### Where requirements are too coarse

| Current requirement | What it actually decomposes into |
|---|---|
| `financial_model` | Financial model + assumptions book + sensitivity analysis + independent model audit |
| `security_package` | Share pledge + account control agreements + contract assignments + insurance assignments + mortgage/charge + direct agreements (one per major counterparty) |
| `insurance_program` | Construction all-risk + third-party liability + DSU/ALOP + business interruption + marine cargo + professional indemnity + political risk (if separate from EXIM) |
| `kyc_aml_compliance` | KYC (beneficial ownership) + AML screening + OFAC sanctions + FCPA due diligence — four distinct compliance workstreams |
| `us_content_report` | Content analysis + Exporter's Certificate + subcontractor certifications + shipping/origin documentation |
| `esia` | Scoping report + baseline studies + impact assessment + public disclosure + 120-day clock (Cat A) |

---

## 2. Missing Domain Objects

### 2.1 Artifact

**Purpose:** A required piece of evidence with its own maturity lifecycle, distinct from a file upload. An Artifact is the *logical concept* of "the executed EPC contract" or "the IE's preliminary report." A Document is a *file* that contributes evidence toward an Artifact.

**Why the current model is insufficient:** `Document` is a file-upload record. `ProjectRequirement` is a status tracker. Neither models the concept of "this requirement needs *these specific evidence items* and here is their individual maturity." The gap shows when a requirement like `financial_model` needs multiple distinct artifacts (the model itself, the assumptions book, the audit letter) — today they are all just files optionally linked to the same `ProjectRequirement`, with no individual maturity tracking.

**Relationships:**
- Artifact belongs_to ProjectRequirement (many-to-one)
- Artifact has_many Documents (the files that fulfill it)
- Artifact has_one owner (Stakeholder or Organization responsible for producing it)
- Artifact has maturity state (mirrors RequirementStatus but per-artifact, not per-requirement)
- Artifact may reference other Artifacts as dependencies

### 2.2 Condition

**Purpose:** A gating requirement imposed by a specific party (EXIM, DFI, commercial lender, host government) that must be satisfied before a milestone can be reached. Distinct from a Requirement (which is the taxonomy) and from an ActionItem (which is a task from a meeting).

**Why the current model is insufficient:** `FunderCondition` exists but is scoped only to `FunderRelationship`. In practice, conditions come from multiple sources — EXIM's own CP list, host-government approval workflows, lender requirements, EP4 obligations — and they cross-cut funder relationships. A condition may not be linked to any specific funder but to a regulatory process. The current model also cannot express that a condition *blocks* a specific milestone or phase transition.

**Relationships:**
- Condition belongs_to Project
- Condition may link_to ProjectRequirement (the taxonomy item it relates to)
- Condition may link_to FunderRelationship (the funder imposing it)
- Condition blocks Milestone or ProjectPhase
- Condition has owner (Stakeholder or Organization responsible for satisfying it)
- Condition has status state machine (open → in_progress → satisfied → waived)

### 2.3 Commitment

**Purpose:** A promise made by a party during a meeting or communication that must resolve into an artifact, action, condition satisfaction, or explicit withdrawal. Commitments are the missing link between meetings and progress.

**Why the current model is insufficient:** `ActionItem` captures tasks extracted from meetings but does not model the *commitment* semantics: who promised what to whom, by when, and whether it resolved. An ActionItem is "someone should do X." A Commitment is "Party A promised Party B they would deliver X by date Y, and it matters because it gates Z." The difference is accountability and traceability.

**Relationships:**
- Commitment originates_from Meeting
- Commitment made_by Stakeholder (or Organization)
- Commitment made_to Stakeholder (or Organization)
- Commitment may resolve_to ActionItem, Artifact, or Condition satisfaction
- Commitment has status (open, fulfilled, broken, withdrawn)
- Commitment may link_to ProjectRequirement

### 2.4 Milestone

**Purpose:** A named, date-targeted event in the project lifecycle with defined entry criteria. Not the same as `ProjectPhase` (which is a state) — a Milestone is a point-in-time gate.

**Why the current model is insufficient:** `ProjectPhase` models the current state but not the target events. The project has `targetLoiDate` and `targetCloseDate` as fields, but there is no structured concept of "what must be true for LOI submission" beyond the LOI-critical requirement flags. Real projects have many milestones: CLS clearance, PIM submission, LOI application filing, LOI issuance, environmental disclosure, Board vote, Final Commitment, CP satisfaction, Financial Close. These are not phases — they are events with prerequisites and target dates.

**Relationships:**
- Milestone belongs_to Project
- Milestone has prerequisites (set of Conditions and/or ProjectRequirements at minimum status)
- Milestone has target_date and actual_date
- Milestone has status (upcoming, overdue, achieved, skipped)
- Milestone may belong_to a phase (e.g., all milestones that fall in the pre_loi phase)

### 2.5 EvidenceLink

**Purpose:** A typed, auditable trace between a claim and its supporting documentation. When the financial model says CAPEX is $350M, and the EPC contract says $280M EPC price, and the project budget reconciles the two — those are evidence links.

**Why the current model is insufficient:** Currently, a Document is optionally linked to a ProjectRequirement. That is a one-level association. There is no way to express "this section of this document supports this specific claim in that other document" or "these three documents together constitute the evidence chain for US-content compliance." Cross-document consistency — identified in all three research memos as a critical intelligence surface — has no data structure to anchor to.

**Relationships:**
- EvidenceLink connects a source (Document, Meeting, or external reference) to a target (Artifact, Condition, ProjectRequirement, or another Document)
- EvidenceLink has type (supports, contradicts, supersedes, references)
- EvidenceLink is created_by (user or AI agent)
- EvidenceLink has confidence and verification_status

**MVP scope note:** EvidenceLink is architecturally important but likely V2. For MVP, the simpler step is ensuring Artifacts can link to multiple Documents and that Conditions can link to Artifacts. The full evidence-graph is a later intelligence surface.

### 2.6 Risk

**Purpose:** A named, assessed risk that may affect readiness, timeline, or financing viability. Distinct from a Condition (which is a known gating requirement) — a Risk is a probabilistic concern.

**Why the current model is insufficient:** No concept of risk exists in the schema. Risk assessment is central to EXIM's underwriting (political risk, commercial risk, construction risk, off-taker credit risk). Sponsors need to track risks that may not yet be conditions but could become blockers.

**Relationships:**
- Risk belongs_to Project
- Risk may link_to ProjectRequirement, Condition, or Counterparty
- Risk has severity, likelihood, and status (identified, mitigated, materialized, closed)
- Risk may have mitigation_strategy (text or linked to ActionItem)

**MVP scope note:** Likely V2. For MVP, condition-tracking covers the most urgent subset (known blockers). Probabilistic risk tracking can wait.

### 2.7 SubmissionPackage

**Purpose:** A curated collection of Artifacts and evidence assembled for a specific submission event (LOI application, PIM, Final Commitment package). Models the "data room view" for a specific audience.

**Why the current model is insufficient:** The current model has no concept of "which artifacts constitute the LOI submission package" beyond the LOI-critical flag on requirements. In practice, the submission is a curated set with a specific order, specific document versions, cover letters, and transmittal requirements. Different funders or agencies may need different submission packages from the same project.

**Relationships:**
- SubmissionPackage belongs_to Project
- SubmissionPackage targets Milestone (the event it is assembled for)
- SubmissionPackage contains Artifacts (specific versions)
- SubmissionPackage may target a specific FunderRelationship
- SubmissionPackage has status (assembling, review, submitted, accepted, returned)

**MVP scope note:** V2. For MVP, the LOI-blocker panel and readiness score serve as the implicit submission-readiness view.

---

## 3. Missing Fields and States

### On Project

| Field | Type | Purpose |
|---|---|---|
| `environmentalCategory` | enum (a, b, c, fi) | EXIM environmental categorization. Determines ESIA scope, disclosure requirements, and review timeline. Affects which `environmental_social` requirements apply and their weight. |
| `clsStatus` | enum (open, restricted, closed, unknown) | Country Limitation Schedule status for the project country. Binary gate for EXIM eligibility. Should be checked against live CLS data. |
| `programPath` | enum (standard, ctep, mmia, critical_minerals, engineering_multiplier) | Which EXIM program path the project is pursuing. Affects US-content thresholds, repayment terms, and which requirements apply. |
| `estimatedTenorMonths` | int? | Target loan tenor in months. Affects exposure fee calculation and OECD compliance. |
| `estimatedExposureFeeBps` | int? | Cached exposure fee estimate in basis points. |

### On ProjectRequirement

| Field | Type | Purpose |
|---|---|---|
| `isApplicable` | boolean, default true | Whether this requirement applies to this specific project. Replaces the overloaded use of `waived` for "not applicable." |
| `applicabilityReason` | string? | Why the requirement doesn't apply (e.g., "Renewable project — no fuel supply"). |
| `responsibleOrganizationId` | FK to Organization? | Which counterparty is responsible for producing this requirement's evidence. |
| `responsibleStakeholderId` | FK to Stakeholder? | Which individual is the point of contact for this requirement. |
| `targetDate` | date? | When this requirement should reach its target status. Enables aging and velocity alerts. |
| `lastExternalReviewDate` | date? | When EXIM, IE, or legal counsel last reviewed the artifact. Drives staleness detection. |

### On EximRequirement (taxonomy)

| Field | Type | Purpose |
|---|---|---|
| `applicableSectors` | string[]? (null = all) | Which sectors this requirement applies to. Null means universal. Enables sector-conditional filtering. |
| `applicableProgramPaths` | string[]? (null = all) | Which program paths require this item. |
| `prerequisiteIds` | string[]? | Other requirement IDs that must reach a minimum status before this one can meaningfully advance. |
| `decomposesInto` | string[]? | Sub-requirement IDs for taxonomy items that expand into detailed evidence sets at FC stage. |

### On Meeting

| Field | Type | Purpose |
|---|---|---|
| `meetingPurpose` | enum (status_update, negotiation, diligence_review, government_meeting, site_visit, kickoff, other) | Structured purpose classification. Enables filtering and intelligence about which meeting types produce which outcomes. |
| `milestoneAdvanced` | boolean, default false | Whether this meeting materially advanced a project milestone. Enables meeting-velocity tracking. |

### On ActionItem

| Field | Type | Purpose |
|---|---|---|
| `commitmentType` | enum (deliverable, decision, information_request, approval, other)? | Distinguishes task-like actions from commitment-like obligations. Bridge toward the full Commitment entity. |
| `madeByStakeholderId` | FK? | Who made the commitment (distinct from `assignedToId` which is who must execute). |

### On FunderCondition

| Field | Type | Purpose |
|---|---|---|
| `conditionType` | enum (condition_precedent, information_requirement, policy_condition, regulatory, other) | Distinguishes CP-type conditions from information requests from regulatory gates. |
| `blocksMilestone` | string? | Which milestone this condition gates (e.g., "financial_close", "first_disbursement"). |
| `agingDays` | int? (computed) | Days since last status change. Enables condition-aging alerts. |

### Requirement status state machine refinement

The current 6-state machine (`not_started → in_progress → draft → substantially_final → executed → waived`) is good but should be augmented:

- Add `not_applicable` as a distinct status, separate from `waived`. `not_applicable` means the requirement structurally does not apply to this project type. `waived` means EXIM has explicitly excused a normally-required item.
- Consider adding `under_review` between `draft` and `substantially_final`. Many artifacts sit in external review (IE, legal counsel, EXIM preliminary review) for weeks. The current model jumps from `draft` to `substantially_final` with no visibility into review status.
- The scoring function would treat `not_applicable` as excluded from both numerator and denominator (unlike `waived` which scores as 1.0 and inflates the denominator).

---

## 4. Required Relationships

### Existing relationships that are correct
- Project ↔ ProjectRequirement (one-to-many via requirement taxonomy): correct
- ProjectRequirement ↔ Document (one-to-many): correct but insufficient (see Artifact)
- Meeting ↔ ActionItem (one-to-many): correct but needs Commitment layer
- FunderRelationship ↔ FunderCondition (one-to-many): correct but too narrow
- Stakeholder ↔ Organization (many-to-one): correct
- StakeholderRole ↔ Project (scoped role per project): correct

### Missing critical relationships

```
requirement ↔ artifact (one-to-many)
  A requirement may need multiple evidence items, each tracked independently.

artifact ↔ document (one-to-many)
  An artifact may have multiple document versions and supporting files.

artifact ↔ responsible_party (many-to-one, either Organization or Stakeholder)
  Someone is responsible for producing each artifact.

meeting ↔ commitment (one-to-many)
  Meetings produce commitments that must be tracked to resolution.

commitment ↔ counterparty (many-to-one, maker + receiver)
  Who promised what to whom.

commitment ↔ resolution (polymorphic: artifact, action_item, condition)
  A commitment resolves into a concrete deliverable.

condition ↔ milestone (many-to-one)
  A condition gates a specific milestone, not just a generic "advancement."

condition ↔ source (polymorphic: funder, agency, regulator, contract)
  Conditions come from multiple sources, not only funders.

requirement ↔ requirement (self-referential: prerequisite)
  Some requirements depend on others reaching a minimum maturity.

stakeholder ↔ obligation (via commitment or document_request)
  What each party still owes the project. The counterparty-obligation graph.

project ↔ program_path (many-to-one or many-to-many if multiple programs)
  Which EXIM program(s) the project is pursuing, with associated rule overlays.

requirement ↔ sector_applicability
  Which requirements apply to which project types. Currently implicit in descriptions.
```

### Relationship priority for implementation

| Priority | Relationship | Rationale |
|---|---|---|
| P0 (now) | requirement ↔ responsible_party | Highest-impact single addition. Answers "who owns this?" |
| P0 (now) | requirement ↔ sector_applicability | Prevents false scores on sector-inappropriate requirements |
| P1 (next) | requirement ↔ artifact (decomposition) | Enables evidence-level tracking for complex requirements |
| P1 (next) | condition ↔ milestone | Makes condition-tracking meaningful |
| P2 (later) | meeting ↔ commitment | Requires Commitment entity |
| P2 (later) | artifact ↔ evidence_link | Requires EvidenceLink entity |

---

## 5. EXIM-Specific vs Future-Core Concepts

| EXIM-specific for now | Likely reusable core concept later |
|---|---|
| LOI / Final Commitment as the two-gate phase model | Multi-gate phase model (any financing program has stages with gates) |
| `isLoiCritical` flag | `isGateCritical(gateId)` — which items block which gates |
| US Content threshold (51% / 85%) | Eligibility criterion with threshold and evidence (any ECA has content rules) |
| Environmental Category A/B/C per EXIM policy | Environmental categorization (IFC Performance Standards are used by multiple DFIs) |
| CLS country-risk classification | Country eligibility per program (DFC, MIGA, bilateral ECAs all have their own) |
| CTEP / MMIA / critical-minerals program paths | Program overlay with specific rules and thresholds |
| Exposure fee calculation (OECD-based) | Pricing/fee estimation per funder |
| EXIM Board vote as a milestone | Agency approval milestone (generic for any ECA/DFI) |
| EXIM-specific application forms (LOI application, PIM) | Submission package per agency/funder |
| OECD Arrangement repayment tenor limits | Regulatory constraint on financing terms |
| `EximRequirement` as a seeded taxonomy table | `ProgramRequirement` — a seeded taxonomy per financing program |
| `RequirementStatus` 6-state machine | Same — maturity states are universal in evidence-based financing |
| `computeReadiness()` weighted scoring | Same — scoring function with program-specific weights |
| `FunderCondition` | `Condition` — generalizes to any gating party |
| `EpcBid` with `usContentPct` | Counterparty qualification with program-specific criteria |
| `Document` / `DocumentRequest` | Same — universal |
| `Meeting` / `ActionItem` | Same — universal |
| `Stakeholder` / `Organization` | Same — universal |
| `Project` | Same — universal |

**Design implication:** The reusable core is larger than the EXIM-specific surface. The right architecture is:

1. Core entities: Project, Requirement, Condition, Artifact, Milestone, Commitment, Stakeholder, Organization, Document, Meeting, ActionItem
2. Program overlay: EXIM-specific taxonomy, EXIM-specific eligibility rules, EXIM-specific scoring weights, EXIM-specific milestones
3. The overlay is loaded as configuration data (like the current `requirements.ts`), not hardcoded into the schema

For MVP (EXIM-first), this means: keep `EximRequirement` as-is in the schema, but add the missing fields noted in Section 3 so the model is correct for EXIM even if not yet generalized.

---

## 6. Taxonomy Delta Recommendation

### Changes to existing requirements

| ID | Change | Rationale |
|---|---|---|
| `supply_agreement` | Add `applicableSectors: ["power", "mining"]`. Mark `isApplicable = false` automatically for renewable-only projects. | Fuel/feedstock supply is not relevant to solar, wind, or hydro. Currently pollutes readiness score. |
| `interconnection_agreement` | Add `applicableSectors: ["power"]`. | Grid connection is only relevant to power projects. Transport, water, telecom, mining do not need it. |
| `us_content_report` | Rename to "US Content Evidence Package". Update description to list the component evidence items: content analysis, Exporter's Certificate, subcontractor certifications, shipping/origin documentation. | More accurately reflects the multi-artifact nature of US-content compliance. |
| `kyc_aml_compliance` | Split into two: `kyc_aml_screening` (KYC/AML/OFAC — corporate category) and `fcpa_compliance` (FCPA/anti-corruption — corporate category). Reduce weight of each to 75 (currently 100 for combined). | These are distinct compliance workstreams with different owners (KYC is sponsor-driven, FCPA involves external counsel). EXIM lists them separately in its policies. |

### New requirements to add

| ID | Name | Category | Phase | LOI Critical | Weight | Rationale |
|---|---|---|---|---|---|---|
| `cls_eligibility` | Country Limitation Schedule Check | `permits` | loi | yes | 100 | Binary eligibility gate. Should be checked first. No point advancing if country is closed. |
| `loi_application` | LOI Application & PIM | `corporate` | loi | yes | 150 | The LOI application itself is a required submission. Currently not tracked. |
| `independent_model_audit` | Independent Financial Model Audit | `financial` | final_commitment | no | 100 | Required for large transactions. Distinct from the sponsor's financial model. |
| `resource_assessment` | Independent Resource Assessment (P50/P90) | `studies` | loi | no | 100 | Required for renewable energy projects. Sector-conditional: `applicableSectors: ["power"]` with sub-condition on technology type. |
| `tax_structure_opinion` | Tax Structure Memorandum | `financial` | final_commitment | no | 75 | Host-country tax structure and withholding analysis. Standard FC checklist item. |
| `intercreditor_agreement` | Intercreditor / Co-Financing Agreement | `financial` | final_commitment | no | 75 | Required for multi-lender deals. Applicable when >1 funder. |

### Category changes

No new categories are needed for MVP. The six categories remain appropriate. If the taxonomy grows past ~50 items, consider splitting `financial` into `financial_model` and `financing_structure`, but this is premature now.

### Requirement weight recalibration

After adding the new items:
- Total taxonomy: ~43 items (36 existing + 6 new + 1 split = 43, minus the merged KYC = 42)
- Total weight: approximately 4,275 → 4,600 (estimate). The denominator shift is small enough that existing projects' scores would move <5% — acceptable for an alpha product.

---

## 7. Architecture Implications

### Prisma schema evolution

**Immediate (P0) additions to existing models:**

1. Add `isApplicable` and `applicabilityReason` to `ProjectRequirement`. This is the smallest change that fixes the sector-conditional scoring problem.
2. Add `responsibleOrganizationId` to `ProjectRequirement`. This answers "who owns this requirement?" — the single most asked question in readiness coordination.
3. Add `targetDate` to `ProjectRequirement`. This enables aging alerts and velocity tracking.
4. Add `environmentalCategory` and `programPath` to `Project`. These are project-level metadata that affect which requirements apply and how they are scored.

**Next iteration (P1) additions — new models:**

5. `Milestone` model. Small schema addition (belongs_to Project, has target_date, actual_date, status, prerequisites as JSON or relation).
6. `Condition` model — generalize `FunderCondition` by adding a standalone `Condition` model that can be sourced from any party (not only FunderRelationship). `FunderCondition` can remain as a convenience view or be migrated.

**Later iteration (P2) additions:**

7. `Artifact` model (belongs_to ProjectRequirement, has maturity state, responsible party, linked Documents).
8. `Commitment` model (belongs_to Meeting, made_by Stakeholder, resolves_to polymorphic).

### App navigation / information architecture

The current page structure (project detail with vertical sections) works for MVP but the domain model changes suggest:

- **Readiness command center** should become the primary project view, not a gauge widget. It should show requirements grouped by blocker status, not just by category.
- **Condition/blocker view** should be surfaced as a first-class panel alongside requirements. Currently, `FunderCondition` is buried inside funder relationships.
- **Counterparty obligation view** — "what does each party still owe us?" — should be a navigable view. Currently requires cross-referencing `DocumentRequest`, `ActionItem`, and `FunderCondition`.
- **Timeline view** (Gantt) should show Milestones as named gates, not just requirement bars.

### Alerting and intelligence surfaces

The domain model changes directly enable these alert types (listed in priority order):

| Alert | Data dependency | MVP feasibility |
|---|---|---|
| LOI blocker countdown | `targetLoiDate` + `loiBlockers` (already exists) | Already implemented in UI |
| Requirement aging | `targetDate` on ProjectRequirement (add P0) | Feasible with P0 additions |
| Counterparty silence | `lastContactDate` on FunderRelationship (exists) + `responsibleOrganizationId` on ProjectRequirement (add P0) | Feasible with P0 additions |
| Condition aging | `status` + `updatedAt` on FunderCondition (exists) | Feasible now |
| Readiness regression | `statusChangedAt` on ProjectRequirement (exists) — detect backward transitions | Feasible now — needs logic, not schema |
| Program-fit drift | `programPath` on Project (add P0) + scoring rules per path | Feasible with P0 additions |

### MVP scope versus later scope

| Scope | What it includes |
|---|---|
| **MVP (now)** | P0 schema additions, taxonomy delta (6 new requirements, 1 split, sector-applicability flags), `not_applicable` status, readiness-regression detection, requirement-aging alerts |
| **V1.1** | Milestone model, Condition model (generalized), condition-aging alerts, counterparty-obligation view |
| **V2** | Artifact model, Commitment model, evidence-link layer, cross-document consistency checking, program-overlay architecture for multi-ECA support |

---

## 8. Open Questions

### Policy verification needed

1. **Is `cls_eligibility` truly a per-project check, or per-country?** If a user has multiple projects in the same country, should CLS status be shared? Likely yes — this suggests CLS status could be a field on `Organization` (for the host country) or on `Project.countryCode` with a lookup table.

2. **Does EXIM require the LOI application and PIM as distinct submissions, or is the PIM part of the LOI application?** This affects whether `loi_application` should be one requirement or two.

3. **What is the exact US-content threshold for CTEP vs. standard vs. MMIA?** The taxonomy currently says "51% standard, 85% for certain products" but CTEP allows 51% where standard is 85%. This needs precise program-path-conditional logic.

4. **Are there EXIM requirements that have changed since the taxonomy was written?** The 2023 OECD modernization and 2025 carbon-intensity policy reversal may affect specific items.

### User interviews needed

5. **Do sponsors actually track requirement ownership today, and if so, how?** This determines whether `responsibleOrganizationId` on ProjectRequirement is immediately useful or premature.

6. **How do sponsors currently handle the LOI submission package assembly?** This determines whether `SubmissionPackage` is a V1 or V2 concept.

7. **What is the typical number of funders per project?** If most projects have only EXIM (not multi-lender), the intercreditor-agreement requirement may be rare enough to mark optional.

### Architecture decisions needed

8. **Should `not_applicable` be a status on ProjectRequirement or a separate boolean field (`isApplicable`)?** A separate field is cleaner (the status machine stays the same for applicable requirements), but a status value is simpler to implement. **Recommendation:** Separate `isApplicable` boolean, because `not_applicable` is a structural property of the (project, requirement) pair, not a progression state.

9. **Should the taxonomy support sub-requirements now, or should Artifact handle decomposition?** Sub-requirements in the taxonomy mean `EximRequirement` gets a `parentId` self-reference. Artifact decomposition means the taxonomy stays flat but Artifacts decompose each requirement at runtime. **Recommendation:** Keep taxonomy flat for now. Add Artifact in V2 to handle decomposition. The 42-item flat list is still manageable.

10. **Should `Condition` replace `FunderCondition` or extend alongside it?** **Recommendation:** Add `Condition` as a standalone model in P1. Migrate `FunderCondition` data to `Condition` with a `sourceFunderRelationshipId` field. This is cleaner than maintaining two parallel models.

### Implementation sequencing

11. **What is the migration strategy for adding requirements to existing projects?** When new requirements are added to the taxonomy, existing projects need `ProjectRequirement` rows created. The seed script handles initial creation, but a migration backfill is needed for existing projects. Should new requirements default to `not_started` or `not_applicable` depending on sector?

12. **Should scoring recalculation be triggered synchronously or queued?** Adding `isApplicable` and `not_applicable` changes the scoring denominator. Projects with sector-conditional requirements will see score changes on migration. This should be communicated to users.

---

## 9. Recommended Next Step

**Write a Prisma schema migration that adds the P0 fields to `ProjectRequirement` and `Project`.**

Specifically:
1. Add `isApplicable Boolean @default(true)` and `applicabilityReason String?` to `ProjectRequirement`
2. Add `responsibleOrganizationId String?` (FK to Organization) to `ProjectRequirement`
3. Add `targetDate DateTime? @db.Date` to `ProjectRequirement`
4. Add `environmentalCategory` enum and `programPath` enum to `Project`
5. Update `computeReadiness()` to exclude `isApplicable = false` rows from both numerator and denominator
6. Add the 6 new taxonomy items to `requirements.ts` with `applicableSectors` metadata (even if the schema doesn't enforce it yet — the field can be checked in application logic)

This is the smallest structural change that makes the domain model meaningfully more accurate without introducing new entities. It unblocks: sector-conditional scoring, requirement ownership, requirement-aging alerts, and environmental categorization. It does not require new UI — the existing RequirementsChecklist can simply filter out `isApplicable = false` items.

After this migration, the next step is the Milestone model (P1), which gives the project a structured timeline beyond the two target dates.
