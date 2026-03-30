/**
 * DFI Project Finance Requirements Taxonomy
 *
 * Covers multilateral and bilateral development finance institutions:
 * IFC, AfDB, DFC, EBRD, ADB, FMO, DEG, Proparco, and similar.
 *
 * Structured around three phases:
 *   concept       — early development through DFI concept note acceptance
 *   board_approval — full appraisal, board/investment committee approval
 *   financial_close — all CPs satisfied, signing, first disbursement
 *
 * Phase labels map to the DFI deal StageStepper.
 *
 * Shape mirrors RequirementDef from src/lib/requirements/types.ts.
 * isPrimaryGate = true means the item is required for board/IC approval.
 */

import type { RequirementDef } from "../requirements/types";

// ─── Contracts & Commercial Agreements ───────────────────────────────────────

const contracts: readonly RequirementDef[] = [
  {
    id: "dfi_concession_agreement",
    category: "contracts",
    name: "Concession / License Agreement",
    description:
      "Agreement between the project company and host government granting the right to develop and operate the project. Must address tenure, fiscal stability, FX convertibility, dispute resolution, and expropriation protections. DFIs always require this for infrastructure in sovereign territories — unlike EXIM, which does not mandate a concession.",
    phaseRequired: "board_approval",
    isPrimaryGate: true,
    weight: 175,
    sortOrder: 1,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor / Host Government",
  },
  {
    id: "dfi_offtake_agreement",
    category: "contracts",
    name: "Offtake / Revenue Agreement",
    description:
      "Binding long-term offtake, PPA, tolling, or capacity payment agreement with a creditworthy counterparty. DFIs scrutinize off-taker creditworthiness more deeply than EXIM since there is no US content angle. Termination provisions, change-in-law protections, and force majeure clauses are subject to DFI review.",
    phaseRequired: "board_approval",
    isPrimaryGate: true,
    weight: 200,
    sortOrder: 2,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor / Off-taker",
    applicableSectors: ["power", "water", "mining"],
  },
  {
    id: "dfi_epc_contract",
    category: "contracts",
    name: "EPC Contract",
    description:
      "Engineering, Procurement & Construction contract. DFIs require fixed-price, lump-sum, date-certain terms with adequate LD provisions and performance security. No US content requirement — procurement must follow DFI procurement guidelines (IFC: open competition; AfDB: AfDB Procurement Policy). Substantially final for board approval; executed at close.",
    phaseRequired: "board_approval",
    isPrimaryGate: true,
    weight: 200,
    sortOrder: 3,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor / EPC Contractor",
  },
  {
    id: "dfi_om_agreement",
    category: "contracts",
    name: "O&M Agreement",
    description:
      "Operations & Maintenance agreement with a qualified operator covering post-construction management, performance incentives, and long-term maintenance. DFIs expect O&M agreements to cover the full financing tenor with performance security and KPI frameworks.",
    phaseRequired: "financial_close",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 4,
    phaseLabel: "Financial Close",
    defaultOwner: "Sponsor / O&M Contractor",
  },
  {
    id: "dfi_fuel_supply",
    category: "contracts",
    name: "Fuel / Feedstock Supply Agreement",
    description:
      "Long-term supply contract for project inputs (gas, coal, feedstock). Must address take-or-pay obligations, price indexation, force majeure, and supply security. Substantially final at board approval stage.",
    phaseRequired: "board_approval",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 5,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor / Supplier",
    applicableSectors: ["power", "mining"],
  },
  {
    id: "dfi_implementation_agreement",
    category: "contracts",
    name: "Government Support / Implementation Agreement",
    description:
      "Formal government undertakings on tax stability, FX convertibility, dispute resolution, and step-in rights. DFIs often require explicit sovereign undertakings beyond what EXIM mandates. Can be combined with the concession agreement or structured as a standalone Government Support Agreement.",
    phaseRequired: "board_approval",
    isPrimaryGate: true,
    weight: 150,
    sortOrder: 6,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor / Host Government",
  },
  {
    id: "dfi_interconnection",
    category: "contracts",
    name: "Grid / Interconnection Agreement",
    description:
      "Terms for connecting the project to the national grid or distribution network, including capacity allocation, curtailment risk, and upgrade obligations. Typically negotiated with the national utility or grid operator.",
    phaseRequired: "financial_close",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 7,
    phaseLabel: "Financial Close",
    defaultOwner: "Sponsor / Grid Operator",
    applicableSectors: ["power"],
  },
  {
    id: "dfi_sponsor_support",
    category: "contracts",
    name: "Sponsor Support / Completion Guarantee",
    description:
      "Sponsor commitments to fund cost overruns and provide completion guarantees. DFI deals may require stronger completion support than EXIM deals since there is no sovereign ECA backing. Equity contribution agreement and cost-overrun facility must be documented.",
    phaseRequired: "financial_close",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 8,
    phaseLabel: "Financial Close",
    defaultOwner: "Sponsor",
  },
  {
    id: "dfi_shareholders_agreement",
    category: "contracts",
    name: "Shareholders' Agreement",
    description:
      "Agreement among equity investors on governance, capital calls, transfer restrictions, exit rights, and dispute resolution. Substantially final at board approval; executed at close.",
    phaseRequired: "board_approval",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 9,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor(s)",
  },
];

