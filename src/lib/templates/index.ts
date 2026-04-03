export type ProjectTemplateDealType = "EXIM" | "DFI" | "PE";

export type ProjectTemplateMilestone = {
  name: string;
  phaseTarget: string;
  daysFromStart: number;
};

export type ProjectTemplate = {
  id: string;
  name: string;
  description: string;
  sector: "power" | "transport" | "water" | "telecom" | "mining" | "other";
  dealType: ProjectTemplateDealType;
  estimatedCapexUsd: number;
  tags: string[];
  milestones: ProjectTemplateMilestone[];
};

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "exim-power-greenfield",
    name: "EXIM Power Plant (Greenfield)",
    description:
      "Standard EXIM project finance template for a greenfield power generation facility. Includes full LOI-to-close milestone set and US EPC requirement tracking.",
    sector: "power",
    dealType: "EXIM",
    estimatedCapexUsd: 250_000_000,
    tags: ["EXIM", "Power", "Greenfield"],
    milestones: [
      {
        name: "CLS Clearance Confirmed",
        phaseTarget: "pre_loi",
        daysFromStart: 0,
      },
      {
        name: "Feasibility Study Complete",
        phaseTarget: "pre_loi",
        daysFromStart: 30,
      },
      {
        name: "US EPC LOI Executed",
        phaseTarget: "pre_loi",
        daysFromStart: 60,
      },
      {
        name: "ESIA Substantially Final",
        phaseTarget: "pre_loi",
        daysFromStart: 90,
      },
      {
        name: "LOI Application Submitted to EXIM",
        phaseTarget: "loi_submitted",
        daysFromStart: 120,
      },
      {
        name: "EXIM LOI Received",
        phaseTarget: "loi_approved",
        daysFromStart: 180,
      },
      {
        name: "EPC Contract Executed",
        phaseTarget: "pre_commitment",
        daysFromStart: 270,
      },
      {
        name: "Financial Close",
        phaseTarget: "financial_close",
        daysFromStart: 365,
      },
    ],
  },
  {
    id: "exim-water-infrastructure",
    name: "EXIM Water Infrastructure",
    description:
      "EXIM template for water treatment or distribution infrastructure projects in emerging markets. Structured around host government implementation agreement and off-take with public utility.",
    sector: "water",
    dealType: "EXIM",
    estimatedCapexUsd: 80_000_000,
    tags: ["EXIM", "Water", "Infrastructure"],
    milestones: [
      {
        name: "CLS Clearance Confirmed",
        phaseTarget: "pre_loi",
        daysFromStart: 0,
      },
      {
        name: "Host Government Support Letter",
        phaseTarget: "pre_loi",
        daysFromStart: 45,
      },
      {
        name: "Feasibility Study Complete",
        phaseTarget: "pre_loi",
        daysFromStart: 60,
      },
      {
        name: "US EPC Bid Shortlist Finalized",
        phaseTarget: "pre_loi",
        daysFromStart: 90,
      },
      {
        name: "LOI Application Submitted to EXIM",
        phaseTarget: "loi_submitted",
        daysFromStart: 120,
      },
      {
        name: "EXIM LOI Received",
        phaseTarget: "loi_approved",
        daysFromStart: 180,
      },
      {
        name: "Off-take Agreement Executed",
        phaseTarget: "pre_commitment",
        daysFromStart: 240,
      },
      {
        name: "Financial Close",
        phaseTarget: "financial_close",
        daysFromStart: 330,
      },
    ],
  },
  {
    id: "dfi-renewable-energy",
    name: "DFI Renewable Energy",
    description:
      "IFC / DFI investment template for solar or wind projects with IFC Performance Standards compliance tracking. Designed for sub-Saharan Africa and Southeast Asia markets.",
    sector: "power",
    dealType: "DFI",
    estimatedCapexUsd: 150_000_000,
    tags: ["IFC", "DFI", "Renewable", "Climate"],
    milestones: [
      {
        name: "IFC Project Concept Review",
        phaseTarget: "pre_loi",
        daysFromStart: 0,
      },
      {
        name: "Environmental & Social Baseline Complete",
        phaseTarget: "pre_loi",
        daysFromStart: 60,
      },
      {
        name: "Independent Resource Assessment (P50/P90)",
        phaseTarget: "pre_loi",
        daysFromStart: 90,
      },
      {
        name: "ESIA Draft Published for Disclosure",
        phaseTarget: "loi_submitted",
        daysFromStart: 120,
      },
      {
        name: "IFC Credit Approval (A-List Disclosure 120 Days)",
        phaseTarget: "loi_approved",
        daysFromStart: 240,
      },
      {
        name: "PPA Executed",
        phaseTarget: "pre_commitment",
        daysFromStart: 270,
      },
      {
        name: "EPC Contract & O&M Agreement Executed",
        phaseTarget: "pre_commitment",
        daysFromStart: 300,
      },
      {
        name: "Financial Close",
        phaseTarget: "financial_close",
        daysFromStart: 360,
      },
    ],
  },
  {
    id: "exim-transport-port",
    name: "EXIM Transport / Port Expansion",
    description:
      "EXIM project finance template for transport infrastructure — port, road, or rail concession. Covers government counterparty engagement, concession agreement, and US equipment content.",
    sector: "transport",
    dealType: "EXIM",
    estimatedCapexUsd: 400_000_000,
    tags: ["EXIM", "Transport", "Port", "Concession"],
    milestones: [
      {
        name: "CLS Clearance Confirmed",
        phaseTarget: "pre_loi",
        daysFromStart: 0,
      },
      {
        name: "Concession Framework Agreement Signed",
        phaseTarget: "pre_loi",
        daysFromStart: 60,
      },
      {
        name: "Independent Engineer Preliminary Report",
        phaseTarget: "pre_loi",
        daysFromStart: 90,
      },
      {
        name: "US Content Analysis Commissioned",
        phaseTarget: "pre_loi",
        daysFromStart: 100,
      },
      {
        name: "LOI Application Submitted to EXIM",
        phaseTarget: "loi_submitted",
        daysFromStart: 150,
      },
      {
        name: "EXIM LOI Received",
        phaseTarget: "loi_approved",
        daysFromStart: 210,
      },
      {
        name: "Concession Agreement Executed",
        phaseTarget: "pre_commitment",
        daysFromStart: 300,
      },
      {
        name: "Financial Close",
        phaseTarget: "financial_close",
        daysFromStart: 420,
      },
    ],
  },
  {
    id: "pe-mining-expansion",
    name: "Private Equity Mining Expansion",
    description:
      "Sponsor-led private equity template for mining asset expansion or acquisition. Covers technical studies, offtake, and equity close without export credit agency involvement.",
    sector: "mining",
    dealType: "PE",
    estimatedCapexUsd: 120_000_000,
    tags: ["PE", "Mining", "Expansion"],
    milestones: [
      {
        name: "Feasibility Study and Resource Report Commissioned",
        phaseTarget: "pre_loi",
        daysFromStart: 0,
      },
      {
        name: "Shareholder Agreement Term Sheet Agreed",
        phaseTarget: "pre_loi",
        daysFromStart: 30,
      },
      {
        name: "Offtake Heads of Terms Signed",
        phaseTarget: "pre_loi",
        daysFromStart: 60,
      },
      {
        name: "ESIA Initiated",
        phaseTarget: "pre_loi",
        daysFromStart: 60,
      },
      {
        name: "Equity Investment Committee Approval",
        phaseTarget: "loi_approved",
        daysFromStart: 120,
      },
      {
        name: "EPC / Construction Contract Executed",
        phaseTarget: "pre_commitment",
        daysFromStart: 180,
      },
      {
        name: "Offtake Agreement Executed",
        phaseTarget: "pre_commitment",
        daysFromStart: 210,
      },
      {
        name: "Financial Close",
        phaseTarget: "financial_close",
        daysFromStart: 270,
      },
    ],
  },
];

export function getProjectTemplateById(id: string): ProjectTemplate | null {
  return PROJECT_TEMPLATES.find((t) => t.id === id) ?? null;
}
