import type { Prisma } from "@prisma/client";
import { db } from "./index";
import type { Result } from "@/types";

export type ActivityEventRow = {
  id: string;
  eventType: string;
  summary: string;
  createdAt: Date;
  clerkUserId: string;
};

export async function recordActivity(
  projectId: string,
  clerkUserId: string,
  eventType: string,
  summary: string,
  metadata?: Prisma.InputJsonObject
): Promise<void> {
  await db.activityEvent.create({
    data: { projectId, clerkUserId, eventType, label: summary, metadata: metadata ?? undefined },
    select: { id: true },
  });
}

export async function getProjectActivity(
  projectId: string,
  limit = 50
): Promise<Result<ActivityEventRow[]>> {
  try {
    const rows = await db.activityEvent.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, eventType: true, label: true, createdAt: true, clerkUserId: true },
    });
    return {
      ok: true,
      value: rows.map((row) => ({
        id: row.id,
        eventType: row.eventType,
        summary: row.label,
        createdAt: row.createdAt,
        clerkUserId: row.clerkUserId,
      })),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}
