/**
 * Private Equity / Sponsor Finance Requirements Taxonomy
 *
 * Covers equity-led infrastructure deals where the sponsor (or a PE fund) is
 * deploying its own capital or raising co-investment — no senior debt or ECA
 * in the initial structure. The deal may later bring in project finance debt,
 * but the current phase is equity-driven.
 *
 * The discipline comes from the sponsor's own Investment Committee (IC) and
 * fiduciary obligations to LPs. There is no external lender imposing a
 * standardized checklist.
 *
 * Structured around three phases:
 *   screening    — initial screening through decision to commit DD budget
 *   ic_approval  — full diligence, IC memo, investment committee approval
 *   post_ic      — post-IC execution: legal close, capital call, construction
 *
 * isPrimaryGate = true means the item is required for IC approval.
 *
 * Shape mirrors RequirementDef from src/lib/requirements/types.ts.
 */

import type { RequirementDef } from "../requirements/types";

// ─── Investment Thesis & Screening ───────────────────────────────────────────

const screening: readonly RequirementDef[] = [
  {
    id: "pe_thesis_memo",
    category: "corporate",
    name: "Investment Thesis Memo",
    description:
      "Internal memo documenting the investment thesis: market opportunity, return profile, strategic fit with fund mandate, target hold period, and exit strategy. The first IC touchpoint — typically a screening committee decision before committing full diligence resources.",
    phaseRequired: "screening",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 1,
    phaseLabel: "Screening",
    defaultOwner: "Deal team",
  },
  {
    id: "pe_mandate_check",
    category: "corporate",
    name: "Fund Mandate Compliance Check",
    description:
      "Verification that the deal falls within the fund's mandate: geography, sector, ticket size, hold period, ESG exclusions, concentration limits, and LP side letter restrictions. This is a hard gate — a deal outside mandate cannot proceed regardless of returns.",
    phaseRequired: "screening",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 2,
    phaseLabel: "Screening",
    defaultOwner: "Deal team / Compliance",
  },
  {
    id: "pe_conflict_check",
    category: "corporate",
    name: "Conflict Check & Related-Party Screen",
    description:
      "Formal conflict-of-interest check across the fund's existing portfolio, co-investors, advisory committee members, and team personal interests. Hard gate — must be cleared before committing resources.",
    phaseRequired: "screening",
    isPrimaryGate: false,
    weight: 50,
    sortOrder: 3,
    phaseLabel: "Screening",
    defaultOwner: "Compliance / Legal",
  },
  {
    id: "pe_lp_mandate_compliance",
    category: "corporate",
    name: "LP Mandate Compliance Memo",
    description:
      "Formal LP mandate compliance memo confirming the deal fits the fund mandate across geography, sector, ticket size, hold period, ESG exclusions, concentration limits, and LP side letter restrictions. Distinct from the informal mandate check (pe_mandate_check) — this is a documented, compliance-sign-off memo prepared before committing full diligence resources.",
    phaseRequired: "screening",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 4,
    phaseLabel: "Screening",
    defaultOwner: "Compliance / Deal team",
  },
  {
    id: "pe_preliminary_returns",
    category: "financial",
    name: "Preliminary Return Analysis",
    description:
      "Initial back-of-envelope return analysis: target equity IRR, equity multiple, hold period assumptions, and exit scenario. Informs the screening decision. Not the full financial model — that comes at IC stage.",
    phaseRequired: "screening",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 1,
    phaseLabel: "Screening",
    defaultOwner: "Deal team",
  },
  {
    id: "pe_precedent_analysis",
    category: "financial",
    name: "Comparable Transactions & Precedent Analysis",
    description:
      "Analysis of comparable infrastructure transactions: valuation multiples, entry EV/EBITDA or EV/MW, return profiles, and deal terms. Benchmarks the deal against market. Supports the IC valuation case.",
    phaseRequired: "ic_approval",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 2,
    phaseLabel: "IC Approval",
    defaultOwner: "Deal team",
  },
];

// ─── Commercial & Contractual ─────────────────────────────────────────────────

