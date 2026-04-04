"use server";

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  updateRequirementStatusInDb,
  updateRequirementNotesInDb,
  updateProjectCachedScore,
  addRequirementNote,
  updateRequirementResponsibility,
} from "@/lib/db/requirements";
import type { RequirementNoteRow } from "@/lib/db/requirements";
import { recordActivity } from "@/lib/db/activity";
import { computeReadiness } from "@/lib/scoring/index";
import { getRequirementById } from "@/lib/requirements/index";
import { REQUIREMENT_STATUS_LABELS } from "@/types/requirements";
import type { Result, AppError } from "@/types";
import type { RequirementStatusValue } from "@/types/requirements";
import { assertProjectAccess } from "@/lib/db/project-access";
import { sendEmail, sendRequirementAssignedEmail } from "@/lib/notifications/email";

const STATUS_VALUES = [
  "not_started",
  "in_progress",
  "draft",
  "substantially_final",
  "executed",
  "waived",
  "not_applicable",
] as const;

const VALID_TRANSITIONS: Record<RequirementStatusValue, RequirementStatusValue[]> = {
  not_started: ["in_progress", "waived", "not_applicable"],
  in_progress: ["draft", "executed", "waived", "not_applicable"],
  draft: ["substantially_final", "waived", "not_applicable", "in_progress"],
  substantially_final: ["executed", "waived", "not_applicable", "draft"],
  executed: [],
  waived: [],
  not_applicable: [],
};

const updateStatusSchema = z.object({
  projectId: z.string().min(1),
  requirementId: z.string().min(1),
  status: z.enum(STATUS_VALUES),
  note: z.string().max(2000).optional(),
});

export async function updateRequirementStatus(
  input: unknown
): Promise<Result<{ scoreBps: number }>> {
  const { userId } = await auth();
  if (!userId) {
    return {
      ok: false,
      error: { code: "UNAUTHORIZED", message: "You must be signed in." },
    };
  }

  const parsed = updateStatusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    };
  }

  const { projectId, requirementId, status, note } = parsed.data;

  // Verify ownership and get slug for revalidation
  const access = await assertProjectAccess(projectId, userId, "editor");
  if (!access.ok) return access;

  // Fetch current status to validate transition
  const currentReq = await db.projectRequirement.findUnique({
    where: { projectId_requirementId: { projectId, requirementId } },
    select: { status: true },
  });

  if (!currentReq) {
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: "Requirement not found." },
    };
  }

  const currentStatus = currentReq.status as RequirementStatusValue;
  const validNextStatuses = VALID_TRANSITIONS[currentStatus];

  if (!validNextStatuses.includes(status)) {
    return {
      ok: false,
      error: {
        code: "INVALID_TRANSITION",
        message: `Cannot transition from ${REQUIREMENT_STATUS_LABELS[currentStatus]} to ${REQUIREMENT_STATUS_LABELS[status]}.`,
      },
    };
  }

  const updateResult = await updateRequirementStatusInDb(
    projectId,
    requirementId,
    status,
    userId
  );
  if (!updateResult.ok) return updateResult;

  // Recompute readiness from all current statuses
  const allStatuses = await db.projectRequirement.findMany({
    where: { projectId },
    select: { requirementId: true, status: true, isApplicable: true },
  });

  const dealType = access.value.dealType;
  const { scoreBps } = computeReadiness(
    allStatuses.map((r) => ({
      requirementId: r.requirementId,
      status: r.isApplicable === false
        ? ("not_applicable" as RequirementStatusValue)
        : (r.status as RequirementStatusValue),
    })),
    dealType
  );

  const scoreResult = await updateProjectCachedScore(projectId, scoreBps);
  if (!scoreResult.ok) return scoreResult;

  const reqName = getRequirementById(dealType, requirementId)?.name ?? requirementId;
  await recordActivity(projectId, userId, "requirement_status_changed",
    `${reqName} → ${REQUIREMENT_STATUS_LABELS[status]}`,
    { requirementId, status }
  );

  // Auto-add a note when one is supplied with the status change
  if (note && note.trim()) {
    await addRequirementNote(projectId, requirementId, userId, note.trim(), status);
  }

  revalidatePath(`/projects/${access.value.slug}`);

  db.projectRequirement.findUnique({
    where: { projectId_requirementId: { projectId, requirementId } },
    select: {
      responsibleStakeholder: { select: { email: true } },
      project: { select: { name: true } },
    },
  }).then((row) => {
    const email = row?.responsibleStakeholder?.email;
    const projectName = row?.project?.name;
    if (email && projectName) {
      sendEmail({
        to: email,
        subject: `Requirement updated: ${reqName}`,
        html: `<p>The requirement <strong>${reqName}</strong> on <strong>${projectName}</strong> has been updated to <strong>${REQUIREMENT_STATUS_LABELS[status]}</strong>.</p>`,
      }).catch(() => {});
    }
  }).catch(() => {});

  return { ok: true, value: { scoreBps } };
}

