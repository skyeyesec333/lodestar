import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all DB dependencies before importing anything
vi.mock("@/lib/db", () => ({
  db: {
    projectRequirement: {
      findMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

import { computeReadinessTrendline } from "../trendline";
import { db } from "@/lib/db";

const mockDb = db as unknown as {
  projectRequirement: { findMany: ReturnType<typeof vi.fn> };
  $queryRaw: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.resetAllMocks();
});

// Helper: build a minimal status row
function makeStatusRow(requirementId: string, status: string) {
  return { requirementId, status };
}

describe("computeReadinessTrendline", () => {
  it("returns isStalled=true when no recent notes or activity", async () => {
    mockDb.projectRequirement.findMany.mockResolvedValue([
      makeStatusRow("epc_contract", "in_progress"),
    ]);
    // No notes, no activity
    mockDb.$queryRaw
      .mockResolvedValueOnce([]) // noteRows
      .mockResolvedValueOnce([]); // recentActivity

    const result = await computeReadinessTrendline("proj-1", 2000);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.isStalled).toBe(true);
  });

  it("returns isStalled=false when recent activity exists", async () => {
    mockDb.projectRequirement.findMany.mockResolvedValue([
      makeStatusRow("epc_contract", "in_progress"),
    ]);
    mockDb.$queryRaw
      .mockResolvedValueOnce([]) // noteRows (no notes)
      .mockResolvedValueOnce([{ createdAt: new Date() }]); // recentActivity

    const result = await computeReadinessTrendline("proj-1", 2000);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.isStalled).toBe(false);
  });

  it("returns currentScoreBps as the passed-in value", async () => {
    mockDb.projectRequirement.findMany.mockResolvedValue([]);
    mockDb.$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await computeReadinessTrendline("proj-1", 3750);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.currentScoreBps).toBe(3750);
  });

  it("returns sevenDayAvgBps=null and thirtyDayAvgBps=null when no notes exist", async () => {
    mockDb.projectRequirement.findMany.mockResolvedValue([
      makeStatusRow("epc_contract", "executed"),
    ]);
    mockDb.$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await computeReadinessTrendline("proj-1", 5000);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.sevenDayAvgBps).toBeNull();
    expect(result.value.thirtyDayAvgBps).toBeNull();
  });

  it("returns velocityBpsPerDay=null when insufficient history", async () => {
    mockDb.projectRequirement.findMany.mockResolvedValue([
      makeStatusRow("epc_contract", "in_progress"),
    ]);
    mockDb.$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await computeReadinessTrendline("proj-1", 1000);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.velocityBpsPerDay).toBeNull();
  });

  it("returns projectedGateDateISO=null when velocity is null", async () => {
    mockDb.projectRequirement.findMany.mockResolvedValue([]);
    mockDb.$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await computeReadinessTrendline("proj-1", 3000);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.projectedGateDateISO).toBeNull();
  });

  it("returns projectedGateDateISO as today's date when score is already at or above 6500 bps and velocity is positive", async () => {
    // Provide a note so the reconstruction yields sufficientData and a positive velocity
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    mockDb.projectRequirement.findMany.mockResolvedValue([
      makeStatusRow("epc_contract", "executed"),
    ]);

    const noteRow = {
      requirementId: "epc_contract",
      statusSnapshot: "in_progress",
      createdAt: sevenDaysAgo,
    };

    mockDb.$queryRaw
      .mockResolvedValueOnce([noteRow]) // noteRows
      .mockResolvedValueOnce([{ createdAt: new Date() }]); // recentActivity

    // Score is already >= 6500
    const result = await computeReadinessTrendline("proj-1", 7000);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // When already past threshold, projected date is today
    const today = new Date().toISOString().slice(0, 10);
    expect(result.value.projectedGateDateISO).toBe(today);
  });

  it("returns a DATABASE_ERROR when db throws", async () => {
    mockDb.projectRequirement.findMany.mockRejectedValue(new Error("DB down"));

    const result = await computeReadinessTrendline("proj-1", 0);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("DATABASE_ERROR");
  });
});
