import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { getCachedProjectBySlug } from "@/lib/db/projects";
import { getProjectRequirements } from "@/lib/db/requirements";
import { getProjectDocuments } from "@/lib/db/documents";
import { getProjectStakeholders } from "@/lib/db/stakeholders";
import { getProjectMembers } from "@/lib/db/members";
import { getApprovalsByProject } from "@/lib/db/approvals";
import { getCommentsByProject } from "@/lib/db/comments";
import { getUserWatchList } from "@/lib/db/watchers";
import { getProjectActivity } from "@/lib/db/activity";
import { resolveClerkUsers } from "@/lib/clerk/resolve-users";
import { buildTeamMembers } from "@/lib/projects/team";
import { computeReadiness, mapRequirementStatuses } from "@/lib/scoring/index";
import { getProgramConfig } from "@/lib/requirements/index";
import { ReadinessGauge } from "@/components/projects/ReadinessGauge";
import { GateBlockersPanel } from "@/components/requirements/LoiBlockersPanel";
import { LoiProjectionWidget } from "@/components/projects/LoiProjectionWidget";
import { ReadinessTrendlineChart } from "@/components/projects/ReadinessTrendlineChart";
import { RequirementsChecklist } from "@/components/requirements/RequirementsChecklist";
import { GapAnalysis } from "@/components/projects/GapAnalysis";
import { WorkplanQueue } from "@/components/projects/WorkplanQueue";
import { StaleAssignmentsPanel } from "@/components/projects/StaleAssignmentsPanel";
import { ApplicabilitySuggestions } from "@/components/requirements/ApplicabilitySuggestions";
import { ResponsibilityMatrix } from "@/components/projects/ResponsibilityMatrix";
import { OverdueActionItems } from "@/components/projects/OverdueActionItems";
import { SectionSubNav } from "@/components/projects/SectionSubNav";
import { SectionSkeleton } from "@/components/ui/SectionSkeleton";

const ScenarioSimulator = dynamic(
  () => import("@/components/projects/ScenarioSimulator").then((m) => ({ default: m.ScenarioSimulator })),
  { loading: () => <SectionSkeleton /> }
);

