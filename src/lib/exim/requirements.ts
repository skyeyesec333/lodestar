/**
 * EXIM Project Finance Requirements Taxonomy
 *
 * This is the single source of truth for every item on the EXIM project
 * finance checklist. The seed script writes these to the `exim_requirements`
 * table; the readiness scoring logic reads weights and flags from here.
 *
 * To add a requirement: add it here, update the seed script, write a
 * migration to insert the row and backfill `requirement_statuses` for
 * existing projects.
 */

export const REQUIREMENT_CATEGORIES = [
  "contracts",
  "financial",
  "studies",
  "permits",
  "corporate",
  "environmental_social",
] as const;

export type RequirementCategory = (typeof REQUIREMENT_CATEGORIES)[number];

const REQUIREMENT_PHASES = ["loi", "final_commitment"] as const;
type RequirementPhase = (typeof REQUIREMENT_PHASES)[number];

export interface EximRequirementDef {
  readonly id: string;
  readonly category: RequirementCategory;
  readonly name: string;
  readonly description: string;
  readonly phaseRequired: RequirementPhase;
  readonly isLoiCritical: boolean;
  readonly weight: number;
  readonly sortOrder: number;
  /**
   * Sectors this requirement applies to. Null = applies to all sectors.
   * When a project's sector is not in this list, the requirement should be
   * automatically marked not_applicable and excluded from scoring.
   */
  readonly applicableSectors?: readonly string[];
}

// ─── Contracts ───────────────────────────────────────────────

const contracts: readonly EximRequirementDef[] = [
  {
    id: "epc_contract",
    category: "contracts",
    name: "EPC Contract",
    description:
      "Engineering, Procurement & Construction contract with a US-based contractor. Must demonstrate >51% US content. The primary vehicle for EXIM financing eligibility.",
    phaseRequired: "loi",
    isLoiCritical: true,
    weight: 200,
    sortOrder: 1,
  },
  {
    id: "offtake_agreement",
    category: "contracts",
    name: "Off-take / PPA Agreement",
    description:
      "Binding agreement with the entity purchasing the project's output (power, water, minerals, etc.). Must demonstrate bankable cash flows sufficient to service debt.",
    phaseRequired: "loi",
    isLoiCritical: true,
    weight: 200,
    sortOrder: 2,
  },
  {
    id: "implementation_agreement",
    category: "contracts",
    name: "Host Government Implementation Agreement",
    description:
      "Agreement between the project company and host government granting development rights. Typically includes fiscal terms, tax holidays, and FX conversion guarantees.",
    phaseRequired: "loi",
    isLoiCritical: true,
    weight: 150,
    sortOrder: 3,
  },
  {
    id: "concession_agreement",
    category: "contracts",
    name: "Concession / Land Rights Agreement",
    description:
      "Legal right to use the project site — concession, lease, or freehold title. A binding term sheet or draft with government sign-off is acceptable for LOI.",
    phaseRequired: "loi",
    isLoiCritical: false,
    weight: 100,
    sortOrder: 4,
  },
  {
    id: "om_agreement",
    category: "contracts",
    name: "O&M Agreement",
    description:
      "Operations & Maintenance agreement for post-construction facility management. Often with the EPC contractor or a specialized operator.",
    phaseRequired: "final_commitment",
    isLoiCritical: false,
    weight: 100,
    sortOrder: 5,
  },
  {
    id: "supply_agreement",
    category: "contracts",
    name: "Fuel / Feedstock Supply Agreement",
    description:
      "Long-term supply contract for project inputs (gas, coal, feedstock). Applicable to thermal power and industrial projects. Not applicable to renewable energy projects.",
    phaseRequired: "final_commitment",
    isLoiCritical: false,
    weight: 100,
    sortOrder: 6,
    applicableSectors: ["power", "mining"],
  },
  {
    id: "interconnection_agreement",
    category: "contracts",
    name: "Interconnection / Grid Connection Agreement",
    description:
      "Terms for connecting the project to the national grid or distribution network. Typically negotiated with the national utility.",
    phaseRequired: "final_commitment",
    isLoiCritical: false,
    weight: 75,
    sortOrder: 7,
    applicableSectors: ["power"],
  },
  {
    id: "insurance_program",
    category: "contracts",
    name: "Insurance Program & Broker Engagement",
    description:
      "Project insurance coverage plan (construction all-risk, third-party liability, business interruption). A broker letter of intent is sufficient early; full placement at financial close.",
    phaseRequired: "final_commitment",
    isLoiCritical: false,
    weight: 75,
    sortOrder: 8,
  },
  {
    id: "epc_subcontracts",
    category: "contracts",
    name: "Key EPC Subcontracts",
    description:
      "Major equipment supply and subcontractor agreements under the EPC umbrella. Relevant for US-content percentage calculation.",
    phaseRequired: "final_commitment",
    isLoiCritical: false,
    weight: 50,
    sortOrder: 9,
  },
  {
    id: "sponsor_support_agreement",
    category: "contracts",
    name: "Sponsor Support / Completion Guarantee",
    description:
      "Sponsor commitments to fund cost overruns and provide completion guarantees. Finalized during credit agreement negotiation.",
    phaseRequired: "final_commitment",
    isLoiCritical: false,
    weight: 100,
    sortOrder: 10,
  },
] as const;

