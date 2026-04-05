import { describe, it, expect } from "vitest";
import {
  toDate,
  startOfDay,
  daysUntil,
  daysSince,
  classifyRequirement,
  classifyStakeholder,
  type OwnershipLoadBoardRequirement,
  type OwnershipLoadBoardStakeholder,
} from "../OwnershipLoadBoard.logic";

const REFERENCE = new Date("2026-03-29T12:00:00Z");

function makeRequirement(
  overrides: Partial<OwnershipLoadBoardRequirement> = {}
): OwnershipLoadBoardRequirement {
  return {
    projectRequirementId: "req-1",
    requirementId: "r1",
    name: "Test Requirement",
    category: "contracts",
    phaseRequired: "loi",
    isPrimaryGate: false,
    status: "not_started",
    isApplicable: true,
    responsibleOrganizationId: null,
    responsibleOrganizationName: null,
    responsibleStakeholderId: null,
    responsibleStakeholderName: null,
    targetDate: null,
    applicabilityReason: null,
    ...overrides,
  };
}

function makeStakeholder(
  overrides: Partial<OwnershipLoadBoardStakeholder> = {}
): OwnershipLoadBoardStakeholder {
  return {
    id: "s1",
    name: "Jane Doe",
    title: "Director",
    organizationName: "ACME Corp",
    roleType: "epc_contact",
    openActionItemCount: 0,
    documentsOwedCount: 0,
    needsFollowUp: false,
    followUpReason: null,
    lastContactAt: null,
    ...overrides,
  };
}

function futureDate(daysFromReference: number): Date {
  const d = new Date(REFERENCE);
  d.setDate(d.getDate() + daysFromReference);
  return d;
}

describe("toDate", () => {
  it("returns a Date from a Date", () => {
    const d = new Date("2026-01-01");
    expect(toDate(d)).toEqual(d);
  });

  it("returns a Date from a string", () => {
    const result = toDate("2026-01-01");
    expect(result).toBeInstanceOf(Date);
  });

  it("returns null for null/undefined/invalid", () => {
    expect(toDate(null)).toBeNull();
    expect(toDate(undefined)).toBeNull();
    expect(toDate("not-a-date")).toBeNull();
  });
});

describe("startOfDay", () => {
  it("zeroes out time components", () => {
    const d = new Date("2026-03-15T14:30:45.999");
    const result = startOfDay(d);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });

  it("does not mutate the input", () => {
    const d = new Date("2026-03-15T14:30:45");
    startOfDay(d);
    expect(d.getHours()).toBe(14);
  });
});

describe("daysUntil", () => {
  it("returns null for null date", () => {
    expect(daysUntil(null, REFERENCE)).toBeNull();
  });

  it("returns 0 for same day", () => {
    expect(daysUntil(new Date(REFERENCE), REFERENCE)).toBe(0);
  });

  it("returns positive for a future date", () => {
    expect(daysUntil(futureDate(7), REFERENCE)).toBe(7);
  });

  it("returns negative for a past date", () => {
    expect(daysUntil(futureDate(-3), REFERENCE)).toBe(-3);
  });
});

describe("daysSince", () => {
  it("returns null for null date", () => {
    expect(daysSince(null, REFERENCE)).toBeNull();
  });

  it("returns 0 for same day", () => {
    expect(daysSince(new Date(REFERENCE), REFERENCE)).toBe(0);
  });

  it("returns positive for a date in the past", () => {
    expect(daysSince(futureDate(-10), REFERENCE)).toBe(10);
  });

  it("returns negative for a future date", () => {
    expect(daysSince(futureDate(5), REFERENCE)).toBe(-5);
  });
});

