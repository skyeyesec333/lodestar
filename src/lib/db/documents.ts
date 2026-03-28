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
  createdAt: true,
} as const;

export async function getProjectDocuments(
  projectId: string
): Promise<Result<DocumentRow[]>> {
  try {
    const rows = await db.document.findMany({
      where: { projectId, state: "current" },
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
