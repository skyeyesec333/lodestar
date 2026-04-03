import { describe, it, expect } from "vitest";
import { buildGapAnalysisPrompt } from "@/lib/ai/prompts";
import type { SerializableProject } from "@/components/projects/ProjectEditForm";
import type { ProjectRequirementRow } from "@/lib/db/requirements";

function makeProject(overrides: Partial<SerializableProject> = {}): SerializableProject {
  return {
    id: "proj-1",
    name: "Test Project",
    slug: "test-project",
    description: null,
    countryCode: "KE",
    sector: "power",
    dealType: "exim_project_finance",
    capexUsdCents: null,
    eximCoverType: null,
    stage: "pre_loi",
    targetLoiDate: null,
    ...overrides,
  };
}

function makeReq(overrides: Partial<ProjectRequirementRow> = {}): ProjectRequirementRow {
  return {
    projectRequirementId: "pr-1",
    requirementId: "req-1",
    name: "Test Requirement",
    description: "A test requirement",
    category: "commercial",
    phaseRequired: "loi_submitted",
    isLoiCritical: false,
    weight: 1,
    sortOrder: 0,
    status: "not_started",
    notes: null,
    isApplicable: true,
    autoFiltered: false,
    responsibleOrganizationId: null,
    responsibleOrganizationName: null,
    responsibleStakeholderId: null,
    responsibleStakeholderName: null,
    targetDate: null,
    applicabilityReason: null,
    recentNotes: [],
    ...overrides,
  };
}

const BASE_ROWS: ProjectRequirementRow[] = [
  makeReq({ requirementId: "req-1", name: "EPC Term Sheet", category: "commercial", isLoiCritical: true, status: "not_started" }),
  makeReq({ requirementId: "req-2", name: "Financial Model", category: "financial", isLoiCritical: true, status: "in_progress" }),
  makeReq({ requirementId: "req-3", name: "ESIA", category: "environmental", isLoiCritical: false, status: "not_started" }),
];

// The dealType parameter to buildGapAnalysisPrompt is a plain string (business-level value).
// The project fixture uses a Prisma-valid DealType for the field; we pass the guidance
// string as the 4th argument independently.
describe("buildGapAnalysisPrompt — deal-type guidance injection", () => {
  it("includes LOI or US content language for exim_project_finance", () => {
    const prompt = buildGapAnalysisPrompt(
      makeProject(),
      BASE_ROWS,
      4500,
      "exim_project_finance"
    );
    const lower = prompt.toLowerCase();
    expect(lower.includes("loi") || lower.includes("us content")).toBe(true);
  });

  it("includes ESMS or additionality language for development_finance", () => {
    const prompt = buildGapAnalysisPrompt(
      makeProject(),
      BASE_ROWS,
      4500,
      "development_finance"
    );
    const lower = prompt.toLowerCase();
    expect(lower.includes("esms") || lower.includes("additionality")).toBe(true);
  });

  it("includes concessional language for blended_finance", () => {
    const prompt = buildGapAnalysisPrompt(
      makeProject(),
      BASE_ROWS,
      4500,
      "blended_finance"
    );
    expect(prompt.toLowerCase()).toContain("concessional");
  });

  it("includes DSCR language for commercial_finance", () => {
    const prompt = buildGapAnalysisPrompt(
      makeProject(),
      BASE_ROWS,
      4500,
      "commercial_finance"
    );
    expect(prompt).toContain("DSCR");
  });
});

describe("buildGapAnalysisPrompt — general structure", () => {
  it("includes the project name", () => {
    const project = makeProject({ name: "Nairobi Solar" });
    const prompt = buildGapAnalysisPrompt(project, BASE_ROWS, 3000, "exim_project_finance");
    expect(prompt).toContain("Nairobi Solar");
  });

  it("includes the readiness score as a percentage", () => {
    const prompt = buildGapAnalysisPrompt(makeProject(), BASE_ROWS, 5000, "exim_project_finance");
    expect(prompt).toContain("50.0%");
  });

  it("requests exactly 3 priority actions", () => {
    const prompt = buildGapAnalysisPrompt(makeProject(), BASE_ROWS, 3000, "exim_project_finance");
    expect(prompt).toContain("Priority 1:");
    expect(prompt).toContain("Priority 2:");
    expect(prompt).toContain("Priority 3:");
  });

  it("names not-started LOI-critical items explicitly", () => {
    const prompt = buildGapAnalysisPrompt(makeProject(), BASE_ROWS, 3000, "exim_project_finance");
    expect(prompt).toContain("EPC Term Sheet");
  });

  it("uses 'LOI submission' as gate label for exim deals", () => {
    const prompt = buildGapAnalysisPrompt(makeProject(), BASE_ROWS, 3000, "exim_project_finance");
    expect(prompt).toContain("LOI submission");
  });

  it("uses 'next gate' as gate label for non-exim deals", () => {
    const prompt = buildGapAnalysisPrompt(makeProject(), BASE_ROWS, 3000, "dfi");
    expect(prompt).toContain("next gate");
  });
});
