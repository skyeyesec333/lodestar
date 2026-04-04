export type NavSection = {
  id: string;
  label: string;
};

export const PROJECT_SECTIONS: NavSection[] = [
  { id: "section-executive-summary", label: "Summary" },
  { id: "section-collaborators", label: "Team" },
  { id: "section-overview", label: "Overview" },
  { id: "section-concept", label: "Concept" },
  { id: "section-stakeholders", label: "Parties" },
  { id: "section-capital", label: "Capital" },
  { id: "section-workplan", label: "Workplan" },
  { id: "section-documents", label: "Evidence" },
  { id: "section-execution", label: "Execution" },
];
