"use server";

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { addComment, editComment, deleteComment, getCommentsForTarget } from "@/lib/db/comments";
import { recordActivity } from "@/lib/db/activity";
import { assertProjectAccess } from "@/lib/db/project-access";
import type { CommentRow } from "@/lib/db/comments";
import type { CommentTargetType } from "@prisma/client";
import type { Result } from "@/types";

const TARGET_TYPES = ["requirement", "document", "meeting"] as const;

const addCommentSchema = z.object({
  projectId: z.string().min(1),
  slug: z.string().min(1),
  targetType: z.enum(TARGET_TYPES),
  targetId: z.string().min(1),
  body: z.string().min(1).max(3000),
  mentionedIds: z.array(z.string()).default([]),
  actorName: z.string().optional(),
});

export async function addCommentAction(raw: unknown): Promise<Result<CommentRow>> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: { code: "UNAUTHORIZED", message: "Sign in required." } };

  const parsed = addCommentSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input." } };

  const { projectId, slug, targetType, targetId, body, mentionedIds, actorName } = parsed.data;

  const access = await assertProjectAccess(projectId, userId, "viewer");
  if (!access.ok) return access;

  const result = await addComment(projectId, userId, targetType as CommentTargetType, targetId, body, mentionedIds);
  if (!result.ok) return result;

  const actor = actorName ?? "A team member";
  await recordActivity(projectId, userId, "comment_added",
    `${actor} commented on ${targetType}`,
    { targetType, targetId, commentId: result.value.id, mentionCount: mentionedIds.length, actorName: actor }
  );

  if (mentionedIds.length > 0) {
    await recordActivity(projectId, userId, "mention_created",
      `${actor} mentioned ${mentionedIds.length === 1 ? "someone" : `${mentionedIds.length} people`} in a comment`,
      { targetType, targetId, commentId: result.value.id, mentionedIds, actorName: actor }
    );
  }

  revalidatePath(`/projects/${slug}`);
  return result;
}

const editCommentSchema = z.object({
  projectId: z.string().min(1),
  slug: z.string().min(1),
  commentId: z.string().min(1),
  body: z.string().min(1).max(3000),
  mentionedIds: z.array(z.string()).default([]),
});

export async function editCommentAction(raw: unknown): Promise<Result<CommentRow>> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: { code: "UNAUTHORIZED", message: "Sign in required." } };

  const parsed = editCommentSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input." } };

  const { slug, commentId, body, mentionedIds } = parsed.data;

  const result = await editComment(commentId, userId, body, mentionedIds);
  if (!result.ok) return result;

  revalidatePath(`/projects/${slug}`);
  return result;
}

const deleteCommentSchema = z.object({
  projectId: z.string().min(1),
  slug: z.string().min(1),
  commentId: z.string().min(1),
});

export async function deleteCommentAction(raw: unknown): Promise<Result<void>> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: { code: "UNAUTHORIZED", message: "Sign in required." } };

  const parsed = deleteCommentSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input." } };

  const { slug, commentId } = parsed.data;

  const result = await deleteComment(commentId, userId);
  if (!result.ok) return result;

  revalidatePath(`/projects/${slug}`);
  return result;
}

const getCommentsSchema = z.object({
  projectId: z.string().min(1),
  targetType: z.enum(TARGET_TYPES),
  targetId: z.string().min(1),
});

export async function getCommentsAction(raw: unknown): Promise<Result<CommentRow[]>> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: { code: "UNAUTHORIZED", message: "Sign in required." } };

  const parsed = getCommentsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input." } };

  const { projectId, targetType, targetId } = parsed.data;
  return getCommentsForTarget(projectId, targetType as CommentTargetType, targetId);
}
