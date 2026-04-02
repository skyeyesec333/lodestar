/**
 * Blended Finance / Concessional Finance Requirements Taxonomy
 *
 * Covers deals that layer concessional capital (donor grants, first-loss
 * tranches, concessional DFI windows) with commercial debt and equity to
 * de-risk projects that would not attract pure commercial financing.
 *
 * Common structures:
 *   - DFI first-loss tranche + commercial senior + sponsor equity
 *   - Donor grant + DFI subordinated debt + commercial bank senior
 *   - IDA Private Sector Window (PSW), MCPP, Green Climate Fund, USAID DCA
 *
 * Structured around three phases:
 *   application          — concept note through concessional window application
 *   concessional_approval — full appraisal and concessional window approval
 *   financial_close      — CP satisfaction, blended structure closed
 *
 * isPrimaryGate = true means the item is required for concessional approval.
 *
 * Shape mirrors RequirementDef from src/lib/requirements/types.ts.
 */

import type { RequirementDef } from "../requirements/types";

// ─── Eligibility & Concept ────────────────────────────────────────────────────

const concept: readonly RequirementDef[] = [
  {
    id: "bl_concept_note",
    category: "corporate",
    name: "Concept Note / Expression of Interest",
    description:
      "Initial concept note or expression of interest submitted to the concessional window (GCF, IDA PSW, MCPP, USAID DCA, etc.). Describes the project, financing gap, development impact case, and proposed blended structure. The gateway to the formal application process.",
    phaseRequired: "application",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 1,
    phaseLabel: "Application",
    defaultOwner: "Sponsor / DFI",
  },
  {
    id: "bl_additionality_memo",
    category: "studies",
    name: "Additionality Demonstration Memo",
    description:
      "Formal demonstration that the project cannot proceed (or cannot proceed at the same scale or development impact) without concessional support. Must show that commercial financing is insufficient — the 'financing gap' that justifies the subsidy. This is the central justification for any blended finance structure and will be scrutinized intensely by donors and DFIs.",
    phaseRequired: "concessional_approval",
    isPrimaryGate: true,
    weight: 150,
    sortOrder: 1,
    phaseLabel: "Concessional Approval",
    defaultOwner: "Sponsor / Financial advisor",
  },
  {
    id: "bl_impact_thesis",
    category: "studies",
    name: "Development Impact Thesis",
    description:
      "Articulation of the project's development impact case: SDG alignment, beneficiary population, economic multipliers, environmental benefits. Donors and DFIs fund blended finance because of development impact — this document is the core of the funding case.",
    phaseRequired: "application",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 2,
    phaseLabel: "Application",
    defaultOwner: "Sponsor / Impact advisor",
  },
  {
    id: "bl_market_failure_analysis",
    category: "studies",
    name: "Market Failure / Financing Gap Analysis",
    description:
      "Analysis demonstrating the market failure that prevents commercial financing alone. Quantifies the minimum concessional support needed (the 'concessional quantum') to make the project bankable. Overstating the financing gap is a common pitfall — donors require rigorous minimum concessionality analysis.",
    phaseRequired: "concessional_approval",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 3,
    phaseLabel: "Concessional Approval",
    defaultOwner: "Sponsor / Financial advisor",
  },
];

// ─── Concessional Structure ───────────────────────────────────────────────────

