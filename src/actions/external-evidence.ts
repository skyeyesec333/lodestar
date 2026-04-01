"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertProjectAccess } from "@/lib/db/project-access";
import {
  createExternalEvidenceSource,
  deleteExternalEvidenceSource,
  EXTERNAL_EVIDENCE_PROVIDERS,
  EXTERNAL_EVIDENCE_SOURCE_TYPES,
} from "@/lib/db/external-evidence";
import type { Result } from "@/types";

const createSchema = z.object({
  projectId: z.string().min(1),
  slug: z.string().min(1),
  projectRequirementId: z.string().min(1).nullable().optional(),
  provider: z.enum(EXTERNAL_EVIDENCE_PROVIDERS),
  sourceType: z.enum(EXTERNAL_EVIDENCE_SOURCE_TYPES).default("file"),
  title: z.string().trim().min(2).max(240),
  url: z.string().trim().url().max(2000),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export async function addExternalEvidenceLink(
  input: unknown
): Promise<Result<Awaited<ReturnType<typeof createExternalEvidenceSource>> extends Result<infer T> ? T : never>> {
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

  const access = await assertProjectAccess(parsed.data.projectId, userId, "editor");
  if (!access.ok) return access;

  const result = await createExternalEvidenceSource({
    projectId: parsed.data.projectId,
    projectRequirementId: parsed.data.projectRequirementId ?? null,
    provider: parsed.data.provider,
    sourceType: parsed.data.sourceType,
    title: parsed.data.title,
    url: parsed.data.url,
    notes: parsed.data.notes ?? null,
    linkedBy: userId,
  });
  if (!result.ok) return result;

  revalidatePath(`/projects/${parsed.data.slug}`);
  return result;
}

const deleteSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  slug: z.string().min(1),
});

export async function removeExternalEvidenceLink(
  input: unknown
): Promise<Result<{ id: string }>> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: { code: "UNAUTHORIZED", message: "You must be signed in." } };
  }

  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input." },
    };
  }

  const access = await assertProjectAccess(parsed.data.projectId, userId, "editor");
  if (!access.ok) return access;

  const result = await deleteExternalEvidenceSource({
    id: parsed.data.id,
    projectId: parsed.data.projectId,
  });
  if (!result.ok) return result;

  revalidatePath(`/projects/${parsed.data.slug}`);
  return result;
}
