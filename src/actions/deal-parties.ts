"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addDealParty, removeDealParty } from "@/lib/db/deal-parties";
import { DEAL_PARTY_TYPES } from "@/lib/exim/deal-parties";
import { assertProjectAccess } from "@/lib/db/project-access";
import { db } from "@/lib/db";
import type { Result } from "@/types";
import type { DealPartyRow } from "@/lib/db/deal-parties";

const addDealPartySchema = z.object({
  projectId: z.string().min(1),
  slug: z.string().min(1),
  organizationName: z.string().trim().min(1, "Organization name is required").max(200),
  partyType: z.enum(DEAL_PARTY_TYPES),
  notes: z.string().trim().max(2000).nullable().optional(),
});

const removeDealPartySchema = z.object({
  dealPartyId: z.string().min(1),
  slug: z.string().min(1),
});

export async function addDealPartyAction(
  input: z.infer<typeof addDealPartySchema>
): Promise<Result<DealPartyRow>> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: { code: "UNAUTHORIZED", message: "Not signed in" } };
  }

  const parsed = addDealPartySchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    return { ok: false, error: { code: "VALIDATION_ERROR", message } };
  }

  const { projectId, slug, organizationName, partyType, notes } = parsed.data;

  const access = await assertProjectAccess(projectId, userId, "editor");
  if (!access.ok) return access;

  const result = await addDealParty(projectId, organizationName, partyType, notes ?? null);

  if (result.ok) {
    revalidatePath(`/projects/${slug}`);
  }

  return result;
}

export async function removeDealPartyAction(
  input: z.infer<typeof removeDealPartySchema>
): Promise<Result<void>> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: { code: "UNAUTHORIZED", message: "Not signed in" } };
  }

  const parsed = removeDealPartySchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    return { ok: false, error: { code: "VALIDATION_ERROR", message } };
  }

  const { dealPartyId, slug } = parsed.data;

  const party = await db.dealParty.findUnique({ where: { id: dealPartyId }, select: { projectId: true } });
  if (!party) return { ok: false, error: { code: "NOT_FOUND", message: "Deal party not found." } };
  const access = await assertProjectAccess(party.projectId, userId, "editor");
  if (!access.ok) return access;

  const result = await removeDealParty(dealPartyId);

  if (result.ok) {
    revalidatePath(`/projects/${slug}`);
  }

  return result;
}
