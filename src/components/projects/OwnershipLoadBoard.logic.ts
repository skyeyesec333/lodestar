/**
 * Pure logic extracted from OwnershipLoadBoard for testability.
 */
import type { ProjectRequirementRow } from "@/lib/db/requirements";
import type { StakeholderRow } from "@/lib/db/stakeholders";

export type OwnershipLoadBoardRequirement = Pick<
  ProjectRequirementRow,
  | "projectRequirementId"
  | "requirementId"
  | "name"
  | "category"
  | "phaseRequired"
  | "isPrimaryGate"
  | "status"
  | "isApplicable"
  | "responsibleOrganizationId"
  | "responsibleOrganizationName"
  | "responsibleStakeholderId"
  | "responsibleStakeholderName"
  | "targetDate"
  | "applicabilityReason"
>;

export type OwnershipLoadBoardStakeholder = Pick<
  StakeholderRow,
  | "id"
  | "name"
  | "title"
  | "organizationName"
  | "roleType"
  | "openActionItemCount"
  | "documentsOwedCount"
  | "needsFollowUp"
  | "followUpReason"
  | "lastContactAt"
>;

export type PressureLevel = "critical" | "warning" | "info" | "quiet";

export type RequirementSignal = {
  requirement: OwnershipLoadBoardRequirement;
  score: number;
  level: PressureLevel;
  label: string;
  detail: string;
};

export type StakeholderSignal = {
  stakeholder: OwnershipLoadBoardStakeholder;
  score: number;
  level: PressureLevel;
  label: string;
  detail: string;
};

const msPerDay = 86_400_000;

export function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function startOfDay(date = new Date()): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function daysUntil(date: Date | null, asOf?: Date): number | null {
  if (!date) return null;
  const reference = asOf ?? new Date();
  const delta = startOfDay(date).getTime() - startOfDay(reference).getTime();
  return Math.round(delta / msPerDay);
}

export function daysSince(date: Date | null, asOf?: Date): number | null {
  if (!date) return null;
  const reference = asOf ?? new Date();
  const delta = startOfDay(reference).getTime() - startOfDay(date).getTime();
  return Math.round(delta / msPerDay);
}

export function classifyRequirement(
  requirement: OwnershipLoadBoardRequirement,
  asOf?: Date
): RequirementSignal {
  const dueDays = daysUntil(toDate(requirement.targetDate), asOf);
  const hasOwner = Boolean(
    requirement.responsibleOrganizationId || requirement.responsibleStakeholderId
  );
  const isBlocked =
    requirement.status === "not_started" ||
    requirement.status === "in_progress" ||
    requirement.status === "draft";
  const isLate = dueDays !== null && dueDays < 0;
  const isSoon = dueDays !== null && dueDays >= 0 && dueDays <= 14;

  let score = 0;
  if (requirement.isPrimaryGate) score += 24;
  if (!hasOwner) score += 18;
  if (isLate) score += 36;
  else if (isSoon) score += 18;
  else if (dueDays !== null && dueDays <= 45) score += 8;
  if (isBlocked) score += 12;

  const level: PressureLevel = !requirement.isApplicable
    ? "quiet"
    : score >= 50
      ? "critical"
      : score >= 28
        ? "warning"
        : score >= 12
          ? "info"
          : "quiet";

  let label = "On track";
  let detail = "No near-term pressure";

  if (!requirement.isApplicable) {
    label = "Not applicable";
    detail = requirement.applicabilityReason ?? "Out of scope";
  } else if (isLate) {
    label = "Overdue";
    detail = dueDays !== null ? `${Math.abs(dueDays)}d late` : "Past due";
  } else if (isSoon) {
    label = "Due soon";
    detail = dueDays === 0 ? "Due today" : `${dueDays}d to due`;
  } else if (!hasOwner) {
    label = "Unassigned";
    detail = "Unassigned owner";
  } else if (requirement.isPrimaryGate) {
    label = "LOI critical";
    detail = "Next-gate blocker";
  } else if (isBlocked) {
    label = "In progress";
    detail = "Open work";
  }

  return { requirement, score, level, label, detail };
}

export function classifyStakeholder(
  stakeholder: OwnershipLoadBoardStakeholder,
  asOf?: Date
): StakeholderSignal {
  const contactDate = toDate(stakeholder.lastContactAt);
  const daysSinceContact = daysSince(contactDate, asOf);
  const openItems = stakeholder.openActionItemCount + stakeholder.documentsOwedCount;

  let score = openItems * 8;
  if (stakeholder.needsFollowUp) score += 18;
  if (daysSinceContact === null) score += 8;
  else if (daysSinceContact >= 21) score += 18;
  else if (daysSinceContact >= 10) score += 8;

  const level: PressureLevel =
    score >= 40 ? "critical" : score >= 24 ? "warning" : score >= 8 ? "info" : "quiet";

  let label = "Responsive";
  let detail = "Low ownership pressure";
  if (stakeholder.needsFollowUp) {
    label = "Needs follow-up";
    detail = "Follow-up pending";
  } else if (openItems > 0) {
    label = "Active";
    detail = `${openItems} open item${openItems === 1 ? "" : "s"}`;
  } else if (daysSinceContact === null) {
    label = "No contact";
    detail = "No touchpoint yet";
  } else if (daysSinceContact >= 21) {
    label = "Stale";
    detail = `${daysSinceContact}d since contact`;
  } else if (daysSinceContact >= 10) {
    label = "Watch";
    detail = `${daysSinceContact}d since contact`;
  }

  return { stakeholder, score, level, label, detail };
}
