import { getProjectsByUser } from "@/lib/db/projects";
import { getProjectMeetings } from "@/lib/db/meetings";
import { getProjectById } from "@/lib/db/projects";
import { getProjectRequirements } from "@/lib/db/requirements";
import { getProjectStakeholders } from "@/lib/db/stakeholders";
import { computeReadiness } from "@/lib/scoring/index";
import type { Result } from "@/types";
import type { ChatContextDocument } from "@/types/chat";
import type { RequirementStatusValue } from "@/types/requirements";

export async function getProjectChatContext(
  projectId: string,
  clerkUserId: string
): Promise<Result<readonly ChatContextDocument[]>> {
  const projectResult = await getProjectById(projectId, clerkUserId);
  if (!projectResult.ok) return projectResult;

  const [requirementsResult, stakeholdersResult, meetingsResult] = await Promise.all([
    getProjectRequirements(projectId, projectResult.value.dealType, projectResult.value.sector),
    getProjectStakeholders(projectId),
    getProjectMeetings(projectId),
  ]);

  if (!requirementsResult.ok) return requirementsResult;
  if (!stakeholdersResult.ok) return stakeholdersResult;
  if (!meetingsResult.ok) return meetingsResult;

  const project = projectResult.value;
  const requirements = requirementsResult.value;
  const stakeholders = stakeholdersResult.value;
  const meetings = meetingsResult.value;

  const readiness = computeReadiness(
    requirements.map((row) => ({
      requirementId: row.requirementId,
      status: row.isApplicable === false
        ? ("not_applicable" as RequirementStatusValue)
        : (row.status as RequirementStatusValue),
    }))
  );

  const topBlockers = requirements
    .filter((row) => readiness.loiBlockers.includes(row.requirementId))
    .slice(0, 5)
    .map((row) => row.name);

  const primaryStakeholders = stakeholders
    .filter((stakeholder) => stakeholder.isPrimary)
    .slice(0, 6);

  const recentMeetings = meetings.slice(0, 3);
  const openActionItems = recentMeetings.flatMap((meeting) =>
    meeting.actionItems.filter((item) => item.status !== "completed")
  );

  const docs: ChatContextDocument[] = [
    {
      id: `project-${project.id}-summary`,
      title: `${project.name} project summary`,
      snippet: `Stage ${project.stage.replace(/_/g, " ")}. Country ${project.countryCode}. Sector ${project.sector}. Readiness ${(readiness.scoreBps / 100).toFixed(1)}%. ${readiness.loiReady ? "LOI-ready." : `${readiness.loiBlockers.length} LOI blockers remain.`}`,
      sourceType: "app",
      url: `/projects/${project.slug}`,
    },
    {
      id: `project-${project.id}-blockers`,
      title: `${project.name} LOI blockers`,
      snippet:
        topBlockers.length > 0
          ? `Current LOI blockers: ${topBlockers.join(", ")}.`
          : "There are no current LOI blockers recorded in the requirement set.",
      sourceType: "app",
      url: `/projects/${project.slug}#section-requirements`,
    },
    {
      id: `project-${project.id}-stakeholders`,
      title: `${project.name} stakeholders`,
      snippet:
        primaryStakeholders.length > 0
          ? `Primary stakeholders include ${primaryStakeholders
              .map((stakeholder) => `${stakeholder.name} (${stakeholder.roleType.replace(/_/g, " ")})`)
              .join(", ")}.`
          : "No primary stakeholders are recorded yet for this project.",
      sourceType: "app",
      url: `/projects/${project.slug}#section-stakeholders`,
    },
    {
      id: `project-${project.id}-meetings`,
      title: `${project.name} recent meetings`,
      snippet:
        recentMeetings.length > 0
          ? `Recent meetings: ${recentMeetings.map((meeting) => meeting.title).join(", ")}. Open action items in those meetings: ${openActionItems.length}.`
          : "No meetings are recorded yet for this project.",
      sourceType: "app",
      url: `/projects/${project.slug}#section-meetings`,
    },
  ];

  return { ok: true, value: docs };
}

export async function getPortfolioChatContext(
  clerkUserId: string
): Promise<Result<readonly ChatContextDocument[]>> {
  const projectsResult = await getProjectsByUser(clerkUserId);
  if (!projectsResult.ok) return projectsResult;

  const projects = projectsResult.value;
  const withLoi = projects.filter((project) => project.targetLoiDate);
  const byNearestLoi = [...withLoi].sort(
    (a, b) => (a.targetLoiDate?.getTime() ?? Infinity) - (b.targetLoiDate?.getTime() ?? Infinity)
  );
  const byReadiness = [...projects].sort(
    (a, b) => (b.cachedReadinessScore ?? -1) - (a.cachedReadinessScore ?? -1)
  );

  const stageCounts = new Map<string, number>();
  for (const project of projects) {
    stageCounts.set(project.stage, (stageCounts.get(project.stage) ?? 0) + 1);
  }

  const docs: ChatContextDocument[] = [
    {
      id: "portfolio-summary",
      title: "Portfolio summary",
      snippet: `${projects.length} projects in portfolio. Stage mix: ${[...stageCounts.entries()]
        .map(([stage, count]) => `${stage.replace(/_/g, " ")} (${count})`)
        .join(", ") || "none"}.`,
      sourceType: "app",
      url: "/projects",
    },
    {
      id: "portfolio-loi",
      title: "Nearest LOI targets",
      snippet:
        byNearestLoi.length > 0
          ? `Nearest LOI dates: ${byNearestLoi
              .slice(0, 3)
              .map((project) => `${project.name} (${project.targetLoiDate?.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})`)
              .join(", ")}.`
          : "No LOI target dates are set in the current portfolio.",
      sourceType: "app",
      url: "/projects",
    },
    {
      id: "portfolio-readiness",
      title: "Portfolio readiness",
      snippet:
        byReadiness.length > 0
          ? `Highest readiness: ${byReadiness[0]?.name} (${((byReadiness[0]?.cachedReadinessScore ?? 0) / 100).toFixed(1)}%). Lowest readiness: ${byReadiness[byReadiness.length - 1]?.name} (${((byReadiness[byReadiness.length - 1]?.cachedReadinessScore ?? 0) / 100).toFixed(1)}%).`
          : "No projects are available to summarize readiness.",
      sourceType: "app",
      url: "/projects",
    },
  ];

  return { ok: true, value: docs };
}
