"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createFunderRelationship,
  updateFunderRelationship,
  deleteFunderRelationship,
  addFunderCondition,
  updateFunderConditionStatus,
  deleteFunderCondition,
} from "@/lib/db/funders";
import { assertProjectAccess } from "@/lib/db/project-access";
import { db } from "@/lib/db";
import type { Result } from "@/types";

const FUNDER_TYPES = ["exim", "dfi", "commercial_bank", "equity", "mezzanine", "other"] as const;
const ENGAGEMENT_STAGES = ["identified", "initial_contact", "due_diligence", "term_sheet", "committed", "declined"] as const;
const CONDITION_STATUSES = ["open", "in_progress", "satisfied", "waived"] as const;

const addFunderSchema = z.object({
  projectId: z.string().min(1),
  slug: z.string().min(1),
  organizationName: z.string().trim().min(1).max(200),
  funderType: z.enum(FUNDER_TYPES),
  engagementStage: z.enum(ENGAGEMENT_STAGES).optional(),
  amountUsdCents: z.number().int().positive().nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  lastContactDate: z.string().datetime().nullable().optional(),
  nextFollowupDate: z.string().datetime().nullable().optional(),
});

const setFunderStageSchema = z.object({
  relationshipId: z.string().min(1),
  slug: z.string().min(1),
  engagementStage: z.enum(ENGAGEMENT_STAGES),
  notes: z.string().trim().max(2000).optional(),
  lastContactDate: z.string().datetime().nullable().optional(),
  nextFollowupDate: z.string().datetime().nullable().optional(),
});

const editFunderDetailsSchema = z.object({
  relationshipId: z.string().min(1),
  slug: z.string().min(1),
  amountUsdCents: z.number().int().positive().nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  lastContactDate: z.string().datetime().nullable().optional(),
  nextFollowupDate: z.string().datetime().nullable().optional(),
});

const removeFunderSchema = z.object({
  relationshipId: z.string().min(1),
  slug: z.string().min(1),
});

const addConditionSchema = z.object({
  funderRelationshipId: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().trim().min(1).max(500),
  dueDate: z.string().datetime().nullable().optional(),
  projectRequirementId: z.string().nullable().optional(),
});

const setConditionStatusSchema = z.object({
  conditionId: z.string().min(1),
  slug: z.string().min(1),
  status: z.enum(CONDITION_STATUSES),
  satisfiedAt: z.string().datetime().nullable().optional(),
});

const removeConditionSchema = z.object({
  conditionId: z.string().min(1),
  slug: z.string().min(1),
});

export async function addFunderRelationship(raw: unknown): Promise<Result<void>> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: { code: "UNAUTHORIZED", message: "Not signed in" } };

  const parsed = addFunderSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } };
  }

  const { slug, lastContactDate, nextFollowupDate, ...data } = parsed.data;

  const access = await assertProjectAccess(data.projectId, userId, "editor");
  if (!access.ok) return access;

  const result = await createFunderRelationship({
    ...data,
    lastContactDate: lastContactDate ? new Date(lastContactDate) : null,
    nextFollowupDate: nextFollowupDate ? new Date(nextFollowupDate) : null,
  });
  if (!result.ok) return result;

  revalidatePath(`/projects/${slug}`);
  return { ok: true, value: undefined };
}

export async function setFunderStage(raw: unknown): Promise<Result<void>> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: { code: "UNAUTHORIZED", message: "Not signed in" } };

  const parsed = setFunderStageSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } };
  }

  const { relationshipId, slug, engagementStage, notes, lastContactDate, nextFollowupDate } = parsed.data;

  const rel = await db.funderRelationship.findUnique({ where: { id: relationshipId }, select: { projectId: true } });
  if (!rel) return { ok: false, error: { code: "NOT_FOUND", message: "Funder relationship not found." } };
  const access = await assertProjectAccess(rel.projectId, userId, "editor");
  if (!access.ok) return access;

  const result = await updateFunderRelationship(relationshipId, {
    engagementStage,
    ...(notes !== undefined ? { notes } : {}),
    lastContactDate: lastContactDate !== undefined ? (lastContactDate ? new Date(lastContactDate) : null) : undefined,
    nextFollowupDate: nextFollowupDate !== undefined ? (nextFollowupDate ? new Date(nextFollowupDate) : null) : undefined,
  });
  if (!result.ok) return result;

  revalidatePath(`/projects/${slug}`);
  return { ok: true, value: undefined };
}

