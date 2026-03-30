/**
 * IFC Project Finance Requirements Taxonomy
 *
 * This is the single source of truth for every item on the IFC project
 * finance checklist. The IFC program tracks compliance with IFC Performance
 * Standards and standard project finance documentation requirements.
 *
 * IFC (International Finance Corporation) is the private-sector arm of
 * the World Bank Group. This taxonomy is also broadly applicable to AfDB,
 * DFC, EBRD, ADB, FMO, and similar DFIs — the DFI taxonomy in
 * src/lib/dfi/requirements.ts is the generic version; this file retains
 * the original IFC-specific naming for backwards compatibility.
 *
 * Phases:
 *   board_approval  — full appraisal, board/investment committee approval
 *   financial_close — all CPs satisfied, signing, first disbursement
 *
 * Shape is compatible with RequirementDef from src/lib/requirements/types.ts.
 * isLoiCritical is retained for backwards compat; maps to isPrimaryGate semantics.
 */

import type { RequirementCategory } from "../exim/requirements";

export interface IfcRequirementDef {
  readonly id: string;
  readonly category: RequirementCategory;
  readonly name: string;
  readonly description: string;
  readonly phaseRequired: "board_approval" | "financial_close";
  readonly isLoiCritical: boolean; // true = required for board approval (primary gate)
  readonly weight: number;
  readonly sortOrder: number;
  readonly phaseLabel: string;
  readonly defaultOwner: string;
  readonly applicableSectors?: readonly string[];
}

// ─── Environmental & Social (IFC Performance Standards 1–8) ──────────────────

