import { db } from "./index";
import type { Result } from "@/types";

export type DocumentRow = {
  id: string;
  documentGroupId: string;
  version: number;
  filename: string;
  storagePath: string;
  contentType: string;
  sizeBytes: number;
  uploadedBy: string;
  state: string;
  projectRequirementId: string | null;
  expiresAt: Date | null;
  expiryAlertDismissedAt: Date | null;
  documentHash: string | null;
  createdAt: Date;
};

const documentSelect = {
  id: true,
  documentGroupId: true,
  version: true,
  filename: true,
  storagePath: true,
  contentType: true,
  sizeBytes: true,
  uploadedBy: true,
  state: true,
  projectRequirementId: true,
  expiresAt: true,
  expiryAlertDismissedAt: true,
  documentHash: true,
  createdAt: true,
} as const;

export type DocumentPage = {
  items: DocumentRow[];
  nextCursor: string | null;
};

export async function getProjectDocuments(
  projectId: string,
  limit = 50,
  cursor?: string
): Promise<Result<DocumentPage>> {
  try {
    const rows = await db.document.findMany({
      where: { projectId, state: "current" },
      select: documentSelect,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor
        ? { cursor: { id: cursor }, skip: 1 }
        : {}),
    });

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? (pageRows[pageRows.length - 1]?.id ?? null) : null;

    return {
      ok: true,
      value: {
        items: pageRows.map((r) => ({ ...r, sizeBytes: Number(r.sizeBytes) })),
        nextCursor,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

export async function getRequirementDocuments(
  projectId: string,
  requirementId: string
): Promise<Result<DocumentRow[]>> {
  try {
    const prRow = await db.projectRequirement.findUnique({
      where: { projectId_requirementId: { projectId, requirementId } },
      select: { id: true },
    });
    if (!prRow) return { ok: true, value: [] };

    const rows = await db.document.findMany({
      where: { projectId, projectRequirementId: prRow.id, state: "current" },
      select: documentSelect,
      orderBy: { createdAt: "desc" },
    });
    return {
      ok: true,
      value: rows.map((r) => ({ ...r, sizeBytes: Number(r.sizeBytes) })),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

export async function createDocumentRecord(input: {
  projectId: string;
  projectRequirementId: string | null;
  documentGroupId: string;
  version: number;
  filename: string;
  storagePath: string;
  contentType: string;
  sizeBytes: number;
  uploadedBy: string;
  documentHash?: string;
}): Promise<Result<DocumentRow>> {
  try {
    const row = await db.document.create({
      data: {
        ...input,
        sizeBytes: BigInt(input.sizeBytes),
        state: "current",
      },
      select: documentSelect,
    });
    return { ok: true, value: { ...row, sizeBytes: Number(row.sizeBytes) } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

export async function updateDocumentExpiry(
  documentId: string,
  projectId: string,
  data: { expiresAt: Date | null; expiryAlertDismissedAt?: Date | null }
): Promise<Result<void>> {
  try {
    const existing = await db.document.findFirst({
      where: { id: documentId, projectId },
      select: { id: true },
    });
    if (!existing) return { ok: false, error: { code: "NOT_FOUND", message: "Document not found." } };

    await db.document.update({
      where: { id: documentId },
      data: {
        expiresAt: data.expiresAt,
        ...(data.expiryAlertDismissedAt !== undefined && {
          expiryAlertDismissedAt: data.expiryAlertDismissedAt,
        }),
      },
    });
    return { ok: true, value: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

export async function getDocumentVersionHistory(
  documentGroupId: string,
  projectId: string
): Promise<Result<DocumentRow[]>> {
  try {
    const rows = await db.document.findMany({
      where: { documentGroupId, projectId },
      select: documentSelect,
      orderBy: { version: "desc" },
    });
    return {
      ok: true,
      value: rows.map((r) => ({ ...r, sizeBytes: Number(r.sizeBytes) })),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

export async function getExpiringDocuments(
  projectId: string,
  withinDays: number
): Promise<Result<DocumentRow[]>> {
  try {
    const now = new Date();
    const cutoff = new Date(now.getTime() + withinDays * 86400_000);
    const rows = await db.document.findMany({
      where: {
        projectId,
        state: "current",
        expiresAt: { gte: now, lte: cutoff },
      },
      select: documentSelect,
      orderBy: { expiresAt: "asc" },
    });
    return {
      ok: true,
      value: rows.map((r) => ({ ...r, sizeBytes: Number(r.sizeBytes) })),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

export async function deleteDocumentRecord(
  documentId: string,
  projectId: string
): Promise<Result<{ storagePath: string }>> {
  try {
    const row = await db.document.findFirst({
      where: { id: documentId, projectId },
      select: { storagePath: true },
    });
    if (!row) return { ok: false, error: { code: "NOT_FOUND", message: "Document not found." } };

    await db.document.delete({ where: { id: documentId } });
    return { ok: true, value: { storagePath: row.storagePath } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}
