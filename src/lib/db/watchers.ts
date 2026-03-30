import { db } from "./index";
import type { WatchTargetType } from "@prisma/client";
import type { Result } from "@/types";

export type WatcherRow = {
  id: string;
  clerkUserId: string;
  projectId: string;
  targetType: WatchTargetType;
  targetId: string | null;
  createdAt: Date;
};

const watcherSelect = {
  id: true,
  clerkUserId: true,
  projectId: true,
  targetType: true,
  targetId: true,
  createdAt: true,
} as const;

export async function getWatchersForProject(
  projectId: string
): Promise<Result<WatcherRow[]>> {
  try {
    const rows = await db.watcher.findMany({
      where: { projectId },
      select: watcherSelect,
    });
    return { ok: true, value: rows };
  } catch (err) {
    return { ok: false, error: { code: "DATABASE_ERROR", message: err instanceof Error ? err.message : "Unknown error" } };
  }
}

export async function isWatching(
  clerkUserId: string,
  projectId: string,
  targetType: WatchTargetType,
  targetId: string | null
): Promise<boolean> {
  const row = await db.watcher.findUnique({
    where: {
      clerkUserId_projectId_targetType_targetId: {
        clerkUserId,
        projectId,
        targetType,
        targetId: targetId ?? "",
      },
    },
    select: { id: true },
  });
  return row !== null;
}

export async function watchItem(
  clerkUserId: string,
  projectId: string,
  targetType: WatchTargetType,
  targetId: string | null
): Promise<Result<WatcherRow>> {
  try {
    const row = await db.watcher.upsert({
      where: {
        clerkUserId_projectId_targetType_targetId: {
          clerkUserId,
          projectId,
          targetType,
          targetId: targetId ?? "",
        },
      },
      create: { clerkUserId, projectId, targetType, targetId },
      update: {},
      select: watcherSelect,
    });
    return { ok: true, value: row };
  } catch (err) {
    return { ok: false, error: { code: "DATABASE_ERROR", message: err instanceof Error ? err.message : "Unknown error" } };
  }
}

export async function unwatchItem(
  clerkUserId: string,
  projectId: string,
  targetType: WatchTargetType,
  targetId: string | null
): Promise<Result<void>> {
  try {
    await db.watcher.deleteMany({
      where: { clerkUserId, projectId, targetType, targetId },
    });
    return { ok: true, value: undefined };
  } catch (err) {
    return { ok: false, error: { code: "DATABASE_ERROR", message: err instanceof Error ? err.message : "Unknown error" } };
  }
}

export async function getUserWatchList(
  clerkUserId: string,
  projectId: string
): Promise<Result<WatcherRow[]>> {
  try {
    const rows = await db.watcher.findMany({
      where: { clerkUserId, projectId },
      orderBy: { createdAt: "asc" },
      select: watcherSelect,
    });
    return { ok: true, value: rows };
  } catch (err) {
    return { ok: false, error: { code: "DATABASE_ERROR", message: err instanceof Error ? err.message : "Unknown error" } };
  }
}
