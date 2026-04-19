import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { getCachedProjectBySlug } from "@/lib/db/projects";
import { getProjectRequirements } from "@/lib/db/requirements";
import { getProjectStakeholders } from "@/lib/db/stakeholders";
import { getProjectMembers } from "@/lib/db/members";
import { getCommentsByProject } from "@/lib/db/comments";
import { getUserWatchList } from "@/lib/db/watchers";
import { getProjectMeetings } from "@/lib/db/meetings";
import { getProjectMilestones } from "@/lib/db/milestones";
import { getUpcomingMilestones } from "@/lib/db/milestones-upcoming";
import { getProjectActivity, getActivityHeatmap } from "@/lib/db/activity";
import { resolveClerkUsers } from "@/lib/clerk/resolve-users";
import { buildTeamMembers } from "@/lib/projects/team";
import { ActivityFeed } from "@/components/projects/ActivityFeed";
import { ActivityHeatmap } from "@/components/charts/ActivityHeatmap";
import { CriticalPathBoard } from "@/components/projects/CriticalPathBoard";
import { OwnershipLoadBoard } from "@/components/projects/OwnershipLoadBoard";
import { WeeklyDriftPanel } from "@/components/projects/WeeklyDriftPanel";
import { ExecutionCommitmentsBoard } from "@/components/projects/ExecutionCommitmentsBoard";
import { MilestonePanel } from "@/components/projects/MilestonePanel";
import { UpcomingMilestonesWidget } from "@/components/projects/UpcomingMilestonesWidget";
import { SectionSubNav } from "@/components/projects/SectionSubNav";
import { WorkspaceFocusStrip } from "@/components/projects/WorkspaceFocusStrip";
import { SectionSkeleton } from "@/components/ui/SectionSkeleton";

const MeetingsLog = dynamic(
  () => import("@/components/meetings/MeetingsLog").then((m) => ({ default: m.MeetingsLog })),
  { loading: () => <SectionSkeleton /> }
);
const GanttChart = dynamic(
  () => import("@/components/projects/GanttChart").then((m) => ({ default: m.GanttChart })),
  { loading: () => <SectionSkeleton /> }
);

