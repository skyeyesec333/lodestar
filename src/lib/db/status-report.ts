import { db } from "./index";
import type { Result } from "@/types";
import type { StatusReportInput } from "@/lib/ai/status-report";

export type StatusReportData = StatusReportInput;

export async function getStatusReportData(
  projectId: string,
  userId: string
): Promise<Result<StatusReportData>> {
  try {
    const project = await db.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerClerkId: userId },
          { members: { some: { clerkUserId: userId } } },
        ],
      },
      select: {
        name: true,
        sector: true,
        countryCode: true,
        stage: true,
        cachedReadinessScore: true,
        targetLoiDate: true,
        dealType: true,
      },
    });

    if (!project) {
      return { ok: false, error: { code: "NOT_FOUND", message: "Project not found." } };
    }

    // Recent activity — last 10 events
    const activityRows = await db.activityEvent.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { label: true, createdAt: true },
    });

    // Open blockers: applicable LOI-critical requirements not yet substantially final
    const requirementStatuses = await db.projectRequirement.findMany({
      where: { projectId },
      select: {
        requirementId: true,
        status: true,
        isApplicable: true,
      },
    });

    // Pull LOI-critical requirement IDs from taxonomy — import statically
    const { getRequirementsForDealType } = await import("@/lib/requirements/index");
    const taxonomy = getRequirementsForDealType(project.dealType);
    const loiCriticalIds = new Set(
      taxonomy.filter((r) => r.isPrimaryGate).map((r) => r.id)
    );
    const taxonomyById = new Map(taxonomy.map((r) => [r.id, r]));

    const doneStatuses = new Set(["substantially_final", "executed", "waived", "not_applicable"]);
    const openBlockers: string[] = requirementStatuses
      .filter((r) => {
        if (r.isApplicable === false) return false;
        if (!loiCriticalIds.has(r.requirementId)) return false;
        return !doneStatuses.has(r.status);
      })
      .map((r) => taxonomyById.get(r.requirementId)?.name ?? r.requirementId);

    // Upcoming milestones — next 60 days, not yet completed
    const sixtyDaysOut = new Date(Date.now() + 60 * 86_400_000);
    const milestoneRows = await db.dealMilestone.findMany({
      where: {
        projectId,
        completedAt: null,
        targetDate: { lte: sixtyDaysOut, gt: new Date(0) },
      },
      select: { name: true, targetDate: true },
      orderBy: { targetDate: { sort: "asc", nulls: "last" } },
      take: 10,
    });

    const upcomingMilestones: string[] = milestoneRows
      .filter((m) => m.targetDate !== null)
      .map((m) => {
        const date = m.targetDate!.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        return `${m.name} — due ${date}`;
      });

    // Days since last update
    const lastActivity = activityRows[0];
    const daysSinceLastUpdate = lastActivity
      ? Math.floor((Date.now() - lastActivity.createdAt.getTime()) / 86_400_000)
      : 999;

    const recentActivity: string[] = activityRows.map((a) => {
      const date = a.createdAt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      return `[${date}] ${a.label}`;
    });

    return {
      ok: true,
      value: {
        projectName: project.name,
        sector: project.sector ?? "Not specified",
        country: project.countryCode ?? "Not specified",
        stage: project.stage,
        readinessScoreBps: project.cachedReadinessScore ?? 0,
        openBlockers,
        upcomingMilestones,
        recentActivity,
        targetLoiDate: project.targetLoiDate
          ? project.targetLoiDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : null,
        daysSinceLastUpdate,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}
