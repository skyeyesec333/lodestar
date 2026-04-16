/**
 * Commercial Bank Project Finance Requirements Taxonomy
 *
 * Covers standard limited/non-recourse project finance deals with commercial
 * banks — no ECA, no DFI. Discipline comes from the Mandated Lead Arranger
 * (MLA) credit committee and Equator Principles (if the bank is a signatory).
 *
 * Structured around three phases:
 *   credit_approval — what the credit committee needs to approve the deal
 *   cp_to_close     — conditions precedent to first drawdown at financial close
 *   covenant        — ongoing post-close obligations (monitoring, reporting)
 *
 * isPrimaryGate = true means the item is required for credit committee approval.
 *
 * Shape mirrors RequirementDef from src/lib/requirements/types.ts.
 */

import type { RequirementDef } from "../requirements/types";

// ─── Mandate & Term Sheet ─────────────────────────────────────────────────────

const mandate: readonly RequirementDef[] = [
  {
    id: "cb_mandate_letter",
    category: "corporate",
    name: "Mandate Letter",
    description:
      "Signed mandate letter appointing the Mandated Lead Arranger (MLA), setting out scope of engagement, advisory fees, exclusivity period, and key process milestones. This is the starting gun for the formal commercial bank process.",
    phaseRequired: "credit_approval",
    isPrimaryGate: true,
    weight: 100,
    sortOrder: 1,
    phaseLabel: "Credit Approval",
    defaultOwner: "Sponsor / MLA",
  },
  {
    id: "cb_term_sheet",
    category: "financial",
    name: "Indicative Term Sheet",
    description:
      "Indicative or binding term sheet from the MLA setting out loan amount, tenor, pricing (margin + reference rate), security package, key financial covenants, drawdown conditions, and syndication approach. This is what the credit committee approves — all downstream documentation flows from the term sheet.",
    phaseRequired: "credit_approval",
    isPrimaryGate: true,
    weight: 150,
    sortOrder: 1,
    phaseLabel: "Credit Approval",
    defaultOwner: "MLA",
  },
  {
    id: "cb_info_memo",
    category: "corporate",
    name: "Information Memorandum (IM)",
    description:
      "Comprehensive syndication IM prepared by the MLA for distribution to potential syndicate banks. Covers project overview, sponsor track record, technical summary, E&S summary, financial model summary, and deal structure. Required for syndicated deals; may be omitted for bilateral club deals.",
    phaseRequired: "credit_approval",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 2,
    phaseLabel: "Credit Approval",
    defaultOwner: "MLA / Financial advisor",
  },
  {
    id: "cb_fee_letters",
    category: "financial",
    name: "Fee Letters (Arrangement, Agency, Commitment)",
    description:
      "Confidential fee letters covering arrangement fees, underwriting fees, agency fees, and commitment fees. Executed at financial close alongside the facility agreement.",
    phaseRequired: "cp_to_close",
    isPrimaryGate: false,
    weight: 50,
    sortOrder: 2,
    phaseLabel: "CP to Close",
    defaultOwner: "MLA / Sponsor",
  },
];

// ─── Project Contracts ────────────────────────────────────────────────────────

