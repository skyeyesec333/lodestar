import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authMock: vi.fn(),
  emailMock: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.authMock,
}));

vi.mock("@/lib/notifications/email", () => ({
  sendConsultationRequestEmail: mocks.emailMock,
}));

vi.mock("@/lib/experts/directory", () => ({
  EXPERTS: [
    {
      id: "sarah-chen",
      name: "Sarah Chen",
    },
  ],
}));

async function loadRoute() {
  return import("./route");
}

describe("POST /api/experts/request", () => {
  beforeEach(() => {
    mocks.authMock.mockReset();
    mocks.emailMock.mockReset();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("rejects unauthenticated requests", async () => {
    mocks.authMock.mockResolvedValue({ userId: null });

    const { POST } = await loadRoute();
    const response = await POST(
      new Request("http://localhost/api/experts/request", {
        method: "POST",
      }) as never
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(mocks.emailMock).not.toHaveBeenCalled();
  });

  it("rejects invalid payloads", async () => {
    mocks.authMock.mockResolvedValue({ userId: "user_123" });

    const { POST } = await loadRoute();
    const response = await POST(
      new Request("http://localhost/api/experts/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expertId: "sarah-chen",
          context: "short",
          timing: "soon",
        }),
      }) as never
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Please describe your situation in at least 10 characters.",
    });
    expect(mocks.emailMock).not.toHaveBeenCalled();
  });

  it("queues the consultation request email and returns ok", async () => {
    mocks.authMock.mockResolvedValue({ userId: "user_123" });
    mocks.emailMock.mockResolvedValue(undefined);

    const { POST } = await loadRoute();
    const response = await POST(
      new Request("http://localhost/api/experts/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expertId: "sarah-chen",
          context: "We need help with LOI readiness planning.",
          timing: "this week",
        }),
      }) as never
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(mocks.emailMock).toHaveBeenCalledWith({
      expertId: "sarah-chen",
      expertName: "Sarah Chen",
      userId: "user_123",
      context: "We need help with LOI readiness planning.",
      timing: "this week",
    });
  });
});