// ─── Financial ───────────────────────────────────────────────

const financial: readonly EximRequirementDef[] = [
  {
    id: "financial_model",
    category: "financial",
    name: "Financial Model",
    description:
      "Integrated financial projection covering construction costs, revenue forecasts, debt service, and equity returns. Must demonstrate DSCR ≥ 1.3x. EXIM's credit team builds their own model from this.",
    phaseRequired: "loi",
    isLoiCritical: true,
    weight: 200,
    sortOrder: 1,
  },
  {
    id: "project_budget",
    category: "financial",
    name: "Detailed Project Budget / CAPEX Breakdown",
    description:
      "Line-item construction budget supporting the financial model. Required for EXIM to verify US-content percentages and size the loan.",
    phaseRequired: "loi",
    isLoiCritical: true,
    weight: 150,
    sortOrder: 2,
  },
  {
    id: "us_content_report",
    category: "financial",
    name: "US Content Analysis & Certification",
    description:
      "Documentation that eligible US goods and services exceed the statutory threshold (51% standard, 85% for certain products). Typically prepared by the EPC contractor. This is EXIM's statutory mandate.",
    phaseRequired: "loi",
    isLoiCritical: true,
    weight: 200,
    sortOrder: 3,
  },
  {
    id: "term_sheet",
    category: "financial",
    name: "Lender Term Sheet / Credit Agreement",
    description:
      "EXIM loan terms or commercial bank term sheet for the EXIM-guaranteed tranche. Negotiated after LOI approval.",
    phaseRequired: "final_commitment",
    isLoiCritical: false,
    weight: 100,
    sortOrder: 4,
  },
  {
    id: "security_package",
    category: "financial",
    name: "Security & Collateral Package",
    description:
      "Assignment of project contracts, share pledges, and account control agreements. The legal architecture of the financing.",
    phaseRequired: "final_commitment",
    isLoiCritical: false,
    weight: 100,
    sortOrder: 5,
  },
  {
    id: "debt_service_reserve",
    category: "financial",
    name: "Debt Service Reserve Structure",
    description:
      "DSRA sizing, funding mechanism, and drawdown rules. Technical financing detail finalized with the credit agreement.",
    phaseRequired: "final_commitment",
    isLoiCritical: false,
    weight: 50,
    sortOrder: 6,
  },
  {
    id: "hedging_strategy",
    category: "financial",
    name: "Interest Rate / FX Hedging Strategy",
    description:
      "Hedging approach for interest rate and currency mismatch between local-currency revenues and USD debt service. Required when currency risk is present.",
    phaseRequired: "final_commitment",
    isLoiCritical: false,
    weight: 50,
    sortOrder: 7,
  },
  {
    id: "independent_model_audit",
    category: "financial",
    name: "Independent Financial Model Audit",
    description:
      "Third-party audit of the sponsor's financial model by an acceptable financial advisor. EXIM's credit team builds their own model but requires an independent audit for large transactions to verify model integrity, formula accuracy, and assumption consistency. Distinct from the sponsor's financial model.",
    phaseRequired: "final_commitment",
    isLoiCritical: false,
    weight: 100,
    sortOrder: 8,
  },
  {
    id: "tax_structure_opinion",
    category: "financial",
    name: "Tax Structure Memorandum",
    description:
      "Host-country and cross-border tax analysis covering withholding taxes on debt service, dividends, and capital gains; VAT/GST implications; transfer pricing; and applicable tax treaties. Required for financial close. Typically prepared by a tax advisor or local counsel.",
    phaseRequired: "final_commitment",
    isLoiCritical: false,
    weight: 75,
    sortOrder: 9,
  },
  {
    id: "intercreditor_agreement",
    category: "financial",
    name: "Intercreditor / Co-Financing Agreement",
    description:
      "Agreement governing the rights, rankings, and remedies of all project lenders (EXIM, DFI, commercial bank) relative to one another. Addresses voting thresholds, waterfall priority, step-in rights, and subordination. Required when more than one lender is participating in the financing.",
    phaseRequired: "final_commitment",
    isLoiCritical: false,
    weight: 75,
    sortOrder: 10,
  },
  {
    id: "exim_exposure_fee_term_sheet",
    category: "financial",
    name: "EXIM Exposure Fee Term Sheet",
    description:
      "EXIM exposure fee term sheet received and modeled in financial projections. The exposure fee (risk premium) is a significant cost item; it must be incorporated into the financial model and confirmed with EXIM's underwriting team before final commitment.",
    phaseRequired: "final_commitment",
    isLoiCritical: false,
    weight: 75,
    sortOrder: 11,
  },
  {
    id: "us_content_certification_formal",
    category: "financial",
    name: "Formal US Content Certification",
    description:
      "Formal US content certification (distinct from the EPC contractor's US content analysis report) submitted directly to EXIM confirming that eligible US goods and services exceed the statutory threshold (>51%). This is the sponsor's affirmative certification to EXIM — a separate, binding submission from the EPC's content breakdown report.",
    phaseRequired: "loi",
    isLoiCritical: true,
    weight: 150,
    sortOrder: 12,
  },
  {
    id: "market_flex_terms",
    category: "financial",
    name: "Market Flex Terms Agreement",
    description:
      "Market flex terms agreed with any co-lending commercial banks in the syndication alongside the EXIM-guaranteed tranche. Flex provisions allow banks to adjust pricing and structure during syndication; these terms must be understood and modeled before final commitment.",
    phaseRequired: "final_commitment",
    isLoiCritical: false,
    weight: 50,
    sortOrder: 13,
  },
] as const;

