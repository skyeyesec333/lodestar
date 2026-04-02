"use server";

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createShareLink, revokeShareLink } from "@/lib/db/share-links";
import { assertProjectAccess } from "@/lib/db/project-access";
import type { ShareLinkRow } from "@/lib/db/share-links";
import type { Result } from "@/types";

// ── Create ─────────────────────────────────────────────────────────────────────

const createShareLinkSchema = z.object({
  projectId: z.string().min(1),
  slug: z.string().min(1),
  label: z.string().max(120).nullish(),
  expiresAt: z
    .string()
    .datetime({ offset: true })
    .nullish()
    .transform((v) => (v ? new Date(v) : null)),
});

export async function createShareLinkAction(
  raw: unknown
): Promise<Result<ShareLinkRow>> {
  const { userId } = await auth();
  if (!userId) {
    return {
      ok: false,
      error: { code: "UNAUTHORIZED", message: "Sign in required." },
    };
  }

  const parsed = createShareLinkSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    };
  }

  const { projectId, slug, label, expiresAt } = parsed.data;

  // Only owners and editors may create share links
  const access = await assertProjectAccess(projectId, userId, "editor");
  if (!access.ok) return access;

  const result = await createShareLink({
    projectId,
    createdBy: userId,
    label: label ?? null,
    expiresAt: expiresAt ?? null,
  });

  if (result.ok) {
    revalidatePath(`/projects/${slug}`);
  }

  return result;
}

// ── Revoke ─────────────────────────────────────────────────────────────────────

const revokeShareLinkSchema = z.object({
  linkId: z.string().min(1),
  slug: z.string().min(1),
  projectId: z.string().min(1),
});

export async function revokeShareLinkAction(
  raw: unknown
): Promise<Result<void>> {
  const { userId } = await auth();
  if (!userId) {
    return {
      ok: false,
      error: { code: "UNAUTHORIZED", message: "Sign in required." },
    };
  }

  const parsed = revokeShareLinkSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    };
  }

  const { linkId, slug, projectId } = parsed.data;

  // Only owners and editors may revoke share links
  const access = await assertProjectAccess(projectId, userId, "editor");
  if (!access.ok) return access;

  const result = await revokeShareLink(linkId, userId);

  if (result.ok) {
    revalidatePath(`/projects/${slug}`);
  }

  return result;
}