const updateNotesSchema = z.object({
  projectId: z.string().min(1),
  requirementId: z.string().min(1),
  notes: z.string().max(2000).nullable(),
});

export async function updateRequirementNotes(
  input: unknown
): Promise<Result<void>> {
  const { userId } = await auth();
  if (!userId) {
    return {
      ok: false,
      error: { code: "UNAUTHORIZED", message: "You must be signed in." },
    };
  }

  const parsed = updateNotesSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    };
  }

  const { projectId, requirementId, notes } = parsed.data;

  const access = await assertProjectAccess(projectId, userId, "editor");
  if (!access.ok) return access;

  const result = await updateRequirementNotesInDb(projectId, requirementId, notes);
  if (!result.ok) return result;

  recordActivity(projectId, userId, "requirement_notes_updated",
    `Notes updated for requirement ${requirementId}`,
    { requirementId }
  ).catch(() => {});

  revalidatePath(`/projects/${access.value.slug}`);

  return { ok: true, value: undefined };
}

const addNoteSchema = z.object({
  projectId: z.string().min(1),
  requirementId: z.string().min(1),
  note: z.string().max(2000),
  statusSnapshot: z.string().min(1),
});

export async function addRequirementNoteAction(
  raw: unknown
): Promise<Result<RequirementNoteRow>> {
  const { userId } = await auth();
  if (!userId) {
    return {
      ok: false,
      error: { code: "UNAUTHORIZED", message: "You must be signed in." },
    };
  }

  const parsed = addNoteSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    };
  }

  const { projectId, requirementId, note, statusSnapshot } = parsed.data;

  const access = await assertProjectAccess(projectId, userId, "editor");
  if (!access.ok) return access;

  const result = await addRequirementNote(projectId, requirementId, userId, note, statusSnapshot);
  if (!result.ok) return result;

  recordActivity(projectId, userId, "requirement_note_added",
    `Note added for requirement ${requirementId}`,
    { requirementId, statusSnapshot }
  ).catch(() => {});

  revalidatePath(`/projects/${access.value.slug}`);

  return result;
}

const bulkUpdateStatusSchema = z.object({
  projectId: z.string().min(1),
  requirementIds: z.array(z.string().min(1)).min(1),
  status: z.enum(STATUS_VALUES),
  slug: z.string().min(1),
});

