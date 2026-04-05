"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createEpcBid,
  updateEpcBidStatus,
  updateEpcBidDetails,
  deleteEpcBid,
} from "@/lib/db/epc-bids";
import { assertProjectAccess } from "@/lib/db/project-access";
import { db } from "@/lib/db";
import type { Result } from "@/types";

const addBidSchema = z.object({
  projectId: z.string().min(1),
  slug: z.string().min(1),
  organizationName: z.string().trim().min(1).max(200),
  isUsEntity: z.boolean(),
  organizationCountryCode: z.string().length(2).optional(),
  bidAmountUsdCents: z.number().int().positive().nullable().optional(),
  usContentPct: z.number().int().min(0).max(100).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

const updateStatusSchema = z.object({
  bidId: z.string().min(1),
  slug: z.string().min(1),
  status: z.enum(["under_review", "qualified", "disqualified", "selected", "rejected"]),
  disqualificationReason: z.string().trim().max(1000).nullable().optional(),
});

const updateDetailsSchema = z.object({
  bidId: z.string().min(1),
  slug: z.string().min(1),
  bidAmountUsdCents: z.number().int().positive().nullable().optional(),
  usContentPct: z.number().int().min(0).max(100).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  submittedAt: z.string().datetime().nullable().optional(),
});

const deleteBidSchema = z.object({
  bidId: z.string().min(1),
  slug: z.string().min(1),
});

export async function addEpcBid(raw: unknown): Promise<Result<void>> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: { code: "UNAUTHORIZED", message: "Not signed in" } };

  const parsed = addBidSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } };
  }

  const { slug, ...data } = parsed.data;

  const access = await assertProjectAccess(data.projectId, userId, "editor");
  if (!access.ok) return access;

  const result = await createEpcBid(data);
  if (!result.ok) return result;

  revalidatePath(`/projects/${slug}`);
  return { ok: true, value: undefined };
}

export async function setEpcBidStatus(raw: unknown): Promise<Result<void>> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: { code: "UNAUTHORIZED", message: "Not signed in" } };

  const parsed = updateStatusSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } };
  }

  const { bidId, slug, status, disqualificationReason } = parsed.data;

  const bid = await db.epcBid.findUnique({ where: { id: bidId }, select: { projectId: true } });
  if (!bid) return { ok: false, error: { code: "NOT_FOUND", message: "EPC bid not found." } };
  const access = await assertProjectAccess(bid.projectId, userId, "editor");
  if (!access.ok) return access;

  const result = await updateEpcBidStatus(bidId, status, disqualificationReason);
  if (!result.ok) return result;

  revalidatePath(`/projects/${slug}`);
  return { ok: true, value: undefined };
}

export async function editEpcBidDetails(raw: unknown): Promise<Result<void>> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: { code: "UNAUTHORIZED", message: "Not signed in" } };

  const parsed = updateDetailsSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } };
  }

  const { bidId, slug, submittedAt, ...data } = parsed.data;

  const bid = await db.epcBid.findUnique({ where: { id: bidId }, select: { projectId: true } });
  if (!bid) return { ok: false, error: { code: "NOT_FOUND", message: "EPC bid not found." } };
  const access = await assertProjectAccess(bid.projectId, userId, "editor");
  if (!access.ok) return access;

  const result = await updateEpcBidDetails(bidId, {
    ...data,
    submittedAt: submittedAt ? new Date(submittedAt) : null,
  });
  if (!result.ok) return result;

  revalidatePath(`/projects/${slug}`);
  return { ok: true, value: undefined };
}

export async function removeEpcBid(raw: unknown): Promise<Result<void>> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: { code: "UNAUTHORIZED", message: "Not signed in" } };

  const parsed = deleteBidSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } };
  }

  const bid = await db.epcBid.findUnique({ where: { id: parsed.data.bidId }, select: { projectId: true } });
  if (!bid) return { ok: false, error: { code: "NOT_FOUND", message: "EPC bid not found." } };
  const access = await assertProjectAccess(bid.projectId, userId, "editor");
  if (!access.ok) return access;

  const result = await deleteEpcBid(parsed.data.bidId);
  if (!result.ok) return result;

  revalidatePath(`/projects/${parsed.data.slug}`);
  return { ok: true, value: undefined };
}