const environmental_social: readonly IfcRequirementDef[] = [
  {
    id: "ps1_esia",
    category: "environmental_social",
    name: "Environmental & Social Impact Assessment (ESIA) — IFC PS1",
    description:
      "Comprehensive ESIA conducted in accordance with IFC Performance Standard 1. Must cover environmental baseline, social impacts, cumulative effects, and full mitigation hierarchy. Category A projects require 120-day public disclosure before board approval. Significantly more rigorous than EXIM's environmental review.",
    phaseRequired: "board_approval",
    isLoiCritical: true,
    weight: 200,
    sortOrder: 1,
    phaseLabel: "Board Approval",
    defaultOwner: "Third-party consultant",
  },
  {
    id: "ps1_esms",
    category: "environmental_social",
    name: "Environmental & Social Management System (ESMS) — IFC PS1",
    description:
      "IFC PS1 requires the sponsor organization (not just the project) to have an E&S management system with clear policies, responsibilities, competencies, monitoring mechanisms, and feedback loops. Organizational-level requirement — no EXIM equivalent.",
    phaseRequired: "board_approval",
    isLoiCritical: false,
    weight: 125,
    sortOrder: 2,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor",
  },
  {
    id: "ps1_esmp",
    category: "environmental_social",
    name: "Environmental & Social Management Plan (ESMP)",
    description:
      "Actionable mitigation plan arising from the ESIA with binding commitments, KPIs, budget allocation, and monitoring schedule. DFIs require a formal ESMP — not the summary mitigation table that EXIM accepts.",
    phaseRequired: "board_approval",
    isLoiCritical: false,
    weight: 150,
    sortOrder: 3,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor + Consultant",
  },
  {
    id: "ps1_sep",
    category: "environmental_social",
    name: "Stakeholder Engagement Plan (SEP) — IFC PS1",
    description:
      "Formal SEP documenting how affected communities and stakeholders will be identified, consulted, and kept informed throughout the project lifecycle. Must be publicly disclosed before board approval. Mandatory under IFC PS1 and AfDB OS1 — EXIM has no standalone equivalent.",
    phaseRequired: "board_approval",
    isLoiCritical: true,
    weight: 125,
    sortOrder: 4,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor + Consultant",
  },
  {
    id: "ps1_grm",
    category: "environmental_social",
    name: "Grievance Redress Mechanism (GRM) — IFC PS1",
    description:
      "Project-level grievance mechanism for affected communities to raise concerns and receive timely responses. Must be operational before board approval — not a post-close deliverable. No EXIM equivalent.",
    phaseRequired: "board_approval",
    isLoiCritical: true,
    weight: 100,
    sortOrder: 5,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor",
  },
  {
    id: "ps1_monitoring",
    category: "environmental_social",
    name: "Annual E&S Monitoring & Reporting Framework",
    description:
      "Agreed framework for annual E&S monitoring reports submitted to IFC post-close. Must specify indicators, frequency, format, and independent monitoring arrangements. Becomes a financial covenant.",
    phaseRequired: "financial_close",
    isLoiCritical: false,
    weight: 75,
    sortOrder: 6,
    phaseLabel: "Financial Close",
    defaultOwner: "Sponsor",
  },
  {
    id: "ps2_labor",
    category: "environmental_social",
    name: "Labor & Working Conditions Policy — IFC PS2",
    description:
      "Human resources policy and management system addressing workers' rights per IFC PS2. Must cover working conditions, non-discrimination, freedom of association, child labor prohibitions, forced labor prohibitions, and supply chain labor standards.",
    phaseRequired: "board_approval",
    isLoiCritical: false,
    weight: 100,
    sortOrder: 7,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor",
  },
  {
    id: "ps3_pollution",
    category: "environmental_social",
    name: "Resource Efficiency & Pollution Prevention Plan — IFC PS3",
    description:
      "Plan demonstrating efficient use of resources and avoidance of pollution per IFC PS3. Covers energy efficiency, GHG emissions, water use, waste management, and hazardous materials handling.",
    phaseRequired: "board_approval",
    isLoiCritical: false,
    weight: 100,
    sortOrder: 8,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor + Consultant",
  },
  {
    id: "ps4_community",
    category: "environmental_social",
    name: "Community Health, Safety & Security Plan — IFC PS4",
    description:
      "Assessment and management plan for project impacts on community health, safety, and security per IFC PS4. Includes traffic management, disease prevention, infrastructure safety, and use of security personnel consistent with the Voluntary Principles on Security and Human Rights.",
    phaseRequired: "board_approval",
    isLoiCritical: true,
    weight: 150,
    sortOrder: 9,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor + Consultant",
  },
  {
    id: "ps5_land",
    category: "environmental_social",
    name: "Resettlement Action Plan / Livelihood Restoration Plan — IFC PS5",
    description:
      "Required when the project involves physical or economic displacement of people per IFC PS5. Must include census of affected persons, entitlement framework, compensation schedule, livelihood restoration measures, and independent monitoring. Far more rigorous than EXIM's approach, which defers to host-country law.",
    phaseRequired: "board_approval",
    isLoiCritical: false,
    weight: 150,
    sortOrder: 10,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor + Consultant",
    applicableSectors: ["power", "mining", "water", "transport"],
  },
  {
    id: "ps6_biodiversity",
    category: "environmental_social",
    name: "Biodiversity Assessment & Management Plan — IFC PS6",
    description:
      "Assessment of project impacts on biodiversity and ecosystem services per IFC PS6. Must identify critical habitats and natural habitats. Mitigation hierarchy (avoid, minimize, restore, offset) must be applied. If critical habitat is affected, strict no-net-loss requirements apply.",
    phaseRequired: "board_approval",
    isLoiCritical: false,
    weight: 100,
    sortOrder: 11,
    phaseLabel: "Board Approval",
    defaultOwner: "Third-party consultant",
  },
  {
    id: "ps7_indigenous",
    category: "environmental_social",
    name: "Indigenous Peoples Plan — IFC PS7",
    description:
      "Plan addressing impacts on indigenous peoples per IFC PS7. If the project affects indigenous peoples' lands, resources, or cultural heritage, Free Prior and Informed Consent (FPIC) may be required. No EXIM equivalent. One of the most significant DFI-specific requirements.",
    phaseRequired: "board_approval",
    isLoiCritical: false,
    weight: 125,
    sortOrder: 12,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor + Consultant",
  },
  {
    id: "ps8_cultural",
    category: "environmental_social",
    name: "Cultural Heritage Assessment — IFC PS8",
    description:
      "Assessment and protection plan for tangible and intangible cultural heritage per IFC PS8. Includes chance-find procedures, documentation of cultural heritage resources, and consultation with affected communities and relevant authorities.",
    phaseRequired: "board_approval",
    isLoiCritical: false,
    weight: 75,
    sortOrder: 13,
    phaseLabel: "Board Approval",
    defaultOwner: "Third-party consultant",
  },
  {
    id: "ifc_climate_risk",
    category: "environmental_social",
    name: "Climate Risk & Paris Alignment Assessment",
    description:
      "Physical and transition climate risk assessment plus Paris Agreement alignment screening. IFC now requires this for all investments. TCFD-aligned analysis demonstrating resilience to physical climate risks and consistency with a below-2°C pathway.",
    phaseRequired: "board_approval",
    isLoiCritical: false,
    weight: 100,
    sortOrder: 14,
    phaseLabel: "Board Approval",
    defaultOwner: "Third-party consultant",
  },
  {
    id: "ifc_ghg",
    category: "environmental_social",
    name: "Greenhouse Gas (GHG) Quantification",
    description:
      "Quantification of project GHG emissions (Scope 1, 2, and material Scope 3) per IFC guidance. For Category A projects, must assess incremental GHG impact vs. no-project baseline.",
    phaseRequired: "board_approval",
    isLoiCritical: false,
    weight: 75,
    sortOrder: 15,
    phaseLabel: "Board Approval",
    defaultOwner: "Third-party consultant",
  },
];