const contracts: readonly RequirementDef[] = [
  {
    id: "cb_offtake",
    category: "contracts",
    name: "Offtake / Revenue Contract",
    description:
      "Executed or substantially final offtake agreement, PPA, tolling agreement, or capacity contract. Revenue certainty is the foundation of commercial bank credit analysis. Banks require assessment of off-taker creditworthiness, termination provisions, and change-in-law protections. Merchant revenue projects require a separate demand study (see Studies).",
    phaseRequired: "credit_approval",
    isPrimaryGate: true,
    weight: 200,
    sortOrder: 1,
    phaseLabel: "Credit Approval",
    defaultOwner: "Sponsor / Off-taker",
    applicableSectors: ["power", "water", "mining"],
  },
  {
    id: "cb_epc_contract",
    category: "contracts",
    name: "EPC Contract",
    description:
      "Lump-sum, fixed-price, date-certain Engineering, Procurement & Construction contract with a creditworthy EPC contractor. Liquidated damages for delay and performance deficiency are mandatory. Commercial banks strongly prefer LSTK (lump-sum turn-key) over multi-contract approaches. No US content requirement — procurement is open.",
    phaseRequired: "credit_approval",
    isPrimaryGate: true,
    weight: 200,
    sortOrder: 2,
    phaseLabel: "Credit Approval",
    defaultOwner: "Sponsor / EPC Contractor",
  },
  {
    id: "cb_epc_bonds",
    category: "contracts",
    name: "EPC Performance Bond & Advance Payment Guarantee",
    description:
      "Performance bond (typically 10% of EPC contract value) and advance payment guarantee from the EPC contractor or its parent. These are standard CPs to first drawdown — the bank needs security against EPC default before releasing funds.",
    phaseRequired: "cp_to_close",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 3,
    phaseLabel: "CP to Close",
    defaultOwner: "EPC Contractor",
  },
  {
    id: "cb_om_contract",
    category: "contracts",
    name: "O&M Agreement",
    description:
      "Operations & Maintenance agreement for post-construction management. Must cover long-term maintenance scheduling, performance KPIs, termination provisions, and performance security. Banks use the O&M plan to validate operating cost assumptions in the financial model.",
    phaseRequired: "credit_approval",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 4,
    phaseLabel: "Credit Approval",
    defaultOwner: "Sponsor / O&M Contractor",
  },
  {
    id: "cb_fuel_supply",
    category: "contracts",
    name: "Fuel / Feedstock Supply Agreement",
    description:
      "Long-term supply contract for project inputs with take-or-pay obligations, price indexation, supply security provisions, and force majeure protections. Material to the financial model's operating cost assumptions.",
    phaseRequired: "credit_approval",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 5,
    phaseLabel: "Credit Approval",
    defaultOwner: "Sponsor / Supplier",
    applicableSectors: ["power", "mining"],
  },
  {
    id: "cb_land_rights",
    category: "contracts",
    name: "Land Lease / Purchase Agreement",
    description:
      "Executed or substantially final agreement granting the project company rights to the project site — land purchase, long-term lease, or government land allocation. Tenure must extend beyond the loan tenor. Title must be clean and unencumbered.",
    phaseRequired: "credit_approval",
    isPrimaryGate: true,
    weight: 150,
    sortOrder: 6,
    phaseLabel: "Credit Approval",
    defaultOwner: "Sponsor / Landowner",
  },
  {
    id: "cb_concession",
    category: "contracts",
    name: "Concession / License Agreement",
    description:
      "Government-granted concession or license to develop and operate the project infrastructure. Must address tenure, exclusivity, fiscal terms, and early termination compensation.",
    phaseRequired: "credit_approval",
    isPrimaryGate: false,
    weight: 125,
    sortOrder: 7,
    phaseLabel: "Credit Approval",
    defaultOwner: "Sponsor / Host Government",
  },
  {
    id: "cb_interconnection",
    category: "contracts",
    name: "Grid / Interconnection Agreement",
    description:
      "Terms for connecting the project to the national grid including capacity allocation, curtailment provisions, metering arrangements, and grid upgrade obligations.",
    phaseRequired: "credit_approval",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 8,
    phaseLabel: "Credit Approval",
    defaultOwner: "Sponsor / Grid Operator",
    applicableSectors: ["power"],
  },
  {
    id: "cb_sponsor_support",
    category: "contracts",
    name: "Sponsor Support / Completion Guarantee",
    description:
      "Sponsor equity contribution agreement, cost-overrun undertaking, and completion guarantee. Banks require sponsors to commit to funding construction cost overruns beyond the contingency line. Defines the sponsor's residual liability during the construction phase.",
    phaseRequired: "cp_to_close",
    isPrimaryGate: false,
    weight: 125,
    sortOrder: 9,
    phaseLabel: "CP to Close",
    defaultOwner: "Sponsor",
  },
  {
    id: "cb_technology_license",
    category: "contracts",
    name: "Technology License / IP Agreement",
    description:
      "License for any proprietary technology used in the project. Banks require review of technology performance guarantees, exclusivity, and continuation rights in event of licensor insolvency.",
    phaseRequired: "credit_approval",
    isPrimaryGate: false,
    weight: 50,
    sortOrder: 10,
    phaseLabel: "Credit Approval",
    defaultOwner: "Sponsor / Technology provider",
  },
];

