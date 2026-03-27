import type { Prisma } from "@prisma/client";
import { db } from "./index";
import type { Result } from "@/types";

export type ActivityEventRow = {
  id: string;
  eventType: string;
  label: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
};

export async function recordActivity(
  projectId: string,
  clerkUserId: string,
  eventType: string,
  label: string,
  metadata?: Prisma.InputJsonObject
): Promise<void> {
  await db.activityEvent.create({
    data: { projectId, clerkUserId, eventType, label, metadata: metadata ?? undefined },
    select: { id: true },
  });
}

export async function getProjectActivity(
  projectId: string,
  limit = 40
): Promise<Result<ActivityEventRow[]>> {
  try {
    const rows = await db.activityEvent.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, eventType: true, label: true, metadata: true, createdAt: true },
    });
    return {
      ok: true,
      value: rows.map((r) => ({
        ...r,
        metadata: (r.metadata as Record<string, unknown>) ?? null,
      })),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}