// ─── Contracts & Commercial Agreements ───────────────────────────────────────

const contracts: readonly IfcRequirementDef[] = [
  {
    id: "ifc_epc_contract",
    category: "contracts",
    name: "EPC Contract (IFC-compliant)",
    description:
      "Fixed-price, lump-sum, date-certain EPC contract with a creditworthy contractor. IFC reviews for adequate LD provisions and performance security. No US content requirement — procurement follows IFC's open competition guidelines.",
    phaseRequired: "board_approval",
    isLoiCritical: true,
    weight: 200,
    sortOrder: 1,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor / EPC Contractor",
  },
  {
    id: "ifc_offtake",
    category: "contracts",
    name: "Offtake Agreement / PPA",
    description:
      "Binding long-term offtake or power purchase agreement with a creditworthy counterparty. IFC requires review of payment obligations, termination provisions, and change-in-law protections.",
    phaseRequired: "board_approval",
    isLoiCritical: true,
    weight: 200,
    sortOrder: 2,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor / Off-taker",
    applicableSectors: ["power", "mining", "water"],
  },
  {
    id: "ifc_concession",
    category: "contracts",
    name: "Concession / Implementation Agreement",
    description:
      "Agreement with the host government granting project development and operation rights. Must address fiscal stability, FX convertibility, dispute resolution, step-in rights, and expropriation protections consistent with IFC standards.",
    phaseRequired: "board_approval",
    isLoiCritical: false,
    weight: 150,
    sortOrder: 3,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor / Host Government",
  },
  {
    id: "ifc_govt_support",
    category: "contracts",
    name: "Government Support / Implementation Agreement",
    description:
      "Formal government undertakings on tax stability, FX convertibility, and dispute resolution. IFC often requires explicit sovereign undertakings beyond the concession. Can be standalone or incorporated into the concession.",
    phaseRequired: "board_approval",
    isLoiCritical: true,
    weight: 150,
    sortOrder: 4,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor / Host Government",
  },
  {
    id: "ifc_om_contract",
    category: "contracts",
    name: "O&M Agreement",
    description:
      "Long-term O&M agreement with a qualified operator. IFC expects performance incentives and adequate performance security covering the full financing tenor.",
    phaseRequired: "financial_close",
    isLoiCritical: false,
    weight: 100,
    sortOrder: 5,
    phaseLabel: "Financial Close",
    defaultOwner: "Sponsor / O&M Contractor",
  },
  {
    id: "ifc_fuel_supply",
    category: "contracts",
    name: "Fuel / Feedstock Supply Agreement",
    description:
      "Long-term supply contract with take-or-pay obligations, price indexation, and supply security provisions. Substantially final at board approval.",
    phaseRequired: "board_approval",
    isLoiCritical: false,
    weight: 100,
    sortOrder: 6,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor / Supplier",
    applicableSectors: ["power", "mining"],
  },
  {
    id: "ifc_sponsor_support",
    category: "contracts",
    name: "Sponsor Support / Completion Guarantee",
    description:
      "Sponsor equity contribution agreement and completion guarantee. IFC may require stronger completion support than EXIM given no sovereign ECA backing.",
    phaseRequired: "financial_close",
    isLoiCritical: false,
    weight: 100,
    sortOrder: 7,
    phaseLabel: "Financial Close",
    defaultOwner: "Sponsor",
  },
  {
    id: "ifc_sha",
    category: "contracts",
    name: "Shareholders' Agreement",
    description:
      "Agreement among equity investors on governance, capital calls, transfer restrictions, and exit rights. Substantially final at board approval; executed at close.",
    phaseRequired: "board_approval",
    isLoiCritical: false,
    weight: 100,
    sortOrder: 8,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor(s)",
  },
  {
    id: "ifc_interconnection",
    category: "contracts",
    name: "Grid / Interconnection Agreement",
    description:
      "Connection to national grid including capacity allocation, curtailment risk, and upgrade obligations.",
    phaseRequired: "financial_close",
    isLoiCritical: false,
    weight: 75,
    sortOrder: 9,
    phaseLabel: "Financial Close",
    defaultOwner: "Sponsor / Grid Operator",
    applicableSectors: ["power"],
  },
];