// ─── Finance Documents ────────────────────────────────────────────────────────

const finance_docs: readonly RequirementDef[] = [
  {
    id: "cb_facility_agreement",
    category: "financial",
    name: "Credit / Facility Agreement (CTA)",
    description:
      "The master loan agreement or Common Terms Agreement governing all aspects of the senior secured debt: drawing conditions, representations, covenants, events of default, and remedies. Negotiated from the term sheet. The single most important finance document.",
    phaseRequired: "cp_to_close",
    isPrimaryGate: false,
    weight: 150,
    sortOrder: 3,
    phaseLabel: "CP to Close",
    defaultOwner: "Lenders' counsel",
  },
  {
    id: "cb_accounts_agreement",
    category: "financial",
    name: "Accounts Agreement",
    description:
      "Defines the project accounts structure: revenue account, operating expense account, debt service reserve account (DSRA), maintenance reserve account (MMRA), and distribution account. Includes waterfall mechanics, lock-up triggers, and permitted withdrawals.",
    phaseRequired: "cp_to_close",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 4,
    phaseLabel: "CP to Close",
    defaultOwner: "Lenders' counsel",
  },
  {
    id: "cb_security_package",
    category: "financial",
    name: "Security Package (Share Pledge, Asset Charge, Contract Assignments)",
    description:
      "Full security package: share pledge over the SPV, fixed and floating charge over project assets, assignment of all material project contracts (EPC, O&M, offtake, insurances), and accounts control agreement. Perfection of security is a CP to first drawdown.",
    phaseRequired: "cp_to_close",
    isPrimaryGate: false,
    weight: 150,
    sortOrder: 5,
    phaseLabel: "CP to Close",
    defaultOwner: "Lenders' counsel / Sponsor",
  },
  {
    id: "cb_direct_agreements",
    category: "financial",
    name: "Direct Agreements (Step-in Rights with Each Counterparty)",
    description:
      "Tripartite direct agreements between the lender, the project company, and each major project counterparty (EPC, O&M, off-taker, fuel supplier, government). Grants lenders step-in rights to cure project company defaults and preserve the project as a going concern.",
    phaseRequired: "cp_to_close",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 6,
    phaseLabel: "CP to Close",
    defaultOwner: "Lenders' counsel",
  },
  {
    id: "cb_ica",
    category: "financial",
    name: "Inter-Creditor / Security Trust Agreement",
    description:
      "Agreement governing voting thresholds, enforcement rights, and waterfall priority between multiple lender groups. Required when the financing involves multiple tranches or lender groups (e.g., commercial bank tranche + DFI tranche). Includes appointment of security trustee.",
    phaseRequired: "cp_to_close",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 7,
    phaseLabel: "CP to Close",
    defaultOwner: "Lenders' counsel",
  },
  {
    id: "cb_hedging",
    category: "financial",
    name: "Hedging Agreements (ISDA + Schedule)",
    description:
      "ISDA Master Agreement and schedule for interest rate and/or currency hedging. Required when there is a currency mismatch between revenues and debt service, or when the loan is floating-rate and the financial model assumes a hedged rate.",
    phaseRequired: "cp_to_close",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 8,
    phaseLabel: "CP to Close",
    defaultOwner: "Sponsor / Hedge counterparty",
  },
  {
    id: "cb_dsra",
    category: "financial",
    name: "Debt Service Reserve Account (DSRA) Funding",
    description:
      "Funded DSRA equivalent to 6 months of debt service (or as specified in the facility agreement). Must be funded at financial close or drawn from the facility. MMRA (Major Maintenance Reserve Account) may also be required.",
    phaseRequired: "cp_to_close",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 9,
    phaseLabel: "CP to Close",
    defaultOwner: "Sponsor",
  },
];

// ─── Financial Analysis ───────────────────────────────────────────────────────

