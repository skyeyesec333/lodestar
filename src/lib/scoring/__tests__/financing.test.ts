import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module before importing the module under test
vi.mock("@/lib/db", () => ({
  db: {
    debtTranche: {
      findMany: vi.fn(),
    },
    covenant: {
      findMany: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
    },
  },
}));

import { assessFinancingReadiness } from "../financing";
import { db } from "@/lib/db";

const mockDb = db as unknown as {
  debtTranche: { findMany: ReturnType<typeof vi.fn> };
  covenant: { findMany: ReturnType<typeof vi.fn> };
  project: { findUnique: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("assessFinancingReadiness", () => {
  it("no tranches and no covenants → level 'none' with penaltyBps 0", async () => {
    mockDb.debtTranche.findMany.mockResolvedValue([]);
    mockDb.covenant.findMany.mockResolvedValue([]);
    mockDb.project.findUnique.mockResolvedValue({ capexUsdCents: null });

    const result = await assessFinancingReadiness("project-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.level).toBe("none");
    expect(result.value.penaltyBps).toBe(0);
    expect(result.value.flags).toHaveLength(0);
  });

  it("tranche with status 'term_sheet' → level 'low' with penaltyBps 200", async () => {
    mockDb.debtTranche.findMany.mockResolvedValue([
      { id: "t1", amountUsdCents: BigInt(1_000_000_00), status: "term_sheet" },
    ]);
    mockDb.covenant.findMany.mockResolvedValue([]);
    mockDb.project.findUnique.mockResolvedValue({ capexUsdCents: null });

    const result = await assessFinancingReadiness("project-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.level).toBe("low");
    expect(result.value.penaltyBps).toBe(200);
    expect(result.value.flags).toContain("Debt not yet committed");
  });

  it("covenant with overdue nextDueAt → level 'high' with penaltyBps 1000", async () => {
    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
    mockDb.debtTranche.findMany.mockResolvedValue([]);
    mockDb.covenant.findMany.mockResolvedValue([
      { id: "c1", title: "DSCR", status: "active", nextDueAt: pastDate },
    ]);
    mockDb.project.findUnique.mockResolvedValue({ capexUsdCents: null });

    const result = await assessFinancingReadiness("project-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.level).toBe("high");
    expect(result.value.penaltyBps).toBe(1000);
    expect(result.value.flags).toContain("Active covenant breach");
  });

  it("covenant due within 14 days (not yet overdue) → level 'medium' with penaltyBps 500", async () => {
    const soonDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    mockDb.debtTranche.findMany.mockResolvedValue([]);
    mockDb.covenant.findMany.mockResolvedValue([
      { id: "c1", title: "LTV", status: "active", nextDueAt: soonDate },
    ]);
    mockDb.project.findUnique.mockResolvedValue({ capexUsdCents: null });

    const result = await assessFinancingReadiness("project-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.level).toBe("medium");
    expect(result.value.penaltyBps).toBe(500);
    expect(result.value.flags).toContain("Covenant at risk");
  });

  it("high covenant breach overrides lower-level tranche flag", async () => {
    const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    mockDb.debtTranche.findMany.mockResolvedValue([
      { id: "t1", amountUsdCents: BigInt(500_000_00), status: "term_sheet" },
    ]);
    mockDb.covenant.findMany.mockResolvedValue([
      { id: "c1", title: "ICR", status: "active", nextDueAt: pastDate },
    ]);
    mockDb.project.findUnique.mockResolvedValue({ capexUsdCents: null });

    const result = await assessFinancingReadiness("project-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.level).toBe("high");
    expect(result.value.penaltyBps).toBe(1000);
  });

  it("committed tranche covers >=50% of capex → no debt coverage flag", async () => {
    const capex = BigInt(10_000_000_00); // $10M
    mockDb.debtTranche.findMany.mockResolvedValue([
      { id: "t1", amountUsdCents: BigInt(6_000_000_00), status: "committed" }, // $6M = 60%
    ]);
    mockDb.covenant.findMany.mockResolvedValue([]);
    mockDb.project.findUnique.mockResolvedValue({ capexUsdCents: capex });

    const result = await assessFinancingReadiness("project-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.flags).not.toContain("Debt coverage below 50%");
    expect(result.value.level).toBe("none");
  });

  it("committed tranche covers <50% of capex → medium risk with debt coverage flag", async () => {
    const capex = BigInt(10_000_000_00); // $10M
    mockDb.debtTranche.findMany.mockResolvedValue([
      { id: "t1", amountUsdCents: BigInt(4_000_000_00), status: "committed" }, // $4M = 40%
    ]);
    mockDb.covenant.findMany.mockResolvedValue([]);
    mockDb.project.findUnique.mockResolvedValue({ capexUsdCents: capex });

    const result = await assessFinancingReadiness("project-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.level).toBe("medium");
    expect(result.value.penaltyBps).toBe(500);
    expect(result.value.flags).toContain("Debt coverage below 50%");
  });

  it("returns DATABASE_ERROR when db throws", async () => {
    mockDb.debtTranche.findMany.mockRejectedValue(new Error("Connection lost"));
    mockDb.covenant.findMany.mockResolvedValue([]);
    mockDb.project.findUnique.mockResolvedValue(null);

    const result = await assessFinancingReadiness("project-1");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("DATABASE_ERROR");
  });
});
