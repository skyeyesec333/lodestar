"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createMilestone,
  updateMilestone,
  completeMilestone,
  uncompleteMilestone,
  deleteMilestone,
  bulkCreateFromTemplate,
} from "@/lib/db/milestones";
import type { Result } from "@/types";
import type { DealMilestoneRow } from "@/lib/db/milestones";
import { MILESTONE_TEMPLATES } from "@/lib/exim/milestone-templates";

const TEMPLATE_SLUGS = MILESTONE_TEMPLATES.map((t) => t.slug) as [string, ...string[]];

const createMilestoneSchema = z.object({
  projectId: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().trim().max(1000).nullable().optional(),
  linkedPhase: z.string().nullable().optional(),
  targetDate: z.string().nullable().optional(), // ISO date string "YYYY-MM-DD"
});

const updateMilestoneSchema = z.object({
  milestoneId: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  linkedPhase: z.string().nullable().optional(),
  targetDate: z.string().nullable().optional(),
});

const toggleMilestoneSchema = z.object({
  milestoneId: z.string().min(1),
  slug: z.string().min(1),
  completed: z.boolean(),
});

const deleteMilestoneSchema = z.object({
  milestoneId: z.string().min(1),
  slug: z.string().min(1),
});

const applyTemplateSchema = z.object({
  projectId: z.string().min(1),
  slug: z.string().min(1),
  templateSlug: z.enum(TEMPLATE_SLUGS),
  anchorDate: z.string().min(1), // ISO date string
});

function parseDateOrNull(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export async function createMilestoneAction(
  input: z.infer<typeof createMilestoneSchema>
): Promise<Result<DealMilestoneRow>> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: { code: "UNAUTHORIZED", message: "Not signed in" } };

  const parsed = createMilestoneSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input" } };
  }

  const { projectId, slug, name, description, linkedPhase, targetDate } = parsed.data;
  const result = await createMilestone(projectId, userId, {
    name,
    description: description ?? null,
    linkedPhase: linkedPhase ?? null,
    targetDate: parseDateOrNull(targetDate),
  });

  if (result.ok) revalidatePath(`/projects/${slug}`);
  return result;
}

export async function updateMilestoneAction(
  input: z.infer<typeof updateMilestoneSchema>
): Promise<Result<DealMilestoneRow>> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: { code: "UNAUTHORIZED", message: "Not signed in" } };

  const parsed = updateMilestoneSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input" } };
  }

  const { milestoneId, slug, name, description, linkedPhase, targetDate } = parsed.data;
  const result = await updateMilestone(milestoneId, {
    name,
    description,
    linkedPhase,
    targetDate: targetDate !== undefined ? parseDateOrNull(targetDate) : undefined,
  });

  if (result.ok) revalidatePath(`/projects/${slug}`);
  return result;
}

export async function toggleMilestoneComplete(
  input: z.infer<typeof toggleMilestoneSchema>
): Promise<Result<DealMilestoneRow>> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: { code: "UNAUTHORIZED", message: "Not signed in" } };

  const parsed = toggleMilestoneSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input" } };
  }

  const { milestoneId, slug, completed } = parsed.data;
  const result = completed
    ? await completeMilestone(milestoneId, userId)
    : await uncompleteMilestone(milestoneId);

  if (result.ok) revalidatePath(`/projects/${slug}`);
  return result;
}

export async function deleteMilestoneAction(
  input: z.infer<typeof deleteMilestoneSchema>
): Promise<Result<void>> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: { code: "UNAUTHORIZED", message: "Not signed in" } };

  const parsed = deleteMilestoneSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input" } };
  }

  const { milestoneId, slug } = parsed.data;
  const result = await deleteMilestone(milestoneId);
  if (result.ok) revalidatePath(`/projects/${slug}`);
  return result;
}

export async function applyMilestoneTemplate(
  input: z.infer<typeof applyTemplateSchema>
): Promise<Result<number>> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: { code: "UNAUTHORIZED", message: "Not signed in" } };

  const parsed = applyTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input" } };
  }

  const { projectId, slug, templateSlug, anchorDate } = parsed.data;
  const anchor = parseDateOrNull(anchorDate);
  if (!anchor) {
    return { ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid anchor date" } };
  }

  const result = await bulkCreateFromTemplate(projectId, templateSlug, anchor, userId);
  if (result.ok) revalidatePath(`/projects/${slug}`);
  return result;
}