const financial: readonly RequirementDef[] = [
  {
    id: "cb_financial_model",
    category: "financial",
    name: "Base Case Financial Model",
    description:
      "Integrated financial projection covering construction drawdowns, operating cash flows, debt service (all tranches), reserve account mechanics, covenant ratios, and distributions. Must demonstrate DSCR ≥ 1.3x in base case. Banks run their own parallel credit model from this.",
    phaseRequired: "credit_approval",
    isPrimaryGate: true,
    weight: 200,
    sortOrder: 10,
    phaseLabel: "Credit Approval",
    defaultOwner: "Sponsor / Financial advisor",
  },
  {
    id: "cb_model_audit",
    category: "financial",
    name: "Independent Financial Model Audit",
    description:
      "Third-party audit of the sponsor's financial model verifying integrity, formula accuracy, assumption consistency, and scenario logic. Required by most commercial banks for all but the smallest transactions. Lender typically appoints or approves the model auditor.",
    phaseRequired: "credit_approval",
    isPrimaryGate: true,
    weight: 150,
    sortOrder: 11,
    phaseLabel: "Credit Approval",
    defaultOwner: "Third-party model auditor",
  },
  {
    id: "cb_sensitivity",
    category: "financial",
    name: "Sensitivity & Downside Analysis",
    description:
      "Stress tests covering: construction delay, cost overrun, revenue shortfall (volume and price), increased operating costs, interest rate upside, FX depreciation, and combined downside scenario. Banks need confidence that DSCR stays above lock-up trigger even under severe stress.",
    phaseRequired: "credit_approval",
    isPrimaryGate: true,
    weight: 125,
    sortOrder: 12,
    phaseLabel: "Credit Approval",
    defaultOwner: "Financial advisor / Model auditor",
  },
  {
    id: "cb_sources_uses",
    category: "financial",
    name: "Sources & Uses Statement",
    description:
      "Detailed sources and uses of funds reconciling equity contributions, senior debt, subordinated debt (if any), and financing costs against total construction cost, contingency, and financing fees.",
    phaseRequired: "credit_approval",
    isPrimaryGate: true,
    weight: 100,
    sortOrder: 13,
    phaseLabel: "Credit Approval",
    defaultOwner: "Financial advisor",
  },
  {
    id: "cb_sponsor_financials",
    category: "financial",
    name: "Sponsor Audited Financial Statements (3 years)",
    description:
      "Three years of audited financial statements for the project sponsor(s). Required to assess sponsor financial capacity for equity commitment and completion guarantee obligations.",
    phaseRequired: "credit_approval",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 14,
    phaseLabel: "Credit Approval",
    defaultOwner: "Sponsor",
  },
  {
    id: "cb_tax_memo",
    category: "financial",
    name: "Tax Structure Memorandum",
    description:
      "Host-country and cross-border tax analysis covering withholding taxes on debt service and dividends, VAT recovery, stamp duty, transfer pricing, and relevant tax treaties. Required before credit approval as it affects the financial model's after-tax returns.",
    phaseRequired: "credit_approval",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 15,
    phaseLabel: "Credit Approval",
    defaultOwner: "Tax advisor",
  },
  {
    id: "cb_dscr_compliance_cert",
    category: "financial",
    name: "Quarterly DSCR Compliance Certificate",
    description:
      "Quarterly DSCR compliance certificate delivered to the agent bank confirming that the project's debt service coverage ratio meets the covenant threshold. Non-delivery is a technical event of default; consistent breach triggers enforcement provisions. Becomes a binding covenant in the facility agreement.",
    phaseRequired: "covenant",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 16,
    phaseLabel: "Covenant",
    defaultOwner: "Sponsor / CFO",
  },
  {
    id: "cb_financial_statements_delivery",
    category: "financial",
    name: "Financial Statements Delivery Covenant",
    description:
      "Delivery of audited annual and management quarterly financial statements to the agent bank per the covenant schedule in the facility agreement. Typically: audited accounts within 180 days of year end; management accounts within 45 days of quarter end. Non-delivery is a technical default.",
    phaseRequired: "covenant",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 17,
    phaseLabel: "Covenant",
    defaultOwner: "Sponsor / CFO",
  },
];

// ─── Technical Studies ────────────────────────────────────────────────────────

