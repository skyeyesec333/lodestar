/**
 * Pure logic extracted from WeeklyDriftPanel for testability.
 * All functions are deterministic and side-effect free.
 */

export type WeeklyDriftEvent = {
  id: string;
  eventType: string;
  summary: string;
  createdAt: Date | string;
};

export type TrendState = "accelerating" | "steady" | "cooling" | "stalled";

export type TimelinePoint = {
  label: string;
  count: number;
};

export const MS_PER_DAY = 86_400_000;
export const DAYS = 7;

export function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function getTrendState(recent: number, prior: number): TrendState {
  if (recent === 0) return "stalled";
  if (recent >= prior + 2) return "accelerating";
  if (recent === prior) return "steady";
  if (recent < prior) return "cooling";
  return "steady";
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function bucketEvents(events: WeeklyDriftEvent[], asOf: Date): TimelinePoint[] {
  const midnight = startOfDay(asOf);
  const buckets = Array.from({ length: DAYS }, (_, index) => {
    const day = new Date(midnight);
    day.setDate(day.getDate() - (DAYS - 1 - index));
    return {
      label: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(day),
      count: 0,
      key: startOfDay(day).getTime(),
    };
  });

  for (const event of events) {
    const date = toDate(event.createdAt);
    if (!date) continue;
    const dayKey = startOfDay(date).getTime();
    const bucket = buckets.find((entry) => entry.key === dayKey);
    if (bucket) bucket.count += 1;
  }

  return buckets.map(({ label, count }) => ({ label, count }));
}

export function summarizeEventTypes(
  events: WeeklyDriftEvent[]
): Array<{ label: string; count: number }> {
  const counts = new Map<string, number>();
  for (const event of events) {
    counts.set(event.eventType, (counts.get(event.eventType) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label: label.replace(/_/g, " "), count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 4);
}

export function splitEventWindows(
  events: WeeklyDriftEvent[],
  asOf: Date
): { recentEvents: (WeeklyDriftEvent & { createdAt: Date })[]; priorEvents: (WeeklyDriftEvent & { createdAt: Date })[] } {
  const now = startOfDay(asOf);
  const recentWindowStart = new Date(now);
  recentWindowStart.setDate(recentWindowStart.getDate() - 7);
  const priorWindowStart = new Date(now);
  priorWindowStart.setDate(priorWindowStart.getDate() - 14);

  const normalized = [...events]
    .map((e) => ({ ...e, createdAt: toDate(e.createdAt) }))
    .filter((e): e is WeeklyDriftEvent & { createdAt: Date } => e.createdAt !== null)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const recentEvents = normalized.filter((e) => e.createdAt >= recentWindowStart);
  const priorEvents = normalized.filter(
    (e) => e.createdAt >= priorWindowStart && e.createdAt < recentWindowStart
  );

  return { recentEvents, priorEvents };
}

export function getChangeLabel(recentCount: number, priorCount: number): string {
  const weekDelta = recentCount - priorCount;
  if (priorCount === 0) {
    return recentCount === 0 ? "No movement" : `+${recentCount} this week`;
  }
  return `${weekDelta >= 0 ? "+" : ""}${weekDelta} vs prior week`;
}

export function getDaysToDate(target: Date | null, asOf: Date): number | null {
  if (!target) return null;
  return Math.ceil((startOfDay(target).getTime() - startOfDay(asOf).getTime()) / MS_PER_DAY);
}
