import { describe, it, expect } from "vitest";
import {
  toUtcMidnight,
  getDaysUntilDue,
  getPriority,
  getStatusTone,
  getStatusLabel,
  ownerLabel,
  buildItems,
  buildOwnerBuckets,
} from "../CriticalPathBoard.logic";
import type { ProjectRequirementRow } from "@/lib/db/requirements";

const REFERENCE_DATE = "2026-03-29";

function makeRow(overrides: Partial<ProjectRequirementRow> = {}): ProjectRequirementRow {
  return {
    projectRequirementId: "req-1",
    requirementId: "r1",
    name: "Test Requirement",
    description: "A test requirement",
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

function targetDate(daysFromReference: number): Date {
  const d = new Date(REFERENCE_DATE);
  d.setDate(d.getDate() + daysFromReference);
  return d;
}

describe("toUtcMidnight", () => {
  it("returns a UTC midnight timestamp", () => {
    const ts = toUtcMidnight("2026-03-29");
    const d = new Date(ts);
    expect(d.getUTCHours()).toBe(0);
    expect(d.getUTCMinutes()).toBe(0);
    expect(d.getUTCSeconds()).toBe(0);
  });
});

describe("getDaysUntilDue", () => {
  it("returns null when targetDate is null", () => {
    expect(getDaysUntilDue(null, REFERENCE_DATE)).toBeNull();
  });

  it("returns 0 when due today", () => {
    expect(getDaysUntilDue(new Date(REFERENCE_DATE), REFERENCE_DATE)).toBe(0);
  });

  it("returns positive when due in the future", () => {
    expect(getDaysUntilDue(targetDate(7), REFERENCE_DATE)).toBe(7);
  });

  it("returns negative when overdue", () => {
    expect(getDaysUntilDue(targetDate(-3), REFERENCE_DATE)).toBe(-3);
  });
});

describe("getPriority", () => {
  it("returns 0 for executed requirements", () => {
    const row = makeRow({ status: "executed" });
    expect(getPriority(row, null)).toBe(0);
  });

  it("returns 0 for waived requirements", () => {
    const row = makeRow({ status: "waived" });
    expect(getPriority(row, null)).toBe(0);
  });

  it("returns 0 for non-applicable requirements", () => {
    const row = makeRow({ isApplicable: false });
    expect(getPriority(row, null)).toBe(0);
  });

  it("gives LOI-critical requirements higher base score", () => {
    const loiRow = makeRow({ isLoiCritical: true });
    const normalRow = makeRow({ isLoiCritical: false });
    expect(getPriority(loiRow, null)).toBeGreaterThan(getPriority(normalRow, null));
  });

  it("adds large bonus for overdue requirements", () => {
    const overdueRow = makeRow();
    const notDueRow = makeRow();
    const overdueScore = getPriority(overdueRow, -1);
    const notDueScore = getPriority(notDueRow, null);
    expect(overdueScore).toBeGreaterThan(notDueScore);
  });

  it("adds bonus for unassigned owner", () => {
    const unassigned = makeRow();
    const assigned = makeRow({ responsibleOrganizationName: "ACME Corp" });
    expect(getPriority(unassigned, null)).toBeGreaterThan(getPriority(assigned, null));
  });

  it("tiers due-date bonuses correctly: overdue > <=14d > <=30d > <=60d > no date", () => {
    const row = makeRow();
    const overdue = getPriority(row, -1);
    const soon = getPriority(row, 7);
    const nearTerm = getPriority(row, 20);
    const midTerm = getPriority(row, 45);
    const noDue = getPriority(row, null);
    expect(overdue).toBeGreaterThan(soon);
    expect(soon).toBeGreaterThan(nearTerm);
    expect(nearTerm).toBeGreaterThan(midTerm);
    expect(midTerm).toBeGreaterThan(noDue);
  });
});

describe("getStatusTone", () => {
  it("returns done for executed", () => {
    expect(getStatusTone(makeRow({ status: "executed" }), null)).toBe("done");
  });

  it("returns done for waived", () => {
    expect(getStatusTone(makeRow({ status: "waived" }), null)).toBe("done");
  });

  it("returns done for non-applicable", () => {
    expect(getStatusTone(makeRow({ isApplicable: false }), null)).toBe("done");
  });

  it("returns critical when overdue", () => {
    expect(getStatusTone(makeRow(), -1)).toBe("critical");
  });

  it("returns warning for LOI critical", () => {
    expect(getStatusTone(makeRow({ isLoiCritical: true }), 60)).toBe("warning");
  });

  it("returns warning when due within 30 days", () => {
    expect(getStatusTone(makeRow(), 15)).toBe("warning");
    expect(getStatusTone(makeRow(), 30)).toBe("warning");
  });

  it("returns neutral otherwise", () => {
    expect(getStatusTone(makeRow(), 31)).toBe("neutral");
    expect(getStatusTone(makeRow(), null)).toBe("neutral");
  });
});

describe("getStatusLabel", () => {
  it("returns 'Not applicable' when isApplicable is false", () => {
    expect(getStatusLabel(makeRow({ isApplicable: false }))).toBe("Not applicable");
  });

  it("returns 'Waived' for waived status", () => {
    expect(getStatusLabel(makeRow({ status: "waived" }))).toBe("Waived");
  });

  it("returns 'Executed' for executed status", () => {
    expect(getStatusLabel(makeRow({ status: "executed" }))).toBe("Executed");
  });

  it("replaces underscores with spaces for other statuses", () => {
    expect(getStatusLabel(makeRow({ status: "not_started" }))).toBe("not started");
    expect(getStatusLabel(makeRow({ status: "in_progress" }))).toBe("in progress");
    expect(getStatusLabel(makeRow({ status: "substantially_final" }))).toBe("substantially final");
  });
});

describe("ownerLabel", () => {
  it("returns organization name when present", () => {
    expect(ownerLabel(makeRow({ responsibleOrganizationName: "ACME Corp" }))).toBe("ACME Corp");
  });

  it("falls back to stakeholder name", () => {
    expect(ownerLabel(makeRow({ responsibleStakeholderName: "Jane Doe" }))).toBe("Jane Doe");
  });

  it("returns Unassigned when neither is set", () => {
    expect(ownerLabel(makeRow())).toBe("Unassigned");
  });

  it("prefers organization name over stakeholder name", () => {
    expect(
      ownerLabel(
        makeRow({
          responsibleOrganizationName: "Org A",
          responsibleStakeholderName: "Jane Doe",
        })
      )
    ).toBe("Org A");
  });
});

describe("buildItems", () => {
  it("returns an item for each row", () => {
    const rows = [makeRow({ projectRequirementId: "a" }), makeRow({ projectRequirementId: "b" })];
    expect(buildItems(rows, REFERENCE_DATE)).toHaveLength(2);
  });

  it("sorts overdue critical items before future items", () => {
    // overdue LOI-critical: 80 + 100 = 180; future LOI-critical at 10d: 80 + 60 = 140
    const future = makeRow({
      projectRequirementId: "future",
      isLoiCritical: true,
      targetDate: targetDate(10),
    });
    const overdue = makeRow({
      projectRequirementId: "overdue",
      isLoiCritical: true,
      targetDate: targetDate(-1),
    });
    const items = buildItems([future, overdue], REFERENCE_DATE);
    expect(items[0].row.projectRequirementId).toBe("overdue");
  });

  it("places closed/non-applicable items at the end (priority 0)", () => {
    const active = makeRow({ projectRequirementId: "active", status: "in_progress" });
    const closed = makeRow({ projectRequirementId: "closed", status: "executed" });
    const items = buildItems([closed, active], REFERENCE_DATE);
    expect(items[items.length - 1].row.projectRequirementId).toBe("closed");
  });

  it("populates daysUntilDue correctly", () => {
    const row = makeRow({ targetDate: targetDate(5) });
    const items = buildItems([row], REFERENCE_DATE);
    expect(items[0].daysUntilDue).toBe(5);
  });
});

describe("buildOwnerBuckets", () => {
  it("groups requirements by owner", () => {
    const rows = [
      makeRow({ projectRequirementId: "r1", responsibleOrganizationName: "Org A" }),
      makeRow({ projectRequirementId: "r2", responsibleOrganizationName: "Org A" }),
      makeRow({ projectRequirementId: "r3", responsibleOrganizationName: "Org B" }),
    ];
    const items = buildItems(rows, REFERENCE_DATE);
    const buckets = buildOwnerBuckets(items, 10);
    const orgA = buckets.find((b) => b.label === "Org A");
    expect(orgA?.count).toBe(2);
  });

  it("respects maxItems limit", () => {
    const rows = Array.from({ length: 10 }, (_, i) =>
      makeRow({
        projectRequirementId: `r${i}`,
        responsibleOrganizationName: `Org ${i}`,
      })
    );
    const items = buildItems(rows, REFERENCE_DATE);
    expect(buildOwnerBuckets(items, 3)).toHaveLength(3);
  });

  it("excludes items with priority 0", () => {
    const closed = makeRow({ projectRequirementId: "r1", status: "executed" });
    const items = buildItems([closed], REFERENCE_DATE);
    expect(buildOwnerBuckets(items, 10)).toHaveLength(0);
  });

  it("sorts by overdue count descending, then total count", () => {
    const overdueForOrgB = makeRow({
      projectRequirementId: "r1",
      responsibleOrganizationName: "Org B",
      targetDate: targetDate(-2),
    });
    const activeForOrgA = makeRow({
      projectRequirementId: "r2",
      responsibleOrganizationName: "Org A",
      targetDate: targetDate(30),
    });
    const items = buildItems([overdueForOrgB, activeForOrgA], REFERENCE_DATE);
    const buckets = buildOwnerBuckets(items, 10);
    expect(buckets[0].label).toBe("Org B");
  });
});