const studies: readonly RequirementDef[] = [
  {
    id: "cb_lta",
    category: "studies",
    name: "Lender's Technical Advisor (LTA) / Independent Engineer Report",
    description:
      "Independent technical due diligence by a lender-appointed engineer. The single most important third-party report in commercial bank project finance. Covers: design review, construction risk, EPC contractor assessment, technology track record, construction schedule, grid study review, and O&M plan assessment. Banks draw on the LTA report to set construction monitoring provisions.",
    phaseRequired: "credit_approval",
    isPrimaryGate: true,
    weight: 250,
    sortOrder: 1,
    phaseLabel: "Credit Approval",
    defaultOwner: "Third-party engineer (lender-appointed)",
  },
  {
    id: "cb_resource",
    category: "studies",
    name: "Independent Resource Assessment (P50/P90)",
    description:
      "Independent energy yield assessment for renewable projects providing P50 (median) and P90 (conservative 90th-percentile) production estimates. Commercial banks typically size debt on P90 production levels to ensure debt service is covered under downside scenarios.",
    phaseRequired: "credit_approval",
    isPrimaryGate: true,
    weight: 175,
    sortOrder: 2,
    phaseLabel: "Credit Approval",
    defaultOwner: "Third-party resource assessor",
    applicableSectors: ["power"],
  },
  {
    id: "cb_market_study",
    category: "studies",
    name: "Market / Demand Study",
    description:
      "Independent assessment of demand for the project's output, tariff trajectory, competitive landscape, and long-term market fundamentals. Required for merchant and partially contracted projects. Banks discount merchant revenues heavily — may require additional credit enhancements.",
    phaseRequired: "credit_approval",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 3,
    phaseLabel: "Credit Approval",
    defaultOwner: "Third-party consultant",
  },
  {
    id: "cb_geotech",
    category: "studies",
    name: "Geotechnical & Site Investigation Report",
    description:
      "Site investigation confirming soil conditions, geotechnical risks, and foundation requirements. Material to the EPC contractor's design and the LTA's review of construction risk.",
    phaseRequired: "credit_approval",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 4,
    phaseLabel: "Credit Approval",
    defaultOwner: "Sponsor / EPC Contractor",
  },
  {
    id: "cb_grid_study",
    category: "studies",
    name: "Grid / Interconnection Study",
    description:
      "Study confirming grid connection capacity, curtailment risk analysis, and any required grid upgrades. Prepared by the grid operator or an independent consultant. Curtailment risk is a material revenue risk that banks stress-test.",
    phaseRequired: "credit_approval",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 5,
    phaseLabel: "Credit Approval",
    defaultOwner: "Grid operator / Consultant",
    applicableSectors: ["power"],
  },
  {
    id: "cb_legal_opinions",
    category: "studies",
    name: "Legal Opinions (Capacity, Security, Local Law, Tax)",
    description:
      "Opinions from local counsel (enforceability, corporate authority, valid security), lenders' counsel (security package), and tax counsel (tax structure). Commercial bank PF deals often require opinions from multiple jurisdictions due to complex holding structures.",
    phaseRequired: "cp_to_close",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 6,
    phaseLabel: "CP to Close",
    defaultOwner: "Legal counsel (multiple)",
  },
  {
    id: "cb_title_report",
    category: "studies",
    name: "Title Report / Title Search",
    description:
      "Confirmation that the project company has clear title to land and assets with no competing liens, encumbrances, or adverse claims. Required for the security package to be perfected.",
    phaseRequired: "cp_to_close",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 7,
    phaseLabel: "CP to Close",
    defaultOwner: "Legal counsel",
  },
];

// ─── Environmental & Social ───────────────────────────────────────────────────

