"use server";

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { watchItem, unwatchItem, getUserWatchList, isWatching } from "@/lib/db/watchers";
import { recordActivity } from "@/lib/db/activity";
import { assertProjectAccess } from "@/lib/db/project-access";
import type { WatcherRow } from "@/lib/db/watchers";
import type { WatchTargetType } from "@prisma/client";
import type { Result } from "@/types";

const TARGET_TYPES = ["project", "requirement", "document", "meeting"] as const;

const watchSchema = z.object({
  projectId: z.string().min(1),
  targetType: z.enum(TARGET_TYPES),
  targetId: z.string().nullable().optional(),
  actorName: z.string().optional(),
});

export async function watchItemAction(raw: unknown): Promise<Result<WatcherRow>> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: { code: "UNAUTHORIZED", message: "Sign in required." } };

  const parsed = watchSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input." } };

  const { projectId, targetType, targetId = null, actorName } = parsed.data;

  const access = await assertProjectAccess(projectId, userId, "viewer");
  if (!access.ok) return access;

  const result = await watchItem(userId, projectId, targetType as WatchTargetType, targetId ?? null);
  if (!result.ok) return result;

  const actor = actorName ?? "A team member";
  const targetLabel = targetType === "project" ? "the deal" : `a ${targetType}`;
  await recordActivity(projectId, userId, "watch_started",
    `${actor} started watching ${targetLabel}`,
    { targetType, targetId, actorName: actor }
  );

  return result;
}

export async function unwatchItemAction(raw: unknown): Promise<Result<void>> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: { code: "UNAUTHORIZED", message: "Sign in required." } };

  const parsed = watchSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input." } };

  const { projectId, targetType, targetId = null } = parsed.data;

  const access = await assertProjectAccess(projectId, userId, "viewer");
  if (!access.ok) return access;

  return unwatchItem(userId, projectId, targetType as WatchTargetType, targetId ?? null);
}

const watchListSchema = z.object({ projectId: z.string().min(1) });

export async function getUserWatchListAction(raw: unknown): Promise<Result<WatcherRow[]>> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: { code: "UNAUTHORIZED", message: "Sign in required." } };

  const parsed = watchListSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input." } };

  return getUserWatchList(userId, parsed.data.projectId);
}

const isWatchingSchema = z.object({
  projectId: z.string().min(1),
  targetType: z.enum(TARGET_TYPES),
  targetId: z.string().nullable().optional(),
});

export async function isWatchingAction(raw: unknown): Promise<Result<boolean>> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: { code: "UNAUTHORIZED", message: "Sign in required." } };

  const parsed = isWatchingSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input." } };

  const { projectId, targetType, targetId = null } = parsed.data;
  const watching = await isWatching(userId, projectId, targetType as WatchTargetType, targetId ?? null);
  return { ok: true, value: watching };
}
