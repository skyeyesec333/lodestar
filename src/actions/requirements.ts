"use server";

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  updateRequirementStatusInDb,
  updateRequirementNotesInDb,
  updateProjectCachedScore,
} from "@/lib/db/requirements";
import { recordActivity } from "@/lib/db/activity";
import { computeReadiness } from "@/lib/scoring/index";
import { EXIM_REQUIREMENTS } from "@/lib/exim/requirements";
import { REQUIREMENT_STATUS_LABELS } from "@/types/requirements";
import type { Result, AppError } from "@/types";
import type { RequirementStatusValue } from "@/types/requirements";

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

  const { projectId, requirementId, status } = parsed.data;

  // Verify ownership and get slug for revalidation
  const project = await db.project.findFirst({
    where: { id: projectId, ownerClerkId: userId },
    select: { id: true, slug: true },
  });

  if (!project) {
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: "Project not found." },
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

  revalidatePath(`/projects/${project.slug}`);

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

  const project = await db.project.findFirst({
    where: { id: projectId, ownerClerkId: userId },
    select: { id: true, slug: true },
  });

  if (!project) {
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: "Project not found." },
    };
  }

  const result = await updateRequirementNotesInDb(projectId, requirementId, notes);
  if (!result.ok) return result;

  revalidatePath(`/projects/${project.slug}`);

  return { ok: true, value: undefined };
}