const contracts: readonly RequirementDef[] = [
  {
    id: "pe_hots",
    category: "contracts",
    name: "Heads of Terms / Term Sheet",
    description:
      "Non-binding or binding heads of terms with the seller, JV partner, or host government setting out key commercial terms: valuation, equity structure, governance, exit rights, and exclusivity. IC typically approves the HoTs before binding documents are signed.",
    phaseRequired: "ic_approval",
    isPrimaryGate: true,
    weight: 150,
    sortOrder: 1,
    phaseLabel: "IC Approval",
    defaultOwner: "Deal team / Counterparty",
  },
  {
    id: "pe_concession",
    category: "contracts",
    name: "Concession / License Agreement",
    description:
      "Agreement granting the project company rights to develop and operate the project. IC needs to see key terms, risk allocation, and tenure. Full execution typically post-IC. Critical — IC will not approve without understanding the project's legal foundation.",
    phaseRequired: "ic_approval",
    isPrimaryGate: true,
    weight: 150,
    sortOrder: 2,
    phaseLabel: "IC Approval",
    defaultOwner: "Sponsor / Host Government",
  },
  {
    id: "pe_offtake",
    category: "contracts",
    name: "Offtake / Revenue Contract (or Merchant Strategy)",
    description:
      "Binding offtake, PPA, toll agreement, or capacity contract. Revenue certainty drives the equity return case. If the project is uncontracted (merchant), IC needs a robust market study and stress-tested revenue assumptions. IC will not approve without understanding revenue risk.",
    phaseRequired: "ic_approval",
    isPrimaryGate: true,
    weight: 175,
    sortOrder: 3,
    phaseLabel: "IC Approval",
    defaultOwner: "Sponsor / Off-taker",
    applicableSectors: ["power", "water", "mining"],
  },
  {
    id: "pe_epc_strategy",
    category: "contracts",
    name: "EPC Contract or Construction Strategy",
    description:
      "Lump-sum turnkey EPC contract (executed or substantially final) or, if pre-construction, a clearly articulated construction strategy memo covering contractor selection approach, contract structure (LSTK vs. multi-contract), and cost certainty provisions. Construction risk allocation is IC-critical since the sponsor bears first loss.",
    phaseRequired: "ic_approval",
    isPrimaryGate: true,
    weight: 175,
    sortOrder: 4,
    phaseLabel: "IC Approval",
    defaultOwner: "Sponsor / EPC Contractor",
  },
  {
    id: "pe_om_strategy",
    category: "contracts",
    name: "O&M Strategy / Agreement",
    description:
      "O&M strategy memo or substantially final agreement covering operational approach, operator selection, performance guarantees, and cost structure. IC needs the approach at approval; binding agreement executed post-IC.",
    phaseRequired: "ic_approval",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 5,
    phaseLabel: "IC Approval",
    defaultOwner: "Sponsor / O&M provider",
  },
  {
    id: "pe_land_rights",
    category: "contracts",
    name: "Land Rights (Secured or Path Clear)",
    description:
      "Evidence of site control: executed land purchase, long-term lease, option agreement, or government land allocation. IC will not approve if site control is at risk — it is a threshold issue for any project investment.",
    phaseRequired: "ic_approval",
    isPrimaryGate: true,
    weight: 125,
    sortOrder: 6,
    phaseLabel: "IC Approval",
    defaultOwner: "Sponsor / Landowner",
  },
  {
    id: "pe_jv_agreement",
    category: "contracts",
    name: "JV / Co-Investment Agreement",
    description:
      "If partnered, term sheet or substantially final JV agreement governing economics, governance, veto rights, transfer restrictions, and exit mechanisms. Governance and exit rights are IC-critical — the fund must be able to exit on its own timeline.",
    phaseRequired: "ic_approval",
    isPrimaryGate: true,
    weight: 125,
    sortOrder: 7,
    phaseLabel: "IC Approval",
    defaultOwner: "Sponsor / Co-investor",
  },
  {
    id: "pe_sha",
    category: "contracts",
    name: "Shareholders' Agreement",
    description:
      "Definitive shareholders' agreement among all equity investors. Term sheet at IC; fully executed at financial close.",
    phaseRequired: "post_ic",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 8,
    phaseLabel: "Post-IC",
    defaultOwner: "Legal counsel / Sponsors",
  },
];

