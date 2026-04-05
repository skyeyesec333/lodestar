/**
 * Pure logic extracted from CriticalPathBoard for testability.
 */
import type { ProjectRequirementRow } from "@/lib/db/requirements";

export type StatusTone = "critical" | "warning" | "neutral" | "done";

export type BoardItem = {
  row: ProjectRequirementRow;
  daysUntilDue: number | null;
  priority: number;
  statusTone: StatusTone;
  statusLabel: string;
};

export type OwnerBucket = {
  label: string;
  count: number;
  overdue: number;
};

export function toUtcMidnight(value: string | Date): number {
  const d = new Date(value);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function getDaysUntilDue(
  targetDate: Date | null,
  referenceDate: string | Date
): number | null {
  if (!targetDate) return null;
  const target = toUtcMidnight(targetDate);
  const reference = toUtcMidnight(referenceDate);
  return Math.ceil((target - reference) / 86_400_000);
}

export function getPriority(row: ProjectRequirementRow, daysUntilDue: number | null): number {
  const isClosed = row.status === "executed" || row.status === "waived" || !row.isApplicable;
  if (isClosed) return 0;

  let score = row.isPrimaryGate ? 80 : 40;
  if (daysUntilDue !== null) {
    if (daysUntilDue < 0) score += 100;
    else if (daysUntilDue <= 14) score += 60;
    else if (daysUntilDue <= 30) score += 35;
    else if (daysUntilDue <= 60) score += 15;
  } else {
    score += 10;
  }

  if (!row.responsibleOrganizationName && !row.responsibleStakeholderName) score += 20;
  if (row.applicabilityReason) score += 5;
  if (row.notes) score += 5;
  return score;
}

export function getStatusTone(
  row: ProjectRequirementRow,
  daysUntilDue: number | null
): StatusTone {
  if (row.status === "executed" || row.status === "waived" || !row.isApplicable) return "done";
  if (daysUntilDue !== null && daysUntilDue < 0) return "critical";
  if (row.isPrimaryGate || (daysUntilDue !== null && daysUntilDue <= 30)) return "warning";
  return "neutral";
}

export function getStatusLabel(row: ProjectRequirementRow): string {
  if (!row.isApplicable) return "Not applicable";
  if (row.status === "waived") return "Waived";
  if (row.status === "executed") return "Executed";
  return row.status.replace(/_/g, " ");
}

export function ownerLabel(row: ProjectRequirementRow): string {
  if (row.responsibleOrganizationName) return row.responsibleOrganizationName;
  if (row.responsibleStakeholderName) return row.responsibleStakeholderName;
  return "Unassigned";
}

export function buildItems(
  rows: ProjectRequirementRow[],
  referenceDate: string | Date
): BoardItem[] {
  return rows
    .map((row) => {
      const daysUntilDue = getDaysUntilDue(row.targetDate, referenceDate);
      return {
        row,
        daysUntilDue,
        priority: getPriority(row, daysUntilDue),
        statusTone: getStatusTone(row, daysUntilDue),
        statusLabel: getStatusLabel(row),
      };
    })
    .sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      if (a.row.sortOrder !== b.row.sortOrder) return a.row.sortOrder - b.row.sortOrder;
      return a.row.name.localeCompare(b.row.name);
    });
}

export function buildOwnerBuckets(items: BoardItem[], maxItems: number): OwnerBucket[] {
  const map = new Map<string, OwnerBucket>();
  for (const item of items) {
    if (item.priority <= 0) continue;
    const label = ownerLabel(item.row);
    const existing = map.get(label) ?? { label, count: 0, overdue: 0 };
    existing.count += 1;
    if (item.daysUntilDue !== null && item.daysUntilDue < 0) existing.overdue += 1;
    map.set(label, existing);
  }
  return [...map.values()]
    .sort((a, b) => b.overdue - a.overdue || b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, maxItems);
}