// ─── Financial ────────────────────────────────────────────────────────────────

const financial: readonly IfcRequirementDef[] = [
  {
    id: "ifc_financial_model",
    category: "financial",
    name: "Integrated Financial Model",
    description:
      "Fully integrated projection covering construction drawdowns, revenues, operating expenses, debt service, reserve accounts, and equity returns. Must demonstrate minimum DSCR of 1.2x–1.3x under base and stress scenarios. IFC builds an independent parallel model.",
    phaseRequired: "board_approval",
    isLoiCritical: true,
    weight: 200,
    sortOrder: 1,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor / Financial advisor",
  },
  {
    id: "ifc_model_audit",
    category: "financial",
    name: "Independent Financial Model Audit",
    description:
      "Third-party audit verifying model integrity, formula accuracy, and assumption consistency. Required for all but the smallest IFC transactions.",
    phaseRequired: "board_approval",
    isLoiCritical: false,
    weight: 100,
    sortOrder: 2,
    phaseLabel: "Board Approval",
    defaultOwner: "Third-party model auditor",
  },
  {
    id: "ifc_debt_term_sheet",
    category: "financial",
    name: "Debt Term Sheet (IFC A/B Loan Structure)",
    description:
      "Indicative or binding term sheet from IFC setting out A loan amount (IFC's own account), B loan syndication to commercial banks, tenor, pricing, security package, and key covenants.",
    phaseRequired: "board_approval",
    isLoiCritical: false,
    weight: 150,
    sortOrder: 3,
    phaseLabel: "Board Approval",
    defaultOwner: "IFC / Lender",
  },
  {
    id: "ifc_equity_commitment",
    category: "financial",
    name: "Equity Commitment Letters",
    description:
      "Binding equity commitment letters confirming equity amount and injection schedule. IFC requires minimum sponsor equity of 20–35% of total project cost.",
    phaseRequired: "board_approval",
    isLoiCritical: false,
    weight: 150,
    sortOrder: 4,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor(s)",
  },
  {
    id: "ifc_sources_uses",
    category: "financial",
    name: "Sources & Uses / Financing Plan",
    description:
      "Detailed sources and uses reconciling equity, IFC tranche, co-lender tranches, and financing costs against total project cost.",
    phaseRequired: "board_approval",
    isLoiCritical: true,
    weight: 125,
    sortOrder: 5,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor / Financial advisor",
  },
  {
    id: "ifc_sponsor_financials",
    category: "financial",
    name: "Sponsor Audited Financial Statements (3 years)",
    description:
      "Three years of audited IFRS or US GAAP financial statements for project sponsor(s). Assesses financial capacity for equity commitment and completion support.",
    phaseRequired: "board_approval",
    isLoiCritical: false,
    weight: 100,
    sortOrder: 6,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor",
  },
  {
    id: "ifc_err",
    category: "financial",
    name: "Economic Rate of Return (ERR) Analysis",
    description:
      "Economic analysis quantifying broader economic benefits (employment, tax revenues, infrastructure access) to justify IFC involvement on development impact grounds. No EXIM equivalent.",
    phaseRequired: "board_approval",
    isLoiCritical: false,
    weight: 100,
    sortOrder: 7,
    phaseLabel: "Board Approval",
    defaultOwner: "IFC (internally) or third-party economist",
  },
  {
    id: "ifc_development_impact",
    category: "financial",
    name: "Development Impact Framework / DOTS Metrics",
    description:
      "Agreed metrics for measuring development impact per IFC's Development Outcome Tracking System (DOTS). Sponsor provides data inputs; outcomes tracked post-close through annual reporting.",
    phaseRequired: "board_approval",
    isLoiCritical: false,
    weight: 100,
    sortOrder: 8,
    phaseLabel: "Board Approval",
    defaultOwner: "IFC + Sponsor",
  },
  {
    id: "ifc_insurance",
    category: "financial",
    name: "Insurance Programme Summary",
    description:
      "Proposed insurance programme covering construction all-risk, TPL, business interruption, and PRI. Full placement required at financial close; broker engagement letter acceptable at board approval stage.",
    phaseRequired: "financial_close",
    isLoiCritical: false,
    weight: 100,
    sortOrder: 9,
    phaseLabel: "Financial Close",
    defaultOwner: "Insurance broker / Sponsor",
  },
  {
    id: "ifc_tax_memo",
    category: "financial",
    name: "Tax Structure Memorandum",
    description:
      "Tax analysis covering withholding taxes, VAT, transfer pricing, and applicable treaties. IFC post-2022 scrutinizes aggressive tax structures against OECD BEPS principles.",
    phaseRequired: "financial_close",
    isLoiCritical: false,
    weight: 75,
    sortOrder: 10,
    phaseLabel: "Financial Close",
    defaultOwner: "Tax advisor",
  },
  {
    id: "ifc_ica",
    category: "financial",
    name: "Inter-Creditor Agreement / Common Terms Agreement",
    description:
      "Agreement governing rights and remedies of all project lenders (IFC, B-loan commercial banks). Addresses waterfall, voting thresholds, step-in rights, and enforcement.",
    phaseRequired: "financial_close",
    isLoiCritical: false,
    weight: 75,
    sortOrder: 11,
    phaseLabel: "Financial Close",
    defaultOwner: "Lenders' counsel",
  },
  {
    id: "ifc_security_package",
    category: "financial",
    name: "Security Package (Share Pledge, Charge, Assignments)",
    description:
      "Full security package: share pledge, charge over project assets, assignment of project contracts and insurances, accounts agreement.",
    phaseRequired: "financial_close",
    isLoiCritical: false,
    weight: 100,
    sortOrder: 12,
    phaseLabel: "Financial Close",
    defaultOwner: "Lenders' counsel / Sponsor",
  },
];