describe("classifyRequirement", () => {
  it("returns quiet level for non-applicable requirements", () => {
    const req = makeRequirement({ isApplicable: false });
    const signal = classifyRequirement(req, REFERENCE);
    expect(signal.level).toBe("quiet");
    expect(signal.label).toBe("Not applicable");
  });

  it("returns overdue label when due date is in the past", () => {
    const req = makeRequirement({ targetDate: futureDate(-3) });
    const signal = classifyRequirement(req, REFERENCE);
    expect(signal.label).toBe("Overdue");
    expect(signal.detail).toBe("3d late");
  });

  it("returns 'Due today' when due today", () => {
    const req = makeRequirement({ targetDate: new Date(REFERENCE) });
    const signal = classifyRequirement(req, REFERENCE);
    expect(signal.label).toBe("Due soon");
    expect(signal.detail).toBe("Due today");
  });

  it("returns 'Due soon' for dates within 14 days", () => {
    const req = makeRequirement({ targetDate: futureDate(10) });
    const signal = classifyRequirement(req, REFERENCE);
    expect(signal.label).toBe("Due soon");
    expect(signal.detail).toBe("10d to due");
  });

  it("returns 'Unassigned' when no owner is set", () => {
    const req = makeRequirement();
    const signal = classifyRequirement(req, REFERENCE);
    expect(signal.label).toBe("Unassigned");
  });

  it("returns 'LOI critical' label for assigned LOI-critical requirements", () => {
    const req = makeRequirement({
      isPrimaryGate: true,
      responsibleOrganizationId: "org-1",
    });
    const signal = classifyRequirement(req, REFERENCE);
    expect(signal.label).toBe("LOI critical");
  });

  it("assigns critical level for high-score requirements (overdue LOI critical unassigned)", () => {
    const req = makeRequirement({
      isPrimaryGate: true,
      targetDate: futureDate(-5),
      status: "in_progress",
    });
    const signal = classifyRequirement(req, REFERENCE);
    expect(signal.level).toBe("critical");
  });

  it("score is 0 and level quiet when not applicable", () => {
    const req = makeRequirement({ isApplicable: false, isPrimaryGate: true });
    const signal = classifyRequirement(req, REFERENCE);
    expect(signal.level).toBe("quiet");
  });
});

describe("classifyStakeholder", () => {
  it("returns Responsive for a low-pressure stakeholder", () => {
    const s = makeStakeholder({ lastContactAt: futureDate(-3) });
    const signal = classifyStakeholder(s, REFERENCE);
    expect(signal.label).toBe("Responsive");
    expect(signal.level).toBe("quiet");
  });

  it("returns 'Needs follow-up' when needsFollowUp is true", () => {
    const s = makeStakeholder({ needsFollowUp: true });
    const signal = classifyStakeholder(s, REFERENCE);
    expect(signal.label).toBe("Needs follow-up");
  });

  it("returns 'Active' when there are open items", () => {
    const s = makeStakeholder({ openActionItemCount: 2, documentsOwedCount: 1 });
    const signal = classifyStakeholder(s, REFERENCE);
    expect(signal.label).toBe("Active");
    expect(signal.detail).toBe("3 open items");
  });

  it("returns 'No contact' when lastContactAt is null", () => {
    const s = makeStakeholder({ lastContactAt: null });
    const signal = classifyStakeholder(s, REFERENCE);
    expect(signal.label).toBe("No contact");
  });

  it("returns 'Stale' when last contact was 21+ days ago", () => {
    const s = makeStakeholder({ lastContactAt: futureDate(-21) });
    const signal = classifyStakeholder(s, REFERENCE);
    expect(signal.label).toBe("Stale");
  });

  it("returns 'Watch' when last contact was 10–20 days ago", () => {
    const s = makeStakeholder({ lastContactAt: futureDate(-10) });
    const signal = classifyStakeholder(s, REFERENCE);
    expect(signal.label).toBe("Watch");
  });

  it("gives critical level for high-pressure stakeholder (needsFollowUp + many open items + stale)", () => {
    const s = makeStakeholder({
      needsFollowUp: true,
      openActionItemCount: 5,
      documentsOwedCount: 0,
      lastContactAt: futureDate(-25),
    });
    const signal = classifyStakeholder(s, REFERENCE);
    expect(signal.level).toBe("critical");
  });

  it("uses sum of openActionItemCount + documentsOwedCount for open items", () => {
    const s = makeStakeholder({ openActionItemCount: 1, documentsOwedCount: 1 });
    const signal = classifyStakeholder(s, REFERENCE);
    expect(signal.detail).toBe("2 open items");
  });

  it("uses singular 'item' label for exactly 1 open item", () => {
    const s = makeStakeholder({ openActionItemCount: 1, documentsOwedCount: 0 });
    const signal = classifyStakeholder(s, REFERENCE);
    expect(signal.detail).toBe("1 open item");
  });
});
