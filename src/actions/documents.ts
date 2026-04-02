"use server";

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { updateDocumentExpiry } from "@/lib/db/documents";
import { assertProjectAccess } from "@/lib/db/project-access";
import type { Result } from "@/types";

const updateDocumentExpirySchema = z.object({
  documentId: z.string().min(1),
  projectId: z.string().min(1),
  slug: z.string().min(1),
  expiresAt: z.string().nullable(),
});

export async function updateDocumentExpiryAction(
  input: unknown
): Promise<Result<void>> {
  const { userId } = await auth();
  if (!userId) {
    return {
      ok: false,
      error: { code: "UNAUTHORIZED", message: "You must be signed in." },
    };
  }

  const parsed = updateDocumentExpirySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    };
  }

  const { documentId, projectId, slug, expiresAt } = parsed.data;

  const access = await assertProjectAccess(projectId, userId, "editor");
  if (!access.ok) return access;

  const expiresAtDate = expiresAt ? new Date(expiresAt) : null;

  const result = await updateDocumentExpiry(documentId, projectId, {
    expiresAt: expiresAtDate,
  });
  if (!result.ok) return result;

  revalidatePath(`/projects/${slug}`);

  return { ok: true, value: undefined };
}
