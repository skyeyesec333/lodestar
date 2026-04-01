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

function normalizeTargetId(targetId: string | null): string {
  return targetId ?? "";
}

function shapeWatcherRow(row: {
  id: string;
  clerkUserId: string;
  projectId: string;
  targetType: WatchTargetType;
  targetId: string | null;
  createdAt: Date;
}): WatcherRow {
  return {
    ...row,
    targetId: row.targetId === "" ? null : row.targetId,
  };
}

export async function getWatchersForProject(
  projectId: string
): Promise<Result<WatcherRow[]>> {
  try {
    const rows = await db.watcher.findMany({
      where: { projectId },
      select: watcherSelect,
    });
    return { ok: true, value: rows.map(shapeWatcherRow) };
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
        targetId: normalizeTargetId(targetId),
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
          targetId: normalizeTargetId(targetId),
        },
      },
      create: {
        clerkUserId,
        projectId,
        targetType,
        targetId: normalizeTargetId(targetId),
      },
      update: {},
      select: watcherSelect,
    });
    return { ok: true, value: shapeWatcherRow(row) };
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
      where: {
        clerkUserId,
        projectId,
        targetType,
        targetId: normalizeTargetId(targetId),
      },
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
    return { ok: true, value: rows.map(shapeWatcherRow) };
  } catch (err) {
    return { ok: false, error: { code: "DATABASE_ERROR", message: err instanceof Error ? err.message : "Unknown error" } };
  }
}