const environmental_social: readonly RequirementDef[] = [
  {
    id: "cb_esia",
    category: "environmental_social",
    name: "Environmental & Social Impact Assessment (ESIA)",
    description:
      "ESIA required for Equator Principles compliance (EP4, applicable to Category A and B projects). Must follow IFC Performance Standards (most EP-signatory banks adopt this standard). Publicly disclosed before credit approval for Category A projects (120-day disclosure). Less rigorous than DFI requirements but still substantial.",
    phaseRequired: "credit_approval",
    isPrimaryGate: true,
    weight: 175,
    sortOrder: 1,
    phaseLabel: "Credit Approval",
    defaultOwner: "Third-party consultant",
  },
  {
    id: "cb_es_advisor",
    category: "environmental_social",
    name: "Lender's Environmental & Social Advisor Report",
    description:
      "Independent E&S due diligence report by a lender-appointed E&S advisor reviewing the sponsor's ESIA against EP and IFC PS requirements. Required for Category A and Category B transactions under Equator Principles.",
    phaseRequired: "credit_approval",
    isPrimaryGate: true,
    weight: 150,
    sortOrder: 2,
    phaseLabel: "Credit Approval",
    defaultOwner: "Third-party (lender-appointed)",
  },
  {
    id: "cb_ep_compliance",
    category: "environmental_social",
    name: "Equator Principles Categorization & Action Plan",
    description:
      "Formal EP categorization (A, B, or C) and, for A and B projects, an Environmental and Social Action Plan (ESAP) documenting required E&S improvements and commitments. All signatory banks must confirm EP compliance before credit approval. Non-signatory bank may also require equivalent framework.",
    phaseRequired: "credit_approval",
    isPrimaryGate: true,
    weight: 125,
    sortOrder: 3,
    phaseLabel: "Credit Approval",
    defaultOwner: "MLA / Lender's E&S advisor",
  },
  {
    id: "cb_sep",
    category: "environmental_social",
    name: "Stakeholder Engagement Plan & Evidence",
    description:
      "Documentation of community consultation and stakeholder engagement consistent with IFC PS1 requirements as adopted by the Equator Principles. Required for Category A and B projects.",
    phaseRequired: "credit_approval",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 4,
    phaseLabel: "Credit Approval",
    defaultOwner: "Sponsor + Consultant",
  },
  {
    id: "cb_rap",
    category: "environmental_social",
    name: "Resettlement Action Plan (RAP)",
    description:
      "Required if the project involves physical or economic displacement of people, per IFC PS5 as adopted under Equator Principles. Must demonstrate fair compensation, consultation, and livelihood restoration.",
    phaseRequired: "credit_approval",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 5,
    phaseLabel: "Credit Approval",
    defaultOwner: "Sponsor + Consultant",
    applicableSectors: ["power", "mining", "water", "transport"],
  },
  {
    id: "cb_climate_risk",
    category: "environmental_social",
    name: "Climate Risk / Physical Risk Assessment",
    description:
      "TCFD-aligned physical and transition climate risk assessment. Increasingly required by banks' own climate policies (net-zero commitments, Paris alignment pledges). Becoming standard for infrastructure deals post-COP26.",
    phaseRequired: "credit_approval",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 6,
    phaseLabel: "Credit Approval",
    defaultOwner: "Consultant / Sponsor",
  },
  {
    id: "cb_es_monitoring",
    category: "environmental_social",
    name: "E&S Monitoring & Reporting Covenant",
    description:
      "Agreed framework for annual E&S compliance reporting to lenders post-close. Becomes a covenant in the facility agreement. Non-compliance is typically an event of default or waiver-required event.",
    phaseRequired: "covenant",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 7,
    phaseLabel: "Covenant",
    defaultOwner: "Sponsor",
  },
];

// ─── Insurance ────────────────────────────────────────────────────────────────

