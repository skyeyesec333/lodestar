import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db before importing the module under test
vi.mock("./index", () => ({
  db: {
    dealMilestone: { findMany: vi.fn() },
    projectRequirement: { findMany: vi.fn() },
    project: { findUnique: vi.fn() },
    activityEvent: { findFirst: vi.fn() },
  },
}));

// The module imports from "./index" (relative), but since we can't intercept
// that alias via the above mock when using @/lib/db path alias, mock via the
// alias path instead.
vi.mock("@/lib/db", () => ({
  db: {
    dealMilestone: { findMany: vi.fn() },
    projectRequirement: { findMany: vi.fn() },
    project: { findUnique: vi.fn() },
    activityEvent: { findFirst: vi.fn() },
  },
}));

import { getTimelineRisks } from "../timeline-risks";
import { db } from "@/lib/db";

const mockDb = db as unknown as {
  dealMilestone: { findMany: ReturnType<typeof vi.fn> };
  projectRequirement: { findMany: ReturnType<typeof vi.fn> };
  project: { findUnique: ReturnType<typeof vi.fn> };
  activityEvent: { findFirst: ReturnType<typeof vi.fn> };
};

// Helper to produce a Date offset from today (in whole days)
function daysFromNow(days: number): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0); // mid-day to avoid timezone edge cases
  d.setDate(d.getDate() + days);
  return d;
}

beforeEach(() => {
  vi.resetAllMocks();
  // Default: no project data, no stall
  mockDb.dealMilestone.findMany.mockResolvedValue([]);
  mockDb.projectRequirement.findMany.mockResolvedValue([]);
  mockDb.project.findUnique.mockResolvedValue(null);
  mockDb.activityEvent.findFirst.mockResolvedValue({ id: "activity-1" }); // not stalled by default
});

describe("getTimelineRisks — milestone_due_soon", () => {
  it("milestone due in 2 days → severity 'critical'", async () => {
    mockDb.dealMilestone.findMany.mockResolvedValue([
      { id: "m1", name: "Financial Close", targetDate: daysFromNow(2) },
    ]);

    const result = await getTimelineRisks("proj-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const risk = result.value.find((r) => r.type === "milestone_due_soon");
    expect(risk).toBeDefined();
    expect(risk?.severity).toBe("critical");
    expect(risk?.entityId).toBe("m1");
  });

  it("milestone due in 5 days → severity 'warning'", async () => {
    mockDb.dealMilestone.findMany.mockResolvedValue([
      { id: "m2", name: "LOI Submission", targetDate: daysFromNow(5) },
    ]);

    const result = await getTimelineRisks("proj-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const risk = result.value.find((r) => r.type === "milestone_due_soon");
    expect(risk).toBeDefined();
    expect(risk?.severity).toBe("warning");
  });

  it("milestone due in 8 days → no milestone_due_soon risk (outside 7-day window)", async () => {
    mockDb.dealMilestone.findMany.mockResolvedValue([
      { id: "m3", name: "Site Survey", targetDate: daysFromNow(8) },
    ]);

    const result = await getTimelineRisks("proj-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const risk = result.value.find((r) => r.type === "milestone_due_soon");
    expect(risk).toBeUndefined();
  });

  it("milestone due today → severity 'critical' (daysUntil = 0 ≤ 3)", async () => {
    mockDb.dealMilestone.findMany.mockResolvedValue([
      { id: "m4", name: "Board Approval", targetDate: daysFromNow(0) },
    ]);

    const result = await getTimelineRisks("proj-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const risk = result.value.find((r) => r.type === "milestone_due_soon");
    expect(risk?.severity).toBe("critical");
  });
});

describe("getTimelineRisks — requirement_overdue", () => {
  it("requirement with past targetDate → type 'requirement_overdue'", async () => {
    mockDb.projectRequirement.findMany.mockResolvedValue([
      {
        id: "req-1",
        targetDate: daysFromNow(-5),
        requirement: { name: "EPC Contract" },
      },
    ]);

    const result = await getTimelineRisks("proj-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const risk = result.value.find((r) => r.type === "requirement_overdue");
    expect(risk).toBeDefined();
    expect(risk?.severity).toBe("warning");
    expect(risk?.entityName).toBe("EPC Contract");
  });
});

describe("getTimelineRisks — deal_stalled", () => {
  it("no recent activity → deal_stalled risk with severity 'warning'", async () => {
    mockDb.activityEvent.findFirst.mockResolvedValue(null);

    const result = await getTimelineRisks("proj-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const risk = result.value.find((r) => r.type === "deal_stalled");
    expect(risk).toBeDefined();
    expect(risk?.severity).toBe("warning");
  });

  it("recent activity exists → no deal_stalled risk", async () => {
    mockDb.activityEvent.findFirst.mockResolvedValue({ id: "act-1" });

    const result = await getTimelineRisks("proj-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const risk = result.value.find((r) => r.type === "deal_stalled");
    expect(risk).toBeUndefined();
  });
});

describe("getTimelineRisks — loi_overdue", () => {
  it("targetLoiDate in the past and stage not past LOI → loi_overdue risk", async () => {
    mockDb.project.findUnique.mockResolvedValue({
      targetLoiDate: daysFromNow(-10),
      stage: "pre_loi",
    });

    const result = await getTimelineRisks("proj-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const risk = result.value.find((r) => r.type === "loi_overdue");
    expect(risk).toBeDefined();
    expect(risk?.severity).toBe("critical");
  });

  it("stage is 'loi_approved' → no loi_overdue risk even if date passed", async () => {
    mockDb.project.findUnique.mockResolvedValue({
      targetLoiDate: daysFromNow(-5),
      stage: "loi_approved",
    });

    const result = await getTimelineRisks("proj-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const risk = result.value.find((r) => r.type === "loi_overdue");
    expect(risk).toBeUndefined();
  });
});

describe("getTimelineRisks — error handling", () => {
  it("returns DATABASE_ERROR when db throws", async () => {
    mockDb.dealMilestone.findMany.mockRejectedValue(new Error("DB unavailable"));

    const result = await getTimelineRisks("proj-1");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("DATABASE_ERROR");
  });
});