// ─── Environmental & Social ───────────────────────────────────────────────────

const environmental_social: readonly RequirementDef[] = [
  {
    id: "dfi_esia",
    category: "environmental_social",
    name: "Environmental & Social Impact Assessment (ESIA)",
    description:
      "Comprehensive ESIA conducted in accordance with IFC Performance Standards (PS1–8) or equivalent DFI framework (AfDB Operational Safeguards, EBRD Performance Requirements). Must be publicly disclosed and subject to meaningful stakeholder consultation. Category A projects require 120-day public disclosure period. Far more rigorous than EXIM's environmental review.",
    phaseRequired: "board_approval",
    isPrimaryGate: true,
    weight: 200,
    sortOrder: 1,
    phaseLabel: "Board Approval",
    defaultOwner: "Third-party consultant",
  },
  {
    id: "dfi_esmp",
    category: "environmental_social",
    name: "Environmental & Social Management Plan (ESMP)",
    description:
      "Actionable mitigation and management plan arising from the ESIA. Must include KPIs, budget allocation, monitoring schedule, and reporting framework. DFIs require a formal ESMP with binding commitments — not the summary-level mitigation table that EXIM accepts.",
    phaseRequired: "board_approval",
    isPrimaryGate: false,
    weight: 150,
    sortOrder: 2,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor + Consultant",
  },
  {
    id: "dfi_esms",
    category: "environmental_social",
    name: "Environmental & Social Management System (ESMS)",
    description:
      "IFC PS1 requires the sponsor organization (not just the project) to have an E&S management system in place with clear policies, responsibilities, competencies, and feedback mechanisms. Organizational-level requirement with no EXIM equivalent.",
    phaseRequired: "board_approval",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 3,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor",
  },
  {
    id: "dfi_sep",
    category: "environmental_social",
    name: "Stakeholder Engagement Plan (SEP)",
    description:
      "Formal SEP documenting how affected communities and other stakeholders will be identified, consulted, and kept informed throughout the project lifecycle. Mandatory under IFC PS1 and AfDB OS1. Must be publicly disclosed before board approval. EXIM has no standalone equivalent requirement.",
    phaseRequired: "board_approval",
    isPrimaryGate: true,
    weight: 125,
    sortOrder: 4,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor + Consultant",
  },
  {
    id: "dfi_grm",
    category: "environmental_social",
    name: "Grievance Redress Mechanism (GRM)",
    description:
      "Project-level grievance mechanism for affected communities to raise concerns and receive timely responses. Must be operational before board approval — not a post-close deliverable. No EXIM equivalent. Increasingly required by commercial banks under Equator Principles as well.",
    phaseRequired: "board_approval",
    isPrimaryGate: true,
    weight: 100,
    sortOrder: 5,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor",
  },
  {
    id: "dfi_ps2_labor",
    category: "environmental_social",
    name: "Labor & Working Conditions Policy (IFC PS2)",
    description:
      "Human resources policy and management system addressing workers' rights per IFC PS2. Must cover working conditions, non-discrimination, freedom of association, child labor prohibitions, forced labor prohibitions, and supply chain labor standards. Organizational-level requirement.",
    phaseRequired: "board_approval",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 6,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor",
  },
  {
    id: "dfi_ps4_community",
    category: "environmental_social",
    name: "Community Health, Safety & Security Plan (IFC PS4)",
    description:
      "Assessment and management plan for project impacts on community health, safety, and security per IFC PS4. Includes traffic management, disease prevention, infrastructure safety, and use of security personnel consistent with the Voluntary Principles on Security and Human Rights.",
    phaseRequired: "board_approval",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 7,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor + Consultant",
  },
  {
    id: "dfi_rap",
    category: "environmental_social",
    name: "Resettlement Action Plan (RAP) / Livelihood Restoration Plan",
    description:
      "Required if the project involves physical or economic displacement of people, per IFC PS5. Must include census of affected persons, entitlement framework, compensation schedule, livelihood restoration measures, and independent monitoring. Significantly more rigorous than EXIM's approach, which defers to host-country law.",
    phaseRequired: "board_approval",
    isPrimaryGate: false,
    weight: 150,
    sortOrder: 8,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor + Consultant",
    applicableSectors: ["power", "mining", "water", "transport"],
  },
  {
    id: "dfi_biodiversity",
    category: "environmental_social",
    name: "Biodiversity Assessment & Management Plan (IFC PS6)",
    description:
      "Assessment of project impacts on biodiversity and ecosystem services per IFC PS6. Must identify critical habitats and natural habitats. Mitigation hierarchy (avoid, minimize, restore, offset) must be applied. If critical habitat is affected, strict no-net-loss or net-positive-impact requirements apply.",
    phaseRequired: "board_approval",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 9,
    phaseLabel: "Board Approval",
    defaultOwner: "Third-party consultant",
  },
  {
    id: "dfi_indigenous_peoples",
    category: "environmental_social",
    name: "Indigenous Peoples Plan (IFC PS7)",
    description:
      "Plan addressing impacts on indigenous peoples per IFC PS7. If the project affects indigenous peoples' lands, resources, or cultural heritage, Free Prior and Informed Consent (FPIC) may be required. No equivalent in EXIM framework. This is one of the most significant DFI-specific requirements.",
    phaseRequired: "board_approval",
    isPrimaryGate: false,
    weight: 125,
    sortOrder: 10,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor + Consultant",
  },
  {
    id: "dfi_cultural_heritage",
    category: "environmental_social",
    name: "Cultural Heritage Assessment (IFC PS8)",
    description:
      "Assessment and protection plan for tangible and intangible cultural heritage per IFC PS8. Includes chance-find procedures, documentation of cultural heritage resources, and consultation with affected communities. Must address both legally protected and unprotected cultural heritage.",
    phaseRequired: "board_approval",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 11,
    phaseLabel: "Board Approval",
    defaultOwner: "Third-party consultant",
  },
  {
    id: "dfi_climate_risk",
    category: "environmental_social",
    name: "Climate Risk & Paris Alignment Assessment",
    description:
      "Physical and transition climate risk assessment, plus Paris Agreement alignment screening. IFC and AfDB now require this for all investments. TCFD-aligned analysis demonstrating the project is resilient to physical climate risks and consistent with a below-2°C pathway. More rigorous than EXIM's basic carbon policy.",
    phaseRequired: "board_approval",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 12,
    phaseLabel: "Board Approval",
    defaultOwner: "Third-party consultant",
  },
  {
    id: "dfi_ghg",
    category: "environmental_social",
    name: "Greenhouse Gas (GHG) Quantification",
    description:
      "Quantification of project GHG emissions (scope 1, 2, and material scope 3) per IFC guidance. For Category A projects, must assess incremental GHG impact vs. a no-project baseline. Increasingly a hard gate for DFI board approval.",
    phaseRequired: "board_approval",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 13,
    phaseLabel: "Board Approval",
    defaultOwner: "Third-party consultant",
  },
  {
    id: "dfi_es_monitoring",
    category: "environmental_social",
    name: "Annual E&S Monitoring & Reporting Framework",
    description:
      "Agreed framework for annual E&S monitoring reports to be submitted to the DFI post-close. Must specify reporting indicators, frequency, format, and independent monitoring arrangements. DFIs require this more rigorously than EXIM — it becomes a covenant in the loan agreement.",
    phaseRequired: "financial_close",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 14,
    phaseLabel: "Financial Close",
    defaultOwner: "Sponsor",
  },
];

