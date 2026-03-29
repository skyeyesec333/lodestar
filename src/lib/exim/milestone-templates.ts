export type MilestoneTemplateDef = {
  name: string;
  description?: string;
  linkedPhase?: string;
  offsetDays: number;
  sortOrder: number;
};

export type MilestoneTemplate = {
  slug: string;
  label: string;
  description: string;
  milestones: MilestoneTemplateDef[];
};

export const MILESTONE_TEMPLATES: readonly MilestoneTemplate[] = [
  {
    slug: "exim_power",
    label: "EXIM Power Project",
    description: "Standard milestone set for an EXIM-backed power generation project.",
    milestones: [
      { name: "NDA Executed with EPC",                offsetDays: 14,  sortOrder: 100 },
      { name: "Feasibility Study Commissioned",        linkedPhase: "concept",          offsetDays: 30,  sortOrder: 200 },
      { name: "EPC RFP Issued",                        offsetDays: 60,  sortOrder: 300 },
      { name: "ESIA Consultant Engaged",               offsetDays: 45,  sortOrder: 400 },
      { name: "Financial Advisor Engaged",             offsetDays: 60,  sortOrder: 500 },
      { name: "EPC Bids Received",                     offsetDays: 120, sortOrder: 600 },
      { name: "EPC Contractor Selected",               linkedPhase: "pre_loi",          offsetDays: 150, sortOrder: 700 },
      { name: "Draft PPA Negotiated",                  linkedPhase: "pre_loi",          offsetDays: 180, sortOrder: 800 },
      { name: "Preliminary ESIA Complete",             linkedPhase: "pre_loi",          offsetDays: 210, sortOrder: 900 },
      { name: "EXIM LOI Application Submitted",        linkedPhase: "loi_submitted",    offsetDays: 240, sortOrder: 1000 },
      { name: "EXIM LOI Received",                     linkedPhase: "loi_approved",     offsetDays: 300, sortOrder: 1100 },
      { name: "Term Sheet Negotiated",                 linkedPhase: "pre_commitment",   offsetDays: 360, sortOrder: 1200 },
      { name: "Board Approval",                        linkedPhase: "pre_commitment",   offsetDays: 390, sortOrder: 1300 },
      { name: "EXIM Final Commitment",                 linkedPhase: "final_commitment", offsetDays: 420, sortOrder: 1400 },
      { name: "Financial Close",                       linkedPhase: "financial_close",  offsetDays: 480, sortOrder: 1500 },
    ],
  },
  {
    slug: "exim_mining",
    label: "EXIM Mining / Resources",
    description: "Milestone set for an EXIM-backed mining or critical minerals project.",
    milestones: [
      { name: "Mineral Resource Estimate Commissioned",  offsetDays: 30,  sortOrder: 100 },
      { name: "Feasibility Study Commissioned",          linkedPhase: "concept",          offsetDays: 45,  sortOrder: 200 },
      { name: "EPC / EPCM RFP Issued",                   offsetDays: 90,  sortOrder: 300 },
      { name: "Offtake Term Sheet Agreed",               linkedPhase: "pre_loi",          offsetDays: 120, sortOrder: 400 },
      { name: "Environmental Baseline Studies Complete", offsetDays: 150, sortOrder: 500 },
      { name: "EPC Contractor Selected",                 linkedPhase: "pre_loi",          offsetDays: 180, sortOrder: 600 },
      { name: "EXIM LOI Application Submitted",          linkedPhase: "loi_submitted",    offsetDays: 240, sortOrder: 700 },
      { name: "EXIM LOI Received",                       linkedPhase: "loi_approved",     offsetDays: 300, sortOrder: 800 },
      { name: "Definitive Feasibility Study Complete",   linkedPhase: "pre_commitment",   offsetDays: 360, sortOrder: 900 },
      { name: "EXIM Final Commitment",                   linkedPhase: "final_commitment", offsetDays: 420, sortOrder: 1000 },
      { name: "Financial Close",                         linkedPhase: "financial_close",  offsetDays: 480, sortOrder: 1100 },
    ],
  },
  {
    slug: "ifc_general",
    label: "IFC General",
    description: "General milestone set for an IFC-backed infrastructure project.",
    milestones: [
      { name: "IFC Concept Review Meeting",            offsetDays: 30,  sortOrder: 100 },
      { name: "Environmental & Social Screening",      offsetDays: 45,  sortOrder: 200 },
      { name: "IFC Appraisal Mission",                 offsetDays: 90,  sortOrder: 300 },
      { name: "ESAP Agreed with IFC",                  offsetDays: 120, sortOrder: 400 },
      { name: "Investment Committee Approval",         offsetDays: 180, sortOrder: 500 },
      { name: "Board Approval",                        offsetDays: 240, sortOrder: 600 },
      { name: "Financial Close",                       offsetDays: 300, sortOrder: 700 },
    ],
  },
];