// ─── Technical Studies ────────────────────────────────────────────────────────

const studies: readonly IfcRequirementDef[] = [
  {
    id: "ifc_feasibility",
    category: "studies",
    name: "Feasibility Study",
    description:
      "Technical and economic feasibility assessment reviewed by the Lender's Technical Advisor.",
    phaseRequired: "board_approval",
    isLoiCritical: false,
    weight: 100,
    sortOrder: 1,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor / Consultant",
  },
  {
    id: "ifc_lta",
    category: "studies",
    name: "Lender's Technical Advisor (LTA) Report",
    description:
      "Independent technical DD by a lender-appointed engineer covering design adequacy, construction risk, EPC contractor assessment, technology track record, and O&M plan review. One of the most critical third-party reports in any IFC financing.",
    phaseRequired: "board_approval",
    isLoiCritical: true,
    weight: 200,
    sortOrder: 2,
    phaseLabel: "Board Approval",
    defaultOwner: "Third-party engineer (IFC-appointed)",
  },
  {
    id: "ifc_resource",
    category: "studies",
    name: "Independent Resource Assessment (P50/P90)",
    description:
      "Independent energy yield assessment for renewable/hydro/geothermal projects providing P50 and P90 production estimates. IFC sizes debt on P90.",
    phaseRequired: "board_approval",
    isLoiCritical: false,
    weight: 150,
    sortOrder: 3,
    phaseLabel: "Board Approval",
    defaultOwner: "Third-party resource assessor",
    applicableSectors: ["power"],
  },
  {
    id: "ifc_market_study",
    category: "studies",
    name: "Market / Demand Analysis",
    description:
      "Independent demand analysis for the project's output. May be waived with a binding long-term offtake from a creditworthy counterparty.",
    phaseRequired: "board_approval",
    isLoiCritical: false,
    weight: 100,
    sortOrder: 4,
    phaseLabel: "Board Approval",
    defaultOwner: "Third-party consultant",
  },
  {
    id: "ifc_geotech",
    category: "studies",
    name: "Geotechnical & Site Investigation Report",
    description:
      "Site investigation confirming soil conditions and foundation requirements. Input to the EPC design and LTA review.",
    phaseRequired: "board_approval",
    isLoiCritical: false,
    weight: 75,
    sortOrder: 5,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor / EPC Contractor",
  },
  {
    id: "ifc_legal_opinion",
    category: "studies",
    name: "Legal Opinions (Local + International)",
    description:
      "Opinions from local counsel and international counsel on enforceability, security package validity, and cross-border structuring. IFC deals typically require opinions from multiple jurisdictions.",
    phaseRequired: "financial_close",
    isLoiCritical: false,
    weight: 100,
    sortOrder: 6,
    phaseLabel: "Financial Close",
    defaultOwner: "Legal counsel (sponsor + IFC)",
  },
];

