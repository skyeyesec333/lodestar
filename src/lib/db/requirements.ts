import { db } from "./index";
import { EXIM_REQUIREMENTS } from "@/lib/exim/requirements";
import type { RequirementStatusValue } from "@/types/requirements";
import type { AppError, Result } from "@/types";

const requirementStatusSelect = {
  id: true,
  requirementId: true,
  status: true,
  notes: true,
  isApplicable: true,
  responsibleOrganizationId: true,
  responsibleOrganization: { select: { name: true } },
  responsibleStakeholderId: true,
  responsibleStakeholder: { select: { name: true } },
  targetDate: true,
  applicabilityReason: true,
} as const;

export type RequirementNoteRow = {
  id: string;
  clerkUserId: string;
  note: string;
  statusSnapshot: string;
  createdAt: Date;
};

export type ProjectRequirementRow = {
  projectRequirementId: string;
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
  isApplicable: boolean;
  responsibleOrganizationId: string | null;
  responsibleOrganizationName: string | null;
  responsibleStakeholderId: string | null;
  responsibleStakeholderName: string | null;
  targetDate: Date | null;
  applicabilityReason: string | null;
  recentNotes: RequirementNoteRow[];
};

type StatusRow = {
  id: string;
  requirementId: string;
  status: string;
  notes: string | null;
  isApplicable: boolean;
  responsibleOrganizationId: string | null;
  responsibleOrganization: { name: string } | null;
  responsibleStakeholderId: string | null;
  responsibleStakeholder: { name: string } | null;
  targetDate: Date | null;
  applicabilityReason: string | null;
};

function buildRows(
  statusMap: Map<string, StatusRow>,
  notesMap: Map<string, RequirementNoteRow[]>
): ProjectRequirementRow[] {
  return EXIM_REQUIREMENTS.map((req) => {
    const live = statusMap.get(req.id);
    return {
      projectRequirementId: live?.id ?? "",
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
      isApplicable: live?.isApplicable ?? true,
      responsibleOrganizationId: live?.responsibleOrganizationId ?? null,
      responsibleOrganizationName: live?.responsibleOrganization?.name ?? null,
      responsibleStakeholderId: live?.responsibleStakeholderId ?? null,
      responsibleStakeholderName: live?.responsibleStakeholder?.name ?? null,
      targetDate: live?.targetDate ?? null,
      applicabilityReason: live?.applicabilityReason ?? null,
      recentNotes: notesMap.get(req.id) ?? [],
    };
  });
}

/**
 * Returns all 43 requirement rows for a project, merged with static taxonomy.
 * Initializes any missing rows to not_started (idempotent via createMany skipDuplicates).
 */
type RawNoteRow = {
  id: string;
  requirement_id: string;
  clerk_user_id: string;
  note: string;
  status_snapshot: string;
  created_at: Date;
};

async function fetchNotesMap(projectId: string): Promise<Map<string, RequirementNoteRow[]>> {
  const allNotes = await db.$queryRaw<RawNoteRow[]>`
    SELECT id, requirement_id, clerk_user_id, note, status_snapshot, created_at
    FROM requirement_notes
    WHERE project_id = ${projectId}
    ORDER BY created_at DESC
    LIMIT 200
  `;

  const map = new Map<string, RequirementNoteRow[]>();
  for (const n of allNotes) {
    const shaped: RequirementNoteRow = {
      id: n.id,
      clerkUserId: n.clerk_user_id,
      note: n.note,
      statusSnapshot: n.status_snapshot,
      createdAt: n.created_at,
    };
    const existing = map.get(n.requirement_id);
    if (!existing) {
      map.set(n.requirement_id, [shaped]);
    } else if (existing.length < 5) {
      existing.push(shaped);
    }
  }
  return map;
}

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

    const notesMap = await fetchNotesMap(projectId);

    if (missingIds.length > 0) {
      await db.projectRequirement.createMany({
        data: missingIds.map((id) => ({
          projectId,
          requirementId: id,
          status: "not_started" as const,
        })),
        skipDuplicates: true,
      });
      // Re-fetch so newly created rows have their UUIDs
      const all = await db.projectRequirement.findMany({
        where: { projectId },
        select: requirementStatusSelect,
      });
      return { ok: true, value: buildRows(new Map(all.map((r) => [r.requirementId, r])), notesMap) };
    }

    return { ok: true, value: buildRows(new Map(existing.map((r) => [r.requirementId, r])), notesMap) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

export async function addRequirementNote(
  projectId: string,
  requirementId: string,
  clerkUserId: string,
  note: string,
  statusSnapshot: string
): Promise<Result<RequirementNoteRow>> {
  try {
    const rows = await db.$queryRaw<RawNoteRow[]>`
      INSERT INTO requirement_notes (id, project_id, requirement_id, clerk_user_id, note, status_snapshot)
      VALUES (gen_random_uuid()::text, ${projectId}, ${requirementId}, ${clerkUserId}, ${note}, ${statusSnapshot})
      RETURNING id, requirement_id, clerk_user_id, note, status_snapshot, created_at
    `;
    const r = rows[0];
    if (!r) throw new Error("Insert returned no rows");
    return {
      ok: true,
      value: {
        id: r.id,
        clerkUserId: r.clerk_user_id,
        note: r.note,
        statusSnapshot: r.status_snapshot,
        createdAt: r.created_at,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

export async function getRequirementNotes(
  projectId: string,
  requirementId: string
): Promise<Result<RequirementNoteRow[]>> {
  try {
    const rows = await db.$queryRaw<RawNoteRow[]>`
      SELECT id, requirement_id, clerk_user_id, note, status_snapshot, created_at
      FROM requirement_notes
      WHERE project_id = ${projectId} AND requirement_id = ${requirementId}
      ORDER BY created_at DESC
    `;
    return {
      ok: true,
      value: rows.map((r) => ({
        id: r.id,
        clerkUserId: r.clerk_user_id,
        note: r.note,
        statusSnapshot: r.status_snapshot,
        createdAt: r.created_at,
      })),
    };
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

export async function updateRequirementResponsibility(
  projectId: string,
  requirementId: string,
  data: {
    responsibleOrganizationId?: string | null;
    responsibleStakeholderId?: string | null;
    targetDate?: Date | null;
    isApplicable?: boolean;
    applicabilityReason?: string | null;
  }
): Promise<Result<void>> {
  try {
    await db.projectRequirement.update({
      where: { projectId_requirementId: { projectId, requirementId } },
      data,
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
