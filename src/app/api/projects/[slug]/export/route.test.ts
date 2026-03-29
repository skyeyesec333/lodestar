import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authMock: vi.fn(),
  getProjectBySlugMock: vi.fn(),
  getProjectRequirementsMock: vi.fn(),
  getProjectStakeholdersMock: vi.fn(),
  getProjectDocumentsMock: vi.fn(),
  getProjectFundersMock: vi.fn(),
  getProjectMilestonesMock: vi.fn(),
  getProjectDealPartiesMock: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.authMock,
}));

vi.mock("@/lib/db/projects", () => ({
  getProjectBySlug: mocks.getProjectBySlugMock,
}));

vi.mock("@/lib/db/requirements", () => ({
  getProjectRequirements: mocks.getProjectRequirementsMock,
}));

vi.mock("@/lib/db/stakeholders", () => ({
  getProjectStakeholders: mocks.getProjectStakeholdersMock,
}));

vi.mock("@/lib/db/documents", () => ({
  getProjectDocuments: mocks.getProjectDocumentsMock,
}));

vi.mock("@/lib/db/funders", () => ({
  getProjectFunders: mocks.getProjectFundersMock,
}));

vi.mock("@/lib/db/milestones", () => ({
  getProjectMilestones: mocks.getProjectMilestonesMock,
}));

vi.mock("@/lib/db/deal-parties", () => ({
  getProjectDealParties: mocks.getProjectDealPartiesMock,
}));

async function loadRoute() {
  return import("./route");
}

describe("GET /api/projects/[slug]/export", () => {
  beforeEach(() => {
    mocks.authMock.mockReset();
    mocks.getProjectBySlugMock.mockReset();
    mocks.getProjectRequirementsMock.mockReset();
    mocks.getProjectStakeholdersMock.mockReset();
    mocks.getProjectDocumentsMock.mockReset();
    mocks.getProjectFundersMock.mockReset();
    mocks.getProjectMilestonesMock.mockReset();
    mocks.getProjectDealPartiesMock.mockReset();
  });

  it("rejects unauthenticated requests", async () => {
    mocks.authMock.mockResolvedValue({ userId: null });

    const { GET } = await loadRoute();
    const response = await GET(
      new Request("http://localhost/api/projects/kivu-hydro/export") as never,
      { params: Promise.resolve({ slug: "kivu-hydro" }) }
    );

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized");
    expect(mocks.getProjectBySlugMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the project is not accessible", async () => {
    mocks.authMock.mockResolvedValue({ userId: "user_123" });
    mocks.getProjectBySlugMock.mockResolvedValue({
      ok: false,
      error: { code: "NOT_FOUND", message: "Project not found." },
    });

    const { GET } = await loadRoute();
    const response = await GET(
      new Request("http://localhost/api/projects/kivu-hydro/export") as never,
      { params: Promise.resolve({ slug: "kivu-hydro" }) }
    );

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not found");
  });

  it("exports a compact json attachment", async () => {
    mocks.authMock.mockResolvedValue({ userId: "user_123" });
    mocks.getProjectBySlugMock.mockResolvedValue({
      ok: true,
      value: {
        id: "project-1",
        name: "Kivu Hydro",
        slug: "kivu-hydro",
        stage: "pre_loi",
        sector: "power",
        capexUsdCents: 1234500000n,
        countryCode: "RW",
        cachedReadinessScore: 5234,
      },
    });
    mocks.getProjectRequirementsMock.mockResolvedValue({
      ok: true,
      value: [
        {
          requirementId: "epc_contract",
          name: "EPC Contract",
          category: "contracts",
          phaseRequired: "pre_loi",
          status: "substantially_final",
        },
      ],
    });
    mocks.getProjectStakeholdersMock.mockResolvedValue({
      ok: true,
      value: [
        {
          id: "stakeholder-1",
          name: "Amina Diallo",
          title: "Legal Counsel",
          organizationName: "Diallo Partners",
          roleType: "legal_counsel_host",
        },
      ],
    });
    mocks.getProjectDocumentsMock.mockResolvedValue({
      ok: true,
      value: [
        {
          filename: "term-sheet.pdf",
          state: "current",
          createdAt: new Date("2026-03-29T00:00:00.000Z"),
        },
      ],
    });
    mocks.getProjectFundersMock.mockResolvedValue({
      ok: true,
      value: [
        {
          organizationName: "EXIM",
          funderType: "exim",
          engagementStage: "identified",
          amountUsdCents: 1000000,
          conditions: [
            { status: "open" },
            { status: "satisfied" },
          ],
        },
      ],
    });
    mocks.getProjectMilestonesMock.mockResolvedValue({
      ok: true,
      value: [
        {
          name: "LOI Submission",
          targetDate: new Date("2026-04-10T00:00:00.000Z"),
          completedAt: null,
          linkedPhase: "pre_loi",
        },
      ],
    });
    mocks.getProjectDealPartiesMock.mockResolvedValue({
      ok: true,
      value: [
        {
          organizationName: "Diallo Partners",
          partyType: "legal_counsel_host",
        },
      ],
    });

    const { GET } = await loadRoute();
    const response = await GET(
      new Request("http://localhost/api/projects/kivu-hydro/export") as never,
      { params: Promise.resolve({ slug: "kivu-hydro" }) }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("application/json");
    expect(response.headers.get("Content-Disposition")).toContain(
      'attachment; filename="kivu-hydro-export.json"'
    );

    const body = await response.json();
    expect(body.deal).toMatchObject({
      name: "Kivu Hydro",
      slug: "kivu-hydro",
      stage: "pre_loi",
      sector: "power",
      capexUsdCents: 1234500000,
      countryCode: "RW",
      readinessScore: 5234,
    });
    expect(body.requirements).toHaveLength(1);
    expect(body.stakeholders).toEqual([
      {
        name: "Amina Diallo",
        title: "Legal Counsel",
        organization: "Diallo Partners",
        roles: ["legal counsel host"],
      },
    ]);
    expect(body.documents[0]).toMatchObject({
      name: "term-sheet.pdf",
      state: "current",
    });
    expect(body.funders[0]).toMatchObject({
      name: "EXIM",
      type: "exim",
      stage: "identified",
      amountUsdCents: 1000000,
      openConditions: 1,
    });
    expect(body.milestones).toHaveLength(1);
    expect(body.dealParties).toEqual([
      {
        organizationName: "Diallo Partners",
        partyType: "legal_counsel_host",
      },
    ]);
  });
});