// ─── Financial Analysis & Modeling ───────────────────────────────────────────

const financial: readonly RequirementDef[] = [
  {
    id: "pe_financial_model",
    category: "financial",
    name: "Full Financial Model",
    description:
      "Integrated equity return model covering construction drawdowns, operating cash flows, financing costs (if debt is part of the structure), equity IRR, equity multiple (MoIC), cash-on-cash returns, and terminal value / exit assumptions. The centerpiece of the IC package. IC scrutinizes the base case and downside scenarios intensely.",
    phaseRequired: "ic_approval",
    isPrimaryGate: true,
    weight: 250,
    sortOrder: 3,
    phaseLabel: "IC Approval",
    defaultOwner: "Deal team / Financial advisor",
  },
  {
    id: "pe_sensitivity",
    category: "financial",
    name: "Sensitivity & Downside Scenarios",
    description:
      "Stress tests covering: construction delay (+6, +12 months), cost overrun (+10%, +20%), revenue shortfall (volume and price), operating cost increases, exit multiple compression, and combined downside. IC wants to see the IRR floor in the worst credible scenario.",
    phaseRequired: "ic_approval",
    isPrimaryGate: true,
    weight: 150,
    sortOrder: 4,
    phaseLabel: "IC Approval",
    defaultOwner: "Deal team",
  },
  {
    id: "pe_valuation",
    category: "financial",
    name: "Valuation Memo",
    description:
      "Formal valuation analysis using DCF, comparable transaction multiples, regulated asset base (RAB) approach, or replacement cost method. Justifies the entry price / acquisition cost and benchmarks against market. IC must approve the valuation methodology.",
    phaseRequired: "ic_approval",
    isPrimaryGate: true,
    weight: 150,
    sortOrder: 5,
    phaseLabel: "IC Approval",
    defaultOwner: "Deal team",
  },
  {
    id: "pe_sources_uses",
    category: "financial",
    name: "Sources & Uses of Funds",
    description:
      "Equity commitment breakdown, co-investment amounts, any bridge facility, contingency sizing, and total equity deployment. IC needs to know the capital call schedule and maximum exposure.",
    phaseRequired: "ic_approval",
    isPrimaryGate: true,
    weight: 125,
    sortOrder: 6,
    phaseLabel: "IC Approval",
    defaultOwner: "Deal team",
  },
  {
    id: "pe_construction_budget",
    category: "financial",
    name: "Construction Budget (Detailed)",
    description:
      "Line-item construction budget reconciled with the EPC contract or contractor estimates. Contingency sizing and escalation assumptions must be justified. Drives equity commitment — sponsor bears first loss on cost overruns.",
    phaseRequired: "ic_approval",
    isPrimaryGate: true,
    weight: 150,
    sortOrder: 7,
    phaseLabel: "IC Approval",
    defaultOwner: "Sponsor / EPC / Quantity Surveyor",
  },
  {
    id: "pe_financing_strategy",
    category: "financial",
    name: "Financing Strategy Memo",
    description:
      "Memo documenting whether the deal is equity-only or whether senior debt will be brought in (bridge-to-perm), when, and from which sources (commercial bank, DFI, EXIM). IC needs to understand the capital structure roadmap and optionality. This item tracks the plan — not the debt itself.",
    phaseRequired: "ic_approval",
    isPrimaryGate: true,
    weight: 125,
    sortOrder: 8,
    phaseLabel: "IC Approval",
    defaultOwner: "Deal team / CFO",
  },
  {
    id: "pe_exit_strategy",
    category: "financial",
    name: "Exit Strategy Memo",
    description:
      "Documented exit strategy: trade sale, IPO, refinancing recapitalization, secondary sale to infrastructure fund, or hold-to-maturity with yield distribution. Exit path is central to the PE IC case — without a credible exit, the IRR is theoretical. Must include exit timeline, buyer universe, and EBITDA/DSCR assumptions at exit.",
    phaseRequired: "ic_approval",
    isPrimaryGate: true,
    weight: 150,
    sortOrder: 9,
    phaseLabel: "IC Approval",
    defaultOwner: "Deal team",
  },
  {
    id: "pe_tax_structure",
    category: "financial",
    name: "Tax Structure / Holding Structure Memo",
    description:
      "Analysis of SPV jurisdiction, withholding taxes on dividends and interest, repatriation of capital gains, applicable tax treaties, and transfer pricing. After-tax returns are what LPs see — tax structure can materially affect the IRR.",
    phaseRequired: "ic_approval",
    isPrimaryGate: true,
    weight: 100,
    sortOrder: 10,
    phaseLabel: "IC Approval",
    defaultOwner: "Tax advisor",
  },
  {
    id: "pe_sponsor_financials",
    category: "financial",
    name: "Sponsor Audited Financial Statements",
    description:
      "Audited financial statements for the project sponsor(s) to confirm financial capacity for equity commitment and completion support.",
    phaseRequired: "ic_approval",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 11,
    phaseLabel: "IC Approval",
    defaultOwner: "Sponsor",
  },
  {
    id: "pe_fx_hedging",
    category: "financial",
    name: "FX Hedging Strategy",
    description:
      "Approach to managing currency mismatch between local-currency revenues and USD/EUR equity distributions. IC needs the exposure quantified; hedging instruments are put in place post-IC.",
    phaseRequired: "ic_approval",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 12,
    phaseLabel: "IC Approval",
    defaultOwner: "Deal team / Treasury",
  },
  {
    id: "pe_comparable_transactions",
    category: "financial",
    name: "Comparable Transaction Analysis",
    description:
      "Comparable transaction analysis prepared for the IC memo: valuation multiples (EV/EBITDA, EV/MW), return profiles (equity IRR, equity multiple), deal terms, and transaction precedents. Benchmarks the deal against market and supports the IC valuation case. Distinct from the initial screening-stage precedent review.",
    phaseRequired: "ic_approval",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 13,
    phaseLabel: "IC Approval",
    defaultOwner: "Deal team",
  },
];

