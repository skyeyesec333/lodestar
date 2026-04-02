import { describe, it, expect } from "vitest";
import { checkStageGate } from "@/lib/projects/stage-gate";
import type { ProjectRequirementRow } from "@/lib/db/requirements";

function makeReq(overrides: Partial<ProjectRequirementRow> = {}): ProjectRequirementRow {
  return {
    projectRequirementId: "pr-default",
    requirementId: "req-default",
    name: "Default Requirement",
    description: "A requirement",
    category: "commercial",
    phaseRequired: "loi_submitted",
    isLoiCritical: false,
    weight: 1,
    sortOrder: 0,
    status: "not_started",
    notes: null,
    isApplicable: true,
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

describe("checkStageGate — loi_submitted", () => {
  it("returns canAdvance: true and no blockers when there are no LOI-critical items", () => {
    const requirements = [
      makeReq({ requirementId: "req-1", isLoiCritical: false, status: "not_started" }),
      makeReq({ requirementId: "req-2", isLoiCritical: false, status: "in_progress" }),
    ];

    const result = checkStageGate("loi_submitted", requirements);

    expect(result.canAdvance).toBe(true);
    expect(result.hardBlockers).toHaveLength(0);
  });

  it("returns canAdvance: true when all LOI-critical items are substantially_final", () => {
    const requirements = [
      makeReq({ requirementId: "req-1", isLoiCritical: true, status: "substantially_final" }),
      makeReq({ requirementId: "req-2", isLoiCritical: true, status: "executed" }),
    ];

    const result = checkStageGate("loi_submitted", requirements);

    expect(result.canAdvance).toBe(true);
    expect(result.hardBlockers).toHaveLength(0);
  });

  it("returns canAdvance: false and lists blockers when LOI-critical items are not done", () => {
    const requirements = [
      makeReq({ requirementId: "req-1", name: "EPC Term Sheet", isLoiCritical: true, status: "not_started" }),
      makeReq({ requirementId: "req-2", name: "Off-take Agreement", isLoiCritical: true, status: "in_progress" }),
      makeReq({ requirementId: "req-3", name: "Financial Model", isLoiCritical: true, status: "substantially_final" }),
    ];

    const result = checkStageGate("loi_submitted", requirements);

    expect(result.canAdvance).toBe(false);
    expect(result.hardBlockers).toHaveLength(2);
    expect(result.hardBlockers.map((b) => b.name)).toContain("EPC Term Sheet");
    expect(result.hardBlockers.map((b) => b.name)).toContain("Off-take Agreement");
    expect(result.hardBlockers.map((b) => b.name)).not.toContain("Financial Model");
  });

  it("excludes isApplicable: false items from hard blockers", () => {
    const requirements = [
      makeReq({ requirementId: "req-1", isLoiCritical: true, status: "not_started", isApplicable: false }),
    ];

    const result = checkStageGate("loi_submitted", requirements);

    expect(result.canAdvance).toBe(true);
    expect(result.hardBlockers).toHaveLength(0);
  });

  it("treats status=not_applicable as a blocker when the item is LOI-critical and isApplicable: true", () => {
    // 'not_applicable' status is NOT in DONE_STATUSES — structural exclusion requires isApplicable: false
    const requirements = [
      makeReq({ requirementId: "req-1", isLoiCritical: true, status: "not_applicable", isApplicable: true }),
    ];

    const result = checkStageGate("loi_submitted", requirements);

    expect(result.canAdvance).toBe(false);
    expect(result.hardBlockers).toHaveLength(1);
  });

  it("includes non-critical not_started items as soft blockers", () => {
    const requirements = [
      makeReq({ requirementId: "req-1", isLoiCritical: true, status: "substantially_final" }),
      makeReq({ requirementId: "req-2", name: "ESIA", isLoiCritical: false, status: "not_started" }),
      makeReq({ requirementId: "req-3", name: "Feasibility Study", isLoiCritical: false, status: "in_progress" }),
    ];

    const result = checkStageGate("loi_submitted", requirements);

    expect(result.canAdvance).toBe(true);
    expect(result.softBlockers).toHaveLength(1);
    expect(result.softBlockers[0]?.name).toBe("ESIA");
  });
});

describe("checkStageGate — final_commitment", () => {
  it("returns canAdvance: true when all applicable items are done", () => {
    const requirements = [
      makeReq({ requirementId: "req-1", isLoiCritical: true, status: "substantially_final" }),
      makeReq({ requirementId: "req-2", isLoiCritical: false, status: "executed" }),
    ];

    const result = checkStageGate("final_commitment", requirements);

    expect(result.canAdvance).toBe(true);
    expect(result.hardBlockers).toHaveLength(0);
  });

  it("includes both LOI-critical and non-critical items as hard blockers when not done", () => {
    const requirements = [
      makeReq({ requirementId: "req-1", name: "EPC Contract", isLoiCritical: true, status: "not_started" }),
      makeReq({ requirementId: "req-2", name: "Board Resolution", isLoiCritical: false, status: "in_progress" }),
      makeReq({ requirementId: "req-3", name: "Financial Model", isLoiCritical: true, status: "substantially_final" }),
    ];

    const result = checkStageGate("final_commitment", requirements);

    expect(result.canAdvance).toBe(false);
    expect(result.hardBlockers).toHaveLength(2);
    expect(result.hardBlockers.map((b) => b.name)).toContain("EPC Contract");
    expect(result.hardBlockers.map((b) => b.name)).toContain("Board Resolution");
    expect(result.softBlockers).toHaveLength(0);
  });

  it("returns no hard blockers for items with isApplicable: false", () => {
    const requirements = [
      makeReq({ requirementId: "req-1", isLoiCritical: false, status: "not_started", isApplicable: false }),
      makeReq({ requirementId: "req-2", isLoiCritical: true, status: "executed" }),
    ];

    const result = checkStageGate("final_commitment", requirements);

    expect(result.canAdvance).toBe(true);
    expect(result.hardBlockers).toHaveLength(0);
  });
});

describe("checkStageGate — pre_loi (early stage)", () => {
  it("has no hard blockers regardless of item status", () => {
    const requirements = [
      makeReq({ requirementId: "req-1", isLoiCritical: true, status: "not_started" }),
      makeReq({ requirementId: "req-2", isLoiCritical: false, status: "not_started" }),
    ];

    const result = checkStageGate("pre_loi", requirements);

    expect(result.canAdvance).toBe(true);
    expect(result.hardBlockers).toHaveLength(0);
  });

  it("lists not_started applicable items as soft blockers", () => {
    const requirements = [
      makeReq({ requirementId: "req-1", name: "Feasibility Study", status: "not_started" }),
      makeReq({ requirementId: "req-2", name: "EPC Term Sheet", status: "in_progress" }),
      makeReq({ requirementId: "req-3", name: "Environmental Review", status: "not_started" }),
    ];

    const result = checkStageGate("pre_loi", requirements);

    expect(result.softBlockers).toHaveLength(2);
    expect(result.softBlockers.map((b) => b.name)).toContain("Feasibility Study");
    expect(result.softBlockers.map((b) => b.name)).toContain("Environmental Review");
    expect(result.softBlockers.map((b) => b.name)).not.toContain("EPC Term Sheet");
  });

  it("excludes isApplicable: false items from soft blockers", () => {
    const requirements = [
      makeReq({ requirementId: "req-1", status: "not_started", isApplicable: false }),
    ];

    const result = checkStageGate("pre_loi", requirements);

    expect(result.softBlockers).toHaveLength(0);
  });

  it("has empty soft blockers when all applicable items are in progress or done", () => {
    const requirements = [
      makeReq({ requirementId: "req-1", status: "in_progress" }),
      makeReq({ requirementId: "req-2", status: "substantially_final" }),
    ];

    const result = checkStageGate("pre_loi", requirements);

    expect(result.canAdvance).toBe(true);
    expect(result.softBlockers).toHaveLength(0);
  });
});

describe("checkStageGate — GateBlocker shape", () => {
  it("blocker objects include the expected fields", () => {
    const requirements = [
      makeReq({
        requirementId: "req-abc",
        name: "EPC Term Sheet",
        category: "commercial",
        status: "not_started",
        isLoiCritical: true,
      }),
    ];

    const result = checkStageGate("loi_submitted", requirements);

    expect(result.hardBlockers[0]).toMatchObject({
      requirementId: "req-abc",
      name: "EPC Term Sheet",
      category: "commercial",
      status: "not_started",
      isLoiCritical: true,
    });
  });
});