const concessional_docs: readonly RequirementDef[] = [
  {
    id: "bl_donor_grant_agreement",
    category: "contracts",
    name: "Donor Grant Agreement",
    description:
      "Binding grant agreement between the donor (GCF, USAID, bilateral donor) and the recipient (project company, DFI, or blended vehicle). Sets out grant amount, disbursement conditions, reporting obligations, and conditions for clawback. The primary concessional instrument in grant-based blended structures.",
    phaseRequired: "concessional_approval",
    isPrimaryGate: true,
    weight: 200,
    sortOrder: 1,
    phaseLabel: "Concessional Approval",
    defaultOwner: "Donor / Sponsor",
  },
  {
    id: "bl_concessional_window_approval",
    category: "corporate",
    name: "Concessional Window Approval",
    description:
      "Formal approval from the concessional facility (IDA PSW, GCF, MCPP, USAID DCA, Green Climate Fund, or bilateral concessional window). The primary gate — without concessional window approval, the blended structure cannot be assembled. Often requires a two-stage process: concept note approval, then full proposal approval.",
    phaseRequired: "concessional_approval",
    isPrimaryGate: true,
    weight: 200,
    sortOrder: 2,
    phaseLabel: "Concessional Approval",
    defaultOwner: "DFI / Donor",
  },
  {
    id: "bl_first_loss_term_sheet",
    category: "financial",
    name: "First-Loss Tranche Provider Term Sheet",
    description:
      "Binding or indicative term sheet from the first-loss tranche provider (DFI, donor, or blended vehicle). Sets out the subordinated tranche size, return expectations (often 0–2%), loss absorption mechanism, and priority of claims. The first-loss tranche is the structural heart of most blended deals — it de-risks the senior commercial tranche.",
    phaseRequired: "concessional_approval",
    isPrimaryGate: true,
    weight: 175,
    sortOrder: 3,
    phaseLabel: "Concessional Approval",
    defaultOwner: "DFI / Blended vehicle",
  },
  {
    id: "bl_results_framework",
    category: "financial",
    name: "Results Framework & Development Indicators",
    description:
      "Agreed results framework with measurable development indicators (jobs, access, GHG, revenue). Donors require a results framework before approval and use it for post-close monitoring and reporting to their shareholders. Must be SMART (specific, measurable, achievable, relevant, time-bound) and linked to disbursement conditions where applicable.",
    phaseRequired: "concessional_approval",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 4,
    phaseLabel: "Concessional Approval",
    defaultOwner: "Donor / DFI + Sponsor",
  },
  {
    id: "bl_blended_structure_memo",
    category: "financial",
    name: "Blended Structure Rationale Memo",
    description:
      "Document explaining the blended finance architecture: who provides what tranche, at what terms, in what priority of repayment, and how concessional support is sized to the minimum necessary. The memo must demonstrate that concessional support is not over-subsidizing commercial investors (the 'crowding out' concern).",
    phaseRequired: "concessional_approval",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 5,
    phaseLabel: "Concessional Approval",
    defaultOwner: "Sponsor / Financial advisor",
  },
  {
    id: "bl_commercial_lender_term_sheet",
    category: "financial",
    name: "Commercial Senior Lender Term Sheet",
    description:
      "Indicative or binding term sheet from the commercial bank(s) in the blended structure. Confirms that commercial lenders will participate — without this, the blended structure is not validated. The commercial lender's participation at market-rate terms is evidence that the concessional support is appropriately sized.",
    phaseRequired: "concessional_approval",
    isPrimaryGate: true,
    weight: 150,
    sortOrder: 6,
    phaseLabel: "Concessional Approval",
    defaultOwner: "Commercial lender",
  },
];

// ─── Financial ────────────────────────────────────────────────────────────────

