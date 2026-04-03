import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    dealConfig: {
      findUnique: vi.fn(),
    },
  },
}));

import { getDealConfig } from "../deal-config";
import { db } from "@/lib/db";

const mockDb = db as unknown as {
  dealConfig: { findUnique: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("getDealConfig", () => {
  it("returns stored values when config exists", async () => {
    mockDb.dealConfig.findUnique.mockResolvedValue({
      readinessThresholdBps: 7500,
      requireConcept: false,
      requireMilestoneDate: false,
    });

    const result = await getDealConfig("project-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.readinessThresholdBps).toBe(7500);
    expect(result.value.requireConcept).toBe(false);
    expect(result.value.requireMilestoneDate).toBe(false);
  });

  it("returns defaults when config is missing (readinessThresholdBps: 6500)", async () => {
    mockDb.dealConfig.findUnique.mockResolvedValue(null);

    const result = await getDealConfig("project-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.readinessThresholdBps).toBe(6500);
    expect(result.value.requireConcept).toBe(true);
    expect(result.value.requireMilestoneDate).toBe(true);
  });

  it("passes the correct projectId to the DB query", async () => {
    mockDb.dealConfig.findUnique.mockResolvedValue(null);

    await getDealConfig("specific-project-id");

    expect(mockDb.dealConfig.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: "specific-project-id" },
      })
    );
  });

  it("returns DATABASE_ERROR when db throws", async () => {
    mockDb.dealConfig.findUnique.mockRejectedValue(new Error("Connection timeout"));

    const result = await getDealConfig("project-1");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("DATABASE_ERROR");
    expect(result.error.message).toContain("Connection timeout");
  });

  it("stored config values take precedence over defaults", async () => {
    mockDb.dealConfig.findUnique.mockResolvedValue({
      readinessThresholdBps: 8000,
      requireConcept: true,
      requireMilestoneDate: false,
    });

    const result = await getDealConfig("project-2");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.readinessThresholdBps).toBe(8000);
    expect(result.value.requireMilestoneDate).toBe(false);
  });
});