// ─── Financial ────────────────────────────────────────────────────────────────

const financial: readonly RequirementDef[] = [
  {
    id: "dfi_financial_model",
    category: "financial",
    name: "Base Case Financial Model",
    description:
      "Integrated financial projection covering construction drawdowns, operating cash flows, debt service (all tranches), reserve accounts, and equity returns. Must demonstrate minimum DSCR of 1.2x–1.3x under base and stress scenarios. DFIs run their own parallel model for credit assessment.",
    phaseRequired: "board_approval",
    isPrimaryGate: true,
    weight: 200,
    sortOrder: 1,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor / Financial advisor",
  },
  {
    id: "dfi_model_audit",
    category: "financial",
    name: "Independent Financial Model Audit",
    description:
      "Third-party audit of the sponsor's financial model verifying model integrity, formula accuracy, assumption consistency, and scenario logic. Required by DFIs for all but the smallest transactions. Distinct from the DFI's own parallel model.",
    phaseRequired: "board_approval",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 2,
    phaseLabel: "Board Approval",
    defaultOwner: "Third-party model auditor (lender-appointed)",
  },
  {
    id: "dfi_sources_uses",
    category: "financial",
    name: "Sources & Uses / Financing Plan",
    description:
      "Detailed sources and uses of funds statement showing equity contribution (typically 20–35% of total project cost per DFI requirements), DFI tranche, commercial bank tranche, and any subordinated debt. Must reconcile with the financial model and EPC contract budget.",
    phaseRequired: "board_approval",
    isPrimaryGate: true,
    weight: 150,
    sortOrder: 3,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor / Financial advisor",
  },
  {
    id: "dfi_equity_commitment",
    category: "financial",
    name: "Equity Commitment Letters",
    description:
      "Binding commitment letters from all equity investors confirming equity amount and injection schedule. DFIs typically require minimum sponsor equity of 20–35% of total project cost. Letters must cover the full equity requirement including contingency.",
    phaseRequired: "board_approval",
    isPrimaryGate: true,
    weight: 150,
    sortOrder: 4,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor(s)",
  },
  {
    id: "dfi_sponsor_financials",
    category: "financial",
    name: "Sponsor Audited Financial Statements (3 years)",
    description:
      "Three years of audited financial statements for the project sponsor(s) prepared under IFRS or US GAAP. Required by DFIs to assess sponsor financial capacity for equity commitment and completion support obligations.",
    phaseRequired: "board_approval",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 5,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor",
  },
  {
    id: "dfi_err",
    category: "financial",
    name: "Economic Rate of Return (ERR) Analysis",
    description:
      "Economic analysis quantifying the project's broader economic benefits (employment, tax revenues, infrastructure improvements, downstream economic activity) to justify DFI involvement on development impact grounds. No EXIM equivalent — this is unique to DFIs and is central to their mandate justification.",
    phaseRequired: "board_approval",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 6,
    phaseLabel: "Board Approval",
    defaultOwner: "DFI (internally) or third-party economist",
  },
  {
    id: "dfi_development_impact",
    category: "financial",
    name: "Development Impact Framework / Results Matrix",
    description:
      "Agreed metrics for measuring and reporting development impact (employment, access to services, tax revenues, GHG displacement, gender outcomes). IFC uses DOTS; AfDB uses ADOA. Sponsor must provide data inputs and agree on tracking methodology. No EXIM equivalent.",
    phaseRequired: "board_approval",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 7,
    phaseLabel: "Board Approval",
    defaultOwner: "DFI + Sponsor",
  },
  {
    id: "dfi_debt_term_sheet",
    category: "financial",
    name: "DFI Debt Term Sheet",
    description:
      "Indicative or binding term sheet from DFI (and co-lenders if applicable) setting out loan amount, tenor, pricing, security package, ICA structure, and key covenants. IFC's A/B loan structure (IFC holds A loan, syndicates B loans to commercial banks) should be reflected.",
    phaseRequired: "board_approval",
    isPrimaryGate: false,
    weight: 150,
    sortOrder: 8,
    phaseLabel: "Board Approval",
    defaultOwner: "DFI / Lender",
  },
  {
    id: "dfi_fx_assessment",
    category: "financial",
    name: "Foreign Exchange & Transfer Risk Assessment",
    description:
      "Analysis of convertibility, transferability, and FX risk for projects in frontier markets. DFIs require this to be modeled explicitly since there is no ECA guarantee. Must identify central bank approval requirements and hedging strategy.",
    phaseRequired: "board_approval",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 9,
    phaseLabel: "Board Approval",
    defaultOwner: "DFI / Financial advisor",
  },
  {
    id: "dfi_tax_memo",
    category: "financial",
    name: "Tax Structure Memorandum",
    description:
      "Host-country and cross-border tax analysis covering withholding taxes, VAT, stamp duty, transfer pricing, and applicable tax treaties. DFIs post-2022 (especially IFC) scrutinize aggressive tax structures and may require alignment with OECD BEPS principles.",
    phaseRequired: "financial_close",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 10,
    phaseLabel: "Financial Close",
    defaultOwner: "Tax advisor",
  },
  {
    id: "dfi_ica",
    category: "financial",
    name: "Inter-Creditor Agreement (ICA) / Common Terms Agreement",
    description:
      "Agreement governing the rights, rankings, remedies, and voting thresholds of all project lenders (DFI, commercial banks). DFI deals typically use a CTA structure with multiple tranches. The ICA addresses waterfall priority, step-in rights, and subordination. Significantly more complex than single-lender EXIM deals.",
    phaseRequired: "financial_close",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 11,
    phaseLabel: "Financial Close",
    defaultOwner: "Lenders' counsel",
  },
  {
    id: "dfi_security_package",
    category: "financial",
    name: "Security Package (Share Pledge, Asset Mortgage, Contract Assignments)",
    description:
      "Full security package including share pledge over SPV, mortgage/charge over project assets, assignment of all material project contracts, assignment of insurances, and accounts agreement. The legal architecture of the DFI financing.",
    phaseRequired: "financial_close",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 12,
    phaseLabel: "Financial Close",
    defaultOwner: "Lenders' counsel / Sponsor",
  },
];