// ─── Studies ─────────────────────────────────────────────────

const studies: readonly EximRequirementDef[] = [
  {
    id: "feasibility_study",
    category: "studies",
    name: "Feasibility Study",
    description:
      "Technical and economic feasibility assessment demonstrating the project is viable with proven technology in a viable market.",
    phaseRequired: "loi",
    isLoiCritical: true,
    weight: 150,
    sortOrder: 1,
  },
  {
    id: "independent_engineer_report",
    category: "studies",
    name: "Independent Engineer's Report",
    description:
      "Third-party technical due diligence by an engineer acceptable to EXIM. Covers design adequacy, construction plan, and technology risk. Preliminary report sufficient for LOI; full report by final commitment.",
    phaseRequired: "loi",
    isLoiCritical: true,
    weight: 150,
    sortOrder: 2,
  },
  {
    id: "market_study",
    category: "studies",
    name: "Market / Demand Study",
    description:
      "Independent assessment of demand for the project's output. Less critical when a binding off-take agreement is in place.",
    phaseRequired: "loi",
    isLoiCritical: false,
    weight: 100,
    sortOrder: 3,
  },
  {
    id: "legal_opinion_host",
    category: "studies",
    name: "Host Country Legal Opinion",
    description:
      "Opinion from local counsel on enforceability of project contracts, compliance with local law, and valid corporate authority of counterparties.",
    phaseRequired: "final_commitment",
    isLoiCritical: false,
    weight: 100,
    sortOrder: 4,
  },
  {
    id: "legal_opinion_us",
    category: "studies",
    name: "US Legal Opinion",
    description:
      "Opinion from US counsel covering EXIM regulatory compliance, OFAC sanctions clearance, and FCPA due diligence.",
    phaseRequired: "final_commitment",
    isLoiCritical: false,
    weight: 100,
    sortOrder: 5,
  },
  {
    id: "title_report",
    category: "studies",
    name: "Title / Lien Search Report",
    description:
      "Confirmation that the project company has clear title to assets with no competing liens or encumbrances.",
    phaseRequired: "final_commitment",
    isLoiCritical: false,
    weight: 75,
    sortOrder: 6,
  },
  {
    id: "resource_assessment",
    category: "studies",
    name: "Independent Resource Assessment (P50/P90)",
    description:
      "Independent energy yield or resource assessment for renewable energy projects, providing P50 (median expected production) and P90 (conservative 90th-percentile) estimates. Required for solar, wind, hydro, and geothermal projects. Prepared by an independent resource assessor (DNV, 3E, Black & Veatch, etc.). EXIM's IE and lenders size debt using P90 production levels.",
    phaseRequired: "loi",
    isLoiCritical: false,
    weight: 100,
    sortOrder: 7,
    applicableSectors: ["power"],
  },
  {
    id: "tied_aid_analysis",
    category: "studies",
    name: "Tied Aid / Grant Analysis",
    description:
      "Tied aid and grant analysis completed where a sovereign counterparty or host government is involved. EXIM must assess whether the project involves tied aid elements that could trigger OECD Arrangement obligations or affect EXIM's pricing and terms. Required for sovereign or quasi-sovereign counterparty transactions.",
    phaseRequired: "loi",
    isLoiCritical: false,
    weight: 75,
    sortOrder: 8,
  },
] as const;