const insurance: readonly RequirementDef[] = [
  {
    id: "cb_insurance_advisor",
    category: "insurance",
    name: "Lender's Insurance Advisor Report",
    description:
      "Review of the proposed insurance program by a lender-appointed insurance advisor to confirm that the program meets market practice, identify gaps, and confirm that assignment to lenders is achievable. Required before credit approval — banks need to know the insurance program is placeable.",
    phaseRequired: "credit_approval",
    isPrimaryGate: true,
    weight: 125,
    sortOrder: 1,
    phaseLabel: "Credit Approval",
    defaultOwner: "Third-party insurance advisor (lender-appointed)",
  },
  {
    id: "cb_insurance_summary",
    category: "insurance",
    name: "Insurance Program Summary",
    description:
      "Full insurance program summary covering all required classes of cover, limits, deductibles, key exclusions, and insurer credit ratings. Banks need to approve the insurance program before credit approval.",
    phaseRequired: "credit_approval",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 2,
    phaseLabel: "Credit Approval",
    defaultOwner: "Insurance broker / Sponsor",
  },
  {
    id: "cb_car_insurance",
    category: "insurance",
    name: "Construction All-Risk (CAR) + Delay in Start-Up (DSU)",
    description:
      "CAR/builder's risk insurance covering the construction phase. DSU (Delay in Start-Up) cover compensates for revenue loss during construction delay periods. Both are CPs to first drawdown — the bank needs evidence of binding coverage before releasing construction funds.",
    phaseRequired: "cp_to_close",
    isPrimaryGate: false,
    weight: 125,
    sortOrder: 3,
    phaseLabel: "CP to Close",
    defaultOwner: "Insurance broker / Sponsor",
  },
  {
    id: "cb_tpl_insurance",
    category: "insurance",
    name: "Third-Party Liability Insurance",
    description:
      "Third-party liability / public liability insurance covering construction and operational phases. CP to first drawdown.",
    phaseRequired: "cp_to_close",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 4,
    phaseLabel: "CP to Close",
    defaultOwner: "Insurance broker / Sponsor",
  },
  {
    id: "cb_pri_insurance",
    category: "insurance",
    name: "Political Risk Insurance (PRI)",
    description:
      "Optional but common in emerging markets. PRI covers expropriation, currency inconvertibility/transfer, political violence, and breach of contract. May be from MIGA, bilateral ECAs, or commercial insurers. Material to the credit case in frontier markets where it can substitute for a government guarantee.",
    phaseRequired: "credit_approval",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 5,
    phaseLabel: "Credit Approval",
    defaultOwner: "Insurance broker / Sponsor",
  },
  {
    id: "cb_ops_insurance",
    category: "insurance",
    name: "Operational Insurance (Property All-Risk + Business Interruption)",
    description:
      "Property all-risk and business interruption insurance for the operational phase. Becomes a continuing covenant post-COD — annual renewal evidence must be provided to the lender.",
    phaseRequired: "covenant",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 6,
    phaseLabel: "Covenant",
    defaultOwner: "Insurance broker / Sponsor",
  },
  {
    id: "cb_insurance_renewal_confirmation",
    category: "insurance",
    name: "Annual Insurance Renewal Confirmation",
    description:
      "Annual insurance renewal confirmation (broker certificate) provided to the agent bank as required by the covenant schedule. Covers all required insurance classes. Non-delivery is a technical event of default; lapse of required coverage is a material event of default.",
    phaseRequired: "covenant",
    isPrimaryGate: false,
    weight: 50,
    sortOrder: 7,
    phaseLabel: "Covenant",
    defaultOwner: "Insurance broker / Sponsor",
  },
];

// ─── Permits & Approvals ──────────────────────────────────────────────────────

const permits: readonly RequirementDef[] = [
  {
    id: "cb_env_permit",
    category: "permits",
    name: "Environmental Permit / License",
    description:
      "Environmental permit or approval issued by the host country's environmental authority. Must be in hand before credit approval; must be unconditional (or with conditions acceptable to lenders) before first drawdown. Commercially, this is one of the most critical development-phase permits.",
    phaseRequired: "credit_approval",
    isPrimaryGate: true,
    weight: 150,
    sortOrder: 1,
    phaseLabel: "Credit Approval",
    defaultOwner: "Sponsor / Host Government",
  },
  {
    id: "cb_construction_permit",
    category: "permits",
    name: "Construction Permit",
    description:
      "Building permits and zoning clearances. Clear path to permits must be demonstrated at credit approval; permits must be in hand before first drawdown.",
    phaseRequired: "cp_to_close",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 2,
    phaseLabel: "CP to Close",
    defaultOwner: "Sponsor / Host Government",
  },
  {
    id: "cb_operating_license",
    category: "permits",
    name: "Operating / Generation License",
    description:
      "License to operate the completed facility. Framework must be understood and pathway clear at credit approval; license issued before COD.",
    phaseRequired: "cp_to_close",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 3,
    phaseLabel: "CP to Close",
    defaultOwner: "Sponsor / Regulator",
  },
  {
    id: "cb_fx_approval",
    category: "permits",
    name: "Foreign Exchange / Central Bank Approval",
    description:
      "Central bank or exchange control approval for currency conversion and transfer of debt service. Critical-path item in markets with capital controls. Must be in hand before financial close.",
    phaseRequired: "cp_to_close",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 4,
    phaseLabel: "CP to Close",
    defaultOwner: "Sponsor / Central Bank",
  },
];

