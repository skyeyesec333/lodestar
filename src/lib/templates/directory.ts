export type TemplatePublisherType = "official" | "community" | "private";
export type TemplateSector =
  | "energy"
  | "water"
  | "transport"
  | "industrial"
  | "cross_sector";
export type TemplateCapitalPath =
  | "exim_project_finance"
  | "commercial_finance"
  | "development_finance"
  | "private_equity"
  | "hybrid";

export type WorkspaceTemplate = {
  id: string;
  name: string;
  summary: string;
  publisher: string;
  publisherMark: string;
  publisherTitle: string;
  publisherType: TemplatePublisherType;
  sector: TemplateSector;
  capitalPath: TemplateCapitalPath;
  structureLabel: string;
  workspaces: string[];
  officialLabel?: string;
  featured?: boolean;
};

export function getWorkspaceTemplate(templateId?: string | null): WorkspaceTemplate | null {
  if (!templateId) return null;
  return WORKSPACE_TEMPLATES.find((template) => template.id === templateId) ?? null;
}

export const WORKSPACE_TEMPLATES: WorkspaceTemplate[] = [
  {
    id: "exim-water-greenfield",
    name: "Emerging Markets Water PF",
    summary:
      "Greenfield utility template with concept, evidence, and EXIM-specific gate defaults for sponsor-led infrastructure deals.",
    publisher: "Deutsche Bank",
    publisherMark: "DEUTSCHE BANK",
    publisherTitle: "Official lender template",
    publisherType: "official",
    sector: "water",
    capitalPath: "exim_project_finance",
    structureLabel: "Project finance",
    workspaces: ["Concept", "Capital", "Workplan", "Evidence", "Execution"],
    officialLabel: "Official bank template",
    featured: true,
  },
  {
    id: "dfi-renewables-core",
    name: "DFI Renewables Core",
    summary:
      "Balanced development-finance structure for renewables with stakeholder mapping, permits, safeguards, and execution cadence baked in.",
    publisher: "IFC Infrastructure Advisory",
    publisherMark: "IFC",
    publisherTitle: "Institutional standard",
    publisherType: "official",
    sector: "energy",
    capitalPath: "development_finance",
    structureLabel: "Development finance",
    workspaces: ["Concept", "Parties", "Capital", "Evidence", "Execution"],
    officialLabel: "Institutional standard",
    featured: true,
  },
  {
    id: "commercial-loan-industrial",
    name: "Commercial Lending Industrial Capex",
    summary:
      "Lender-oriented deal room for industrial expansion with diligence lists, covenant prep, and faster close tracking.",
    publisher: "Meridian Infrastructure Advisory",
    publisherMark: "MERIDIAN",
    publisherTitle: "Template creator",
    publisherType: "community",
    sector: "industrial",
    capitalPath: "commercial_finance",
    structureLabel: "Commercial lending",
    workspaces: ["Concept", "Capital", "Workplan", "Evidence"],
    featured: true,
  },
  {
    id: "ppp-concession-launch",
    name: "PPP / Concession Launch Kit",
    summary:
      "Public-private partnership framing template with counterparty roles, approvals, milestones, and structured government engagement.",
    publisher: "Open Project Structuring Network",
    publisherMark: "OPSN",
    publisherTitle: "Open-source publisher",
    publisherType: "community",
    sector: "transport",
    capitalPath: "hybrid",
    structureLabel: "PPP / concession",
    workspaces: ["Concept", "Parties", "Capital", "Execution"],
  },
  {
    id: "sponsor-private-workspace",
    name: "Sponsor Internal Origination",
    summary:
      "Private organization template for sponsors to frame the deal, pressure-test the thesis, and seed the execution workspaces before outside sharing.",
    publisher: "Your organization",
    publisherMark: "YOUR ORG",
    publisherTitle: "Private workspace template",
    publisherType: "private",
    sector: "cross_sector",
    capitalPath: "hybrid",
    structureLabel: "Internal origination",
    workspaces: ["Concept", "Parties", "Workplan"],
  },
];
