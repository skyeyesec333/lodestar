import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
// notFound used for project lookup; requirements errors throw to surface the actual message
import Link from "next/link";
import { getProjectBySlug } from "@/lib/db/projects";
import { getProjectRequirements } from "@/lib/db/requirements";
import { computeReadiness } from "@/lib/scoring/index";
import { ReadinessGauge } from "@/components/projects/ReadinessGauge";
import { StageStepper } from "@/components/projects/StageStepper";
import { ProjectEditForm } from "@/components/projects/ProjectEditForm";
import type { SerializableProject } from "@/components/projects/ProjectEditForm";
import { GapAnalysis } from "@/components/projects/GapAnalysis";
import { ActivityFeed } from "@/components/projects/ActivityFeed";
import { StakeholderPanel } from "@/components/stakeholders/StakeholderPanel";
import { getProjectActivity } from "@/lib/db/activity";
import { getProjectStakeholders } from "@/lib/db/stakeholders";
import { LoiBlockersPanel } from "@/components/requirements/LoiBlockersPanel";
import { RequirementsChecklist } from "@/components/requirements/RequirementsChecklist";
import { DocumentPanel } from "@/components/documents/DocumentPanel";
import { getProjectDocuments } from "@/lib/db/documents";
import { MeetingsLog } from "@/components/meetings/MeetingsLog";
import { getProjectMeetings } from "@/lib/db/meetings";
import { EpcBidsPanel } from "@/components/projects/EpcBidsPanel";
import { getProjectEpcBids } from "@/lib/db/epc-bids";
import { FunderWorkspace } from "@/components/projects/FunderWorkspace";
import { getProjectFunders } from "@/lib/db/funders";
import { getProjectDealParties } from "@/lib/db/deal-parties";
import { getProjectMilestones } from "@/lib/db/milestones";
import { MilestonePanel } from "@/components/projects/MilestonePanel";
import { CollaboratorsPanel } from "@/components/projects/CollaboratorsPanel";
import { getProjectMembers } from "@/lib/db/members";
import { GanttChart } from "@/components/projects/GanttChart";
import { ProjectNav } from "@/components/projects/ProjectNav";
import { TourGuide } from "@/components/projects/TourGuide";
import { getProjectDetailChatPresets } from "@/lib/ai/chat-presets";
import { BeaconProvider } from "@/components/beacon/BeaconProvider";
import { BeaconPanel } from "@/components/beacon/BeaconPanel";
import { CriticalPathBoard } from "@/components/projects/CriticalPathBoard";
import { DocumentCoverageMap } from "@/components/projects/DocumentCoverageMap";
import { OwnershipLoadBoard } from "@/components/projects/OwnershipLoadBoard";
import { WeeklyDriftPanel } from "@/components/projects/WeeklyDriftPanel";
import type { RequirementStatusValue } from "@/types/requirements";
import { getCommentsByProject } from "@/lib/db/comments";
import { getApprovalsByProject } from "@/lib/db/approvals";
import { getUserWatchList } from "@/lib/db/watchers";
import type { TeamMember } from "@/types/collaboration";
import type { ProjectMemberRow } from "@/lib/db/members";

function roleLabel(role: TeamMember["role"]): string {
  switch (role) {
    case "owner":
      return "Owner";
    case "editor":
      return "Editor";
    case "viewer":
    default:
      return "Viewer";
  }
}

function fallbackMemberName(clerkUserId: string, role: TeamMember["role"]): string {
  return `${roleLabel(role)} ${clerkUserId.slice(-4).toUpperCase()}`;
}

