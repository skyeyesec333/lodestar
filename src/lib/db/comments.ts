import { db } from "./index";
import type { CommentTargetType } from "@prisma/client";
import type { Result } from "@/types";

export type CommentMentionRow = {
  mentionedId: string;
};

export type CommentRow = {
  id: string;
  projectId: string;
  authorId: string;
  body: string;
  editedAt: Date | null;
  createdAt: Date;
  targetType: CommentTargetType;
  projectRequirementId: string | null;
  documentId: string | null;
  meetingId: string | null;
  mentions: CommentMentionRow[];
};

const commentSelect = {
  id: true,
  projectId: true,
  authorId: true,
  body: true,
  editedAt: true,
  createdAt: true,
  targetType: true,
  projectRequirementId: true,
  documentId: true,
  meetingId: true,
  mentions: { select: { mentionedId: true } },
} as const;

export async function getCommentsForTarget(
  projectId: string,
  targetType: CommentTargetType,
  targetId: string
): Promise<Result<CommentRow[]>> {
  const where =
    targetType === "requirement"
      ? { projectId, targetType, projectRequirementId: targetId }
      : targetType === "document"
        ? { projectId, targetType, documentId: targetId }
        : { projectId, targetType, meetingId: targetId };

  try {
    const rows = await db.comment.findMany({
      where,
      orderBy: { createdAt: "asc" },
      select: commentSelect,
    });
    return { ok: true, value: rows };
  } catch (err) {
    return { ok: false, error: { code: "DATABASE_ERROR", message: err instanceof Error ? err.message : "Unknown error" } };
  }
}

export async function getCommentsByProject(
  projectId: string
): Promise<Result<CommentRow[]>> {
  try {
    const rows = await db.comment.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
      select: commentSelect,
    });
    return { ok: true, value: rows };
  } catch (err) {
    return { ok: false, error: { code: "DATABASE_ERROR", message: err instanceof Error ? err.message : "Unknown error" } };
  }
}

export async function addComment(
  projectId: string,
  authorId: string,
  targetType: CommentTargetType,
  targetId: string,
  body: string,
  mentionedIds: string[]
): Promise<Result<CommentRow>> {
  const targetField =
    targetType === "requirement"
      ? { projectRequirementId: targetId }
      : targetType === "document"
        ? { documentId: targetId }
        : { meetingId: targetId };

  try {
    const row = await db.comment.create({
      data: {
        projectId,
        authorId,
        body,
        targetType,
        ...targetField,
        mentions: mentionedIds.length > 0
          ? { create: mentionedIds.map((mentionedId) => ({ mentionedId })) }
          : undefined,
      },
      select: commentSelect,
    });
    return { ok: true, value: row };
  } catch (err) {
    return { ok: false, error: { code: "DATABASE_ERROR", message: err instanceof Error ? err.message : "Unknown error" } };
  }
}

export async function editComment(
  commentId: string,
  authorId: string,
  body: string,
  mentionedIds: string[]
): Promise<Result<CommentRow>> {
  try {
    // Verify ownership before edit
    const existing = await db.comment.findUnique({ where: { id: commentId }, select: { authorId: true } });
    if (!existing) return { ok: false, error: { code: "NOT_FOUND", message: "Comment not found." } };
    if (existing.authorId !== authorId) return { ok: false, error: { code: "UNAUTHORIZED", message: "You can only edit your own comments." } };

    // Replace mentions atomically
    const row = await db.comment.update({
      where: { id: commentId },
      data: {
        body,
        editedAt: new Date(),
        mentions: {
          deleteMany: {},
          create: mentionedIds.map((mentionedId) => ({ mentionedId })),
        },
      },
      select: commentSelect,
    });
    return { ok: true, value: row };
  } catch (err) {
    return { ok: false, error: { code: "DATABASE_ERROR", message: err instanceof Error ? err.message : "Unknown error" } };
  }
}

export async function deleteComment(
  commentId: string,
  authorId: string
): Promise<Result<void>> {
  try {
    const existing = await db.comment.findUnique({ where: { id: commentId }, select: { authorId: true } });
    if (!existing) return { ok: false, error: { code: "NOT_FOUND", message: "Comment not found." } };
    if (existing.authorId !== authorId) return { ok: false, error: { code: "UNAUTHORIZED", message: "You can only delete your own comments." } };

    await db.comment.delete({ where: { id: commentId } });
    return { ok: true, value: undefined };
  } catch (err) {
    return { ok: false, error: { code: "DATABASE_ERROR", message: err instanceof Error ? err.message : "Unknown error" } };
  }
}