export default async function ProjectWorkplanPage({
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
    documentsResult,
    stakeholdersResult,
    membersResult,
    approvalsResult,
    commentsResult,
    watchListResult,
    activityResult,
  ] = await Promise.all([
    getProjectRequirements(project.id, project.dealType, project.sector),
    getProjectDocuments(project.id),
    getProjectStakeholders(project.id),
    getProjectMembers(project.id),
    getApprovalsByProject(project.id),
    getCommentsByProject(project.id),
    getUserWatchList(userId, project.id),
    getProjectActivity(project.id),
  ]);
  if (!reqResult.ok) throw new Error(reqResult.error.message);

  const rows = reqResult.value;
  const documents = documentsResult.ok ? documentsResult.value.items : [];
  const stakeholders = stakeholdersResult.ok ? stakeholdersResult.value : [];
  const members = membersResult.ok ? membersResult.value : [];
  const approvals = approvalsResult.ok ? approvalsResult.value : [];
  const comments = commentsResult.ok ? commentsResult.value : [];
  const watchList = watchListResult.ok ? watchListResult.value : [];
  const activityEvents = activityResult.ok ? activityResult.value.items : [];

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
  const allClerkIds = [...new Set(memberClerkIds)];
  const resolvedUsers = await resolveClerkUsers(allClerkIds);
  const teamMembers = buildTeamMembers(project.ownerClerkId, members, resolvedUsers);
  const actorName = teamMembers.find((m) => m.clerkUserId === userId)?.name;

  const commentsByRequirementId: Record<string, typeof comments> = {};
  for (const comment of comments) {
    if (comment.projectRequirementId) {
      commentsByRequirementId[comment.projectRequirementId] ??= [];
      commentsByRequirementId[comment.projectRequirementId].push(comment);
    }
  }

  const approvalsByRequirementId = Object.fromEntries(
    approvals
      .filter((a) => a.projectRequirementId)
      .map((a) => [a.projectRequirementId!, a])
  );

  const watchedRequirementIds = new Set(
    watchList
      .filter((w) => w.targetType === "requirement" && w.targetId)
      .map((w) => w.targetId!)
  );

  const twentyEightDaysAgo = new Date(Date.now() - 28 * 86_400_000);
  const recentCompletions = activityEvents.filter(
    (e) => e.eventType === "requirement_status_updated" && new Date(e.createdAt) >= twentyEightDaysAgo
  ).length;
  const recentVelocity = recentCompletions / 4;

  const { scoreBps, loiReady, loiBlockers, categoryScores } = computeReadiness(
    mapRequirementStatuses(rows),
    project.dealType
  );
  const isExim = project.dealType === "exim_project_finance";
  const programConfig = getProgramConfig(project.dealType);

  const now = new Date();
  const sixtyDaysOut = new Date(now.getTime() + 60 * 86_400_000);
  const primaryGateRequirementIds = new Set(
    rows.filter((r) => r.isPrimaryGate).map((r) => r.projectRequirementId)
  );
  const expiringGateDocs = documents
    .filter(
      (d) =>
        d.expiresAt !== null &&
        d.expiresAt <= sixtyDaysOut &&
        d.projectRequirementId !== null &&
        primaryGateRequirementIds.has(d.projectRequirementId)
    )
    .map((d) => {
      const req = rows.find((r) => r.projectRequirementId === d.projectRequirementId);
      return {
        name: d.filename,
        expiresAt: d.expiresAt as Date,
        requirementTitle: req?.name ?? "Unknown requirement",
      };
    });

  return (
    <section id="section-workplan" style={{ marginBottom: "40px", scrollMarginTop: "72px" }}>
      <div style={{ marginBottom: "18px" }}>
        <p className="eyebrow" style={{ marginBottom: "8px" }}>Workplan workspace</p>
        <h2
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: "26px",
            fontWeight: 400,
            color: "var(--ink)",
            margin: "0 0 8px",
          }}
        >
          Readiness, blockers, and required work
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
          Workplan is the canonical source of truth for what must be completed before the next gate. It combines readiness, blocker logic, the gap view, and the live checklist.
        </p>
      </div>

      <SectionSubNav
        items={[
          { id: "section-readiness", label: "Readiness" },
          { id: "section-gap-analysis", label: "Gap Analysis" },
        ]}
      />

      <section id="section-readiness">
        <ReadinessGauge
          scoreBps={scoreBps}
          loiReady={loiReady}
          categoryScores={categoryScores}
          dealType={project.dealType}
          projectId={project.id}
          projectSlug={project.slug}
          cachedScoreUpdatedAt={project.cachedScoreUpdatedAt}
        />
      </section>

      <Suspense fallback={<SectionSkeleton />}>
        <OverdueActionItems projectId={project.id} />
      </Suspense>

      {programConfig.hasBlockerColumn && !loiReady && (
        <GateBlockersPanel
          blockers={loiBlockers.map((id) => ({
            id,
            name: rows.find((r) => r.requirementId === id)?.name ?? id,
          }))}
          gateLabel={programConfig.primaryGateLabel}
          expiringDocuments={expiringGateDocs}
        />
      )}

      <LoiProjectionWidget
        loiBlockerCount={loiBlockers.length}
        recentVelocity={recentVelocity}
        targetLoiDate={project.targetLoiDate ?? project.targetCloseDate}
        dealType={project.dealType}
        actualLoiSubmittedDate={project.actualLoiSubmittedDate}
      />

      <ReadinessTrendlineChart projectSlug={project.slug} />

      <Suspense fallback={<SectionSkeleton />}>
        <ScenarioSimulator
          projectSlug={project.slug}
          requirements={rows.map((r) => ({
            requirementId: r.requirementId,
            name: r.name,
            category: r.category,
            status: r.status,
            isApplicable: r.isApplicable,
            isPrimaryGate: r.isPrimaryGate,
          }))}
        />
      </Suspense>

      <div id="section-gap-analysis" />
      <GapAnalysis projectId={project.id} dealType={project.dealType} />

      <StaleAssignmentsPanel projectId={project.id} />

      <WorkplanQueue
        projectId={project.id}
        slug={project.slug}
        dealType={project.dealType}
        rows={rows}
        documents={documents}
        canEdit={canEditProjectContent}
      />

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
            Begin building your evidence base
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
          canEdit={canEditProjectContent}
          canApprove={canEditProjectContent}
          commentsByRequirementId={commentsByRequirementId}
          approvalsByRequirementId={approvalsByRequirementId}
          watchedRequirementIds={watchedRequirementIds}
        />
      </section>

      <ApplicabilitySuggestions projectSlug={project.slug} projectId={project.id} />

      <ResponsibilityMatrix requirements={rows} />
    </section>
  );
}
