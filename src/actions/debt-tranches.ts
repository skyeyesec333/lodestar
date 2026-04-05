"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  addDebtTranche,
  updateDebtTranche,
  removeDebtTranche,
} from "@/lib/db/debt-tranches";
import { recordActivity } from "@/lib/db/activity";
import { assertProjectAccess } from "@/lib/db/project-access";
import { db } from "@/lib/db";
import type { Result } from "@/types";

const TRANCHE_TYPES = [
  "senior_secured",
  "mezzanine",
  "equity_bridge",
  "subordinated",
  "concessional",
  "first_loss",
] as const;

const TRANCHE_STATUSES = ["term_sheet", "committed", "drawn", "repaid"] as const;

const addSchema = z.object({
  projectId: z.string().min(1),
  slug: z.string().min(1),
  funderId: z.string().nullable().optional(),
  name: z.string().trim().min(1).max(200),
  type: z.enum(TRANCHE_TYPES),
  amountUsdCents: z.number().int().positive(),
  tenorYears: z.number().int().positive().nullable().optional(),
  interestRateBps: z.number().int().min(0).max(10000).nullable().optional(),
  status: z.enum(TRANCHE_STATUSES).optional(),
});

const updateSchema = z.object({
  trancheId: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().trim().min(1).max(200).optional(),
  type: z.enum(TRANCHE_TYPES).optional(),
  amountUsdCents: z.number().int().positive().optional(),
  tenorYears: z.number().int().positive().nullable().optional(),
  interestRateBps: z.number().int().min(0).max(10000).nullable().optional(),
  status: z.enum(TRANCHE_STATUSES).optional(),
  funderId: z.string().nullable().optional(),
});

const removeSchema = z.object({
  trancheId: z.string().min(1),
  slug: z.string().min(1),
});

export async function addDebtTrancheAction(
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

  const result = await addDebtTranche({
    projectId: parsed.data.projectId,
    funderId: parsed.data.funderId,
    name: parsed.data.name,
    type: parsed.data.type,
    amountUsdCents: parsed.data.amountUsdCents,
    tenorYears: parsed.data.tenorYears,
    interestRateBps: parsed.data.interestRateBps,
    status: parsed.data.status,
  });

  if (result.ok) {
    revalidatePath(`/projects/${parsed.data.slug}`);
    recordActivity(parsed.data.projectId, userId, "debt_tranche_added",
      `Added debt tranche: ${parsed.data.name}`,
      { trancheId: result.value.id, name: parsed.data.name, type: parsed.data.type }
    ).catch(() => {});
  }
  return result;
}

export async function updateDebtTrancheAction(
  input: unknown
): Promise<Result<void>> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } };

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.message } };
  }

  const { trancheId, slug, ...data } = parsed.data;

  const tranche = await db.debtTranche.findUnique({ where: { id: trancheId }, select: { projectId: true } });
  if (!tranche) return { ok: false, error: { code: "NOT_FOUND", message: "Debt tranche not found." } };
  const access = await assertProjectAccess(tranche.projectId, userId, "editor");
  if (!access.ok) return access;

  const result = await updateDebtTranche(trancheId, data);

  if (result.ok) revalidatePath(`/projects/${slug}`);
  return result;
}

export async function removeDebtTrancheAction(
  input: unknown
): Promise<Result<void>> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } };

  const parsed = removeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.message } };
  }

  const tranche = await db.debtTranche.findUnique({ where: { id: parsed.data.trancheId }, select: { projectId: true } });
  if (!tranche) return { ok: false, error: { code: "NOT_FOUND", message: "Debt tranche not found." } };
  const access = await assertProjectAccess(tranche.projectId, userId, "editor");
  if (!access.ok) return access;

  const result = await removeDebtTranche(parsed.data.trancheId);
  if (result.ok) revalidatePath(`/projects/${parsed.data.slug}`);
  return result;
}
