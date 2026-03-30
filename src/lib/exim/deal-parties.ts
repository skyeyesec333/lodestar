export const DEAL_PARTY_TYPES = [
  "epc_contractor",
  "offtake_counterparty",
  "senior_lender",
  "mezzanine_lender",
  "equity_sponsor",
  "legal_counsel_host",
  "legal_counsel_us",
  "government_authority",
  "environmental_consultant",
  "independent_engineer",
  "insurance_broker",
  "exim_officer",
] as const;

export type DealPartyType = (typeof DEAL_PARTY_TYPES)[number];

export const DEAL_PARTY_LABELS: Record<DealPartyType, string> = {
  epc_contractor:           "EPC Contractor",
  offtake_counterparty:     "Off-taker",
  senior_lender:            "Senior Lender",
  mezzanine_lender:         "Mezzanine Lender",
  equity_sponsor:           "Equity Sponsor",
  legal_counsel_host:       "Host Country Counsel",
  legal_counsel_us:         "US Counsel",
  government_authority:     "Government Authority",
  environmental_consultant: "Environmental Consultant",
  independent_engineer:     "Independent Engineer",
  insurance_broker:         "Insurance Broker",
  exim_officer:             "EXIM Officer",
};

export const DEAL_PARTY_DESCRIPTIONS: Record<DealPartyType, string> = {
  epc_contractor:           "Engineering, Procurement & Construction contractor (must be US entity)",
  offtake_counterparty:     "Entity contractually obligated to purchase the project output",
  senior_lender:            "Primary debt provider; typically EXIM Bank or a commercial bank",
  mezzanine_lender:         "Subordinated debt provider filling the gap between senior debt and equity",
  equity_sponsor:           "Equity investor providing risk capital to the project company",
  legal_counsel_host:       "Law firm qualified in host country law",
  legal_counsel_us:         "US-qualified law firm providing opinions on US law matters",
  government_authority:     "Host country ministry, regulator, or concession-granting authority",
  environmental_consultant: "Firm conducting the ESIA and preparing ESMP",
  independent_engineer:     "Technical advisor reviewing feasibility and construction oversight",
  insurance_broker:         "Broker assembling the project insurance program",
  exim_officer:             "EXIM Bank relationship manager or transaction officer",
};

/// Requirement IDs that auto-assign to each deal party type when added.
/// Only assigns if responsibleOrganizationId is currently null (no overwrite).
export const DEAL_PARTY_REQUIREMENT_MAP: Record<DealPartyType, string[]> = {
  epc_contractor:           ["epc_contract", "epc_subcontracts", "us_content_report"],
  offtake_counterparty:     ["offtake_agreement"],
  senior_lender:            ["term_sheet", "security_package", "intercreditor_agreement"],
  mezzanine_lender:         [],
  equity_sponsor:           ["shareholder_agreement", "sponsor_support_agreement"],
  legal_counsel_host:       ["legal_opinion_host"],
  legal_counsel_us:         ["legal_opinion_us", "fcpa_compliance"],
  government_authority:     ["host_government_approval", "implementation_agreement"],
  environmental_consultant: ["esia", "esmp"],
  independent_engineer:     ["independent_engineer_report", "feasibility_study"],
  insurance_broker:         ["insurance_program"],
  exim_officer:             ["loi_application", "cls_eligibility"],
};

/// The subset of deal party types considered structurally mandatory for any EXIM deal.
export const REQUIRED_DEAL_PARTIES: DealPartyType[] = [
  "epc_contractor",
  "offtake_counterparty",
  "senior_lender",
  "equity_sponsor",
  "legal_counsel_host",
  "legal_counsel_us",
  "government_authority",
  "exim_officer",
];
