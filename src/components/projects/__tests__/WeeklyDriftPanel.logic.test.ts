import { describe, it, expect } from "vitest";
import {
  toDate,
  startOfDay,
  getTrendState,
  clamp,
  bucketEvents,
  summarizeEventTypes,
  splitEventWindows,
  getChangeLabel,
  getDaysToDate,
  type WeeklyDriftEvent,
} from "../WeeklyDriftPanel.logic";

// Fixed reference date for deterministic tests
const REFERENCE = new Date("2026-03-29T12:00:00Z");

function makeEvent(id: string, eventType: string, daysAgo: number): WeeklyDriftEvent {
  const date = new Date(REFERENCE);
  date.setDate(date.getDate() - daysAgo);
  return { id, eventType, summary: `Event ${id}`, createdAt: date };
}

describe("toDate", () => {
  it("returns a Date from a Date", () => {
    const d = new Date("2026-01-01");
    expect(toDate(d)).toEqual(d);
  });

  it("returns a Date from a string", () => {
    const result = toDate("2026-01-01");
    expect(result).toBeInstanceOf(Date);
    expect(result!.getFullYear()).toBe(2026);
  });

  it("returns null for null", () => {
    expect(toDate(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(toDate(undefined)).toBeNull();
  });

  it("returns null for invalid date string", () => {
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
    const d = new Date("2026-03-15T14:30:45.999");
    startOfDay(d);
    expect(d.getHours()).toBe(14);
  });
});

describe("getTrendState", () => {
  it("returns stalled when recent is 0", () => {
    expect(getTrendState(0, 5)).toBe("stalled");
    expect(getTrendState(0, 0)).toBe("stalled");
  });

  it("returns accelerating when recent >= prior + 2", () => {
    expect(getTrendState(7, 5)).toBe("accelerating");
    expect(getTrendState(10, 3)).toBe("accelerating");
  });

  it("returns steady when recent equals prior", () => {
    expect(getTrendState(5, 5)).toBe("steady");
  });

  it("returns cooling when recent < prior", () => {
    expect(getTrendState(3, 5)).toBe("cooling");
    expect(getTrendState(1, 10)).toBe("cooling");
  });

  it("returns steady when recent = prior + 1 (not quite accelerating)", () => {
    expect(getTrendState(6, 5)).toBe("steady");
  });
});

describe("clamp", () => {
  it("returns value when within range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it("clamps to min", () => {
    expect(clamp(-1, 0, 10)).toBe(0);
  });

  it("clamps to max", () => {
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it("returns min when value equals min", () => {
    expect(clamp(0, 0, 10)).toBe(0);
  });

  it("returns max when value equals max", () => {
    expect(clamp(10, 0, 10)).toBe(10);
  });
});

describe("bucketEvents", () => {
  it("returns 7 buckets", () => {
    const result = bucketEvents([], REFERENCE);
    expect(result).toHaveLength(7);
  });

  it("counts events in the correct day bucket", () => {
    const events = [
      makeEvent("a", "milestone_updated", 0),
      makeEvent("b", "milestone_updated", 0),
      makeEvent("c", "document_added", 3),
    ];
    const result = bucketEvents(events, REFERENCE);
    const todayBucket = result[result.length - 1];
    expect(todayBucket.count).toBe(2);
    const threeDaysAgoBucket = result[result.length - 1 - 3];
    expect(threeDaysAgoBucket.count).toBe(1);
  });

  it("ignores events outside the 7-day window", () => {
    const events = [makeEvent("old", "milestone_updated", 8)];
    const result = bucketEvents(events, REFERENCE);
    const total = result.reduce((sum, b) => sum + b.count, 0);
    expect(total).toBe(0);
  });

  it("returns zero counts for empty events", () => {
    const result = bucketEvents([], REFERENCE);
    result.forEach((b) => expect(b.count).toBe(0));
  });

  it("ignores events with invalid dates", () => {
    const events: WeeklyDriftEvent[] = [
      { id: "x", eventType: "foo", summary: "bar", createdAt: "not-a-date" },
    ];
    const result = bucketEvents(events, REFERENCE);
    const total = result.reduce((sum, b) => sum + b.count, 0);
    expect(total).toBe(0);
  });
});

describe("summarizeEventTypes", () => {
  it("returns top 4 event types by count", () => {
    const events = [
      makeEvent("1", "milestone_updated", 1),
      makeEvent("2", "milestone_updated", 1),
      makeEvent("3", "document_added", 1),
      makeEvent("4", "document_added", 1),
      makeEvent("5", "document_added", 1),
      makeEvent("6", "stakeholder_added", 1),
      makeEvent("7", "meeting_scheduled", 1),
      makeEvent("8", "requirement_changed", 1),
    ];
    const result = summarizeEventTypes(events);
    expect(result).toHaveLength(4);
    expect(result[0].label).toBe("document added");
    expect(result[0].count).toBe(3);
  });

  it("replaces underscores with spaces in labels", () => {
    const events = [makeEvent("1", "milestone_updated", 1)];
    const result = summarizeEventTypes(events);
    expect(result[0].label).toBe("milestone updated");
  });

  it("returns empty array for empty events", () => {
    expect(summarizeEventTypes([])).toEqual([]);
  });

  it("sorts by count descending then label ascending", () => {
    const events = [
      makeEvent("1", "b_event", 1),
      makeEvent("2", "a_event", 1),
    ];
    const result = summarizeEventTypes(events);
    expect(result[0].label).toBe("a event");
  });
});

describe("splitEventWindows", () => {
  it("puts events from 0–7 days ago in recentEvents", () => {
    const events = [
      makeEvent("r1", "foo", 0),
      makeEvent("r2", "foo", 6),
      makeEvent("r3", "foo", 7),
    ];
    const { recentEvents } = splitEventWindows(events, REFERENCE);
    expect(recentEvents).toHaveLength(3);
  });

  it("puts events from 7–14 days ago in priorEvents", () => {
    const events = [
      makeEvent("p1", "foo", 8),
      makeEvent("p2", "foo", 13),
    ];
    const { priorEvents } = splitEventWindows(events, REFERENCE);
    expect(priorEvents).toHaveLength(2);
  });

  it("excludes events older than 14 days from both windows", () => {
    const events = [makeEvent("old", "foo", 15)];
    const { recentEvents, priorEvents } = splitEventWindows(events, REFERENCE);
    expect(recentEvents).toHaveLength(0);
    expect(priorEvents).toHaveLength(0);
  });

  it("filters out events with invalid dates", () => {
    const events: WeeklyDriftEvent[] = [
      { id: "bad", eventType: "foo", summary: "bar", createdAt: "invalid" },
    ];
    const { recentEvents, priorEvents } = splitEventWindows(events, REFERENCE);
    expect(recentEvents).toHaveLength(0);
    expect(priorEvents).toHaveLength(0);
  });

  it("sorts recentEvents newest first", () => {
    const events = [
      makeEvent("old", "foo", 5),
      makeEvent("new", "foo", 1),
    ];
    const { recentEvents } = splitEventWindows(events, REFERENCE);
    expect(recentEvents[0].id).toBe("new");
  });
});

describe("getChangeLabel", () => {
  it("returns 'No movement' when both are 0", () => {
    expect(getChangeLabel(0, 0)).toBe("No movement");
  });

  it("returns '+N this week' when prior is 0 and recent > 0", () => {
    expect(getChangeLabel(5, 0)).toBe("+5 this week");
  });

  it("returns positive delta vs prior week", () => {
    expect(getChangeLabel(8, 5)).toBe("+3 vs prior week");
  });

  it("returns negative delta vs prior week", () => {
    expect(getChangeLabel(3, 5)).toBe("-2 vs prior week");
  });

  it("returns +0 when equal and prior > 0", () => {
    expect(getChangeLabel(5, 5)).toBe("+0 vs prior week");
  });
});

describe("getDaysToDate", () => {
  it("returns null for null target", () => {
    expect(getDaysToDate(null, REFERENCE)).toBeNull();
  });

  it("returns 0 for same day", () => {
    const sameDay = startOfDay(new Date(REFERENCE));
    expect(getDaysToDate(sameDay, REFERENCE)).toBe(0);
  });

  it("returns positive for future date", () => {
    const future = new Date(REFERENCE);
    future.setDate(future.getDate() + 10);
    expect(getDaysToDate(future, REFERENCE)).toBe(10);
  });

  it("returns negative for past date", () => {
    const past = new Date(REFERENCE);
    past.setDate(past.getDate() - 5);
    expect(getDaysToDate(past, REFERENCE)).toBe(-5);
  });
});