// ─── Permits ─────────────────────────────────────────────────

const permits: readonly EximRequirementDef[] = [
  {
    id: "cls_eligibility",
    category: "permits",
    name: "Country Limitation Schedule (CLS) Clearance",
    description:
      "Verification that the project country is 'open for cover' on EXIM's Country Limitation Schedule. A closed or prohibited country is an absolute eligibility bar — no further work should advance until CLS clearance is confirmed. The CLS is updated periodically; sponsors must confirm the current status.",
    phaseRequired: "loi",
    isLoiCritical: true,
    weight: 100,
    sortOrder: 1,
  },
  {
    id: "host_government_approval",
    category: "permits",
    name: "Host Government Approval / Support Letter",
    description:
      "Formal indication of host government approval and support — presidential decree, ministerial approval, or investment certificate. EXIM requires evidence of government backing.",
    phaseRequired: "loi",
    isLoiCritical: true,
    weight: 150,
    sortOrder: 2,
  },
  {
    id: "environmental_permits",
    category: "permits",
    name: "Environmental Permits & Clearances",
    description:
      "Local environmental regulatory approvals from the host country's environmental authority. The ESIA is the analysis; this is the resulting regulatory permit.",
    phaseRequired: "final_commitment",
    isLoiCritical: false,
    weight: 100,
    sortOrder: 3,
  },
  {
    id: "construction_permits",
    category: "permits",
    name: "Construction Permits & Approvals",
    description:
      "Building permits and zoning clearances required to begin construction. Typically obtained during or after detailed engineering.",
    phaseRequired: "final_commitment",
    isLoiCritical: false,
    weight: 75,
    sortOrder: 4,
  },
  {
    id: "operating_license",
    category: "permits",
    name: "Operating License / Authorization",
    description:
      "License to operate the completed facility (generation license, extraction license, etc.). Framework approval should be in place even if final license is post-construction.",
    phaseRequired: "final_commitment",
    isLoiCritical: false,
    weight: 75,
    sortOrder: 5,
  },
  {
    id: "fx_approval",
    category: "permits",
    name: "Foreign Exchange / Repatriation Approval",
    description:
      "Central bank or monetary authority approval for converting local currency revenues to USD for debt service. Critical in countries with capital controls.",
    phaseRequired: "final_commitment",
    isLoiCritical: false,
    weight: 75,
    sortOrder: 6,
  },
] as const;

// ─── Corporate ───────────────────────────────────────────────

