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
import { EXIM_REQUIREMENTS } from "@/lib/exim/requirements";
import { REQUIREMENT_STATUS_LABELS } from "@/types/requirements";
import type { Result, AppError } from "@/types";
import type { RequirementStatusValue } from "@/types/requirements";
import { assertProjectAccess } from "@/lib/db/project-access";

const STATUS_VALUES = [
  "not_started",
  "in_progress",
  "draft",
  "substantially_final",
  "executed",
  "waived",
] as const;

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
    select: { requirementId: true, status: true },
  });

  const { scoreBps } = computeReadiness(
    allStatuses.map((r) => ({
      requirementId: r.requirementId,
      status: r.status as RequirementStatusValue,
    }))
  );

  const scoreResult = await updateProjectCachedScore(projectId, scoreBps);
  if (!scoreResult.ok) return scoreResult;

  const reqName = EXIM_REQUIREMENTS.find((r) => r.id === requirementId)?.name ?? requirementId;
  await recordActivity(projectId, userId, "requirement_status_changed",
    `${reqName} → ${REQUIREMENT_STATUS_LABELS[status]}`,
    { requirementId, status }
  );

  // Auto-add a note when one is supplied with the status change
  if (note && note.trim()) {
    await addRequirementNote(projectId, requirementId, userId, note.trim(), status);
  }

  revalidatePath(`/projects/${access.value.slug}`);

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

  revalidatePath(`/projects/${access.value.slug}`);

  return result;
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

  revalidatePath(`/projects/${slug || access.value.slug}`);

  return { ok: true, value: undefined };
}