const financial: readonly RequirementDef[] = [
  {
    id: "bl_financial_model",
    category: "financial",
    name: "Integrated Blended Finance Financial Model",
    description:
      "Financial model that integrates all tranches — grant, concessional debt, first-loss, senior commercial, and equity — with correct waterfall, priority of payment, and return profiles for each investor. Must demonstrate DSCR for commercial lenders, return on the concessional tranche, and development impact metrics. More complex than a standard project finance model.",
    phaseRequired: "concessional_approval",
    isPrimaryGate: true,
    weight: 200,
    sortOrder: 1,
    phaseLabel: "Concessional Approval",
    defaultOwner: "Sponsor / Financial advisor",
  },
  {
    id: "bl_minimum_concessionality",
    category: "financial",
    name: "Minimum Concessionality Analysis",
    description:
      "Analysis demonstrating that the concessional support is sized to the minimum necessary to make the project bankable — no more. Donors and DFIs are sensitive to 'over-subsidization' which crowds out commercial capital. This document is required by most concessional windows (GCF, IDA PSW).",
    phaseRequired: "concessional_approval",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 2,
    phaseLabel: "Concessional Approval",
    defaultOwner: "Sponsor / Financial advisor",
  },
  {
    id: "bl_equity_commitment",
    category: "financial",
    name: "Sponsor Equity Commitment Letters",
    description:
      "Binding equity commitment letters from all equity investors. Blended deals typically require 20–30% equity from the sponsor before concessional support is released.",
    phaseRequired: "concessional_approval",
    isPrimaryGate: false,
    weight: 125,
    sortOrder: 3,
    phaseLabel: "Concessional Approval",
    defaultOwner: "Sponsor(s)",
  },
  {
    id: "bl_ica_waterfall",
    category: "financial",
    name: "Intercreditor Agreement & Payment Waterfall",
    description:
      "Agreement governing the rights and payment priority of all capital providers: grant (no repayment), first-loss (last paid), senior commercial (first paid), equity (last after debt service). The waterfall is the legal architecture of the blended structure — it determines who absorbs losses in what order.",
    phaseRequired: "financial_close",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 4,
    phaseLabel: "Financial Close",
    defaultOwner: "Lenders' counsel",
  },
];

// ─── Contracts ────────────────────────────────────────────────────────────────

const contracts: readonly RequirementDef[] = [
  {
    id: "bl_epc_contract",
    category: "contracts",
    name: "EPC Contract",
    description:
      "Engineering, Procurement & Construction contract. Blended deals typically go through a DFI or donor procurement process. Fixed-price, lump-sum terms are preferred. The EPC contract is the anchor document for technical and cost risk.",
    phaseRequired: "concessional_approval",
    isPrimaryGate: false,
    weight: 150,
    sortOrder: 1,
    phaseLabel: "Concessional Approval",
    defaultOwner: "Sponsor / EPC Contractor",
  },
  {
    id: "bl_offtake_agreement",
    category: "contracts",
    name: "Offtake / Revenue Agreement",
    description:
      "Long-term offtake or revenue agreement with a creditworthy counterparty. Many blended deals involve sovereign or quasi-sovereign off-takers — their creditworthiness is a key concern for commercial lenders in the structure.",
    phaseRequired: "concessional_approval",
    isPrimaryGate: true,
    weight: 175,
    sortOrder: 2,
    phaseLabel: "Concessional Approval",
    defaultOwner: "Sponsor / Off-taker",
    applicableSectors: ["power", "water", "mining"],
  },
  {
    id: "bl_implementation_agreement",
    category: "contracts",
    name: "Host Government Implementation Agreement",
    description:
      "Government support agreement providing fiscal stability, FX convertibility, dispute resolution, and political risk protections. Donors and DFIs require explicit sovereign undertakings in blended structures where sovereign credit risk is present.",
    phaseRequired: "concessional_approval",
    isPrimaryGate: false,
    weight: 125,
    sortOrder: 3,
    phaseLabel: "Concessional Approval",
    defaultOwner: "Sponsor / Host Government",
  },
];

// ─── Environmental & Social ───────────────────────────────────────────────────