// ─── Due Diligence Reports ────────────────────────────────────────────────────

const studies: readonly RequirementDef[] = [
  {
    id: "pe_technical_dd",
    category: "studies",
    name: "Technical Due Diligence / Independent Engineer Report",
    description:
      "Technical DD commissioned by the sponsor covering design review, construction risk, EPC contractor assessment, technology track record, and O&M plan. Unlike lender-driven deals, the sponsor appoints the engineer for its own protection — not on lender instruction. IC requires at minimum a summary of technical findings.",
    phaseRequired: "ic_approval",
    isPrimaryGate: true,
    weight: 200,
    sortOrder: 1,
    phaseLabel: "IC Approval",
    defaultOwner: "Third-party engineer (sponsor-appointed)",
  },
  {
    id: "pe_resource",
    category: "studies",
    name: "Resource Assessment (P50/P90)",
    description:
      "Independent energy yield or resource assessment for renewable energy, hydro, or geothermal projects. P50 underpins the base case; P90 is the downside used in sensitivity analysis. IC must understand the resource risk.",
    phaseRequired: "ic_approval",
    isPrimaryGate: false,
    weight: 150,
    sortOrder: 2,
    phaseLabel: "IC Approval",
    defaultOwner: "Third-party resource assessor",
    applicableSectors: ["power"],
  },
  {
    id: "pe_market_study",
    category: "studies",
    name: "Market Study / Demand Analysis",
    description:
      "Independent assessment of the market for the project's output: power demand, tariff trajectory, traffic growth, water demand, mineral pricing outlook. Underpins revenue assumptions in the financial model.",
    phaseRequired: "ic_approval",
    isPrimaryGate: true,
    weight: 125,
    sortOrder: 3,
    phaseLabel: "IC Approval",
    defaultOwner: "Third-party consultant or in-house",
  },
  {
    id: "pe_legal_dd",
    category: "studies",
    name: "Legal Due Diligence Report",
    description:
      "Legal DD covering title to assets, enforceability of project contracts, litigation search, regulatory compliance, corporate structure review, and IP ownership. IC requires a summary — full report informs the closing documents.",
    phaseRequired: "ic_approval",
    isPrimaryGate: true,
    weight: 150,
    sortOrder: 4,
    phaseLabel: "IC Approval",
    defaultOwner: "Legal counsel",
  },
  {
    id: "pe_regulatory_risk",
    category: "studies",
    name: "Regulatory & Political Risk Assessment",
    description:
      "Assessment of regulatory stability, political risk (expropriation, policy reversal, currency restrictions), and government counterparty creditworthiness. May include a country risk rating from an independent firm. IC must approve the country/regulatory risk before committing capital.",
    phaseRequired: "ic_approval",
    isPrimaryGate: true,
    weight: 125,
    sortOrder: 5,
    phaseLabel: "IC Approval",
    defaultOwner: "In-house or third-party consultant",
  },
  {
    id: "pe_integrity_dd",
    category: "studies",
    name: "Integrity / Reputational Due Diligence",
    description:
      "Background investigation on all key counterparties (off-taker, EPC contractor, government officials, co-investors) covering adverse media, sanctions, litigation, corporate registrations, and beneficial ownership. Hard gate for most PE funds — reputational risk to the fund and its LPs is existential.",
    phaseRequired: "ic_approval",
    isPrimaryGate: true,
    weight: 100,
    sortOrder: 6,
    phaseLabel: "IC Approval",
    defaultOwner: "Compliance / Third-party investigator",
  },
  {
    id: "pe_insurance_dd",
    category: "studies",
    name: "Insurance Due Diligence",
    description:
      "Assessment of insurable risks, insurance market availability, indicative premiums, coverage gaps, and PRI options. IC needs to understand the risk map; full insurance placement is post-IC.",
    phaseRequired: "ic_approval",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 7,
    phaseLabel: "IC Approval",
    defaultOwner: "Insurance advisor",
  },
];