// ─── Technical Studies ────────────────────────────────────────────────────────

const studies: readonly RequirementDef[] = [
  {
    id: "dfi_feasibility",
    category: "studies",
    name: "Feasibility Study",
    description:
      "Technical and economic feasibility assessment demonstrating the project is viable with proven technology in a viable market. DFIs review the sponsor's feasibility study; the Lender's Technical Advisor then provides an independent assessment.",
    phaseRequired: "board_approval",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 1,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor / Consultant",
  },
  {
    id: "dfi_lta",
    category: "studies",
    name: "Lender's Technical Advisor (LTA) Report",
    description:
      "Independent technical due diligence by a lender-appointed engineer covering design adequacy, construction risk, EPC contractor assessment, technology track record, and O&M plan review. One of the most critical third-party reports in any DFI financing.",
    phaseRequired: "board_approval",
    isPrimaryGate: true,
    weight: 200,
    sortOrder: 2,
    phaseLabel: "Board Approval",
    defaultOwner: "Third-party engineer (lender-appointed)",
  },
  {
    id: "dfi_resource",
    category: "studies",
    name: "Independent Resource Assessment (P50/P90)",
    description:
      "Independent energy yield or resource assessment for renewable energy, hydro, and geothermal projects. Provides P50 (median) and P90 (conservative) production estimates. DFIs size debt on P90 production levels to ensure debt coverage under downside scenarios.",
    phaseRequired: "board_approval",
    isPrimaryGate: false,
    weight: 150,
    sortOrder: 3,
    phaseLabel: "Board Approval",
    defaultOwner: "Third-party resource assessor",
    applicableSectors: ["power"],
  },
  {
    id: "dfi_market_study",
    category: "studies",
    name: "Market / Demand Analysis",
    description:
      "Independent assessment of demand for the project's output — power demand, traffic volumes, water demand, mineral offtake. Informs revenue assumptions in the financial model. May be waived if a long-term binding offtake agreement is in place from a creditworthy counterparty.",
    phaseRequired: "board_approval",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 4,
    phaseLabel: "Board Approval",
    defaultOwner: "Third-party consultant",
  },
  {
    id: "dfi_geotech",
    category: "studies",
    name: "Geotechnical & Site Investigation Report",
    description:
      "Site investigation confirming soil conditions, geotechnical risks, and foundation requirements. Feeds into EPC contractor's design and the LTA's review.",
    phaseRequired: "board_approval",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 5,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor / EPC Contractor",
  },
  {
    id: "dfi_legal_opinion",
    category: "studies",
    name: "Legal Opinions (Local + International)",
    description:
      "Opinions from local counsel (enforceability of contracts, compliance with local law, valid authority) and international counsel (cross-border structuring, security package validity). DFI deals often require opinions from 3+ jurisdictions due to complex ownership structures.",
    phaseRequired: "financial_close",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 6,
    phaseLabel: "Financial Close",
    defaultOwner: "Legal counsel (sponsor + lenders)",
  },
];