const environmental_social: readonly RequirementDef[] = [
  {
    id: "bl_esia",
    category: "environmental_social",
    name: "Environmental & Social Impact Assessment (ESIA)",
    description:
      "IFC Performance Standards-compliant ESIA. Blended structures involving DFIs or GCF require full IFC PS compliance. Category A projects require 120-day public disclosure before board approval.",
    phaseRequired: "concessional_approval",
    isPrimaryGate: true,
    weight: 175,
    sortOrder: 1,
    phaseLabel: "Concessional Approval",
    defaultOwner: "Third-party consultant",
  },
  {
    id: "bl_climate_rationale",
    category: "environmental_social",
    name: "Climate Rationale & Paris Alignment",
    description:
      "Documentation of the project's climate rationale — how it contributes to Paris Agreement goals (below 2°C pathway). Required by GCF, many bilateral donors, and DFIs with net-zero commitments. Must include GHG emission reductions or avoided emissions quantified over the project life.",
    phaseRequired: "concessional_approval",
    isPrimaryGate: false,
    weight: 125,
    sortOrder: 2,
    phaseLabel: "Concessional Approval",
    defaultOwner: "Third-party consultant",
    applicableSectors: ["power", "transport", "water"],
  },
  {
    id: "bl_ghg_quantification",
    category: "environmental_social",
    name: "GHG Emission Reduction Quantification",
    description:
      "Quantification of GHG emission reductions or avoided emissions attributable to the project, using an agreed methodology (GCF methodology, IPCC guidelines). Required by climate-focused concessional windows. Forms the basis for climate finance metrics reported to donors.",
    phaseRequired: "concessional_approval",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 3,
    phaseLabel: "Concessional Approval",
    defaultOwner: "Third-party consultant",
  },
];

// ─── Corporate & Permits ──────────────────────────────────────────────────────

const corporate: readonly RequirementDef[] = [
  {
    id: "bl_spv_formation",
    category: "corporate",
    name: "SPV / Project Company Formation",
    description:
      "Legal formation of the Special Purpose Vehicle in an acceptable jurisdiction. Many blended structures use offshore holding companies (Mauritius, Netherlands) to facilitate investment by DFIs and donors.",
    phaseRequired: "application",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 1,
    phaseLabel: "Application",
    defaultOwner: "Legal counsel",
  },
  {
    id: "bl_kyc_integrity",
    category: "corporate",
    name: "KYC / Integrity Due Diligence",
    description:
      "KYC, AML, and integrity due diligence on all sponsors, equity investors, UBOs, and key counterparties. Donors and DFIs conduct extensive integrity screening — blended structures must meet the most stringent standard across all capital providers.",
    phaseRequired: "concessional_approval",
    isPrimaryGate: true,
    weight: 100,
    sortOrder: 2,
    phaseLabel: "Concessional Approval",
    defaultOwner: "Sponsor / DFI compliance",
  },
  {
    id: "bl_env_permit",
    category: "permits",
    name: "Environmental Permit (Host Country)",
    description:
      "Environmental permit from the host country environmental authority. Must be in place or at advanced stage before concessional window approval.",
    phaseRequired: "financial_close",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 1,
    phaseLabel: "Financial Close",
    defaultOwner: "Sponsor / Host Government",
  },
];

// ─── Combined taxonomy ────────────────────────────────────────────────────────

/**
 * The complete Blended Finance / Concessional Finance requirements taxonomy.
 * ~30 items across 6 categories covering grant-based, first-loss, and
 * concessional window blended structures.
 */
export const BLENDED_REQUIREMENTS: readonly RequirementDef[] = [
  ...concept,
  ...concessional_docs,
  ...financial,
  ...contracts,
  ...environmental_social,
  ...corporate,
] as const;

/** Lookup by requirement ID. */
export const BLENDED_REQUIREMENTS_BY_ID: ReadonlyMap<string, RequirementDef> =
  new Map(BLENDED_REQUIREMENTS.map((r) => [r.id, r]));

/** IDs that are hard gates for concessional window approval. */
export const BLENDED_PRIMARY_GATE_IDS: readonly string[] = BLENDED_REQUIREMENTS.filter(
  (r) => r.isPrimaryGate,
).map((r) => r.id);

/** Total weight pool — denominator for readiness score. */
export const BLENDED_TOTAL_WEIGHT: number = BLENDED_REQUIREMENTS.reduce(
  (sum, r) => sum + r.weight,
  0,
);
