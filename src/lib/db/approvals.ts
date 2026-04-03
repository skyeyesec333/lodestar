import { db } from "./index";
import type { ApprovalStatus, ApprovalTargetType } from "@prisma/client";
import type { Result } from "@/types";

export type ApprovalRow = {
  id: string;
  projectId: string;
  reviewerId: string;
  status: ApprovalStatus;
  note: string | null;
  targetType: ApprovalTargetType;
  projectRequirementId: string | null;
  documentId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const approvalSelect = {
  id: true,
  projectId: true,
  reviewerId: true,
  status: true,
  note: true,
  targetType: true,
  projectRequirementId: true,
  documentId: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function getApproval(
  targetType: ApprovalTargetType,
  targetId: string
): Promise<Result<ApprovalRow | null>> {
  try {
    const where =
      targetType === "requirement"
        ? { projectRequirementId: targetId }
        : { documentId: targetId };

    const row = await db.approval.findFirst({ where, select: approvalSelect });
    return { ok: true, value: row };
  } catch (err) {
    return { ok: false, error: { code: "DATABASE_ERROR", message: err instanceof Error ? err.message : "Unknown error" } };
  }
}

export async function upsertApproval(
  projectId: string,
  reviewerId: string,
  targetType: ApprovalTargetType,
  targetId: string,
  status: ApprovalStatus,
  note: string | null
): Promise<Result<ApprovalRow>> {
  const targetField =
    targetType === "requirement"
      ? { projectRequirementId: targetId }
      : { documentId: targetId };

  const whereUnique =
    targetType === "requirement"
      ? { projectRequirementId: targetId }
      : { documentId: targetId };

  try {
    const row = await db.approval.upsert({
      where: whereUnique,
      create: {
        projectId,
        reviewerId,
        status,
        note,
        targetType,
        ...targetField,
      },
      update: {
        reviewerId,
        status,
        note,
        updatedAt: new Date(),
      },
      select: approvalSelect,
    });
    return { ok: true, value: row };
  } catch (err) {
    return { ok: false, error: { code: "DATABASE_ERROR", message: err instanceof Error ? err.message : "Unknown error" } };
  }
}

export type ApprovalHistoryEntry = {
  id: string;
  actorClerkId: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdAt: Date;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export async function getApprovalHistory(
  approvalId: string,
  projectId: string
): Promise<Result<ApprovalHistoryEntry[]>> {
  try {
    const rows = await db.activityEvent.findMany({
      where: {
        projectId,
        eventType: "approval_status_changed",
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        clerkUserId: true,
        metadata: true,
        createdAt: true,
      },
    });

    const entries: ApprovalHistoryEntry[] = rows
      .filter((row) => {
        const meta = isRecord(row.metadata) ? row.metadata : null;
        return meta?.approvalId === approvalId;
      })
      .map((row) => {
        const meta = isRecord(row.metadata) ? row.metadata : null;
        return {
          id: row.id,
          actorClerkId: row.clerkUserId,
          fromStatus: typeof meta?.fromStatus === "string" ? meta.fromStatus : null,
          toStatus: typeof meta?.toStatus === "string" ? meta.toStatus : "draft",
          note: typeof meta?.note === "string" ? meta.note : null,
          createdAt: row.createdAt,
        };
      });

    return { ok: true, value: entries };
  } catch (err) {
    return {
      ok: false,
      error: { code: "DATABASE_ERROR", message: err instanceof Error ? err.message : "Unknown error" },
    };
  }
}

export async function getApprovalsByProject(
  projectId: string
): Promise<Result<ApprovalRow[]>> {
  try {
    const rows = await db.approval.findMany({
      where: { projectId },
      orderBy: { updatedAt: "desc" },
      select: approvalSelect,
    });
    return { ok: true, value: rows };
  } catch (err) {
    return { ok: false, error: { code: "DATABASE_ERROR", message: err instanceof Error ? err.message : "Unknown error" } };
  }
}
