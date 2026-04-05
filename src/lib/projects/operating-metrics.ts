import type { DocumentRow } from "@/lib/db/documents";
import type { ProjectRequirementRow } from "@/lib/db/requirements";
import { checkStageGate, type GateBlocker } from "@/lib/projects/stage-gate";

export const OPERATING_DONE_STATUSES = new Set([
  "substantially_final",
  "executed",
  "waived",
]);

const STAGE_ORDER = [
  "concept",
  "pre_loi",
  "loi_submitted",
  "loi_approved",
  "pre_commitment",
  "final_commitment",
  "financial_close",
] as const;

export type ProjectOperatingMetrics = {
  nextStageId: string;
  daysToNextGate: number | null;
  hardBlockers: GateBlocker[];
  hardBlockerCount: number;
  softBlockerCount: number;
  unassignedCriticalCount: number;
  missingEvidenceCount: number;
  expiringEvidenceCount: number;
  overdueCount: number;
  criticalOpenCount: number;
  doneCount: number;
  uncoveredRequirementCount: number;
  coveredRequirementCount: number;
};

function getNextStageId(stage: string): string {
  const currentIndex = STAGE_ORDER.indexOf(stage as (typeof STAGE_ORDER)[number]);
  if (currentIndex < 0 || currentIndex >= STAGE_ORDER.length - 1) {
    return STAGE_ORDER[STAGE_ORDER.length - 1];
  }
  return STAGE_ORDER[currentIndex + 1];
}

export function getDaysUntilDate(
  date: Date | null | undefined,
  referenceDate: Date = new Date()
): number | null {
  if (!date) return null;
  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - start.getTime()) / 86_400_000);
}

export function isRequirementDone(status: string): boolean {
  return OPERATING_DONE_STATUSES.has(status);
}

export function buildProjectOperatingMetrics(input: {
  stage: string;
  dealType: string;
  targetLoiDate?: Date | null;
  targetCloseDate?: Date | null;
  requirements: ProjectRequirementRow[];
  documents: DocumentRow[];
  referenceDate?: Date;
}): ProjectOperatingMetrics {
  const {
    stage,
    dealType,
    targetLoiDate = null,
    targetCloseDate = null,
    requirements,
    documents,
    referenceDate = new Date(),
  } = input;

  const nextStageId = getNextStageId(stage);
  const targetGateDate =
    dealType === "exim_project_finance"
      ? targetLoiDate ?? targetCloseDate
      : targetCloseDate ?? targetLoiDate;
  const daysToNextGate = getDaysUntilDate(targetGateDate, referenceDate);
  const gateCheck = checkStageGate(nextStageId, requirements);

  const currentDocs = documents.filter((document) => document.state === "current");
  const docsByRequirementId = new Map<string, number>();
  let expiringEvidenceCount = 0;
  const cutoff = new Date(referenceDate.getTime() + 90 * 86_400_000);

  for (const document of currentDocs) {
    if (document.projectRequirementId) {
      docsByRequirementId.set(
        document.projectRequirementId,
        (docsByRequirementId.get(document.projectRequirementId) ?? 0) + 1
      );
    }

    if (document.expiresAt && document.expiresAt >= referenceDate && document.expiresAt <= cutoff) {
      expiringEvidenceCount += 1;
    }
  }

  let unassignedCriticalCount = 0;
  let missingEvidenceCount = 0;
  let overdueCount = 0;
  let criticalOpenCount = 0;
  let doneCount = 0;
  let uncoveredRequirementCount = 0;
  let coveredRequirementCount = 0;

  for (const row of requirements) {
    if (row.isApplicable === false) continue;

    const done = isRequirementDone(row.status);
    const docCount = row.projectRequirementId
      ? (docsByRequirementId.get(row.projectRequirementId) ?? 0)
      : 0;

    if (done) {
      doneCount += 1;
    } else {
      if (docCount === 0) {
        missingEvidenceCount += 1;
      }
      if (row.targetDate && row.targetDate < referenceDate) {
        overdueCount += 1;
      }
    }

    if (docCount === 0) uncoveredRequirementCount += 1;
    else coveredRequirementCount += 1;

    if (row.isPrimaryGate && !done) {
      criticalOpenCount += 1;
      if (!row.responsibleOrganizationId && !row.responsibleStakeholderId) {
        unassignedCriticalCount += 1;
      }
    }
  }

  return {
    nextStageId,
    daysToNextGate,
    hardBlockers: gateCheck.hardBlockers,
    hardBlockerCount: gateCheck.hardBlockers.length,
    softBlockerCount: gateCheck.softBlockers.length,
    unassignedCriticalCount,
    missingEvidenceCount,
    expiringEvidenceCount,
    overdueCount,
    criticalOpenCount,
    doneCount,
    uncoveredRequirementCount,
    coveredRequirementCount,
  };
}