// ─── Permits & Approvals ──────────────────────────────────────────────────────

const permits: readonly IfcRequirementDef[] = [
  {
    id: "ifc_env_permit",
    category: "permits",
    name: "Environmental Permit / Approval (Host Country)",
    description:
      "Environmental permit from the host country's environmental authority based on the IFC-compliant ESIA. Must be in place or at advanced stage before board approval; unconditional before first drawdown.",
    phaseRequired: "board_approval",
    isLoiCritical: true,
    weight: 150,
    sortOrder: 1,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor / Host Government",
  },
  {
    id: "ifc_land_title",
    category: "permits",
    name: "Land Title or Long-term Lease",
    description:
      "Evidence that the project company holds clear title to the project site or a long-term lease on terms sufficient for the financing tenor. Title searches and encumbrance releases must be documented.",
    phaseRequired: "board_approval",
    isLoiCritical: false,
    weight: 150,
    sortOrder: 2,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor",
  },
  {
    id: "ifc_construction_permit",
    category: "permits",
    name: "Construction Permit",
    description:
      "Building permits and zoning clearances. IFC requires these to be in hand or at advanced stage before financial close.",
    phaseRequired: "financial_close",
    isLoiCritical: false,
    weight: 100,
    sortOrder: 3,
    phaseLabel: "Financial Close",
    defaultOwner: "Sponsor / Host Government",
  },
  {
    id: "ifc_operating_license",
    category: "permits",
    name: "Operating / Generation License",
    description:
      "License to operate the completed facility. Regulatory pathway must be clear at board approval; license issued before COD.",
    phaseRequired: "financial_close",
    isLoiCritical: false,
    weight: 75,
    sortOrder: 4,
    phaseLabel: "Financial Close",
    defaultOwner: "Sponsor / Regulator",
  },
  {
    id: "ifc_fdi_approval",
    category: "permits",
    name: "Foreign Investment Registration / Approval",
    description:
      "Host-country FDI registration where required. Must be secured before financial close.",
    phaseRequired: "board_approval",
    isLoiCritical: false,
    weight: 75,
    sortOrder: 5,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor / Host Government",
  },
  {
    id: "ifc_central_bank",
    category: "permits",
    name: "Central Bank / Exchange Control Approval",
    description:
      "Central bank approval for currency conversion and transfer of debt service. Critical-path in markets with capital controls.",
    phaseRequired: "financial_close",
    isLoiCritical: false,
    weight: 75,
    sortOrder: 6,
    phaseLabel: "Financial Close",
    defaultOwner: "Sponsor / Central Bank",
  },
  {
    id: "ifc_sovereign_noobj",
    category: "permits",
    name: "Host Government Consent to IFC Financing",
    description:
      "Formal no-objection or consent from the host government Ministry of Finance. Required when sovereign provides guarantees or the project needs government buy-in for the IFC relationship.",
    phaseRequired: "board_approval",
    isLoiCritical: false,
    weight: 100,
    sortOrder: 7,
    phaseLabel: "Board Approval",
    defaultOwner: "Host Government / Ministry of Finance",
  },
];