// ─── Corporate & Legal ────────────────────────────────────────────────────────

const corporate: readonly RequirementDef[] = [
  {
    id: "cb_spv",
    category: "corporate",
    name: "SPV Incorporation Documents",
    description:
      "Legal formation of the Special Purpose Vehicle — certificate of incorporation, memorandum and articles, share register, registered office. Certified copies provided at close.",
    phaseRequired: "cp_to_close",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 3,
    phaseLabel: "CP to Close",
    defaultOwner: "Legal counsel",
  },
  {
    id: "cb_sha",
    category: "corporate",
    name: "Shareholders' Agreement",
    description:
      "Agreement among equity investors on governance, capital calls, transfer restrictions, and exit rights. Substantially final at credit approval; executed at close.",
    phaseRequired: "credit_approval",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 4,
    phaseLabel: "Credit Approval",
    defaultOwner: "Legal counsel / Sponsors",
  },
  {
    id: "cb_kyc",
    category: "corporate",
    name: "KYC / AML / Sanctions Compliance",
    description:
      "Know Your Customer and Anti-Money Laundering compliance pack on all borrower entities, sponsors, and UBOs. OFAC, EU, UN sanctions checks. Hard gate for all commercial banks — no exceptions.",
    phaseRequired: "credit_approval",
    isPrimaryGate: true,
    weight: 100,
    sortOrder: 5,
    phaseLabel: "Credit Approval",
    defaultOwner: "Sponsor / MLA compliance",
  },
  {
    id: "cb_board_resolutions",
    category: "corporate",
    name: "Board Resolutions & Corporate Authorizations",
    description:
      "Board approvals from each sponsor, the SPV, and each guarantor authorizing the transaction. Standard CP to close.",
    phaseRequired: "cp_to_close",
    isPrimaryGate: false,
    weight: 50,
    sortOrder: 6,
    phaseLabel: "CP to Close",
    defaultOwner: "Legal counsel",
  },
  {
    id: "cb_cp_tracker",
    category: "corporate",
    name: "CP Tracker / Closing Checklist",
    description:
      "Master list of all conditions precedent, responsible parties, status, and outstanding items. Prepared by lenders' counsel and updated through to close. The document that confirms all other CPs are satisfied. A formal instrument in commercial bank PF — not just a project management tool.",
    phaseRequired: "cp_to_close",
    isPrimaryGate: false,
    weight: 50,
    sortOrder: 7,
    phaseLabel: "CP to Close",
    defaultOwner: "Lenders' counsel",
  },
  {
    id: "cb_change_of_control_consent",
    category: "corporate",
    name: "Change of Control Consent Confirmation",
    description:
      "Change of control consent clause confirmed with the lender group. The facility agreement will include change of control as an event of default or mandatory prepayment trigger; the consent mechanism must be documented and understood by all sponsors before close.",
    phaseRequired: "cp_to_close",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 8,
    phaseLabel: "CP to Close",
    defaultOwner: "Sponsor / Legal counsel",
  },
  {
    id: "cb_mac_notification",
    category: "corporate",
    name: "Material Adverse Change (MAC) Notification Obligation",
    description:
      "Material adverse change notification obligation documented and tracked as a post-close covenant. The facility agreement requires the borrower to notify the agent bank promptly of any MAC event. Sponsors must have an internal process to monitor and discharge this obligation throughout the loan term.",
    phaseRequired: "covenant",
    isPrimaryGate: false,
    weight: 50,
    sortOrder: 9,
    phaseLabel: "Covenant",
    defaultOwner: "Sponsor / CFO",
  },
];

// ─── Combined taxonomy ────────────────────────────────────────────────────────

/**
 * The complete Commercial Bank Project Finance requirements taxonomy.
 * ~75 items across 8 categories.
 */
export const COMMERCIAL_REQUIREMENTS: readonly RequirementDef[] = [
  ...mandate,
  ...contracts,
  ...finance_docs,
  ...financial,
  ...studies,
  ...environmental_social,
  ...insurance,
  ...permits,
  ...corporate,
] as const;

