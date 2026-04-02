import type { DocumentRow } from "@/lib/db/documents";
import type { ProjectRequirementRow } from "@/lib/db/requirements";
import { isRequirementDone } from "@/lib/projects/operating-metrics";

export type WorkplanQueueItem = {
  projectRequirementId: string;
  requirementId: string;
  name: string;
  category: string;
  phaseRequired: string;
  status: ProjectRequirementRow["status"];
  isLoiCritical: boolean;
  targetDate: Date | null;
  responsibleOrganizationName: string | null;
  responsibleStakeholderName: string | null;
  notes: ProjectRequirementRow["recentNotes"];
  documentCount: number;
  blockedByEvidence: boolean;
  blockedByOwner: boolean;
  overdue: boolean;
};

export type WorkplanQueue = {
  criticalNow: WorkplanQueueItem[];
  missingEvidence: WorkplanQueueItem[];
  unowned: WorkplanQueueItem[];
  overdue: WorkplanQueueItem[];
  recentlyAdvanced: WorkplanQueueItem[];
  done: WorkplanQueueItem[];
};

export function buildWorkplanQueue(
  rows: ProjectRequirementRow[],
  documents: DocumentRow[],
  referenceDate: Date = new Date()
): WorkplanQueue {
  const currentDocs = documents.filter((document) => document.state === "current");
  const docCountByProjectRequirementId = new Map<string, number>();

  for (const document of currentDocs) {
    if (!document.projectRequirementId) continue;
    docCountByProjectRequirementId.set(
      document.projectRequirementId,
      (docCountByProjectRequirementId.get(document.projectRequirementId) ?? 0) + 1
    );
  }

  const criticalNow: WorkplanQueueItem[] = [];
  const missingEvidence: WorkplanQueueItem[] = [];
  const unowned: WorkplanQueueItem[] = [];
  const overdue: WorkplanQueueItem[] = [];
  const recentlyAdvanced: WorkplanQueueItem[] = [];
  const done: WorkplanQueueItem[] = [];

  const items = rows
    .filter((row) => row.isApplicable !== false)
    .map((row) => {
      const documentCount = row.projectRequirementId
        ? (docCountByProjectRequirementId.get(row.projectRequirementId) ?? 0)
        : 0;
      const blockedByOwner = !row.responsibleOrganizationId && !row.responsibleStakeholderId;
      const blockedByEvidence = !isRequirementDone(row.status) && documentCount === 0;
      const rowDueDate = row.targetDate ? new Date(row.targetDate) : null;
      const overdueFlag = !!(rowDueDate && rowDueDate < referenceDate && !isRequirementDone(row.status));

      return {
        projectRequirementId: row.projectRequirementId,
        requirementId: row.requirementId,
        name: row.name,
        category: row.category,
        phaseRequired: row.phaseRequired,
        status: row.status,
        isLoiCritical: row.isLoiCritical,
        targetDate: row.targetDate,
        responsibleOrganizationName: row.responsibleOrganizationName,
        responsibleStakeholderName: row.responsibleStakeholderName,
        notes: row.recentNotes,
        documentCount,
        blockedByEvidence,
        blockedByOwner,
        overdue: overdueFlag,
        sortKey: `${row.sortOrder}`.padStart(4, "0"),
      } as WorkplanQueueItem & { sortKey: string };
    });

  for (const item of items) {
    if (isRequirementDone(item.status)) {
      done.push(item);
      continue;
    }

    if (item.isLoiCritical) criticalNow.push(item);
    if (item.blockedByEvidence) missingEvidence.push(item);
    if (item.blockedByOwner) unowned.push(item);
    if (item.overdue) overdue.push(item);
    if (item.notes.length > 0 || ["in_progress", "draft"].includes(item.status)) {
      recentlyAdvanced.push(item);
    }
  }

  const sort = (queueItems: (WorkplanQueueItem & { sortKey?: string })[]) =>
    queueItems
      .sort((a, b) => {
        const aTime = a.targetDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const bTime = b.targetDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
        if (aTime !== bTime) return aTime - bTime;
        const aKey = "sortKey" in a && a.sortKey ? a.sortKey : a.name;
        const bKey = "sortKey" in b && b.sortKey ? b.sortKey : b.name;
        return aKey.localeCompare(bKey);
      })
      .map(({ sortKey: _sortKey, ...rest }) => rest);

  return {
    criticalNow: sort(criticalNow),
    missingEvidence: sort(missingEvidence),
    unowned: sort(unowned),
    overdue: sort(overdue),
    recentlyAdvanced: sort(recentlyAdvanced),
    done: sort(done),
  };
}
