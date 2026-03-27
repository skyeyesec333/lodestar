import { db } from "./index";
import { EXIM_REQUIREMENTS } from "@/lib/exim/requirements";
import type { RequirementStatusValue } from "@/types/requirements";
import type { AppError, Result } from "@/types";

const requirementStatusSelect = {
  requirementId: true,
  status: true,
  notes: true,
} as const;

export type ProjectRequirementRow = {
  requirementId: string;
  name: string;
  description: string;
  category: string;
  phaseRequired: string;
  isLoiCritical: boolean;
  weight: number;
  sortOrder: number;
  status: RequirementStatusValue;
  notes: string | null;
};

/**
 * Returns all 36 requirement rows for a project, merged with static taxonomy.
 * Initializes any missing rows to not_started (idempotent via createMany skipDuplicates).
 */
export async function getProjectRequirements(
  projectId: string
): Promise<Result<ProjectRequirementRow[]>> {
  try {
    const existing = await db.projectRequirement.findMany({
      where: { projectId },
      select: requirementStatusSelect,
    });

    const existingIds = new Set(existing.map((r) => r.requirementId));
    const missingIds = EXIM_REQUIREMENTS.map((r) => r.id).filter(
      (id) => !existingIds.has(id)
    );

    if (missingIds.length > 0) {
      await db.projectRequirement.createMany({
        data: missingIds.map((id) => ({
          projectId,
          requirementId: id,
          status: "not_started" as const,
        })),
        skipDuplicates: true,
      });
    }

    const statusMap = new Map(existing.map((r) => [r.requirementId, r]));

    const rows: ProjectRequirementRow[] = EXIM_REQUIREMENTS.map((req) => {
      const live = statusMap.get(req.id);
      return {
        requirementId: req.id,
        name: req.name,
        description: req.description,
        category: req.category,
        phaseRequired: req.phaseRequired,
        isLoiCritical: req.isLoiCritical,
        weight: req.weight,
        sortOrder: req.sortOrder,
        status: (live?.status ?? "not_started") as RequirementStatusValue,
        notes: live?.notes ?? null,
      };
    });

    return { ok: true, value: rows };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

export async function updateRequirementStatusInDb(
  projectId: string,
  requirementId: string,
  status: RequirementStatusValue,
  clerkUserId: string
): Promise<Result<void>> {
  try {
    await db.projectRequirement.update({
      where: { projectId_requirementId: { projectId, requirementId } },
      data: {
        status,
        statusChangedAt: new Date(),
        statusChangedBy: clerkUserId,
      },
      select: { id: true },
    });
    return { ok: true, value: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

export async function updateRequirementNotesInDb(
  projectId: string,
  requirementId: string,
  notes: string | null
): Promise<Result<void>> {
  try {
    await db.projectRequirement.update({
      where: { projectId_requirementId: { projectId, requirementId } },
      data: { notes },
      select: { id: true },
    });
    return { ok: true, value: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

export async function updateProjectCachedScore(
  projectId: string,
  scoreBps: number
): Promise<Result<void>> {
  try {
    await db.project.update({
      where: { id: projectId },
      data: { cachedReadinessScore: scoreBps, cachedScoreUpdatedAt: new Date() },
      select: { id: true },
    });
    return { ok: true, value: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}