const corporate: readonly EximRequirementDef[] = [
  {
    id: "project_company_formation",
    category: "corporate",
    name: "Project Company / SPV Incorporation",
    description:
      "Legal formation of the Special Purpose Vehicle that will own and operate the project. Must be incorporated in the host country or an acceptable jurisdiction.",
    phaseRequired: "loi",
    isLoiCritical: false,
    weight: 100,
    sortOrder: 1,
  },
  {
    id: "shareholder_agreement",
    category: "corporate",
    name: "Shareholder / Joint Venture Agreement",
    description:
      "Agreement among equity investors on governance, capital calls, transfer restrictions, and dispute resolution.",
    phaseRequired: "final_commitment",
    isLoiCritical: false,
    weight: 100,
    sortOrder: 2,
  },
  {
    id: "kyc_aml_compliance",
    category: "corporate",
    name: "KYC / AML / Sanctions Screening",
    description:
      "Know Your Customer, Anti-Money Laundering, and OFAC/SDN sanctions screening on all project parties (sponsors, obligors, guarantors, key counterparties). EXIM conducts its own review but expects sponsors to perform and document initial due diligence including beneficial ownership disclosure.",
    phaseRequired: "loi",
    isLoiCritical: false,
    weight: 75,
    sortOrder: 3,
  },
  {
    id: "fcpa_compliance",
    category: "corporate",
    name: "FCPA / Anti-Corruption Due Diligence",
    description:
      "Foreign Corrupt Practices Act compliance review covering all agents, intermediaries, government officials, and third parties involved in the transaction. EXIM's policies explicitly require FCPA compliance certification. Typically conducted by US legal counsel.",
    phaseRequired: "loi",
    isLoiCritical: false,
    weight: 75,
    sortOrder: 4,
  },
  {
    id: "loi_application",
    category: "corporate",
    name: "EXIM LOI Application & Preliminary Information Memo",
    description:
      "The formal Letter of Interest application submitted to EXIM, including the Preliminary Information Memo (PIM). The PIM summarizes the project, sponsor, transaction structure, US-content breakdown, and financing request. EXIM's LOI guidelines specify the required content. This item tracks assembly and submission readiness of the application package itself.",
    phaseRequired: "loi",
    isLoiCritical: true,
    weight: 150,
    sortOrder: 5,
  },
  {
    id: "corporate_authorizations",
    category: "corporate",
    name: "Board Resolutions & Corporate Authorizations",
    description:
      "Board approvals from sponsor, project company, and key counterparties authorizing the transaction. Standard closing checklist item.",
    phaseRequired: "final_commitment",
    isLoiCritical: false,
    weight: 50,
    sortOrder: 6,
  },
  {
    id: "application_fee_loi_fee",
    category: "corporate",
    name: "LOI Application Fee Confirmation",
    description:
      "Confirm that the EXIM LOI application fee has been submitted or formally waived. EXIM charges a processing fee at the time of LOI application; failure to submit the fee delays the application intake process.",
    phaseRequired: "loi",
    isLoiCritical: false,
    weight: 50,
    sortOrder: 7,
  },
] as const;

// ─── Environmental & Social ─────────────────────────────────

const environmental_social: readonly EximRequirementDef[] = [
  {
    id: "esia",
    category: "environmental_social",
    name: "Environmental & Social Impact Assessment",
    description:
      "Comprehensive ESIA compliant with IFC Performance Standards (adopted by EXIM). Covers environmental baseline, social impacts, and mitigation measures. Preliminary ESIA must be substantially complete for LOI.",
    phaseRequired: "loi",
    isLoiCritical: true,
    weight: 200,
    sortOrder: 1,
  },
  {
    id: "esmp",
    category: "environmental_social",
    name: "Environmental & Social Management Plan",
    description:
      "Actionable mitigation plan arising from the ESIA. Describes how environmental and social risks will be managed during construction and operation.",
    phaseRequired: "final_commitment",
    isLoiCritical: false,
    weight: 100,
    sortOrder: 2,
  },
  {
    id: "stakeholder_engagement",
    category: "environmental_social",
    name: "Stakeholder Engagement Plan & Evidence",
    description:
      "Documentation of community consultation, public hearings, and grievance mechanisms per IFC PS1. Must include evidence of meaningful engagement (meeting records, feedback summaries).",
    phaseRequired: "final_commitment",
    isLoiCritical: false,
    weight: 75,
    sortOrder: 3,
  },
  {
    id: "resettlement_plan",
    category: "environmental_social",
    name: "Resettlement Action Plan",
    description:
      "Required if the project displaces people or affects livelihoods, per IFC PS5. Can be waived if no physical or economic displacement occurs.",
    phaseRequired: "final_commitment",
    isLoiCritical: false,
    weight: 75,
    sortOrder: 4,
  },
] as const;

// ─── Combined taxonomy ──────────────────────────────────────

/**
 * The complete EXIM requirements taxonomy. 48 items across 6 categories.
 * This array is the source of truth — the seed script and scoring logic
 * both read from here.
 *
 * Items with `applicableSectors` should be automatically marked not_applicable
 * for projects whose sector is not in the list. See scoring/index.ts.
 */
export const EXIM_REQUIREMENTS: readonly EximRequirementDef[] = [
  ...contracts,
  ...financial,
  ...studies,
  ...permits,
  ...corporate,
  ...environmental_social,
] as const;

/** Quick lookup by requirement ID slug. */
export const REQUIREMENTS_BY_ID: ReadonlyMap<string, EximRequirementDef> =
  new Map(EXIM_REQUIREMENTS.map((r) => [r.id, r]));

/** All requirement IDs that are hard blockers for LOI submission. */
export const LOI_CRITICAL_IDS: readonly string[] = EXIM_REQUIREMENTS.filter(
  (r) => r.isLoiCritical,
).map((r) => r.id);

/** Total weight pool — denominator for readiness score calculation. */
export const TOTAL_WEIGHT: number = EXIM_REQUIREMENTS.reduce(
  (sum, r) => sum + r.weight,
  0,
);