// ─── Corporate & Legal ────────────────────────────────────────────────────────

const corporate: readonly IfcRequirementDef[] = [
  {
    id: "ifc_spv",
    category: "corporate",
    name: "SPV Incorporation Documents",
    description:
      "Certificate of incorporation, memorandum and articles, share register, and registered office for the project SPV.",
    phaseRequired: "board_approval",
    isLoiCritical: false,
    weight: 75,
    sortOrder: 1,
    phaseLabel: "Board Approval",
    defaultOwner: "Legal counsel",
  },
  {
    id: "ifc_kyc",
    category: "corporate",
    name: "KYC / AML / Integrity Due Diligence",
    description:
      "Comprehensive KYC, AML, and integrity DD on all sponsors, equity investors, UBOs, and key counterparties. IFC conducts extensive integrity due diligence including PEP screening, sanctions checks, and anti-corruption compliance. More rigorous than EXIM's OFAC/debarment check.",
    phaseRequired: "board_approval",
    isLoiCritical: true,
    weight: 100,
    sortOrder: 2,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor / IFC compliance",
  },
  {
    id: "ifc_debarment",
    category: "corporate",
    name: "Debarment / Sanctions Clearance",
    description:
      "Cross-check against IFC's own debarment list, World Bank Group debarment list, and applicable UN, EU, and US sanctions lists.",
    phaseRequired: "board_approval",
    isLoiCritical: true,
    weight: 75,
    sortOrder: 3,
    phaseLabel: "Board Approval",
    defaultOwner: "IFC",
  },
  {
    id: "ifc_audited_accounts",
    category: "corporate",
    name: "Audited Financial Statements — Sponsor (3 years)",
    description:
      "Three years of audited IFRS or US GAAP financial statements for the project sponsor(s). Assesses financial capacity for equity commitment and completion support.",
    phaseRequired: "board_approval",
    isLoiCritical: false,
    weight: 100,
    sortOrder: 4,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor",
  },
  {
    id: "ifc_local_content",
    category: "corporate",
    name: "Local Content / Procurement Plan",
    description:
      "Procurement plan addressing local content targets. IFC encourages local procurement but does not mandate a specific percentage. Replaces EXIM's >51% US content requirement.",
    phaseRequired: "board_approval",
    isLoiCritical: false,
    weight: 75,
    sortOrder: 5,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor",
  },
  {
    id: "ifc_board_resolutions",
    category: "corporate",
    name: "Board Resolutions & Corporate Authorizations",
    description:
      "Board approvals from each sponsor entity, the SPV, and each guarantor authorizing the transaction and execution of financing documents.",
    phaseRequired: "financial_close",
    isLoiCritical: false,
    weight: 50,
    sortOrder: 6,
    phaseLabel: "Financial Close",
    defaultOwner: "Legal counsel",
  },
];

// ─── Combined taxonomy ────────────────────────────────────────────────────────

/**
 * The complete IFC requirements taxonomy.
 * ~60 items across 6 categories.
 */
export const IFC_REQUIREMENTS: readonly IfcRequirementDef[] = [
  ...environmental_social,
  ...contracts,
  ...financial,
  ...studies,
  ...permits,
  ...corporate,
] as const;

/** Lookup by requirement ID. */
export const IFC_REQUIREMENTS_BY_ID: ReadonlyMap<string, IfcRequirementDef> =
  new Map(IFC_REQUIREMENTS.map((r) => [r.id, r]));

/** All IFC requirement IDs that are hard gates for board approval. */
export const IFC_LOI_CRITICAL_IDS: readonly string[] = IFC_REQUIREMENTS.filter(
  (r) => r.isLoiCritical,
).map((r) => r.id);

/** Total weight pool — denominator for IFC readiness score calculation. */
export const IFC_TOTAL_WEIGHT: number = IFC_REQUIREMENTS.reduce(
  (sum, r) => sum + r.weight,
  0,
);
