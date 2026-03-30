"use server";

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  createMeetingRecord,
  createActionItemRecord,
  updateActionItemStatus,
} from "@/lib/db/meetings";
import { recordActivity } from "@/lib/db/activity";
import { assertProjectAccess } from "@/lib/db/project-access";
import type { MeetingType, ActionItemPriority, ActionItemStatus } from "@prisma/client";
import type { Result } from "@/types";
import type { MeetingRow, ActionItemRow } from "@/lib/db/meetings";

const MEETING_TYPES = ["in_person", "virtual", "phone_call", "site_visit"] as const;
const PRIORITY_VALUES = ["low", "medium", "high", "critical"] as const;
const STATUS_VALUES = ["open", "in_progress", "completed", "cancelled"] as const;

const createMeetingSchema = z.object({
  projectId: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1).max(200),
  meetingType: z.enum(MEETING_TYPES),
  meetingDate: z.coerce.date(),
  durationMinutes: z.coerce.number().int().positive().nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  summary: z.string().max(5000).nullable().optional(),
  attendeeStakeholderIds: z.array(z.string()).default([]),
});

const createActionItemSchema = z.object({
  projectId: z.string().min(1),
  slug: z.string().min(1),
  meetingId: z.string().min(1),
  title: z.string().min(1).max(300),
  description: z.string().max(2000).nullable().optional(),
  priority: z.enum(PRIORITY_VALUES).default("medium"),
  dueDate: z.coerce.date().nullable().optional(),
  assignedToId: z.string().nullable().optional(),
  requirementId: z.string().nullable().optional(),
});

const updateActionItemStatusSchema = z.object({
  projectId: z.string().min(1),
  slug: z.string().min(1),
  actionItemId: z.string().min(1),
  status: z.enum(STATUS_VALUES),
});

export async function createMeeting(input: unknown): Promise<Result<MeetingRow>> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: { code: "UNAUTHORIZED", message: "You must be signed in." } };
  }

  const parsed = createMeetingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input." },
    };
  }

  const { projectId, slug, title, meetingType, meetingDate, durationMinutes, location, summary, attendeeStakeholderIds } = parsed.data;

  const access = await assertProjectAccess(projectId, userId, "editor");
  if (!access.ok) return access;

  const result = await createMeetingRecord({
    projectId,
    title,
    meetingType: meetingType as MeetingType,
    meetingDate,
    durationMinutes: durationMinutes ?? null,
    location: location ?? null,
    summary: summary ?? null,
    createdBy: userId,
    attendeeStakeholderIds,
  });

  if (!result.ok) return result;

  await recordActivity(projectId, userId, "meeting_logged", `Meeting logged: ${title}`, { title, meetingType });

  revalidatePath(`/projects/${slug}`);
  return result;
}

export async function createActionItem(input: unknown): Promise<Result<ActionItemRow>> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: { code: "UNAUTHORIZED", message: "You must be signed in." } };
  }

  const parsed = createActionItemSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input." },
    };
  }

  const { projectId, slug, meetingId, title, description, priority, dueDate, assignedToId, requirementId } = parsed.data;

  const access = await assertProjectAccess(projectId, userId, "editor");
  if (!access.ok) return access;

  // Resolve requirementId → projectRequirementId
  let projectRequirementId: string | null = null;
  if (requirementId) {
    const pr = await db.projectRequirement.findUnique({
      where: { projectId_requirementId: { projectId, requirementId } },
      select: { id: true },
    });
    projectRequirementId = pr?.id ?? null;
  }

  const result = await createActionItemRecord({
    meetingId,
    projectId,
    title,
    description: description ?? null,
    priority: priority as ActionItemPriority,
    dueDate: dueDate ?? null,
    assignedToId: assignedToId ?? null,
    projectRequirementId,
  });

  if (!result.ok) return result;

  revalidatePath(`/projects/${slug}`);
  return result;
}

export async function updateMeetingActionItemStatus(input: unknown): Promise<Result<void>> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: { code: "UNAUTHORIZED", message: "You must be signed in." } };
  }

  const parsed = updateActionItemStatusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid input." },
    };
  }

  const { projectId, slug, actionItemId, status } = parsed.data;

  const access = await assertProjectAccess(projectId, userId, "editor");
  if (!access.ok) return access;

  const result = await updateActionItemStatus(actionItemId, projectId, status as ActionItemStatus);
  if (!result.ok) return result;

  revalidatePath(`/projects/${slug}`);
  return { ok: true, value: undefined };
}
