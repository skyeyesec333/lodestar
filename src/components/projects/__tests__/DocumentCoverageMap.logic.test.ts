import { describe, it, expect } from "vitest";
import {
  computeCoverage,
  getCoverageLabel,
} from "../DocumentCoverageMap.logic";
import type { DocumentRow } from "@/lib/db/documents";
import type { ProjectRequirementRow } from "@/lib/db/requirements";

function makeRequirement(
  overrides: Partial<ProjectRequirementRow> = {}
): ProjectRequirementRow {
  return {
    projectRequirementId: "req-1",
    requirementId: "r1",
    name: "Test Requirement",
    description: "",
    category: "contracts",
    phaseRequired: "loi",
    isLoiCritical: false,
    weight: 5,
    sortOrder: 1,
    status: "not_started",
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

function makeDocument(overrides: Partial<DocumentRow> = {}): DocumentRow {
  return {
    id: "doc-1",
    documentGroupId: "dg-1",
    version: 1,
    filename: "test.pdf",
    storagePath: "projects/p1/test.pdf",
    contentType: "application/pdf",
    sizeBytes: 1024,
    uploadedBy: "user-1",
    state: "active",
    projectRequirementId: null,
    expiresAt: null,
    expiryAlertDismissedAt: null,
    documentHash: null,
    createdAt: new Date("2026-01-01"),
    ...overrides,
  };
}

describe("computeCoverage", () => {
  it("returns zero coverage for empty inputs", () => {
    const result = computeCoverage([], []);
    expect(result.coveragePct).toBe(0);
    expect(result.loiCriticalTotal).toBe(0);
    expect(result.loiCriticalCovered).toBe(0);
    expect(result.orphanedDocuments).toHaveLength(0);
  });

  it("returns 0% coverage when no docs are linked", () => {
    const reqs = [makeRequirement({ projectRequirementId: "r1", isApplicable: true })];
    const result = computeCoverage(reqs, []);
    expect(result.coveragePct).toBe(0);
  });

  it("returns 100% coverage when all applicable reqs have docs", () => {
    const req = makeRequirement({ projectRequirementId: "r1", isApplicable: true });
    const doc = makeDocument({ projectRequirementId: "r1" });
    const result = computeCoverage([req], [doc]);
    expect(result.coveragePct).toBe(100);
  });

  it("ignores non-applicable requirements in coverage percentage", () => {
    const applicable = makeRequirement({
      projectRequirementId: "r1",
      requirementId: "r1",
      isApplicable: true,
    });
    const notApplicable = makeRequirement({
      projectRequirementId: "r2",
      requirementId: "r2",
      isApplicable: false,
    });
    const doc = makeDocument({ projectRequirementId: "r1" });
    const result = computeCoverage([applicable, notApplicable], [doc]);
    expect(result.coveragePct).toBe(100);
  });

  it("computes partial coverage correctly", () => {
    const reqs = [
      makeRequirement({ projectRequirementId: "r1", requirementId: "r1", isApplicable: true }),
      makeRequirement({ projectRequirementId: "r2", requirementId: "r2", isApplicable: true }),
      makeRequirement({ projectRequirementId: "r3", requirementId: "r3", isApplicable: true }),
      makeRequirement({ projectRequirementId: "r4", requirementId: "r4", isApplicable: true }),
    ];
    const docs = [makeDocument({ projectRequirementId: "r1" })];
    const result = computeCoverage(reqs, docs);
    expect(result.coveragePct).toBe(25);
  });

  it("identifies orphaned documents (no projectRequirementId)", () => {
    const doc = makeDocument({ projectRequirementId: null });
    const result = computeCoverage([], [doc]);
    expect(result.orphanedDocuments).toHaveLength(1);
    expect(result.orphanedDocuments[0].id).toBe("doc-1");
  });

  it("does not count orphaned docs as coverage", () => {
    const req = makeRequirement({ projectRequirementId: "r1", isApplicable: true });
    const orphan = makeDocument({ projectRequirementId: null });
    const result = computeCoverage([req], [orphan]);
    expect(result.coveragePct).toBe(0);
  });

  it("counts LOI-critical applicable requirements", () => {
    const loiReq = makeRequirement({
      projectRequirementId: "r1",
      requirementId: "r1",
      isApplicable: true,
      isLoiCritical: true,
    });
    const nonLoi = makeRequirement({
      projectRequirementId: "r2",
      requirementId: "r2",
      isApplicable: true,
      isLoiCritical: false,
    });
    const doc = makeDocument({ projectRequirementId: "r1" });
    const result = computeCoverage([loiReq, nonLoi], [doc]);
    expect(result.loiCriticalTotal).toBe(1);
    expect(result.loiCriticalCovered).toBe(1);
  });

  it("does not count LOI-critical non-applicable requirements", () => {
    const req = makeRequirement({
      projectRequirementId: "r1",
      isApplicable: false,
      isLoiCritical: true,
    });
    const result = computeCoverage([req], []);
    expect(result.loiCriticalTotal).toBe(0);
  });

  it("groups requirements into category buckets", () => {
    const contractsReq = makeRequirement({
      projectRequirementId: "r1",
      category: "contracts",
      isApplicable: true,
    });
    const financialReq = makeRequirement({
      projectRequirementId: "r2",
      category: "financial",
      isApplicable: true,
    });
    const result = computeCoverage([contractsReq, financialReq], []);
    const contractsBucket = result.buckets.find((b) => b.category === "contracts");
    const financialBucket = result.buckets.find((b) => b.category === "financial");
    expect(contractsBucket?.requirements).toHaveLength(1);
    expect(financialBucket?.requirements).toHaveLength(1);
  });

  it("bucket coveredCount only counts applicable reqs with docs", () => {
    const req = makeRequirement({ projectRequirementId: "r1", category: "contracts", isApplicable: true });
    const doc = makeDocument({ projectRequirementId: "r1" });
    const result = computeCoverage([req], [doc]);
    const bucket = result.buckets.find((b) => b.category === "contracts")!;
    expect(bucket.coveredCount).toBe(1);
    expect(bucket.applicableCount).toBe(1);
  });

  it("bucket documentCount totals all docs in the category", () => {
    const req = makeRequirement({ projectRequirementId: "r1", category: "contracts", isApplicable: true });
    const doc1 = makeDocument({ id: "d1", projectRequirementId: "r1" });
    const doc2 = makeDocument({ id: "d2", projectRequirementId: "r1" });
    const result = computeCoverage([req], [doc1, doc2]);
    const bucket = result.buckets.find((b) => b.category === "contracts")!;
    expect(bucket.documentCount).toBe(2);
  });

  it("builds docsByRequirementId map correctly", () => {
    const req = makeRequirement({ projectRequirementId: "r1" });
    const doc = makeDocument({ projectRequirementId: "r1" });
    const result = computeCoverage([req], [doc]);
    expect(result.docsByRequirementId.get("r1")).toHaveLength(1);
  });

  it("returns 0% when all applicable requirements have no docs", () => {
    const reqs = Array.from({ length: 5 }, (_, i) =>
      makeRequirement({ projectRequirementId: `r${i}`, requirementId: `r${i}`, isApplicable: true })
    );
    const result = computeCoverage(reqs, []);
    expect(result.coveragePct).toBe(0);
  });
});

describe("getCoverageLabel", () => {
  it("returns 'Not applicable' for non-applicable requirement", () => {
    const req = makeRequirement({ isApplicable: false });
    expect(getCoverageLabel(req, 0)).toBe("Not applicable");
  });

  it("returns '1 linked file' for exactly one doc", () => {
    const req = makeRequirement({ isApplicable: true });
    expect(getCoverageLabel(req, 1)).toBe("1 linked file");
  });

  it("returns 'N linked files' for multiple docs", () => {
    const req = makeRequirement({ isApplicable: true });
    expect(getCoverageLabel(req, 3)).toBe("3 linked files");
  });

  it("returns 'Needs linked evidence' for executed status with no docs", () => {
    const req = makeRequirement({ isApplicable: true, status: "executed" });
    expect(getCoverageLabel(req, 0)).toBe("Needs linked evidence");
  });

  it("returns 'Needs linked evidence' for waived status with no docs", () => {
    const req = makeRequirement({ isApplicable: true, status: "waived" });
    expect(getCoverageLabel(req, 0)).toBe("Needs linked evidence");
  });

  it("returns 'Evidence still pending' for substantially_final with no docs", () => {
    const req = makeRequirement({ isApplicable: true, status: "substantially_final" });
    expect(getCoverageLabel(req, 0)).toBe("Evidence still pending");
  });

  it("returns 'No linked files' for not_started with no docs", () => {
    const req = makeRequirement({ isApplicable: true, status: "not_started" });
    expect(getCoverageLabel(req, 0)).toBe("No linked files");
  });

  it("returns 'No linked files' for in_progress with no docs", () => {
    const req = makeRequirement({ isApplicable: true, status: "in_progress" });
    expect(getCoverageLabel(req, 0)).toBe("No linked files");
  });
});