function buildTeamMembers(
  ownerClerkId: string,
  members: ProjectMemberRow[]
): TeamMember[] {
  const deduped = new Map<string, TeamMember>();
  deduped.set(ownerClerkId, {
    clerkUserId: ownerClerkId,
    name: fallbackMemberName(ownerClerkId, "owner"),
    email: null,
    imageUrl: null,
    role: "owner",
  });

  for (const member of members) {
    const role = member.role === "editor" ? "editor" : "viewer";
    if (member.clerkUserId === ownerClerkId) continue;
    deduped.set(member.clerkUserId, {
      clerkUserId: member.clerkUserId,
      name: fallbackMemberName(member.clerkUserId, role),
      email: null,
      imageUrl: null,
      role,
    });
  }

  return Array.from(deduped.values());
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { slug } = await params;

  const projectResult = await getProjectBySlug(slug, userId);
  if (!projectResult.ok) notFound();
  const project = projectResult.value;

  const reqResult = await getProjectRequirements(project.id, project.dealType);
  if (!reqResult.ok) {
    throw new Error(`Failed to load requirements: ${reqResult.error.message}`);
  }
  const rows = reqResult.value;

  const [
    activityResult,
    stakeholdersResult,
    documentsResult,
    meetingsResult,
    epcBidsResult,
    fundersResult,
    membersResult,
    dealPartiesResult,
    milestonesResult,
    commentsResult,
    approvalsResult,
    watchListResult,
  ] = await Promise.all([
    getProjectActivity(project.id),
    getProjectStakeholders(project.id),
    getProjectDocuments(project.id),
    getProjectMeetings(project.id),
    getProjectEpcBids(project.id),
    getProjectFunders(project.id),
    getProjectMembers(project.id),
    getProjectDealParties(project.id),
    getProjectMilestones(project.id),
    getCommentsByProject(project.id),
    getApprovalsByProject(project.id),
    getUserWatchList(userId, project.id),
  ]);
  const activityEvents = activityResult.ok ? activityResult.value : [];
  const stakeholders = stakeholdersResult.ok ? stakeholdersResult.value : [];
  const documents = documentsResult.ok ? documentsResult.value : [];
  const meetings = meetingsResult.ok ? meetingsResult.value : [];
  const epcBids = epcBidsResult.ok ? epcBidsResult.value : [];
  const funders = fundersResult.ok ? fundersResult.value : [];
  const members = membersResult.ok ? membersResult.value : [];
  const dealParties = dealPartiesResult.ok ? dealPartiesResult.value : [];
  const milestones = milestonesResult.ok ? milestonesResult.value : [];
  const comments = commentsResult.ok ? commentsResult.value : [];
  const approvals = approvalsResult.ok ? approvalsResult.value : [];
  const watchList = watchListResult.ok ? watchListResult.value : [];
  const teamMembers = buildTeamMembers(project.ownerClerkId, members);
  const actorName = teamMembers.find((member) => member.clerkUserId === userId)?.name;
  const teamMemberNamesById = Object.fromEntries(
    teamMembers.map((member) => [member.clerkUserId, member.name])
  );

  const commentsByRequirementId: Record<string, typeof comments> = {};
  const commentsByDocumentId: Record<string, typeof comments> = {};
  const commentsByMeetingId: Record<string, typeof comments> = {};

  for (const comment of comments) {
    if (comment.projectRequirementId) {
      commentsByRequirementId[comment.projectRequirementId] ??= [];
      commentsByRequirementId[comment.projectRequirementId].push(comment);
    }
    if (comment.documentId) {
      commentsByDocumentId[comment.documentId] ??= [];
      commentsByDocumentId[comment.documentId].push(comment);
    }
    if (comment.meetingId) {
      commentsByMeetingId[comment.meetingId] ??= [];
      commentsByMeetingId[comment.meetingId].push(comment);
    }
  }

  const approvalsByRequirementId = Object.fromEntries(
    approvals
      .filter((approval) => approval.projectRequirementId)
      .map((approval) => [approval.projectRequirementId!, approval])
  );
  const approvalsByDocumentId = Object.fromEntries(
    approvals
      .filter((approval) => approval.documentId)
      .map((approval) => [approval.documentId!, approval])
  );

  const watchedRequirementIds = new Set(
    watchList
      .filter((watch) => watch.targetType === "requirement" && watch.targetId)
      .map((watch) => watch.targetId!)
  );
  const watchedDocumentIds = new Set(
    watchList
      .filter((watch) => watch.targetType === "document" && watch.targetId)
      .map((watch) => watch.targetId!)
  );
  const watchedMeetingIds = new Set(
    watchList
      .filter((watch) => watch.targetType === "meeting" && watch.targetId)
      .map((watch) => watch.targetId!)
  );

  const serializableProject: SerializableProject = {
    id: project.id,
    name: project.name,
    slug: project.slug,
    description: project.description,
    countryCode: project.countryCode,
    sector: project.sector,
    dealType: project.dealType,
    capexUsdCents: project.capexUsdCents != null ? Number(project.capexUsdCents) : null,
    eximCoverType: project.eximCoverType,
    stage: project.stage,
    targetLoiDate: project.targetLoiDate ? project.targetLoiDate.toISOString() : null,
  };

  // LOI countdown — computed server-side, accurate to the day
  const loiDaysRemaining = project.targetLoiDate
    ? Math.ceil(
        (new Date(project.targetLoiDate).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) /
          86_400_000
      )
    : null;

  const { scoreBps, loiReady, loiBlockers, categoryScores } = computeReadiness(
    rows.map((r) => ({
      requirementId: r.requirementId,
      status: r.status as RequirementStatusValue,
    })),
    project.dealType
  );
  const isExim = project.dealType === "exim_project_finance";

  const chatPresets = getProjectDetailChatPresets({
    projectName: project.name,
    scoreBps,
    loiReady,
    loiBlockerCount: loiBlockers.length,
  });

  return (
    <BeaconProvider>
    <div style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <ProjectNav />
      <TourGuide dealType={project.dealType} />

      {/* Breadcrumb */}
      <div style={{ marginBottom: "32px" }}>
        <Link
          href="/projects"
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "11px",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "var(--ink-muted)",
            textDecoration: "none",
          }}
        >
          ← Deals
        </Link>
      </div>

      {/* Collaborators */}
      <CollaboratorsPanel
        projectId={project.id}
        slug={project.slug}
        ownerClerkId={project.ownerClerkId}
        currentUserId={userId}
        initialMembers={members}
      />

      {/* Project header */}
      <section id="section-overview" style={{ marginBottom: "40px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "24px", flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <p className="eyebrow" style={{ marginBottom: "10px" }}>
              {project.sector} · {project.countryCode}
            </p>
            <h1
              style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: "40px",
                fontWeight: 400,
                color: "var(--ink)",
                margin: "0 0 12px",
              }}
            >
              {project.name}
            </h1>
            {project.description && (
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "15px",
                  color: "var(--ink-mid)",
                  lineHeight: 1.7,
                  maxWidth: "600px",
                  margin: 0,
                }}
              >
                {project.description}
              </p>
            )}
          </div>

          {/* LOI countdown badge — EXIM only */}
          {isExim && loiDaysRemaining !== null && (
            <div
              style={{
                textAlign: "right",
                flexShrink: 0,
              }}
            >
              <p
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  fontWeight: 500,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--ink-muted)",
                  margin: "0 0 6px",
                }}
              >
                LOI Target
              </p>
              <p
                style={{
                  fontFamily: "'DM Serif Display', Georgia, serif",
                  fontSize: "48px",
                  fontWeight: 400,
                  lineHeight: 1,
                  margin: "0 0 4px",
                  color:
                    loiDaysRemaining < 0
                      ? "var(--ink-muted)"
                      : loiDaysRemaining <= 30
                      ? "var(--accent)"
                      : loiDaysRemaining <= 90
                      ? "var(--gold)"
                      : "var(--teal)",
                }}
              >
                {loiDaysRemaining < 0
                  ? "—"
                  : loiDaysRemaining === 0
                  ? "Today"
                  : loiDaysRemaining}
                {loiDaysRemaining > 0 && (
                  <span
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "13px",
                      color: "var(--ink-muted)",
                      marginLeft: "6px",
                    }}
                  >
                    {loiDaysRemaining === 1 ? "day" : "days"}
                  </span>
                )}
              </p>
              <p
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  letterSpacing: "0.06em",
                  color: "var(--ink-muted)",
                  margin: 0,
                }}
              >
                {loiDaysRemaining < 0
                  ? "passed "
                  : "remaining · "}
                {new Date(project.targetLoiDate!).toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          )}
        </div>

        {/* Urgency banner — EXIM only, ≤30 days and not LOI ready */}
        {isExim && loiDaysRemaining !== null && loiDaysRemaining >= 0 && loiDaysRemaining <= 30 && !loiReady && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginTop: "20px",
              backgroundColor: "var(--accent-soft)",
              border: "1px solid var(--accent)",
              borderRadius: "3px",
              padding: "10px 16px",
            }}
          >
            <span style={{ fontSize: "14px" }}>⚠</span>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "13px",
                color: "var(--accent)",
                margin: 0,
              }}
            >
              <strong>
                {loiDaysRemaining === 0 ? "LOI target is today" : `${loiDaysRemaining} day${loiDaysRemaining === 1 ? "" : "s"} to LOI target`}
              </strong>
              {" "}— {loiBlockers.length} LOI-critical item{loiBlockers.length !== 1 ? "s" : ""} still pending.
              Focus on blockers below.
            </p>
          </div>
        )}
      </section>

      {/* Stakeholders */}
      <div id="section-stakeholders" />
      <StakeholderPanel
        projectId={project.id}
        slug={project.slug}
        initialStakeholders={stakeholders}
        initialDealParties={dealParties}
      />

      {/* EPC Qualification — EXIM only */}
      {isExim && (
        <>
          <div id="section-epc" />
          <EpcBidsPanel
            projectId={project.id}
            slug={project.slug}
            initialBids={epcBids}
          />
        </>
      )}

      {/* Funder Workspace */}
      <FunderWorkspace
        projectId={project.id}
        slug={project.slug}
        initialFunders={funders}
        requirements={rows.map((r) => ({ requirementId: r.requirementId, name: r.name }))}
        capexUsdCents={project.capexUsdCents != null ? Number(project.capexUsdCents) : null}
      />

      {/* Edit / advance controls */}
      <div style={{ marginBottom: "32px" }}>
        <ProjectEditForm project={serializableProject} />
      </div>

      {/* Stage stepper */}
      <StageStepper current={project.stage} dealType={project.dealType} />

      {/* Metadata row */}
      <div
        style={{
          display: "flex",
          gap: "28px 32px",
          marginBottom: "40px",
          paddingBottom: "32px",
          borderBottom: "1px solid var(--border)",
          flexWrap: "wrap",
        }}
      >
        {[
          { label: "Deal Phase", value: project.stage.replace(/_/g, " ") },
          { label: "Country", value: project.countryCode },
          { label: "Sector", value: project.sector },
          {
            label: "CAPEX",
            value:
              project.capexUsdCents != null
                ? `$${(Number(project.capexUsdCents) / 100_000_000).toFixed(0)}M`
                : "—",
          },
          ...(isExim ? [{
            label: "EXIM Cover",
            value: project.eximCoverType
              ? project.eximCoverType.replace(/_/g, " ")
              : "—",
          }] : []),
          {
            label: isExim ? "Target LOI" : "Target Close",
            value: (isExim ? project.targetLoiDate : (project.targetCloseDate ?? project.targetLoiDate))
              ? new Date((isExim ? project.targetLoiDate : (project.targetCloseDate ?? project.targetLoiDate))!).toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })
              : "—",
          },
        ].map(({ label, value }) => (
          <div key={label}>
            <p
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                fontWeight: 500,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--ink-muted)",
                margin: "0 0 4px",
              }}
            >
              {label}
            </p>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "15px",
                fontWeight: 500,
                color: "var(--ink)",
                margin: 0,
                textTransform: "capitalize",
              }}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      <section style={{ marginBottom: "40px" }}>
        <div style={{ marginBottom: "16px" }}>
          <p className="eyebrow" style={{ marginBottom: "8px" }}>Execution</p>
          <h2
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: "24px",
              fontWeight: 400,
              color: "var(--ink)",
              margin: 0,
            }}
          >
            Meetings and recent activity
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "20px",
            alignItems: "start",
          }}
        >
          <section id="section-meetings">
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
              teamMembers={teamMembers}
              currentUserId={userId}
              actorName={actorName}
              commentsByMeetingId={commentsByMeetingId}
              watchedMeetingIds={watchedMeetingIds}
            />
          </section>

          <section id="section-activity">
            <ActivityFeed events={activityEvents} teamMemberNamesById={teamMemberNamesById} />
          </section>
        </div>
      </section>

      <section style={{ marginBottom: "40px" }}>
        <div style={{ marginBottom: "18px" }}>
          <p className="eyebrow" style={{ marginBottom: "8px" }}>PM Signal Layer</p>
          <h2
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: "26px",
              fontWeight: 400,
              color: "var(--ink)",
              margin: 0,
            }}
          >
            Operational visuals for the next gate
          </h2>
        </div>

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
      </section>

      {/* Readiness gauge */}
      <section id="section-readiness">
        <ReadinessGauge
          scoreBps={scoreBps}
          loiReady={loiReady}
          categoryScores={categoryScores}
          dealType={project.dealType}
        />
      </section>

      {/* LOI blockers — EXIM only */}
      {isExim && !loiReady && <LoiBlockersPanel blockerIds={loiBlockers} />}

      {/* Deal Milestones */}
      <MilestonePanel
        projectId={project.id}
        slug={project.slug}
        initialMilestones={milestones}
        anchorDate={project.targetLoiDate?.toISOString() ?? project.createdAt.toISOString()}
      />

      {/* Timeline / Gantt chart */}
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
        <GanttChart
          rows={rows}
          projectCreatedAt={project.createdAt}
          targetLoiDate={project.targetLoiDate}
          targetCloseDate={project.targetCloseDate}
          milestones={milestones.map((m) => ({
            id: m.id,
            name: m.name,
            targetDate: m.targetDate,
            completedAt: m.completedAt,
          }))}
        />
      </section>

      {/* Documents */}
      <section id="section-documents">
        <DocumentCoverageMap
          projectName={project.name}
          requirementRows={rows}
          documents={documents}
        />
        <DocumentPanel
          projectId={project.id}
          slug={project.slug}
          initialDocuments={documents}
          requirementRows={rows}
          teamMembers={teamMembers}
          currentUserId={userId}
          actorName={actorName}
          commentsByDocumentId={commentsByDocumentId}
          approvalsByDocumentId={approvalsByDocumentId}
          watchedDocumentIds={watchedDocumentIds}
        />
      </section>

      {/* Claude gap analysis */}
      <div id="section-gap-analysis" />
      <GapAnalysis projectId={project.id} />

      {/* Getting started callout — shown only at 0% */}
      {scoreBps === 0 && (
        <div
          style={{
            backgroundColor: "var(--gold-soft)",
            border: "1px solid var(--gold)",
            borderLeft: "3px solid var(--gold)",
            borderRadius: "4px",
            padding: "24px 28px",
            marginBottom: "32px",
          }}
        >
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--gold)",
              margin: "0 0 10px",
            }}
          >
            Getting Started
          </p>
          <p
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: "20px",
              fontWeight: 400,
              color: "var(--ink)",
              margin: "0 0 12px",
              lineHeight: 1.3,
            }}
          >
            Begin building your deal data room
          </p>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "14px",
              color: "var(--ink-mid)",
              lineHeight: 1.7,
              margin: "0 0 20px",
              maxWidth: "560px",
            }}
          >
            {isExim
              ? <>Your EXIM deal readiness score starts at 0%. Work through the deal workplan items below — focus on the <strong>EXIM LOI</strong>-flagged items first, as those are gating for your EXIM Letter of Interest submission. Mark each item as it progresses from In Progress → Draft → Substantially Final → Executed.</>
              : <>Your deal readiness score starts at 0%. Work through the workplan items below and mark each as it progresses. Focus on the items flagged as gating for your next milestone first.</>
            }
          </p>
          <div style={{ display: "flex", gap: "32px", flexWrap: "wrap" }}>
            {(isExim ? [
              { step: "01", label: "Set LOI requirements to In Progress" },
              { step: "02", label: "Attach notes to track open questions" },
              { step: "03", label: "Advance items to Substantially Final form" },
            ] : [
              { step: "01", label: "Set workplan items to In Progress" },
              { step: "02", label: "Attach notes and documents to each item" },
              { step: "03", label: "Advance items through Draft to Executed" },
            ]).map(({ step, label }) => (
              <div key={step} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "11px",
                    fontWeight: 500,
                    color: "var(--gold)",
                    letterSpacing: "0.08em",
                  }}
                >
                  {step}
                </span>
                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "13px",
                    color: "var(--ink-mid)",
                  }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Requirements checklist */}
      <section id="section-requirements">
        <RequirementsChecklist
          projectId={project.id}
          slug={project.slug}
          dealType={project.dealType}
          rows={rows}
          documents={documents}
          stakeholders={stakeholders.map((s) => ({ id: s.id, name: s.name }))}
          organizations={Array.from(
            new Map(
              stakeholders
                .filter((s): s is typeof s & { organizationId: string; organizationName: string } =>
                  s.organizationId !== null && s.organizationName !== null
                )
                .map((s) => [s.organizationId, { id: s.organizationId, name: s.organizationName }])
            ).values()
          )}
          teamMembers={teamMembers}
          currentUserId={userId}
          actorName={actorName}
          commentsByRequirementId={commentsByRequirementId}
          approvalsByRequirementId={approvalsByRequirementId}
          watchedRequirementIds={watchedRequirementIds}
        />
      </section>
    </div>
    </div>
    <BeaconPanel
      presetQuestions={chatPresets}
      pageContext={`Deal detail page for ${project.name}. Country ${project.countryCode}. Sector ${project.sector}. Stage ${project.stage.replace(/_/g, " ")}. Deal type ${project.dealType.replace(/_/g, " ")}. Readiness ${(scoreBps / 100).toFixed(1)}%.${isExim ? ` EXIM LOI blockers ${loiBlockers.length}.` : ""}`}
      context={{ page: "project_detail", projectId: project.id, projectSlug: project.slug }}
      projectName={project.name}
      readinessPct={scoreBps / 100}
      loiBlockerCount={loiBlockers.length}
    />
    </BeaconProvider>
  );
}
