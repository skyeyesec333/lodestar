import { describe, it, expect, vi } from "vitest";
import {
  buildProjectOperatingMetrics,
  getDaysUntilDate,
  isRequirementDone,
  OPERATING_DONE_STATUSES,
} from "./operating-metrics";
import type { ProjectRequirementRow } from "@/lib/db/requirements";
import type { DocumentRow } from "@/lib/db/documents";

// ── Helpers ──────────────────────────────────────────────────────────────────

const REF_DATE = new Date("2026-04-07T00:00:00Z");

function makeReq(overrides: Partial<ProjectRequirementRow> = {}): ProjectRequirementRow {
  return {
    projectRequirementId: overrides.projectRequirementId ?? "pr-1",
    requirementId: overrides.requirementId ?? "req-1",
    name: overrides.name ?? "Test Requirement",
    description: "desc",
    category: overrides.category ?? "contracts",
    phaseRequired: "loi",
    isPrimaryGate: overrides.isPrimaryGate ?? false,
    weight: overrides.weight ?? 100,
    sortOrder: 1,
    status: overrides.status ?? "not_started",
    notes: null,
    isApplicable: overrides.isApplicable ?? true,
    autoFiltered: false,
    responsibleOrganizationId: overrides.responsibleOrganizationId ?? null,
    responsibleOrganizationName: null,
    responsibleStakeholderId: overrides.responsibleStakeholderId ?? null,
    responsibleStakeholderName: null,
    targetDate: overrides.targetDate ?? null,
    applicabilityReason: null,
    recentNotes: [],
  };
}

function makeDoc(overrides: Partial<DocumentRow> = {}): DocumentRow {
  return {
    id: overrides.id ?? "doc-1",
    documentGroupId: "dg-1",
    version: 1,
    filename: "file.pdf",
    storagePath: "/path",
    contentType: "application/pdf",
    sizeBytes: 1024,
    uploadedBy: "user-1",
    state: overrides.state ?? "current",
    projectRequirementId: overrides.projectRequirementId ?? null,
    expiresAt: overrides.expiresAt ?? null,
    expiryAlertDismissedAt: null,
    documentHash: null,
    createdAt: REF_DATE,
  };
}

// ── getDaysUntilDate ─────────────────────────────────────────────────────────

describe("getDaysUntilDate", () => {
  it("returns null for null/undefined date", () => {
    expect(getDaysUntilDate(null, REF_DATE)).toBeNull();
    expect(getDaysUntilDate(undefined, REF_DATE)).toBeNull();
  });

  it("returns 0 for same day", () => {
    expect(getDaysUntilDate(REF_DATE, REF_DATE)).toBe(0);
  });

  it("returns positive days for future date", () => {
    const future = new Date("2026-04-17T00:00:00Z");
    expect(getDaysUntilDate(future, REF_DATE)).toBe(10);
  });

  it("returns negative days for past date", () => {
    const past = new Date("2026-04-02T00:00:00Z");
    expect(getDaysUntilDate(past, REF_DATE)).toBe(-5);
  });
});

// ── isRequirementDone ────────────────────────────────────────────────────────

describe("isRequirementDone", () => {
  it.each(["substantially_final", "executed", "waived"])("returns true for %s", (status) => {
    expect(isRequirementDone(status)).toBe(true);
  });

  it.each(["not_started", "in_progress", "draft", "not_applicable"])("returns false for %s", (status) => {
    expect(isRequirementDone(status)).toBe(false);
  });
});

// ── buildProjectOperatingMetrics ─────────────────────────────────────────────