// ─── Permits & Approvals ──────────────────────────────────────────────────────

const permits: readonly RequirementDef[] = [
  {
    id: "dfi_env_permit",
    category: "permits",
    name: "Environmental Permit / License (Host Country)",
    description:
      "Environmental permit or approval issued by the host country's environmental authority based on the IFC-compliant ESIA. DFIs require this to be in place or at an advanced stage before board approval. Must be issued unconditionally (or with conditions acceptable to lenders) before first drawdown.",
    phaseRequired: "board_approval",
    isPrimaryGate: true,
    weight: 150,
    sortOrder: 1,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor / Host Government",
  },
  {
    id: "dfi_construction_permit",
    category: "permits",
    name: "Construction Permit",
    description:
      "Building permits and zoning clearances required to commence construction. Clear path to obtaining permits must be demonstrated at board approval; permits must be in hand before first drawdown.",
    phaseRequired: "financial_close",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 2,
    phaseLabel: "Financial Close",
    defaultOwner: "Sponsor / Host Government",
  },
  {
    id: "dfi_operating_license",
    category: "permits",
    name: "Operating License / Generation License",
    description:
      "License to operate the completed facility. Regulatory framework and license pathway must be clear at board approval; license issued before commercial operation date (COD).",
    phaseRequired: "financial_close",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 3,
    phaseLabel: "Financial Close",
    defaultOwner: "Sponsor / Regulator",
  },
  {
    id: "dfi_fdi_approval",
    category: "permits",
    name: "Foreign Investment Registration / Approval",
    description:
      "Host-country foreign investment registration or approval, where required. Critical-path item in many DFI target markets with FDI screening regimes. Must be secured before financial close.",
    phaseRequired: "board_approval",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 4,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor / Host Government",
  },
  {
    id: "dfi_central_bank",
    category: "permits",
    name: "Central Bank / Exchange Control Approval",
    description:
      "Central bank or monetary authority approval for converting local currency revenues to hard currency for debt service and dividend repatriation. Often a critical-path item in frontier markets. DFI deals face this same constraint as EXIM deals, but DFIs cannot backstop the FX risk via a guarantee.",
    phaseRequired: "financial_close",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 5,
    phaseLabel: "Financial Close",
    defaultOwner: "Sponsor / Central Bank",
  },
  {
    id: "dfi_sovereign_noobj",
    category: "permits",
    name: "Host Government Consent to DFI Financing",
    description:
      "Formal no-objection letter or consent from the host government Ministry of Finance or central bank acknowledging and supporting the DFI financing. Unique to DFI deals — required when the sovereign provides guarantees or comfort letters. No EXIM equivalent.",
    phaseRequired: "board_approval",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 6,
    phaseLabel: "Board Approval",
    defaultOwner: "Host Government / Ministry of Finance",
  },
];