export async function bulkUpdateRequirementStatus(
  input: unknown
): Promise<Result<void>> {
  const { userId } = await auth();
  if (!userId) {
    return {
      ok: false,
      error: { code: "UNAUTHORIZED", message: "You must be signed in." },
    };
  }

  const parsed = bulkUpdateStatusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    };
  }

  const { projectId, requirementIds, status, slug } = parsed.data;

  const access = await assertProjectAccess(projectId, userId, "editor");
  if (!access.ok) return access;

  try {
    await db.projectRequirement.updateMany({
      where: { projectId, requirementId: { in: requirementIds } },
      data: { status },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }

  recordActivity(projectId, userId, "requirement_status_updated",
    `Bulk status update: ${requirementIds.length} requirements → ${status}`,
    { requirementIds, status }
  ).catch(() => {});

  revalidatePath(`/projects/${slug}`);

  return { ok: true, value: undefined };
}

const copyRequirementsSchema = z.object({
  sourceProjectId: z.string().min(1),
  targetProjectId: z.string().min(1),
  targetSlug: z.string().min(1),
});

export async function copyRequirementsFromProject(
  sourceProjectId: string,
  targetProjectId: string,
  targetSlug: string
): Promise<Result<{ copied: number }>> {
  const { userId } = await auth();
  if (!userId) {
    return {
      ok: false,
      error: { code: "UNAUTHORIZED", message: "You must be signed in." },
    };
  }

  const parsed = copyRequirementsSchema.safeParse({ sourceProjectId, targetProjectId, targetSlug });
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    };
  }

  const sourceAccess = await assertProjectAccess(sourceProjectId, userId, "viewer");
  if (!sourceAccess.ok) return sourceAccess;

  const targetAccess = await assertProjectAccess(targetProjectId, userId, "editor");
  if (!targetAccess.ok) return targetAccess;

  let sourceRequirements: Array<{ requirementId: string }>;
  try {
    sourceRequirements = await db.projectRequirement.findMany({
      where: { projectId: sourceProjectId, isApplicable: true },
      select: { requirementId: true },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }

  if (sourceRequirements.length === 0) {
    revalidatePath(`/projects/${targetSlug}`);
    return { ok: true, value: { copied: 0 } };
  }

  let createResult: { count: number };
  try {
    createResult = await db.projectRequirement.createMany({
      data: sourceRequirements.map((r) => ({
        projectId: targetProjectId,
        requirementId: r.requirementId,
        status: "not_started" as const,
        isApplicable: true,
        responsibleOrganizationId: null,
        responsibleStakeholderId: null,
        targetDate: null,
      })),
      skipDuplicates: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }

  recordActivity(targetProjectId, userId, "requirements_copied",
    `Copied ${createResult.count} requirements from another project`,
    { sourceProjectId, copiedCount: createResult.count }
  ).catch(() => {});

  revalidatePath(`/projects/${targetSlug}`);

  return { ok: true, value: { copied: createResult.count } };
}

const updateResponsibilitySchema = z.object({
  projectId: z.string().min(1),
  requirementId: z.string().min(1),
  slug: z.string().min(1),
  responsibleOrganizationId: z.string().nullable().optional(),
  responsibleStakeholderId: z.string().nullable().optional(),
  targetDate: z.string().date().nullable().optional(),
  isApplicable: z.boolean().optional(),
  applicabilityReason: z.string().max(500).nullable().optional(),
});

export async function updateRequirementResponsibilityAction(
  raw: unknown
): Promise<Result<void>> {
  const { userId } = await auth();
  if (!userId) {
    return {
      ok: false,
      error: { code: "UNAUTHORIZED", message: "You must be signed in." },
    };
  }

  const parsed = updateResponsibilitySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    };
  }

  const { projectId, requirementId, slug, responsibleOrganizationId, responsibleStakeholderId, targetDate, isApplicable, applicabilityReason } = parsed.data;

  const access = await assertProjectAccess(projectId, userId, "editor");
  if (!access.ok) return access;

  const result = await updateRequirementResponsibility(projectId, requirementId, {
    responsibleOrganizationId: responsibleOrganizationId ?? null,
    responsibleStakeholderId: responsibleStakeholderId ?? null,
    targetDate: targetDate ? new Date(targetDate) : null,
    isApplicable,
    applicabilityReason: applicabilityReason ?? null,
  });
  if (!result.ok) return result;

  recordActivity(projectId, userId, "requirement_responsibility_updated",
    `Responsibility updated for requirement ${requirementId}`,
    { requirementId }
  ).catch(() => {});

  if (responsibleStakeholderId) {
    const newStakeholderId = responsibleStakeholderId;
    db.stakeholder.findUnique({
      where: { id: newStakeholderId },
      select: { email: true },
    }).then(async (stakeholder) => {
      if (!stakeholder?.email) return;
      const proj = await db.project.findUnique({
        where: { id: projectId },
        select: { name: true, slug: true },
      });
      if (!proj) return;
      const reqDef = await db.projectRequirement.findUnique({
        where: { projectId_requirementId: { projectId, requirementId } },
        select: { requirement: { select: { name: true } } },
      });
      const reqName = reqDef?.requirement?.name ?? requirementId;
      sendRequirementAssignedEmail({
        to: stakeholder.email,
        projectName: proj.name,
        requirementName: reqName,
        projectSlug: proj.slug,
      }).catch(() => {});
    }).catch(() => {});
  }

  revalidatePath(`/projects/${slug || access.value.slug}`);

  return { ok: true, value: undefined };
}

const bulkAssignSchema = z.object({
  projectId: z.string().min(1),
  slug: z.string().min(1),
  requirementIds: z.array(z.string().min(1)).min(1).max(50),
  responsibleOrganizationId: z.string().min(1).nullable(),
  responsibleStakeholderId: z.string().min(1).nullable(),
  targetDate: z.string().datetime().nullable().optional(),
});

export async function bulkAssignResponsibility(
  raw: unknown
): Promise<Result<{ updated: number }>> {
  const { userId } = await auth();
  if (!userId) {
    return {
      ok: false,
      error: { code: "UNAUTHORIZED", message: "You must be signed in." },
    };
  }

  const parsed = bulkAssignSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    };
  }

  const { projectId, slug, requirementIds, responsibleOrganizationId, responsibleStakeholderId, targetDate } = parsed.data;

  const access = await assertProjectAccess(projectId, userId, "editor");
  if (!access.ok) return access;

  try {
    const result = await db.projectRequirement.updateMany({
      where: {
        projectId,
        requirementId: { in: requirementIds },
      },
      data: {
        responsibleOrganizationId: responsibleOrganizationId,
        responsibleStakeholderId: responsibleStakeholderId,
        targetDate: targetDate ? new Date(targetDate) : null,
      },
    });

    recordActivity(projectId, userId, "requirement_responsibility_bulk_assigned",
      `Bulk assigned ${requirementIds.length} requirements`,
      { requirementIds, responsibleOrganizationId, responsibleStakeholderId }
    ).catch(() => {});

    revalidatePath(`/projects/${slug}`);

    return { ok: true, value: { updated: result.count } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}