export async function editFunderDetails(raw: unknown): Promise<Result<void>> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: { code: "UNAUTHORIZED", message: "Not signed in" } };

  const parsed = editFunderDetailsSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } };
  }

  const { relationshipId, slug, lastContactDate, nextFollowupDate, ...data } = parsed.data;

  const rel = await db.funderRelationship.findUnique({ where: { id: relationshipId }, select: { projectId: true } });
  if (!rel) return { ok: false, error: { code: "NOT_FOUND", message: "Funder relationship not found." } };
  const access = await assertProjectAccess(rel.projectId, userId, "editor");
  if (!access.ok) return access;

  const result = await updateFunderRelationship(relationshipId, {
    ...data,
    lastContactDate: lastContactDate !== undefined ? (lastContactDate ? new Date(lastContactDate) : null) : undefined,
    nextFollowupDate: nextFollowupDate !== undefined ? (nextFollowupDate ? new Date(nextFollowupDate) : null) : undefined,
  });
  if (!result.ok) return result;

  revalidatePath(`/projects/${slug}`);
  return { ok: true, value: undefined };
}

export async function removeFunderRelationship(raw: unknown): Promise<Result<void>> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: { code: "UNAUTHORIZED", message: "Not signed in" } };

  const parsed = removeFunderSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } };
  }

  const rel = await db.funderRelationship.findUnique({ where: { id: parsed.data.relationshipId }, select: { projectId: true } });
  if (!rel) return { ok: false, error: { code: "NOT_FOUND", message: "Funder relationship not found." } };
  const access = await assertProjectAccess(rel.projectId, userId, "editor");
  if (!access.ok) return access;

  const result = await deleteFunderRelationship(parsed.data.relationshipId);
  if (!result.ok) return result;

  revalidatePath(`/projects/${parsed.data.slug}`);
  return { ok: true, value: undefined };
}

export async function addCondition(raw: unknown): Promise<Result<void>> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: { code: "UNAUTHORIZED", message: "Not signed in" } };

  const parsed = addConditionSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } };
  }

  const { slug, dueDate, ...data } = parsed.data;

  const rel = await db.funderRelationship.findUnique({ where: { id: data.funderRelationshipId }, select: { projectId: true } });
  if (!rel) return { ok: false, error: { code: "NOT_FOUND", message: "Funder relationship not found." } };
  const access = await assertProjectAccess(rel.projectId, userId, "editor");
  if (!access.ok) return access;

  const result = await addFunderCondition({
    ...data,
    dueDate: dueDate ? new Date(dueDate) : null,
  });
  if (!result.ok) return result;

  revalidatePath(`/projects/${slug}`);
  return { ok: true, value: undefined };
}

export async function setConditionStatus(raw: unknown): Promise<Result<void>> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: { code: "UNAUTHORIZED", message: "Not signed in" } };

  const parsed = setConditionStatusSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } };
  }

  const { conditionId, slug, status, satisfiedAt } = parsed.data;

  const cond = await db.funderCondition.findUnique({ where: { id: conditionId }, select: { funderRelationship: { select: { projectId: true } } } });
  if (!cond) return { ok: false, error: { code: "NOT_FOUND", message: "Condition not found." } };
  const access = await assertProjectAccess(cond.funderRelationship.projectId, userId, "editor");
  if (!access.ok) return access;

  const result = await updateFunderConditionStatus(
    conditionId,
    status,
    satisfiedAt !== undefined ? (satisfiedAt ? new Date(satisfiedAt) : null) : undefined
  );
  if (!result.ok) return result;

  revalidatePath(`/projects/${slug}`);
  return { ok: true, value: undefined };
}

export async function removeCondition(raw: unknown): Promise<Result<void>> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: { code: "UNAUTHORIZED", message: "Not signed in" } };

  const parsed = removeConditionSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } };
  }

  const cond = await db.funderCondition.findUnique({ where: { id: parsed.data.conditionId }, select: { funderRelationship: { select: { projectId: true } } } });
  if (!cond) return { ok: false, error: { code: "NOT_FOUND", message: "Condition not found." } };
  const access = await assertProjectAccess(cond.funderRelationship.projectId, userId, "editor");
  if (!access.ok) return access;

  const result = await deleteFunderCondition(parsed.data.conditionId);
  if (!result.ok) return result;

  revalidatePath(`/projects/${parsed.data.slug}`);
  return { ok: true, value: undefined };
}
