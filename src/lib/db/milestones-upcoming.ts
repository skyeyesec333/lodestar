import { db } from "./index";
import { toDbError } from "@/lib/utils";
import type { Result } from "@/types";

export type UpcomingMilestone = {
  id: string;
  name: string;
  targetDate: Date;
  daysUntil: number;
  projectId: string;
  projectName: string;
  projectSlug: string;
  urgency: "overdue" | "critical" | "warning" | "normal";
};

export async function getUpcomingMilestones(
  userId: string,
  daysAhead: number = 30
): Promise<Result<UpcomingMilestone[]>> {
  try {
    const projects = await db.project.findMany({
      where: {
        OR: [
          { ownerClerkId: userId },
          { members: { some: { clerkUserId: userId } } },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    const projectIds = projects.map((p) => p.id);

    if (projectIds.length === 0) {
      return { ok: true, value: [] };
    }

    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const milestones = await db.dealMilestone.findMany({
      where: {
        projectId: { in: projectIds },
        completedAt: null,
        OR: [
          {
            targetDate: {
              lte: futureDate,
              gt: new Date(0), // Ensure targetDate is not null by using a date filter
            },
          },
          {
            targetDate: {
              equals: null,
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        targetDate: true,
        projectId: true,
      },
      orderBy: {
        targetDate: {
          sort: "asc",
          nulls: "last",
        },
      },
    });

    const projectMap = new Map(projects.map((p) => [p.id, p]));

    const upcoming: UpcomingMilestone[] = milestones
      .filter((milestone) => milestone.targetDate !== null)
      .map((milestone) => {
        const project = projectMap.get(milestone.projectId);
        if (!project) {
          return null;
        }

        const daysUntil = Math.ceil(
          (milestone.targetDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        let urgency: UpcomingMilestone["urgency"];
        if (daysUntil < 0) {
          urgency = "overdue";
        } else if (daysUntil <= 3) {
          urgency = "critical";
        } else if (daysUntil <= 7) {
          urgency = "warning";
        } else {
          urgency = "normal";
        }

        return {
          id: milestone.id,
          name: milestone.name,
          targetDate: milestone.targetDate!,
          daysUntil,
          projectId: milestone.projectId,
          projectName: project.name,
          projectSlug: project.slug,
          urgency,
        };
      })
      .filter((m): m is UpcomingMilestone => m !== null);

    return { ok: true, value: upcoming };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
  }
}