// ─── IC Process & Governance ──────────────────────────────────────────────────

const governance: readonly RequirementDef[] = [
  {
    id: "pe_ic_memo",
    category: "corporate",
    name: "Investment Committee Memorandum (IC Memo)",
    description:
      "The definitive IC memo synthesizing the investment thesis, deal terms, due diligence findings, financial analysis, risk assessment, ESG considerations, and investment recommendation. This is the gate — everything in the checklist feeds into the IC memo, and IC approval is contingent on its quality.",
    phaseRequired: "ic_approval",
    isPrimaryGate: true,
    weight: 300,
    sortOrder: 4,
    phaseLabel: "IC Approval",
    defaultOwner: "Deal team",
  },
  {
    id: "pe_ic_presentation",
    category: "corporate",
    name: "IC Presentation / Deal Book",
    description:
      "Presentation deck for the IC meeting summarizing key deal terms, financial returns, risks, and recommendation. Typically a distillation of the IC memo for the IC's oral review.",
    phaseRequired: "ic_approval",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 5,
    phaseLabel: "IC Approval",
    defaultOwner: "Deal team",
  },
  {
    id: "pe_side_letter_check",
    category: "corporate",
    name: "LP Side Letter Compliance Check",
    description:
      "Review of all LP side letters to confirm the deal does not breach any LP-specific restrictions (geography, sector, ESG, concentration limits, responsible investment). Hard gate — a breach could require LP consent or waiver before close.",
    phaseRequired: "ic_approval",
    isPrimaryGate: true,
    weight: 75,
    sortOrder: 6,
    phaseLabel: "IC Approval",
    defaultOwner: "Compliance / Investor relations",
  },
  {
    id: "pe_anti_corruption",
    category: "corporate",
    name: "Anti-Corruption / AML / Sanctions Compliance Pack",
    description:
      "FCPA/Bribery Act compliance review, AML screening of all counterparties, and OFAC/EU/UN sanctions checks. Hard gate for all PE funds. Must be documented before IC approval.",
    phaseRequired: "ic_approval",
    isPrimaryGate: true,
    weight: 100,
    sortOrder: 7,
    phaseLabel: "IC Approval",
    defaultOwner: "Compliance",
  },
  {
    id: "pe_management_references",
    category: "corporate",
    name: "Management Team Reference Checks",
    description:
      "Formal reference checks on the management team: prior employer verification, peer references from co-investors, counterparty references from prior transactions, and legal/regulatory background. IC will not approve a management team without completed reference checks — in PE, management is a primary risk factor.",
    phaseRequired: "ic_approval",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 8,
    phaseLabel: "IC Approval",
    defaultOwner: "Deal team / Compliance",
  },
  {
    id: "pe_exit_strategy_memo",
    category: "corporate",
    name: "Exit Strategy Memo (Multi-Path Analysis)",
    description:
      "Exit strategy memo modeling multiple exit paths: trade sale, IPO, secondary to infrastructure fund, refinancing recapitalization, and hold-to-maturity. Includes buyer universe, exit timeline, EV/EBITDA or DSCR assumptions at exit for each scenario, and expected IRR range per path. IC approves the exit strategy — without a credible exit, the IRR is theoretical.",
    phaseRequired: "ic_approval",
    isPrimaryGate: true,
    weight: 125,
    sortOrder: 9,
    phaseLabel: "IC Approval",
    defaultOwner: "Deal team",
  },
  {
    id: "pe_board_gp_resolutions",
    category: "corporate",
    name: "Board / GP Resolutions Authorizing Investment",
    description:
      "Formal board or GP resolutions authorizing the investment consistent with the IC approval. Formalizes the IC decision in legal documentation.",
    phaseRequired: "post_ic",
    isPrimaryGate: false,
    weight: 50,
    sortOrder: 8,
    phaseLabel: "Post-IC",
    defaultOwner: "Legal / Fund manager",
  },
  {
    id: "pe_lp_notification",
    category: "corporate",
    name: "LP Notification / Advisory Committee Consultation",
    description:
      "Where required by the Limited Partnership Agreement, formal notification to LPs or consultation with the LP Advisory Committee before closing. May be a CP to investment completion.",
    phaseRequired: "post_ic",
    isPrimaryGate: false,
    weight: 50,
    sortOrder: 9,
    phaseLabel: "Post-IC",
    defaultOwner: "Fund manager / Investor relations",
  },
  {
    id: "pe_capital_call",
    category: "corporate",
    name: "Capital Call Notice to LPs",
    description:
      "Formal capital call notice issued to LPs per the LPA drawdown mechanics. Issued post-IC at closing. Timing is typically 10 business days before the equity is needed.",
    phaseRequired: "post_ic",
    isPrimaryGate: false,
    weight: 50,
    sortOrder: 10,
    phaseLabel: "Post-IC",
    defaultOwner: "Fund manager",
  },
];