export default async function ProjectExecutionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const { slug } = await params;

  const projectResult = await getCachedProjectBySlug(slug, userId);
  if (!projectResult.ok) {
    if (projectResult.error.code === "NOT_FOUND") notFound();
    throw new Error(projectResult.error.message);
  }
  const project = projectResult.value;

  const [
    reqResult,
    stakeholdersResult,
    membersResult,
    commentsResult,
    watchListResult,
    meetingsResult,
    milestonesResult,
    upcomingMilestonesResult,
    activityResult,
    heatmapResult,
  ] = await Promise.all([
    getProjectRequirements(project.id, project.dealType, project.sector),
    getProjectStakeholders(project.id),
    getProjectMembers(project.id),
    getCommentsByProject(project.id),
    getUserWatchList(userId, project.id),
    getProjectMeetings(project.id),
    getProjectMilestones(project.id),
    getUpcomingMilestones(userId),
    getProjectActivity(project.id),
    getActivityHeatmap([project.id]),
  ]);
  if (!reqResult.ok) throw new Error(reqResult.error.message);

  const rows = reqResult.value;
  const stakeholders = stakeholdersResult.ok ? stakeholdersResult.value : [];
  const members = membersResult.ok ? membersResult.value : [];
  const comments = commentsResult.ok ? commentsResult.value : [];
  const watchList = watchListResult.ok ? watchListResult.value : [];
  const meetings = meetingsResult.ok ? meetingsResult.value : [];
  const milestones = milestonesResult.ok ? milestonesResult.value : [];
  const upcomingMilestones = upcomingMilestonesResult.ok ? upcomingMilestonesResult.value : [];
  const activityEvents = activityResult.ok ? activityResult.value.items : [];
  const activityHeatmapData = heatmapResult.ok ? heatmapResult.value : [];

  const currentMembership = members.find((m) => m.clerkUserId === userId);
  const currentProjectRole =
    project.ownerClerkId === userId
      ? "owner"
      : currentMembership?.role === "editor"
        ? "editor"
        : "viewer";
  const canEditProjectContent = currentProjectRole !== "viewer";

  const memberClerkIds = [
    project.ownerClerkId,
    ...members.map((m) => m.clerkUserId).filter((id) => id !== project.ownerClerkId),
  ];
  const activityActorIds = activityEvents.map((e) => e.clerkUserId);
  const allClerkIds = [...new Set([...memberClerkIds, ...activityActorIds])];
  const resolvedUsers = await resolveClerkUsers(allClerkIds);
  const teamMembers = buildTeamMembers(project.ownerClerkId, members, resolvedUsers);
  const actorName = teamMembers.find((m) => m.clerkUserId === userId)?.name;
  const teamMemberNamesById = Object.fromEntries(
    teamMembers.map((m) => [m.clerkUserId, m.name])
  );

  const commentsByMeetingId: Record<string, typeof comments> = {};
  for (const comment of comments) {
    if (comment.meetingId) {
      commentsByMeetingId[comment.meetingId] ??= [];
      commentsByMeetingId[comment.meetingId].push(comment);
    }
  }

  const watchedMeetingIds = new Set(
    watchList
      .filter((w) => w.targetType === "meeting" && w.targetId)
      .map((w) => w.targetId!)
  );

  return (
    <section id="section-execution" style={{ marginBottom: "40px", scrollMarginTop: "72px" }}>
      <div style={{ marginBottom: "16px" }}>
        <p className="eyebrow" style={{ marginBottom: "8px" }}>Execution workspace</p>
        <h2
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: "24px",
            fontWeight: 400,
            color: "var(--ink)",
            margin: "0 0 8px",
          }}
        >
          Commitments, signals, timeline, and stage review
        </h2>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "14px",
            color: "var(--ink-mid)",
            lineHeight: 1.6,
            margin: 0,
            maxWidth: "760px",
          }}
        >
          Execution is where follow-through becomes visible: what the team committed to, what is slipping, and whether the deal can realistically move through the next gate.
        </p>
      </div>

      <SectionSubNav
        items={[
          { id: "section-meetings", label: "Meetings" },
          { id: "section-activity", label: "Activity" },
          { id: "section-pm-signals", label: "PM Signals" },
          { id: "section-timeline", label: "Timeline" },
        ]}
      />

      <WorkspaceFocusStrip
        items={[
          {
            label: "Review the next gate",
            detail:
              "Keep the stage review, drift, and timeline tied to the same decision about whether the deal can advance.",
          },
          {
            label: "Connect meetings to action",
            detail:
              "Use meetings and activity together so discussions translate into accountable next moves.",
          },
          {
            label: "Watch operating pressure",
            detail:
              "Critical path, ownership load, and weekly drift should explain where execution is actually slipping.",
          },
        ]}
      />

      <ExecutionCommitmentsBoard
        projectSlug={project.slug}
        meetings={meetings}
        activityEvents={activityEvents}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "20px",
          alignItems: "start",
          marginBottom: "24px",
        }}
      >
        <section id="section-meetings">
          <Suspense fallback={<SectionSkeleton />}>
            <MeetingsLog
              projectId={project.id}
              slug={project.slug}
              initialMeetings={meetings}
              stakeholders={stakeholders}
              requirements={rows.map((r) => ({
                requirementId: r.requirementId,
                name: r.name,
                status: r.status,
              }))}
              dealType={project.dealType ?? undefined}
              teamMembers={teamMembers}
              currentUserId={userId}
              actorName={actorName}
              canEdit={canEditProjectContent}
              commentsByMeetingId={commentsByMeetingId}
              watchedMeetingIds={watchedMeetingIds}
            />
          </Suspense>
        </section>

        <section id="section-activity">
          <div style={{ marginBottom: "16px" }}>
            <ActivityHeatmap
              data={activityHeatmapData}
              title="Activity — last 12 months"
              description="Each square represents a day. Darker shades indicate more events."
            />
          </div>
          <ActivityFeed events={activityEvents} teamMemberNamesById={teamMemberNamesById} projectSlug={project.slug} />
        </section>
      </div>

      <div id="section-pm-signals" style={{ marginBottom: "24px" }}>
        <WeeklyDriftPanel
          events={activityEvents}
          asOf={new Date()}
          projectCreatedAt={project.createdAt}
          targetLoiDate={project.targetLoiDate}
          targetCloseDate={project.targetCloseDate}
        />

        <CriticalPathBoard
          rows={rows}
          referenceDate={new Date()}
          subtitle="Focus on the requirements most likely to slip the next milestone, with ownership and timing pressure shown inline."
        />

        <OwnershipLoadBoard
          requirements={rows}
          stakeholders={stakeholders}
          subtitle="Surface owner pressure before coordination debt turns into schedule slip."
        />
      </div>

      <MilestonePanel
        projectId={project.id}
        slug={project.slug}
        initialMilestones={milestones}
        anchorDate={project.targetLoiDate?.toISOString() ?? project.createdAt.toISOString()}
      />

      <UpcomingMilestonesWidget milestones={upcomingMilestones} />

      <section
        id="section-timeline"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "4px",
          padding: "24px",
          marginBottom: "24px",
        }}
      >
        <p className="eyebrow" style={{ marginBottom: "20px" }}>Deal Timeline</p>
        <Suspense fallback={<SectionSkeleton />}>
          <GanttChart
            rows={rows}
            projectCreatedAt={project.createdAt}
            targetLoiDate={project.targetLoiDate}
            targetCloseDate={project.targetCloseDate}
            dealType={project.dealType}
            milestones={milestones.map((m) => ({
              id: m.id,
              name: m.name,
              targetDate: m.targetDate,
              completedAt: m.completedAt,
            }))}
          />
        </Suspense>
      </section>
    </section>
  );
}
