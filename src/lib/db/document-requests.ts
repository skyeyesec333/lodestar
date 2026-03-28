import { db } from "./index";
import type { DocumentRequestStatus } from "@prisma/client";
import type { Result } from "@/types";

export type DocumentRequestRow = {
  id: string;
  title: string;
  description: string | null;
  status: DocumentRequestStatus;
  dueDate: Date | null;
  requirementName: string | null;
  createdAt: Date;
};

export async function createDocumentRequestRecord(input: {
  projectId: string;
  stakeholderId: string;
  projectRequirementId: string | null;
  title: string;
  description: string | null;
  dueDate: Date | null;
  createdBy: string;
}): Promise<Result<DocumentRequestRow>> {
  try {
    const row = await db.documentRequest.create({
      data: {
        projectId: input.projectId,
        stakeholderId: input.stakeholderId,
        projectRequirementId: input.projectRequirementId,
        title: input.title,
        description: input.description,
        dueDate: input.dueDate,
        createdBy: input.createdBy,
        status: "requested",
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        dueDate: true,
        createdAt: true,
        projectRequirement: {
          select: {
            requirement: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return {
      ok: true,
      value: {
        id: row.id,
        title: row.title,
        description: row.description,
        status: row.status,
        dueDate: row.dueDate,
        requirementName: row.projectRequirement?.requirement.name ?? null,
        createdAt: row.createdAt,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

export async function updateDocumentRequestStatus(
  requestId: string,
  projectId: string,
  status: DocumentRequestStatus
): Promise<Result<void>> {
  try {
    const existing = await db.documentRequest.findFirst({
      where: { id: requestId, projectId },
      select: { id: true },
    });

    if (!existing) {
      return { ok: false, error: { code: "NOT_FOUND", message: "Document request not found." } };
    }

    await db.documentRequest.update({
      where: { id: existing.id },
      data: {
        status,
        fulfilledAt: status === "received" ? new Date() : null,
      },
      select: { id: true },
    });
    return { ok: true, value: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}
