import { db } from "./index";
import { toDbError } from "@/lib/utils";
import type { Result } from "@/types";

export type TimelineRisk = {
  type: "milestone_due_soon" | "requirement_overdue" | "deal_stalled" | "loi_overdue";
  severity: "warning" | "critical";
  label: string;
  daysUntil?: number;
  entityId?: string;
  entityName?: string;
};

const LOI_PAST_STAGES = new Set([
  "loi_submitted",
  "loi_approved",
  "pre_commitment",
  "final_commitment",
  "financial_close",
]);

export async function getTimelineRisks(projectId: string): Promise<Result<TimelineRisk[]>> {
  try {
    const now = new Date();
    const risks: TimelineRisk[] = [];

    const milestones = await db.dealMilestone.findMany({
      where: { projectId, completedAt: null, targetDate: { not: null } },
      select: { id: true, name: true, targetDate: true },
    });

    for (const milestone of milestones) {
      if (!milestone.targetDate) continue;
      const msDate = new Date(milestone.targetDate);
      msDate.setHours(0, 0, 0, 0);
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const daysUntil = Math.ceil(
        (msDate.getTime() - todayStart.getTime()) / 86_400_000
      );

      if (daysUntil <= 7) {
        const severity = daysUntil <= 3 ? "critical" : "warning";
        const label =
          daysUntil < 0
            ? `Milestone "${milestone.name}" is ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? "s" : ""} overdue`
            : daysUntil === 0
              ? `Milestone "${milestone.name}" is due today`
              : `Milestone "${milestone.name}" is due in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`;

        risks.push({
          type: "milestone_due_soon",
          severity,
          label,
          daysUntil,
          entityId: milestone.id,
          entityName: milestone.name,
        });
      }
    }

    const overdueRequirements = await db.projectRequirement.findMany({
      where: {
        projectId,
        targetDate: { lt: now },
        status: { notIn: ["executed", "waived", "not_applicable"] },
        isApplicable: true,
      },
      select: {
        id: true,
        targetDate: true,
        requirement: { select: { name: true } },
      },
    });

    for (const req of overdueRequirements) {
      if (!req.targetDate) continue;
      const reqDate = new Date(req.targetDate);
      reqDate.setHours(0, 0, 0, 0);
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const daysUntil = Math.ceil(
        (reqDate.getTime() - todayStart.getTime()) / 86_400_000
      );

      risks.push({
        type: "requirement_overdue",
        severity: "warning",
        label: `Requirement "${req.requirement.name}" target date missed by ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? "s" : ""}`,
        daysUntil,
        entityId: req.id,
        entityName: req.requirement.name,
      });
    }

    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { targetLoiDate: true, stage: true },
    });

    if (
      project?.targetLoiDate &&
      !LOI_PAST_STAGES.has(project.stage) &&
      new Date(project.targetLoiDate) < now
    ) {
      const loiDate = new Date(project.targetLoiDate);
      loiDate.setHours(0, 0, 0, 0);
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const daysUntil = Math.ceil(
        (loiDate.getTime() - todayStart.getTime()) / 86_400_000
      );

      risks.push({
        type: "loi_overdue",
        severity: "critical",
        label: `LOI target date has passed — ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? "s" : ""} ago`,
        daysUntil,
      });
    }

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
    const recentActivity = await db.activityEvent.findFirst({
      where: { projectId, createdAt: { gte: thirtyDaysAgo } },
      select: { id: true },
    });

    if (!recentActivity) {
      risks.push({
        type: "deal_stalled",
        severity: "warning",
        label: "No activity recorded in the last 30 days — deal may be stalled",
      });
    }

    return { ok: true, value: risks };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
  }
}