// ─── ESG & Impact ─────────────────────────────────────────────────────────────

const environmental_social: readonly RequirementDef[] = [
  {
    id: "pe_esg_screen",
    category: "environmental_social",
    name: "ESG Screening / Exclusion List Check",
    description:
      "Formal screening against the fund's ESG exclusion list (weapons, tobacco, forced labor, etc.) and any LP-driven exclusions. Hard gate — a deal on the exclusion list cannot proceed regardless of financial returns.",
    phaseRequired: "screening",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 1,
    phaseLabel: "Screening",
    defaultOwner: "ESG team / Deal team",
  },
  {
    id: "pe_es_dd",
    category: "environmental_social",
    name: "Environmental & Social Due Diligence",
    description:
      "E&S due diligence ranging from desktop review to full ESIA depending on risk level. For PE funds with ESG policy or LP reporting obligations, this is increasingly a hard IC gate. Covers E&S risks, regulatory compliance gaps, community relations, and remediation requirements.",
    phaseRequired: "ic_approval",
    isPrimaryGate: true,
    weight: 125,
    sortOrder: 2,
    phaseLabel: "IC Approval",
    defaultOwner: "ESG team / Third-party consultant",
  },
  {
    id: "pe_esg_action_plan",
    category: "environmental_social",
    name: "ESG Action Plan (100-Day Plan)",
    description:
      "Draft ESG action plan for the first 100 days post-close: identified E&S gaps, improvement commitments, timeline, and responsible owner. IC sees the plan to confirm the fund is taking E&S risk seriously. Finalized post-IC.",
    phaseRequired: "ic_approval",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 3,
    phaseLabel: "IC Approval",
    defaultOwner: "ESG team",
  },
  {
    id: "pe_climate_alignment",
    category: "environmental_social",
    name: "Climate Alignment / Carbon Footprint Assessment",
    description:
      "Assessment of the project's GHG footprint and alignment with the fund's net-zero or Paris-aligned commitment. Required if the fund has made climate commitments to LPs. Increasingly standard for infrastructure funds.",
    phaseRequired: "ic_approval",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 4,
    phaseLabel: "IC Approval",
    defaultOwner: "ESG team / Consultant",
  },
  {
    id: "pe_impact_kpis",
    category: "environmental_social",
    name: "Impact KPIs / SDG Mapping",
    description:
      "Mapping of the investment's expected impact against relevant SDGs and the fund's impact framework (jobs created, people with access to power/water, taxes generated, GHG displaced). Required for LP reporting in impact-focused funds.",
    phaseRequired: "ic_approval",
    isPrimaryGate: false,
    weight: 50,
    sortOrder: 5,
    phaseLabel: "IC Approval",
    defaultOwner: "Deal team / ESG team",
  },
  {
    id: "pe_esg_baseline",
    category: "environmental_social",
    name: "ESG Baseline Assessment",
    description:
      "ESG baseline assessment completed per fund policy: identifies current E&S risks and gaps, establishes a pre-investment baseline for tracking improvement, and informs the 100-day ESG action plan. Required by LP reporting frameworks (GRESB, ILPA) and increasingly a hard IC gate for infrastructure funds with ESG commitments.",
    phaseRequired: "ic_approval",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 6,
    phaseLabel: "IC Approval",
    defaultOwner: "ESG team / Third-party consultant",
  },
  {
    id: "pe_responsible_contractor",
    category: "environmental_social",
    name: "Responsible Contractor Policy",
    description:
      "Labor standards policy for the construction contractor covering wages, working hours, health and safety, non-discrimination, and freedom of association. Post-IC but incorporated into EPC contract terms.",
    phaseRequired: "post_ic",
    isPrimaryGate: false,
    weight: 50,
    sortOrder: 7,
    phaseLabel: "Post-IC",
    defaultOwner: "ESG team / Sponsor",
  },
];

