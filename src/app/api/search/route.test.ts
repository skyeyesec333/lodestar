import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  authMock: vi.fn(),
  searchMock: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.authMock,
}));

vi.mock("@/lib/db/search", () => ({
  searchDealsAndStakeholders: mocks.searchMock,
}));

async function loadRoute() {
  return import("./route");
}

describe("GET /api/search", () => {
  beforeEach(() => {
    mocks.authMock.mockReset();
    mocks.searchMock.mockReset();
  });

  it("rejects unauthenticated requests", async () => {
    mocks.authMock.mockResolvedValue({ userId: null });

    const { GET } = await loadRoute();
    const response = await GET(new NextRequest("http://localhost/api/search?q=deal"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(mocks.searchMock).not.toHaveBeenCalled();
  });

  it("rejects short queries", async () => {
    mocks.authMock.mockResolvedValue({ userId: "user_123" });

    const { GET } = await loadRoute();
    const response = await GET(new NextRequest("http://localhost/api/search?q=a"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Query must be at least 2 characters.",
    });
    expect(mocks.searchMock).not.toHaveBeenCalled();
  });

  it("returns project and stakeholder results", async () => {
    mocks.authMock.mockResolvedValue({ userId: "user_123" });
    mocks.searchMock.mockResolvedValue({
      ok: true,
      value: {
        projects: [
          {
            id: "project-1",
            name: "Kivu Hydro",
            slug: "kivu-hydro",
            stage: "pre_loi",
          },
        ],
        stakeholders: [
          {
            id: "stakeholder-1",
            name: "Amina Diallo",
            title: "Legal Counsel",
            organizationName: "Diallo Partners",
            projectSlug: "kivu-hydro",
          },
        ],
      },
    });

    const { GET } = await loadRoute();
    const response = await GET(new NextRequest("http://localhost/api/search?q=ki"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      projects: [
        {
          id: "project-1",
          name: "Kivu Hydro",
          slug: "kivu-hydro",
          stage: "pre_loi",
        },
      ],
      stakeholders: [
        {
          id: "stakeholder-1",
          name: "Amina Diallo",
          title: "Legal Counsel",
          organizationName: "Diallo Partners",
          projectSlug: "kivu-hydro",
        },
      ],
    });
    expect(mocks.searchMock).toHaveBeenCalledWith("user_123", "ki");
  });
});
