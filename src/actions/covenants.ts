"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  addCovenant,
  updateCovenant,
  markCovenantSatisfied,
  removeCovenant,
} from "@/lib/db/covenants";
import { recordActivity } from "@/lib/db/activity";
import { assertProjectAccess } from "@/lib/db/project-access";
import { db } from "@/lib/db";
import type { Result } from "@/types";

const COVENANT_TYPES = [
  "financial_ratio",
  "reporting",
  "insurance",
  "operational",
  "other",
] as const;

const COVENANT_FREQUENCIES = [
  "monthly",
  "quarterly",
  "semi_annual",
  "annual",
  "one_time",
] as const;

const addSchema = z.object({
  projectId: z.string().min(1),
  slug: z.string().min(1),
  funderId: z.string().nullable().optional(),
  title: z.string().trim().min(1).max(300),
  covenantType: z.enum(COVENANT_TYPES),
  frequency: z.enum(COVENANT_FREQUENCIES),
  nextDueAt: z.coerce.date().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

const updateSchema = z.object({
  covenantId: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().trim().min(1).max(300).optional(),
  covenantType: z.enum(COVENANT_TYPES).optional(),
  frequency: z.enum(COVENANT_FREQUENCIES).optional(),
  nextDueAt: z.coerce.date().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  status: z.enum(["active", "satisfied", "waived"]).optional(),
  waiverReason: z.string().trim().max(1000).nullable().optional(),
  waiverExpiresAt: z.coerce.date().nullable().optional(),
});

const satisfySchema = z.object({
  covenantId: z.string().min(1),
  slug: z.string().min(1),
});

const removeSchema = z.object({
  covenantId: z.string().min(1),
  slug: z.string().min(1),
});

export async function addCovenantAction(
  input: unknown
): Promise<Result<{ id: string }>> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } };

  const parsed = addSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.message } };
  }

  const access = await assertProjectAccess(parsed.data.projectId, userId, "editor");
  if (!access.ok) return access;

  const result = await addCovenant({
    projectId: parsed.data.projectId,
    funderId: parsed.data.funderId,
    title: parsed.data.title,
    covenantType: parsed.data.covenantType,
    frequency: parsed.data.frequency,
    nextDueAt: parsed.data.nextDueAt,
    notes: parsed.data.notes,
  });

  if (result.ok) {
    revalidatePath(`/projects/${parsed.data.slug}`);
    recordActivity(parsed.data.projectId, userId, "covenant_added",
      `Added covenant: ${parsed.data.title}`,
      { covenantId: result.value.id, title: parsed.data.title, covenantType: parsed.data.covenantType }
    ).catch(() => {});
  }
  return result;
}

export async function updateCovenantAction(
  input: unknown
): Promise<Result<void>> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } };

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.message } };
  }

  const { covenantId, slug, ...data } = parsed.data;

  const covenant = await db.covenant.findUnique({ where: { id: covenantId }, select: { projectId: true } });
  if (!covenant) return { ok: false, error: { code: "NOT_FOUND", message: "Covenant not found." } };
  const access = await assertProjectAccess(covenant.projectId, userId, "editor");
  if (!access.ok) return access;

  const result = await updateCovenant(covenantId, data, userId);

  if (result.ok) revalidatePath(`/projects/${slug}`);
  return result;
}

export async function markCovenantSatisfiedAction(
  input: unknown
): Promise<Result<void>> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } };

  const parsed = satisfySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.message } };
  }

  const covenant = await db.covenant.findUnique({ where: { id: parsed.data.covenantId }, select: { projectId: true } });
  if (!covenant) return { ok: false, error: { code: "NOT_FOUND", message: "Covenant not found." } };
  const access = await assertProjectAccess(covenant.projectId, userId, "editor");
  if (!access.ok) return { ok: false, error: access.error };

  const result = await markCovenantSatisfied(parsed.data.covenantId, userId);

  if (result.ok) {
    revalidatePath(`/projects/${parsed.data.slug}`);
    recordActivity(result.value.projectId, userId, "covenant_satisfied",
      `Marked covenant satisfied: ${parsed.data.covenantId}`,
      { covenantId: parsed.data.covenantId }
    ).catch(() => {});
  }
  return { ok: result.ok, ...(result.ok ? {} : { error: result.error }) } as Result<void>;
}

export async function removeCovenantAction(
  input: unknown
): Promise<Result<void>> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } };

  const parsed = removeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.message } };
  }

  const covenant = await db.covenant.findUnique({ where: { id: parsed.data.covenantId }, select: { projectId: true } });
  if (!covenant) return { ok: false, error: { code: "NOT_FOUND", message: "Covenant not found." } };
  const access = await assertProjectAccess(covenant.projectId, userId, "editor");
  if (!access.ok) return access;

  const result = await removeCovenant(parsed.data.covenantId);
  if (result.ok) revalidatePath(`/projects/${parsed.data.slug}`);
  return result;
}