// ─── Permits ──────────────────────────────────────────────────────────────────

const permits: readonly RequirementDef[] = [
  {
    id: "pe_env_permit",
    category: "permits",
    name: "Environmental Permit / Approval",
    description:
      "Environmental permit from the host country's environmental authority. Must be in place or on a clear path at IC — a high permitting risk will prevent IC approval. The permit must be in hand before construction commences.",
    phaseRequired: "ic_approval",
    isPrimaryGate: true,
    weight: 125,
    sortOrder: 1,
    phaseLabel: "IC Approval",
    defaultOwner: "Sponsor / Host Government",
  },
  {
    id: "pe_construction_permit",
    category: "permits",
    name: "Construction Permit",
    description:
      "Building permits and zoning clearances. Path must be clear at IC. Obtained post-IC during the pre-construction period.",
    phaseRequired: "post_ic",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 2,
    phaseLabel: "Post-IC",
    defaultOwner: "Sponsor / Host Government",
  },
  {
    id: "pe_operating_license",
    category: "permits",
    name: "Operating / Generation License",
    description:
      "License to operate the completed facility. Regulatory framework must be understood at IC. License obtained post-COD.",
    phaseRequired: "post_ic",
    isPrimaryGate: false,
    weight: 50,
    sortOrder: 3,
    phaseLabel: "Post-IC",
    defaultOwner: "Sponsor / Regulator",
  },
  {
    id: "pe_fdi_approval",
    category: "permits",
    name: "Foreign Investment Approval",
    description:
      "Host-country FDI registration or approval where required. If it is a gating risk, must be factored into the IC decision. Obtained before close.",
    phaseRequired: "ic_approval",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 4,
    phaseLabel: "IC Approval",
    defaultOwner: "Sponsor / Host Government",
  },
];

