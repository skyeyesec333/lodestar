"use server";

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { DocumentRequestStatus } from "@prisma/client";
import { recordActivity } from "@/lib/db/activity";
import { assertProjectAccess } from "@/lib/db/project-access";
import {
  createDocumentRequestRecord,
  type DocumentRequestRow,
  updateDocumentRequestStatus,
} from "@/lib/db/document-requests";
import type { Result } from "@/types";

const createSchema = z.object({
  projectId: z.string().min(1),
  slug: z.string().min(1),
  stakeholderId: z.string().min(1),
  stakeholderName: z.string().min(1),
  title: z.string().min(1).max(160),
  description: z.string().max(1000).nullable().optional(),
  projectRequirementId: z.string().min(1).nullable().optional(),
  requirementName: z.string().min(1).nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

const updateSchema = z.object({
  projectId: z.string().min(1),
  slug: z.string().min(1),
  requestId: z.string().min(1),
  stakeholderName: z.string().min(1),
  title: z.string().min(1),
  status: z.enum(["requested", "received", "waived", "cancelled"]),
});


export async function createDocumentRequest(input: unknown): Promise<Result<DocumentRequestRow>> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: { code: "UNAUTHORIZED", message: "You must be signed in." } };
  }

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input." },
    };
  }

  const {
    projectId,
    slug,
    stakeholderId,
    stakeholderName,
    title,
    description,
    projectRequirementId,
    requirementName,
    dueDate,
  } = parsed.data;

  const access = await assertProjectAccess(projectId, userId, "editor");
  if (!access.ok) return access;

  const result = await createDocumentRequestRecord({
    projectId,
    stakeholderId,
    projectRequirementId: projectRequirementId ?? null,
    title,
    description: description ?? null,
    dueDate: dueDate ? new Date(dueDate) : null,
    createdBy: userId,
  });
  if (!result.ok) return result;

  await recordActivity(
    projectId,
    userId,
    "document_request_added",
    requirementName
      ? `${stakeholderName} asked for ${title} (${requirementName})`
      : `${stakeholderName} asked for ${title}`,
    {
      stakeholderId,
      title,
      projectRequirementId: projectRequirementId ?? null,
    }
  );

  revalidatePath(`/projects/${slug}`);
  return result;
}

export async function updateStakeholderDocumentRequestStatus(
  input: unknown
): Promise<Result<void>> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: { code: "UNAUTHORIZED", message: "You must be signed in." } };
  }

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input." },
    };
  }

  const { projectId, slug, requestId, stakeholderName, title, status } = parsed.data;

  const access = await assertProjectAccess(projectId, userId, "editor");
  if (!access.ok) return access;

  const result = await updateDocumentRequestStatus(
    requestId,
    projectId,
    status as DocumentRequestStatus
  );
  if (!result.ok) return result;

  await recordActivity(
    projectId,
    userId,
    "document_request_updated",
    `${stakeholderName}: ${title} marked ${status.replace(/_/g, " ")}`,
    { requestId, status }
  );

  revalidatePath(`/projects/${slug}`);
  return { ok: true, value: undefined };
}