describe("buildProjectOperatingMetrics", () => {
  it("computes next stage for concept → pre_loi", () => {
    const result = buildProjectOperatingMetrics({
      stage: "concept",
      dealType: "exim_project_finance",
      requirements: [],
      documents: [],
      referenceDate: REF_DATE,
    });
    expect(result.nextStageId).toBe("pre_loi");
  });

  it("stays at financial_close when already at final stage", () => {
    const result = buildProjectOperatingMetrics({
      stage: "financial_close",
      dealType: "exim_project_finance",
      requirements: [],
      documents: [],
      referenceDate: REF_DATE,
    });
    expect(result.nextStageId).toBe("financial_close");
  });

  it("uses targetLoiDate for exim deals", () => {
    const loiDate = new Date("2026-04-17T00:00:00Z");
    const result = buildProjectOperatingMetrics({
      stage: "pre_loi",
      dealType: "exim_project_finance",
      targetLoiDate: loiDate,
      targetCloseDate: new Date("2026-12-01T00:00:00Z"),
      requirements: [],
      documents: [],
      referenceDate: REF_DATE,
    });
    expect(result.daysToNextGate).toBe(10);
  });

  it("uses targetCloseDate for non-exim deals", () => {
    const closeDate = new Date("2026-04-27T00:00:00Z");
    const result = buildProjectOperatingMetrics({
      stage: "pre_loi",
      dealType: "dfi_ifc",
      targetLoiDate: new Date("2026-04-17T00:00:00Z"),
      targetCloseDate: closeDate,
      requirements: [],
      documents: [],
      referenceDate: REF_DATE,
    });
    expect(result.daysToNextGate).toBe(20);
  });

  it("returns null daysToNextGate when no dates set", () => {
    const result = buildProjectOperatingMetrics({
      stage: "pre_loi",
      dealType: "exim_project_finance",
      requirements: [],
      documents: [],
      referenceDate: REF_DATE,
    });
    expect(result.daysToNextGate).toBeNull();
  });

  it("counts done requirements", () => {
    const requirements = [
      makeReq({ requirementId: "r1", status: "executed" }),
      makeReq({ requirementId: "r2", status: "substantially_final" }),
      makeReq({ requirementId: "r3", status: "waived" }),
      makeReq({ requirementId: "r4", status: "draft" }),
    ];
    const result = buildProjectOperatingMetrics({
      stage: "pre_loi",
      dealType: "exim_project_finance",
      requirements,
      documents: [],
      referenceDate: REF_DATE,
    });
    expect(result.doneCount).toBe(3);
  });

  it("skips non-applicable requirements", () => {
    const requirements = [
      makeReq({ requirementId: "r1", status: "not_started", isApplicable: true }),
      makeReq({ requirementId: "r2", status: "not_started", isApplicable: false }),
    ];
    const result = buildProjectOperatingMetrics({
      stage: "pre_loi",
      dealType: "exim_project_finance",
      requirements,
      documents: [],
      referenceDate: REF_DATE,
    });
    // Only the applicable requirement should be counted
    expect(result.doneCount).toBe(0);
    expect(result.missingEvidenceCount).toBe(1); // only applicable r1
  });

  it("counts overdue requirements with past targetDate", () => {
    const requirements = [
      makeReq({
        requirementId: "r1",
        status: "draft",
        targetDate: new Date("2026-04-01T00:00:00Z"),
      }),
      makeReq({
        requirementId: "r2",
        status: "draft",
        targetDate: new Date("2026-05-01T00:00:00Z"),
      }),
    ];
    const result = buildProjectOperatingMetrics({
      stage: "pre_loi",
      dealType: "exim_project_finance",
      requirements,
      documents: [],
      referenceDate: REF_DATE,
    });
    expect(result.overdueCount).toBe(1);
  });

  it("does not count done requirements as overdue even with past targetDate", () => {
    const requirements = [
      makeReq({
        requirementId: "r1",
        status: "executed",
        targetDate: new Date("2026-03-01T00:00:00Z"),
      }),
    ];
    const result = buildProjectOperatingMetrics({
      stage: "pre_loi",
      dealType: "exim_project_finance",
      requirements,
      documents: [],
      referenceDate: REF_DATE,
    });
    expect(result.overdueCount).toBe(0);
  });

  it("counts unassigned critical requirements", () => {
    const requirements = [
      makeReq({
        requirementId: "r1",
        isPrimaryGate: true,
        status: "draft",
        responsibleOrganizationId: null,
        responsibleStakeholderId: null,
      }),
      makeReq({
        requirementId: "r2",
        isPrimaryGate: true,
        status: "draft",
        responsibleOrganizationId: "org-1",
      }),
      makeReq({
        requirementId: "r3",
        isPrimaryGate: false,
        status: "draft",
        responsibleOrganizationId: null,
        responsibleStakeholderId: null,
      }),
    ];
    const result = buildProjectOperatingMetrics({
      stage: "pre_loi",
      dealType: "exim_project_finance",
      requirements,
      documents: [],
      referenceDate: REF_DATE,
    });
    expect(result.unassignedCriticalCount).toBe(1);
    expect(result.criticalOpenCount).toBe(2);
  });

  it("tracks document coverage per requirement", () => {
    const requirements = [
      makeReq({ projectRequirementId: "pr-1", requirementId: "r1", status: "draft" }),
      makeReq({ projectRequirementId: "pr-2", requirementId: "r2", status: "draft" }),
      makeReq({ projectRequirementId: "pr-3", requirementId: "r3", status: "draft" }),
    ];
    const documents = [
      makeDoc({ projectRequirementId: "pr-1", state: "current" }),
      makeDoc({ id: "doc-2", projectRequirementId: "pr-2", state: "current" }),
    ];
    const result = buildProjectOperatingMetrics({
      stage: "pre_loi",
      dealType: "exim_project_finance",
      requirements,
      documents,
      referenceDate: REF_DATE,
    });
    expect(result.coveredRequirementCount).toBe(2);
    expect(result.uncoveredRequirementCount).toBe(1);
    expect(result.missingEvidenceCount).toBe(1); // pr-3 has no docs and is not done
  });

  it("ignores superseded documents", () => {
    const requirements = [
      makeReq({ projectRequirementId: "pr-1", requirementId: "r1", status: "draft" }),
    ];
    const documents = [
      makeDoc({ projectRequirementId: "pr-1", state: "superseded" }),
    ];
    const result = buildProjectOperatingMetrics({
      stage: "pre_loi",
      dealType: "exim_project_finance",
      requirements,
      documents,
      referenceDate: REF_DATE,
    });
    expect(result.coveredRequirementCount).toBe(0);
    expect(result.uncoveredRequirementCount).toBe(1);
  });

  it("counts expiring evidence within 90-day window", () => {
    const documents = [
      makeDoc({
        id: "d1",
        projectRequirementId: "pr-1",
        state: "current",
        expiresAt: new Date("2026-05-01T00:00:00Z"), // 24 days out — within window
      }),
      makeDoc({
        id: "d2",
        projectRequirementId: "pr-2",
        state: "current",
        expiresAt: new Date("2026-08-01T00:00:00Z"), // 116 days out — outside window
      }),
      makeDoc({
        id: "d3",
        state: "current",
        expiresAt: new Date("2026-04-01T00:00:00Z"), // already expired — before ref date
      }),
    ];
    const result = buildProjectOperatingMetrics({
      stage: "pre_loi",
      dealType: "exim_project_finance",
      requirements: [],
      documents,
      referenceDate: REF_DATE,
    });
    expect(result.expiringEvidenceCount).toBe(1);
  });

  it("does not count missing evidence for done requirements", () => {
    const requirements = [
      makeReq({ projectRequirementId: "pr-1", requirementId: "r1", status: "executed" }),
    ];
    const result = buildProjectOperatingMetrics({
      stage: "pre_loi",
      dealType: "exim_project_finance",
      requirements,
      documents: [],
      referenceDate: REF_DATE,
    });
    expect(result.missingEvidenceCount).toBe(0);
  });

  it("returns zero counts for empty inputs", () => {
    const result = buildProjectOperatingMetrics({
      stage: "pre_loi",
      dealType: "exim_project_finance",
      requirements: [],
      documents: [],
      referenceDate: REF_DATE,
    });
    expect(result.hardBlockerCount).toBe(0);
    expect(result.softBlockerCount).toBe(0);
    expect(result.unassignedCriticalCount).toBe(0);
    expect(result.missingEvidenceCount).toBe(0);
    expect(result.expiringEvidenceCount).toBe(0);
    expect(result.overdueCount).toBe(0);
    expect(result.criticalOpenCount).toBe(0);
    expect(result.doneCount).toBe(0);
    expect(result.uncoveredRequirementCount).toBe(0);
    expect(result.coveredRequirementCount).toBe(0);
  });
});
