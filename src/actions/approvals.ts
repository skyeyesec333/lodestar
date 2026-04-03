"use server";

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { upsertApproval, getApproval, getApprovalHistory } from "@/lib/db/approvals";
import { recordActivity } from "@/lib/db/activity";
import { assertProjectAccess } from "@/lib/db/project-access";
import type { ApprovalRow, ApprovalHistoryEntry } from "@/lib/db/approvals";
import type { ApprovalStatus, ApprovalTargetType } from "@prisma/client";
import type { Result } from "@/types";

const TARGET_TYPES = ["requirement", "document"] as const;
const APPROVAL_STATUSES = ["draft", "in_review", "approved", "rejected"] as const;

const upsertApprovalSchema = z.object({
  projectId: z.string().min(1),
  slug: z.string().min(1),
  targetType: z.enum(TARGET_TYPES),
  targetId: z.string().min(1),
  status: z.enum(APPROVAL_STATUSES),
  note: z.string().max(1000).nullable().optional(),
  actorName: z.string().optional(),
});

export async function upsertApprovalAction(raw: unknown): Promise<Result<ApprovalRow>> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: { code: "UNAUTHORIZED", message: "Sign in required." } };

  const parsed = upsertApprovalSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input." } };

  const { projectId, slug, targetType, targetId, status, note, actorName } = parsed.data;

  const access = await assertProjectAccess(projectId, userId, "editor");
  if (!access.ok) return access;

  const previousResult = await getApproval(targetType as ApprovalTargetType, targetId);
  const previousStatus: ApprovalStatus | null = previousResult.ok && previousResult.value ? previousResult.value.status : null;

  const result = await upsertApproval(
    projectId,
    userId,
    targetType as ApprovalTargetType,
    targetId,
    status as ApprovalStatus,
    note ?? null
  );
  if (!result.ok) return result;

  const approvalId = result.value.id;
  const actor = actorName ?? "A team member";
  const statusLabel = status === "approved" ? "approved" : status === "rejected" ? "rejected" : status === "in_review" ? "submitted for review" : "set to draft";

  recordActivity(
    projectId,
    userId,
    "approval_status_changed",
    `${actor} ${statusLabel} ${targetType}`,
    {
      approvalId,
      entityType: targetType,
      entityId: targetId,
      fromStatus: previousStatus ?? null,
      toStatus: status,
      note: note ?? null,
      actorName: actor,
    }
  ).catch(() => {});

  revalidatePath(`/projects/${slug}`);
  return result;
}

const getApprovalSchema = z.object({
  projectId: z.string().min(1),
  targetType: z.enum(TARGET_TYPES),
  targetId: z.string().min(1),
});

export async function getApprovalAction(raw: unknown): Promise<Result<ApprovalRow | null>> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: { code: "UNAUTHORIZED", message: "Sign in required." } };

  const parsed = getApprovalSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input." } };

  const { projectId, targetType, targetId } = parsed.data;
  const access = await assertProjectAccess(projectId, userId, "viewer");
  if (!access.ok) return { ok: false, error: access.error };

  return getApproval(targetType as ApprovalTargetType, targetId);
}

const getApprovalHistorySchema = z.object({
  projectId: z.string().min(1),
  approvalId: z.string().min(1),
});

export async function getApprovalHistoryAction(raw: unknown): Promise<Result<ApprovalHistoryEntry[]>> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: { code: "UNAUTHORIZED", message: "Sign in required." } };

  const parsed = getApprovalHistorySchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input." } };

  const { projectId, approvalId } = parsed.data;
  const access = await assertProjectAccess(projectId, userId, "viewer");
  if (!access.ok) return { ok: false, error: access.error };

  return getApprovalHistory(approvalId, projectId);
}