// ─── Construction (Post-IC) ───────────────────────────────────────────────────

const construction: readonly RequirementDef[] = [
  {
    id: "pe_spv_formation",
    category: "corporate",
    name: "SPV Incorporation & Legal Formation",
    description:
      "Legal formation of the Special Purpose Vehicle. Often done pre-IC if needed for exclusivity, but finalized at close. Must be in an acceptable jurisdiction for the fund's LP base.",
    phaseRequired: "post_ic",
    isPrimaryGate: false,
    weight: 50,
    sortOrder: 11,
    phaseLabel: "Post-IC",
    defaultOwner: "Legal counsel",
  },
  {
    id: "pe_owners_engineer",
    category: "construction",
    name: "Owner's Engineer Appointment",
    description:
      "Appointment of the Owner's Engineer (OE) to oversee construction on behalf of the sponsor. In PE deals, the OE is sponsor-appointed (not lender-appointed), but fulfills the same function: independent monitoring of EPC contractor performance.",
    phaseRequired: "post_ic",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 1,
    phaseLabel: "Post-IC",
    defaultOwner: "Sponsor",
  },
  {
    id: "pe_insurance_placement",
    category: "insurance",
    name: "Insurance Placement (Construction Phase)",
    description:
      "Placement of construction all-risk, third-party liability, and political risk insurance. Post-IC deliverable — binding coverage must be in place before the Notice to Proceed is issued to the EPC contractor.",
    phaseRequired: "post_ic",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 1,
    phaseLabel: "Post-IC",
    defaultOwner: "Insurance broker / Sponsor",
  },
  {
    id: "pe_ntp",
    category: "construction",
    name: "Notice to Proceed (NTP)",
    description:
      "Formal notice to the EPC contractor to commence construction. Issued after equity is deployed, permits are in hand, and construction insurance is placed. The 'money is moving' milestone — triggers equity drawdown schedule.",
    phaseRequired: "post_ic",
    isPrimaryGate: false,
    weight: 100,
    sortOrder: 2,
    phaseLabel: "Post-IC",
    defaultOwner: "Sponsor → EPC Contractor",
  },
  {
    id: "pe_construction_plan",
    category: "construction",
    name: "Construction Management Plan",
    description:
      "Detailed construction management plan including schedule, critical path, resource plan, quality control, safety plan, and variation management procedures. Prepared pre-NTP by EPC or Owner's Engineer.",
    phaseRequired: "post_ic",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 3,
    phaseLabel: "Post-IC",
    defaultOwner: "EPC Contractor / Owner's Engineer",
  },
  {
    id: "pe_progress_reports",
    category: "construction",
    name: "Monthly Construction Progress Reports",
    description:
      "Monthly reports from the EPC contractor (reviewed by Owner's Engineer) on construction progress, schedule, cost to complete, and variation status. Allows sponsor to monitor against budget and timeline commitments made at IC.",
    phaseRequired: "post_ic",
    isPrimaryGate: false,
    weight: 50,
    sortOrder: 4,
    phaseLabel: "Post-IC",
    defaultOwner: "EPC Contractor / Owner's Engineer",
  },
  {
    id: "pe_cod_certificate",
    category: "construction",
    name: "Substantial Completion / COD Certificate",
    description:
      "Certification from the Owner's Engineer confirming substantial completion of construction and readiness for commercial operations. Marks the end of the construction phase and the start of the operational period.",
    phaseRequired: "post_ic",
    isPrimaryGate: false,
    weight: 75,
    sortOrder: 5,
    phaseLabel: "Post-IC",
    defaultOwner: "Owner's Engineer / EPC Contractor",
  },
];

// ─── Combined taxonomy ────────────────────────────────────────────────────────

/**
 * The complete PE / Sponsor Finance requirements taxonomy.
 * ~70 items across 8 categories.
 */
export const PE_REQUIREMENTS: readonly RequirementDef[] = [
  ...screening,
  ...contracts,
  ...financial,
  ...studies,
  ...governance,
  ...environmental_social,
  ...permits,
  ...construction,
] as const;

