/**
 * IFC Project Finance Requirements Taxonomy
 *
 * This is the single source of truth for every item on the IFC project
 * finance checklist. The IFC program tracks compliance with IFC Performance
 * Standards and standard project finance documentation requirements.
 *
 * Shape mirrors EximRequirementDef exactly so that shared scoring and UI
 * utilities can operate on either program without branching.
 */

import type { RequirementCategory, RequirementPhase } from "../exim/requirements";

export interface IfcRequirementDef {
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

// ─── Environmental & Social (IFC Performance Standards) ──────

const environmental_social: readonly IfcRequirementDef[] = [
  {
    id: "ps1_esia",
    category: "environmental_social",
    name: "Environmental & Social Assessment",
    description:
      "Comprehensive Environmental & Social Impact Assessment conducted in accordance with IFC Performance Standard 1. Covers environmental baseline, social impacts, cumulative effects, and mitigation hierarchy. Must be publicly disclosed and subject to meaningful stakeholder consultation.",
    phaseRequired: "loi",
    isLoiCritical: true,
    weight: 200,
    sortOrder: 1,
  },
  {
    id: "ps2_labor",
    category: "environmental_social",
    name: "Labor & Working Conditions Policy",
    description:
      "Human resources policy and management system addressing workers' rights per IFC Performance Standard 2. Must cover working conditions, terms of employment, non-discrimination, freedom of association, child labor, and forced labor prohibitions.",
    phaseRequired: "loi",
    isLoiCritical: false,
    weight: 100,
    sortOrder: 2,
  },
  {
    id: "ps3_resource",
    category: "environmental_social",
    name: "Resource Efficiency & Pollution Prevention Plan",
    description:
      "Plan demonstrating efficient use of resources and avoidance of pollution per IFC Performance Standard 3. Covers energy efficiency, greenhouse gas emissions, water use, waste management, and hazardous materials handling.",
    phaseRequired: "loi",
    isLoiCritical: false,
    weight: 100,
    sortOrder: 3,
  },
  {
    id: "ps4_community",
    category: "environmental_social",
    name: "Community Health, Safety & Security Assessment",
    description:
      "Assessment of project impacts on community health, safety, and security per IFC Performance Standard 4. Includes traffic management, disease prevention, infrastructure safety, and use of security personnel consistent with the Voluntary Principles on Security and Human Rights.",
    phaseRequired: "loi",
    isLoiCritical: true,
    weight: 150,
    sortOrder: 4,
  },
  {
    id: "ps5_land",
    category: "environmental_social",
    name: "Land Acquisition & Involuntary Resettlement Plan",
    description:
      "Resettlement Action Plan or Livelihood Restoration Plan per IFC Performance Standard 5. Required when the project involves physical or economic displacement. Must demonstrate consultation, fair compensation, and restoration of livelihoods.",
    phaseRequired: "final_commitment",
    isLoiCritical: false,
    weight: 150,
    sortOrder: 5,
    applicableSectors: ["power", "mining", "water"],
  },
  {
    id: "ps6_biodiversity",
    category: "environmental_social",
    name: "Biodiversity & Living Natural Resources Assessment",
    description:
      "Assessment of project impacts on biodiversity and ecosystem services per IFC Performance Standard 6. Must identify critical habitats, natural habitats, and legally protected areas. Mitigation hierarchy must be applied.",
    phaseRequired: "final_commitment",
    isLoiCritical: false,
    weight: 100,
    sortOrder: 6,
  },
  {
    id: "ps8_cultural",
    category: "environmental_social",
    name: "Cultural Heritage Assessment",
    description:
      "Assessment and protection plan for tangible and intangible cultural heritage per IFC Performance Standard 8. Includes chance-find procedures, documentation of cultural heritage resources, and consultation with affected communities and relevant authorities.",
    phaseRequired: "final_commitment",
    isLoiCritical: false,
    weight: 75,
    sortOrder: 7,
  },
] as const;

// ─── Contracts ────────────────────────────────────────────────

const contracts: readonly IfcRequirementDef[] = [
  {
    id: "ifc_epc_contract",
    category: "contracts",
    name: "EPC Contract (IFC-compliant)",
    description:
      "Engineering, Procurement & Construction contract meeting IFC requirements. Must be on fixed-price, lump-sum, date-certain terms with a creditworthy contractor. IFC reviews for adequate performance security and liquidated damages provisions.",
    phaseRequired: "loi",
    isLoiCritical: true,
    weight: 200,
    sortOrder: 1,
  },
  {
    id: "ifc_offtake",
    category: "contracts",
    name: "Offtake Agreement",
    description:
      "Binding long-term offtake or power purchase agreement with a creditworthy counterparty. Must generate revenue streams sufficient to service project debt. IFC requires review of payment obligations, termination provisions, and change-in-law protections.",
    phaseRequired: "loi",
    isLoiCritical: true,
    weight: 200,
    sortOrder: 2,
    applicableSectors: ["power", "mining", "water"],
  },
  {
    id: "ifc_concession",
    category: "contracts",
    name: "Concession or Implementation Agreement",
    description:
      "Agreement with the host government granting the project company rights to develop and operate the project. Must address fiscal terms, dispute resolution, step-in rights, and expropriation protections consistent with IFC investment protection standards.",
    phaseRequired: "loi",
    isLoiCritical: false,
    weight: 150,
    sortOrder: 3,
  },
  {
    id: "ifc_om_contract",
    category: "contracts",
    name: "O&M Contract",
    description:
      "Operations & Maintenance agreement for post-construction facility management by a qualified operator. IFC expects long-term O&M contracts with performance incentives and adequate performance security.",
    phaseRequired: "final_commitment",
    isLoiCritical: false,
    weight: 100,
    sortOrder: 4,
  },
] as const;

// ─── Financial ────────────────────────────────────────────────

const financial: readonly IfcRequirementDef[] = [
  {
    id: "ifc_financial_model",
    category: "financial",
    name: "Integrated Financial Model",
    description:
      "Fully integrated financial projection covering construction costs, revenues, operating expenses, debt service, and equity returns. IFC requires the model to demonstrate a minimum DSCR of 1.2x–1.3x under base and stress scenarios. IFC's financial team builds an independent model from this.",
    phaseRequired: "loi",
    isLoiCritical: true,
    weight: 200,
    sortOrder: 1,
  },
  {
    id: "ifc_debt_term_sheet",
    category: "financial",
    name: "Debt Term Sheet",
    description:
      "Indicative or binding term sheet from IFC and/or co-lenders setting out loan amount, tenor, pricing, security package, and key covenants. IFC's A/B loan structure (where IFC holds the A loan and syndicates B loans to commercial banks) should be reflected.",
    phaseRequired: "loi",
    isLoiCritical: false,
    weight: 150,
    sortOrder: 2,
  },
  {
    id: "ifc_equity_commitment",
    category: "financial",
    name: "Equity Commitment Letters",
    description:
      "Binding equity commitment letters from sponsors and other equity investors. IFC requires minimum sponsor equity of 20–35% of total project cost, with letters evidencing committed capital and equity injection schedule.",
    phaseRequired: "loi",
    isLoiCritical: false,
    weight: 150,
    sortOrder: 3,
  },
  {
    id: "ifc_insurance",
    category: "financial",
    name: "Insurance Programme Summary",
    description:
      "Summary of proposed insurance programme covering construction all-risk, third-party liability, business interruption, and political risk insurance. Full placement required at financial close; broker engagement letter acceptable at LOI stage.",
    phaseRequired: "final_commitment",
    isLoiCritical: false,
    weight: 100,
    sortOrder: 4,
  },
] as const;

// ─── Permits ─────────────────────────────────────────────────

const permits: readonly IfcRequirementDef[] = [
  {
    id: "ifc_env_permit",
    category: "permits",
    name: "Environmental Permit / Approval",
    description:
      "Environmental permit or approval issued by the host country's environmental authority based on the IFC-compliant ESIA. IFC requires evidence that the permit is in place or that a clear path to obtaining it exists before Financial Close.",
    phaseRequired: "loi",
    isLoiCritical: true,
    weight: 150,
    sortOrder: 1,
  },
  {
    id: "ifc_land_title",
    category: "permits",
    name: "Land Title or Long-term Lease",
    description:
      "Evidence that the project company holds clear title to the project site or has a long-term lease on terms sufficient for the financing tenor. Title searches and any encumbrance releases must be documented.",
    phaseRequired: "loi",
    isLoiCritical: false,
    weight: 150,
    sortOrder: 2,
  },
  {
    id: "ifc_construction_permit",
    category: "permits",
    name: "Construction Permit",
    description:
      "Building permits and zoning clearances required to commence construction. IFC requires these to be in hand or at an advanced stage before Financial Close to reduce construction commencement risk.",
    phaseRequired: "final_commitment",
    isLoiCritical: false,
    weight: 100,
    sortOrder: 3,
  },
] as const;

// ─── Corporate ────────────────────────────────────────────────

const corporate: readonly IfcRequirementDef[] = [
  {
    id: "ifc_kyc",
    category: "corporate",
    name: "KYC / AML Compliance Package",
    description:
      "Know Your Customer and Anti-Money Laundering compliance package covering all project sponsors, equity investors, key counterparties, and beneficial owners. IFC conducts its own integrity due diligence but requires sponsors to assemble and certify the initial compliance package.",
    phaseRequired: "loi",
    isLoiCritical: true,
    weight: 100,
    sortOrder: 1,
  },
  {
    id: "ifc_audited_accounts",
    category: "corporate",
    name: "Audited Financial Statements (3 years)",
    description:
      "Three years of audited financial statements for the project sponsor(s) prepared under IFRS or US GAAP. IFC requires audited accounts to assess sponsor financial capacity and creditworthiness for equity commitment and completion support obligations.",
    phaseRequired: "loi",
    isLoiCritical: false,
    weight: 100,
    sortOrder: 2,
  },
] as const;

// ─── Combined taxonomy ─────────────────────────────────────

/**
 * The complete IFC requirements taxonomy. 20 items across 5 categories.
 * This array is the source of truth for IFC readiness scoring and UI display.
 *
 * Items with `applicableSectors` should be automatically marked not_applicable
 * for projects whose sector is not in the list.
 */
export const IFC_REQUIREMENTS: readonly IfcRequirementDef[] = [
  ...environmental_social,
  ...contracts,
  ...financial,
  ...permits,
  ...corporate,
] as const;

/** All IFC requirement IDs that are hard blockers for LOI submission. */
export const IFC_LOI_CRITICAL_IDS: readonly string[] = IFC_REQUIREMENTS.filter(
  (r) => r.isLoiCritical,
).map((r) => r.id);

/** Total weight pool — denominator for IFC readiness score calculation. */
export const IFC_TOTAL_WEIGHT: number = IFC_REQUIREMENTS.reduce(
  (sum, r) => sum + r.weight,
  0,
);
