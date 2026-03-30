import { db } from "./index";
import { EXIM_REQUIREMENTS } from "@/lib/exim/requirements";
import { getRequirementsForDealType } from "@/lib/requirements/index";
import type { RequirementDef } from "@/lib/requirements/types";
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
  requirements: readonly RequirementDef[],
  statusMap: Map<string, StatusRow>,
  notesMap: Map<string, RequirementNoteRow[]>
): ProjectRequirementRow[] {
  return requirements.map((req) => {
    const live = statusMap.get(req.id);
    return {
      projectRequirementId: live?.id ?? "",
      requirementId: req.id,
      name: req.name,
      description: req.description,
      category: req.category,
      phaseRequired: req.phaseRequired,
      isLoiCritical: req.isPrimaryGate,
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
 * Returns all requirement rows for a project, merged with the correct static
 * taxonomy for the project's deal type.
 * Initializes any missing rows to not_started (idempotent via createMany skipDuplicates).
 */
type RawNoteRow = {
  id: string;
  requirementId: string;
  clerkUserId: string;
  note: string;
  statusSnapshot: string;
  createdAt: Date;
};

async function fetchNotesMap(projectId: string): Promise<Map<string, RequirementNoteRow[]>> {
  const allNotes = await db.$queryRaw<RawNoteRow[]>`
    SELECT id, "requirementId", "clerkUserId", note, "statusSnapshot", "createdAt"
    FROM requirement_notes
    WHERE "projectId" = ${projectId}
    ORDER BY "createdAt" DESC
    LIMIT 200
  `;

  const map = new Map<string, RequirementNoteRow[]>();
  for (const n of allNotes) {
    const shaped: RequirementNoteRow = {
      id: n.id,
      clerkUserId: n.clerkUserId,
      note: n.note,
      statusSnapshot: n.statusSnapshot,
      createdAt: n.createdAt,
    };
    const existing = map.get(n.requirementId);
    if (!existing) {
      map.set(n.requirementId, [shaped]);
    } else if (existing.length < 5) {
      existing.push(shaped);
    }
  }
  return map;
}

export async function getProjectRequirements(
  projectId: string,
  dealType?: string
): Promise<Result<ProjectRequirementRow[]>> {
  try {
    // Resolve the taxonomy for this deal type (falls back to EXIM if omitted)
    const requirements: readonly RequirementDef[] =
      dealType && dealType !== "exim_project_finance"
        ? getRequirementsForDealType(dealType)
        : EXIM_REQUIREMENTS.map((r) => ({
            id: r.id,
            category: r.category,
            name: r.name,
            description: r.description,
            phaseRequired: r.phaseRequired,
            isPrimaryGate: r.isLoiCritical,
            weight: r.weight,
            sortOrder: r.sortOrder,
            phaseLabel: r.phaseRequired === "loi" ? "LOI" : "Final Commitment",
            defaultOwner: "Sponsor",
            applicableSectors: r.applicableSectors,
          }));

    const existing = await db.projectRequirement.findMany({
      where: { projectId },
      select: requirementStatusSelect,
    });

    const existingIds = new Set(existing.map((r) => r.requirementId));
    const missingIds = requirements
      .map((r) => r.id)
      .filter((id) => !existingIds.has(id));

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
      return {
        ok: true,
        value: buildRows(
          requirements,
          new Map(all.map((r) => [r.requirementId, r])),
          notesMap
        ),
      };
    }

    return {
      ok: true,
      value: buildRows(
        requirements,
        new Map(existing.map((r) => [r.requirementId, r])),
        notesMap
      ),
    };
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
      INSERT INTO requirement_notes (id, "projectId", "requirementId", "clerkUserId", note, "statusSnapshot")
      VALUES (gen_random_uuid()::text, ${projectId}, ${requirementId}, ${clerkUserId}, ${note}, ${statusSnapshot})
      RETURNING id, "requirementId", "clerkUserId", note, "statusSnapshot", "createdAt"
    `;
    const r = rows[0];
    if (!r) throw new Error("Insert returned no rows");
    return {
      ok: true,
      value: {
        id: r.id,
        clerkUserId: r.clerkUserId,
        note: r.note,
        statusSnapshot: r.statusSnapshot,
        createdAt: r.createdAt,
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
      SELECT id, "requirementId", "clerkUserId", note, "statusSnapshot", "createdAt"
      FROM requirement_notes
      WHERE "projectId" = ${projectId} AND "requirementId" = ${requirementId}
      ORDER BY "createdAt" DESC
    `;
    return {
      ok: true,
      value: rows.map((r) => ({
        id: r.id,
        clerkUserId: r.clerkUserId,
        note: r.note,
        statusSnapshot: r.statusSnapshot,
        createdAt: r.createdAt,
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
