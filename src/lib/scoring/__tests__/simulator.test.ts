import { describe, it, expect, vi } from "vitest";

// Stub out the DB so that importing scoring/index.ts (which re-exports trendline.ts)
// does not throw at module load time due to missing DATABASE_URL.
vi.mock("@/lib/db", () => ({
  db: {
    projectRequirement: { findMany: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

import { simulateRequirementChanges } from "../simulator";
import { EXIM_REQUIREMENTS } from "@/lib/exim/requirements";
import { computeReadiness } from "../index";
import type { ProjectRequirementRow } from "@/lib/db/requirements";
import type { RequirementStatusValue } from "@/types/requirements";

// Build a minimal ProjectRequirementRow from an EXIM requirement definition
function makeRow(
  id: string,
  status: RequirementStatusValue,
  overrides: Partial<ProjectRequirementRow> = {}
): ProjectRequirementRow {
  const def = EXIM_REQUIREMENTS.find((r) => r.id === id);
  return {
    projectRequirementId: `pr-${id}`,
    requirementId: id,
    name: def?.name ?? id,
    description: def?.description ?? "",
    category: def?.category ?? "contracts",
    phaseRequired: def?.phaseRequired ?? "loi",
    isLoiCritical: def?.isLoiCritical ?? false,
    weight: def?.weight ?? 100,
    sortOrder: def?.sortOrder ?? 1,
    status,
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

// Build a full set of rows for all EXIM requirements at a given status
function allRows(status: RequirementStatusValue): ProjectRequirementRow[] {
  return EXIM_REQUIREMENTS.map((r) => makeRow(r.id, status));
}

describe("simulateRequirementChanges", () => {
  it("applying not_started → executed increases the score", () => {
    const rows = allRows("not_started");
    const currentScore = computeReadiness(
      rows.map((r) => ({ requirementId: r.requirementId, status: r.status }))
    ).scoreBps;

    const result = simulateRequirementChanges(
      rows,
      [{ requirementId: "epc_contract", newStatus: "executed" }],
      currentScore
    );

    expect(result.simulatedScoreBps).toBeGreaterThan(result.currentScoreBps);
    expect(result.deltaScoreBps).toBeGreaterThan(0);
  });

  it("applying multiple changes returns a correct aggregate delta", () => {
    const rows = allRows("not_started");
    const currentScore = 0;

    const result = simulateRequirementChanges(
      rows,
      [
        { requirementId: "epc_contract", newStatus: "executed" },
        { requirementId: "offtake_agreement", newStatus: "executed" },
      ],
      currentScore
    );

    // Both requirements bumped to executed — delta should be positive
    expect(result.deltaScoreBps).toBeGreaterThan(0);
    expect(result.changedRequirements).toHaveLength(2);
  });

  it("a requirement not in the changes list that is non-applicable does not affect the simulated score", () => {
    // All rows start at executed except epc_contract which is non-applicable.
    // We only change offtake_agreement (already executed → executed), so delta is 0.
    const rows = allRows("executed").map((r) =>
      r.requirementId === "epc_contract"
        ? { ...r, isApplicable: false }
        : r
    );

    const currentScore = computeReadiness(
      rows.map((r) => ({
        requirementId: r.requirementId,
        status: r.isApplicable === false
          ? ("not_applicable" as RequirementStatusValue)
          : r.status,
      }))
    ).scoreBps;

    // Changing a requirement that is already executed to executed → zero delta
    const result = simulateRequirementChanges(
      rows,
      [{ requirementId: "offtake_agreement", newStatus: "executed" }],
      currentScore
    );

    expect(result.deltaScoreBps).toBe(0);
  });

  it("loiReady is true when the simulated score reaches 6500 bps", () => {
    // Set all LOI-critical requirements to executed and most others to executed
    const rows = EXIM_REQUIREMENTS.map((r) =>
      makeRow(r.id, r.isLoiCritical ? "executed" : "executed")
    );

    const currentScore = computeReadiness(
      rows.map((r) => ({ requirementId: r.requirementId, status: r.status }))
    ).scoreBps;

    const result = simulateRequirementChanges(rows, [], currentScore);

    expect(result.loiReady).toBe(true);
    expect(result.simulatedScoreBps).toBeGreaterThanOrEqual(6500);
  });

  it("loiReady is false when simulated score is below 6500 bps", () => {
    const rows = allRows("not_started");
    const currentScore = 0;
    const result = simulateRequirementChanges(rows, [], currentScore);
    expect(result.loiReady).toBe(false);
    expect(result.simulatedScoreBps).toBeLessThan(6500);
  });

  it("changedRequirements contains correct fromStatus and toStatus", () => {
    const rows = allRows("not_started");
    const currentScore = 0;

    const result = simulateRequirementChanges(
      rows,
      [{ requirementId: "epc_contract", newStatus: "substantially_final" }],
      currentScore
    );

    expect(result.changedRequirements).toHaveLength(1);
    const changed = result.changedRequirements[0];
    expect(changed?.requirementId).toBe("epc_contract");
    expect(changed?.fromStatus).toBe("not_started");
    expect(changed?.toStatus).toBe("substantially_final");
  });

  it("empty changes array returns current score unchanged", () => {
    const rows = allRows("in_progress");
    const currentScore = computeReadiness(
      rows.map((r) => ({ requirementId: r.requirementId, status: r.status }))
    ).scoreBps;

    const result = simulateRequirementChanges(rows, [], currentScore);

    expect(result.simulatedScoreBps).toBe(currentScore);
    expect(result.deltaScoreBps).toBe(0);
    expect(result.changedRequirements).toHaveLength(0);
  });
});
