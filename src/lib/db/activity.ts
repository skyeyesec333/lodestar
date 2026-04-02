import type { Prisma } from "@prisma/client";
import { db } from "./index";
import type { Result } from "@/types";

export type ActivityMetadata = Record<string, unknown>;

export type ActivityEventRow = {
  id: string;
  eventType: string;
  summary: string;
  createdAt: Date;
  clerkUserId: string;
  /** actorName is read from metadata.actorName if present, otherwise null */
  actorName: string | null;
  metadata: ActivityMetadata | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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

export type ActivityPage = {
  items: ActivityEventRow[];
  nextCursor: string | null;
};

export async function getProjectActivity(
  projectId: string,
  limit = 25,
  cursor?: string
): Promise<Result<ActivityPage>> {
  try {
    const rows = await db.activityEvent.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor
        ? { cursor: { id: cursor }, skip: 1 }
        : {}),
      select: { id: true, eventType: true, label: true, createdAt: true, clerkUserId: true, metadata: true },
    });

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? (pageRows[pageRows.length - 1]?.id ?? null) : null;

    return {
      ok: true,
      value: {
        items: pageRows.map((row) => {
          const meta = isRecord(row.metadata) ? row.metadata : null;
          const actorName = typeof meta?.actorName === "string" ? meta.actorName : null;
          return {
            id: row.id,
            eventType: row.eventType,
            summary: row.label,
            createdAt: row.createdAt,
            clerkUserId: row.clerkUserId,
            actorName,
            metadata: meta,
          };
        }),
        nextCursor,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}
