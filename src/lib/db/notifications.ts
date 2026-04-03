import { db } from "./index";
import type { Result } from "@/types";

export type NotificationItem = {
  id: string;
  type: string;
  message: string;
  projectId: string;
  projectName: string;
  projectSlug: string;
  createdAt: Date;
  read: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildMessage(eventType: string, label: string, meta: Record<string, unknown> | null): string {
  const actorName = typeof meta?.actorName === "string" ? meta.actorName : null;
  const actor = actorName ?? "A team member";

  switch (eventType) {
    case "requirement_status_changed": {
      const reqName = typeof meta?.requirementName === "string" ? meta.requirementName : "a requirement";
      const newStatus = typeof meta?.newStatus === "string" ? meta.newStatus.replace(/_/g, " ") : null;
      return newStatus
        ? `${actor} updated "${reqName}" to ${newStatus}`
        : `${actor} updated requirement "${reqName}"`;
    }
    case "document_uploaded": {
      const filename = typeof meta?.filename === "string" ? meta.filename : "a document";
      return `${actor} uploaded "${filename}"`;
    }
    case "document_version_added": {
      const filename = typeof meta?.filename === "string" ? meta.filename : "a document";
      return `${actor} added a new version of "${filename}"`;
    }
    case "meeting_created": {
      const title = typeof meta?.meetingTitle === "string" ? meta.meetingTitle : "a meeting";
      return `${actor} logged meeting "${title}"`;
    }
    case "comment_added": {
      const target = typeof meta?.targetType === "string" ? meta.targetType : "an item";
      return `${actor} commented on ${target}`;
    }
    case "member_invited": {
      const invitee = typeof meta?.inviteeName === "string" ? meta.inviteeName : "a new member";
      return `${actor} invited ${invitee} to the project`;
    }
    case "milestone_completed": {
      const name = typeof meta?.milestoneName === "string" ? meta.milestoneName : "a milestone";
      return `${actor} completed milestone "${name}"`;
    }
    case "approval_requested": {
      const target = typeof meta?.targetName === "string" ? meta.targetName : "an item";
      return `${actor} requested approval for "${target}"`;
    }
    case "approval_decided": {
      const target = typeof meta?.targetName === "string" ? meta.targetName : "an item";
      const decision = typeof meta?.decision === "string" ? meta.decision : "reviewed";
      return `${actor} ${decision} "${target}"`;
    }
    default:
      return label || `${actor} updated the project`;
  }
}

export async function getRecentNotifications(
  userId: string,
  limit = 20
): Promise<Result<NotificationItem[]>> {
  try {
    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Fetch projects the user owns or is a member of
    const memberProjects = await db.projectMember.findMany({
      where: { clerkUserId: userId },
      select: { projectId: true },
    });

    const ownedProjects = await db.project.findMany({
      where: { ownerClerkId: userId },
      select: { id: true },
    });

    const watchedProjects = await db.watcher.findMany({
      where: { clerkUserId: userId },
      select: { projectId: true },
    });

    const projectIdSet = new Set<string>([
      ...memberProjects.map((m) => m.projectId),
      ...ownedProjects.map((p) => p.id),
      ...watchedProjects.map((w) => w.projectId),
    ]);

    if (projectIdSet.size === 0) {
      return { ok: true, value: [] };
    }

    const projectIds = Array.from(projectIdSet);

    const rows = await db.activityEvent.findMany({
      where: {
        projectId: { in: projectIds },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        eventType: true,
        label: true,
        metadata: true,
        createdAt: true,
        clerkUserId: true,
        project: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    const items: NotificationItem[] = rows.map((row) => {
      const meta = isRecord(row.metadata) ? row.metadata : null;
      const message = buildMessage(row.eventType, row.label, meta);
      const read = row.createdAt < cutoff24h;

      return {
        id: row.id,
        type: row.eventType,
        message,
        projectId: row.project.id,
        projectName: row.project.name,
        projectSlug: row.project.slug,
        createdAt: row.createdAt,
        read,
      };
    });

    return { ok: true, value: items };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}