// ─── Corporate & Legal ────────────────────────────────────────────────────────

const corporate: readonly RequirementDef[] = [
  {
    id: "dfi_spv",
    category: "corporate",
    name: "SPV Incorporation Documents",
    description:
      "Legal formation of the Special Purpose Vehicle — certificate of incorporation, memorandum and articles of association, share register, and registered office. Must be incorporated in an acceptable jurisdiction with clean corporate records.",
    phaseRequired: "board_approval",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 1,
    phaseLabel: "Board Approval",
    defaultOwner: "Legal counsel",
  },
  {
    id: "dfi_kyc",
    category: "corporate",
    name: "KYC / AML / Integrity Due Diligence",
    description:
      "Comprehensive Know Your Customer, Anti-Money Laundering, and integrity due diligence on all sponsors, equity investors, UBOs, key counterparties, and government officials. DFIs (especially IFC) conduct extensive integrity due diligence including PEP screening, sanctions checks, and anti-corruption compliance. Significantly more rigorous than EXIM's OFAC/debarment check.",
    phaseRequired: "board_approval",
    isPrimaryGate: true,
    weight: 100,
    sortOrder: 2,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor / DFI compliance",
  },
  {
    id: "dfi_debarment",
    category: "corporate",
    name: "Debarment / Sanctions Clearance",
    description:
      "Cross-check against DFI's own debarment list, World Bank Group debarment list, and applicable sanctions lists (UN, EU, US OFAC). DFIs cross-reference their own lists plus the World Bank list — broader than EXIM's US-only sanctions check.",
    phaseRequired: "board_approval",
    isPrimaryGate: true,
    weight: 75,
    sortOrder: 3,
    phaseLabel: "Board Approval",
    defaultOwner: "DFI",
  },
  {
    id: "dfi_local_content",
    category: "corporate",
    name: "Local Content / Procurement Plan",
    description:
      "Procurement plan addressing local content and sourcing targets. DFIs encourage local procurement and, for AfDB, may require African procurement targets. This replaces EXIM's >51% US content requirement — the direction is the same but the target is local rather than American.",
    phaseRequired: "board_approval",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 4,
    phaseLabel: "Board Approval",
    defaultOwner: "Sponsor",
  },
  {
    id: "dfi_board_resolutions",
    category: "corporate",
    name: "Board Resolutions & Corporate Authorizations",
    description:
      "Board approvals from each sponsor entity, the SPV, and each key counterparty authorizing the transaction, the security package, and execution of financing documents.",
    phaseRequired: "financial_close",
    isPrimaryGate: false,
    weight: 50,
    sortOrder: 5,
    phaseLabel: "Financial Close",
    defaultOwner: "Legal counsel",
  },
];

// ─── Combined taxonomy ────────────────────────────────────────────────────────

/**
 * The complete DFI requirements taxonomy.
 * ~60 items across 6 categories covering IFC, AfDB, DFC, and similar DFIs.
 */
export const DFI_REQUIREMENTS: readonly RequirementDef[] = [
  ...contracts,
  ...environmental_social,
  ...financial,
  ...studies,
  ...permits,
  ...corporate,
] as const;

/** Lookup by requirement ID. */
export const DFI_REQUIREMENTS_BY_ID: ReadonlyMap<string, RequirementDef> =
  new Map(DFI_REQUIREMENTS.map((r) => [r.id, r]));

/** IDs that are hard gates for board approval. */
export const DFI_PRIMARY_GATE_IDS: readonly string[] = DFI_REQUIREMENTS.filter(
  (r) => r.isPrimaryGate,
).map((r) => r.id);

/** Total weight pool — denominator for readiness score. */
export const DFI_TOTAL_WEIGHT: number = DFI_REQUIREMENTS.reduce(
  (sum, r) => sum + r.weight,
  0,
);
