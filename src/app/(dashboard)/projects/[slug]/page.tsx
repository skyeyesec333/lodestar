import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
// notFound used for project lookup; requirements errors throw to surface the actual message
import Link from "next/link";
import { getProjectBySlug } from "@/lib/db/projects";
import { getProjectRequirements } from "@/lib/db/requirements";
import { computeReadiness } from "@/lib/scoring/index";
import { getProgramConfig, getStageLabel, getCategoryLabel } from "@/lib/requirements/index";
import { countryLabel } from "@/lib/projects/country-label";
import { resolveClerkUsers } from "@/lib/clerk/resolve-users";
import { ReadinessGauge } from "@/components/projects/ReadinessGauge";
import { StageStepper } from "@/components/projects/StageStepper";
import { ProjectEditForm } from "@/components/projects/ProjectEditForm";
import type { SerializableProject } from "@/components/projects/ProjectEditForm";
import { GapAnalysis } from "@/components/projects/GapAnalysis";
import { ActivityFeed } from "@/components/projects/ActivityFeed";
import { StakeholderPanel } from "@/components/stakeholders/StakeholderPanel";
import { getProjectActivity } from "@/lib/db/activity";
import { getProjectStakeholders } from "@/lib/db/stakeholders";
import { GateBlockersPanel } from "@/components/requirements/LoiBlockersPanel";
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
import { TourGuide } from "@/components/projects/TourGuide";
import { getProjectDetailChatPresets } from "@/lib/ai/chat-presets";
import { BeaconProvider } from "@/components/beacon/BeaconProvider";
import { BeaconPanel } from "@/components/beacon/BeaconPanel";
import { WorkspaceBeaconSync } from "@/components/beacon/WorkspaceBeaconSync";
import { CriticalPathBoard } from "@/components/projects/CriticalPathBoard";
import { DocumentCoverageMap } from "@/components/projects/DocumentCoverageMap";
import { OwnershipLoadBoard } from "@/components/projects/OwnershipLoadBoard";
import { WeeklyDriftPanel } from "@/components/projects/WeeklyDriftPanel";
import { ProjectConceptPanel } from "@/components/projects/ProjectConceptPanel";
import type { RequirementStatusValue } from "@/types/requirements";
import { getCommentsByProject } from "@/lib/db/comments";
import { getApprovalsByProject } from "@/lib/db/approvals";
import { getUserWatchList } from "@/lib/db/watchers";
import { buildGateReview } from "@/lib/projects/gate-review";
import { getProjectConcept } from "@/lib/db/project-concepts";
import { getProjectExternalEvidence } from "@/lib/db/external-evidence";
import { CovenantMonitoringPanel } from "@/components/projects/CovenantMonitoringPanel";
import { getProjectCovenants } from "@/lib/db/covenants";
import { ResponsibilityMatrix } from "@/components/projects/ResponsibilityMatrix";
import { ExpiryTimeline } from "@/components/documents/ExpiryTimeline";
import { ReadinessBreakdown } from "@/components/projects/ReadinessBreakdown";
import { ScenarioSimulator } from "@/components/projects/ScenarioSimulator";
import { ShareLinksPanel } from "@/components/projects/ShareLinksPanel";
import { getShareLinksForProject } from "@/lib/db/share-links";
import type { CategoryBreakdown } from "@/lib/db/requirements";
import type { TeamMember } from "@/types/collaboration";
import type { ProjectMemberRow } from "@/lib/db/members";
import { DecisionDesk } from "@/components/projects/DecisionDesk";
import { ConceptBeaconBrief } from "@/components/projects/ConceptBeaconBrief";
import { checkStageGate } from "@/lib/projects/stage-gate";
import { buildProjectOperatingMetrics } from "@/lib/projects/operating-metrics";
import { WorkplanQueue } from "@/components/projects/WorkplanQueue";
import { StaleAssignmentsPanel } from "@/components/projects/StaleAssignmentsPanel";
import { ProjectWorkspaceTabs } from "@/components/projects/ProjectWorkspaceTabs";
import { EvidenceActionBoard } from "@/components/projects/EvidenceActionBoard";
import { ExecutionCommitmentsBoard } from "@/components/projects/ExecutionCommitmentsBoard";
import { getTimelineRisks } from "@/lib/db/timeline-risks";
import { TimelineRiskBadge } from "@/components/projects/TimelineRiskBadge";
import { ExecutiveSummary } from "@/components/projects/ExecutiveSummary";
import { assessFinancingReadiness } from "@/lib/scoring/financing";
import { FinancingRiskBadge } from "@/components/projects/FinancingRiskBadge";
import type { FinancingRisk } from "@/lib/scoring/financing";
import { getUpcomingMilestones } from "@/lib/db/milestones-upcoming";
import { UpcomingMilestonesWidget } from "@/components/projects/UpcomingMilestonesWidget";
import { ReadinessTrendlineChart } from "@/components/projects/ReadinessTrendlineChart";
import { ApprovalsPanel } from "@/components/projects/ApprovalsPanel";
import { StatusReportButton } from "@/components/projects/StatusReportButton";
import { SectionSubNav } from "@/components/projects/SectionSubNav";
import { FirstRunOverlay } from "@/components/projects/FirstRunOverlay";
import { SetupChecklist } from "@/components/projects/SetupChecklist";

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
  members: ProjectMemberRow[],
  resolvedUsers: Map<string, { fullName: string; firstName: string; imageUrl: string }>
): TeamMember[] {
  const deduped = new Map<string, TeamMember>();
  const ownerResolved = resolvedUsers.get(ownerClerkId);
  deduped.set(ownerClerkId, {
    clerkUserId: ownerClerkId,
    name: ownerResolved?.fullName ?? fallbackMemberName(ownerClerkId, "owner"),
    email: null,
    imageUrl: ownerResolved?.imageUrl ?? null,
    role: "owner",
  });

  for (const member of members) {
    const role = member.role === "editor" ? "editor" : "viewer";
    if (member.clerkUserId === ownerClerkId) continue;
    const resolved = resolvedUsers.get(member.clerkUserId);
    deduped.set(member.clerkUserId, {
      clerkUserId: member.clerkUserId,
      name: resolved?.fullName ?? fallbackMemberName(member.clerkUserId, role),
      email: null,
      imageUrl: resolved?.imageUrl ?? null,
      role,
    });
  }

  return Array.from(deduped.values());
}

const DEAL_TYPE_LABELS: Record<string, string> = {
  exim_project_finance: "US EXIM Project Finance",
  commercial_finance: "Commercial Finance",
  development_finance: "Development Finance",
  private_equity: "Private Equity",
  other: "Undecided Path",
};

function formatDealTypeLabel(dealType: string) {
  return DEAL_TYPE_LABELS[dealType] ?? dealType.replace(/_/g, " ");
}


function getNextGateLabel(stage: string, dealType: string) {
  const order = [
    "concept",
    "pre_loi",
    "loi_submitted",
    "loi_approved",
    "pre_commitment",
    "final_commitment",
    "financial_close",
  ];
  const currentIndex = order.indexOf(stage);
  if (currentIndex < 0 || currentIndex >= order.length - 1) {
    return "Financial Close";
  }
  return getStageLabel(order[currentIndex + 1], dealType);
}

function formatTargetDate(date: Date | null | undefined) {
  if (!date) return "Not set";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function WorkspaceFocusStrip({
  items,
}: {
  items: Array<{ label: string; detail: string }>;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "12px",
        marginBottom: "18px",
      }}
    >
      {items.map((item) => (
        <div
          key={item.label}
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "14px 16px",
          }}
        >
          <p className="eyebrow" style={{ marginBottom: "8px" }}>
            {item.label}
          </p>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "13px",
              color: "var(--ink-mid)",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {item.detail}
          </p>
        </div>
      ))}
    </div>
  );
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

  const reqResult = await getProjectRequirements(project.id, project.dealType, project.sector);
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
    conceptResult,
    externalEvidenceResult,
    covenantsResult,
    shareLinksResult,
    timelineRisksResult,
    financingRiskResult,
    upcomingMilestonesResult,
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
    getProjectConcept(project.id),
    getProjectExternalEvidence(project.id),
    getProjectCovenants(project.id),
    getShareLinksForProject(project.id),
    getTimelineRisks(project.id),
    assessFinancingReadiness(project.id),
    getUpcomingMilestones(userId),
  ]);
  const activityEvents = activityResult.ok ? activityResult.value.items : [];
  const stakeholders = stakeholdersResult.ok ? stakeholdersResult.value : [];
  const documents = documentsResult.ok ? documentsResult.value.items : [];
  const meetings = meetingsResult.ok ? meetingsResult.value : [];
  const epcBids = epcBidsResult.ok ? epcBidsResult.value : [];
  const funders = fundersResult.ok ? fundersResult.value : [];
  const members = membersResult.ok ? membersResult.value : [];

  const memberClerkIds = [
    project.ownerClerkId,
    ...members.map((m) => m.clerkUserId).filter((id) => id !== project.ownerClerkId),
  ];
  const activityActorIds = activityEvents.map((e) => e.clerkUserId);
  const allClerkIds = [...new Set([...memberClerkIds, ...activityActorIds])];
  const resolvedUsers = await resolveClerkUsers(allClerkIds);
  const dealParties = dealPartiesResult.ok ? dealPartiesResult.value : [];
  const milestones = milestonesResult.ok ? milestonesResult.value : [];
  const comments = commentsResult.ok ? commentsResult.value : [];
  const approvals = approvalsResult.ok ? approvalsResult.value : [];
  const watchList = watchListResult.ok ? watchListResult.value : [];
  const concept = conceptResult.ok ? conceptResult.value : null;
  const externalEvidence = externalEvidenceResult.ok ? externalEvidenceResult.value : [];
  const covenants = covenantsResult.ok ? covenantsResult.value : [];
  const shareLinks = shareLinksResult.ok ? shareLinksResult.value : [];
  const timelineRisks = timelineRisksResult.ok ? timelineRisksResult.value : [];
  const upcomingMilestones = upcomingMilestonesResult.ok ? upcomingMilestonesResult.value : [];
  const DEFAULT_FINANCING_RISK: FinancingRisk = { level: "none", penaltyBps: 0, flags: [] };
  const financingRisk = financingRiskResult.ok ? financingRiskResult.value : DEFAULT_FINANCING_RISK;
  const currentMembership = members.find((member) => member.clerkUserId === userId);
  const currentProjectRole =
    project.ownerClerkId === userId
      ? "owner"
      : currentMembership?.role === "editor"
        ? "editor"
        : "viewer";
  const canEditProject = currentProjectRole === "owner";
  const canEditProjectContent = currentProjectRole !== "viewer";
  const teamMembers = buildTeamMembers(project.ownerClerkId, members, resolvedUsers);
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
    capexUsdCents: project.capexUsdCents,
    eximCoverType: project.eximCoverType,
    stage: project.stage,
    targetLoiDate: project.targetLoiDate ? project.targetLoiDate.toISOString() : null,
  };

  // Compute category breakdown from already-fetched requirement rows (no extra DB call)
  const categoryBreakdown: CategoryBreakdown[] = (() => {
    const groups: Record<
      string,
      {
        total: number;
        completed: number;
        inProgress: number;
        blockingRequirements: Array<{ id: string; label: string; status: string }>;
      }
    > = {};
    for (const row of rows) {
      if (!row.isApplicable) continue;
      const cat = row.category;
      if (!groups[cat]) {
        groups[cat] = { total: 0, completed: 0, inProgress: 0, blockingRequirements: [] };
      }
      groups[cat].total++;
      if (["substantially_final", "executed", "waived"].includes(row.status)) {
        groups[cat].completed++;
      } else if (["in_progress", "draft"].includes(row.status)) {
        groups[cat].inProgress++;
      }

      // Collect blocking requirements (not yet in final state)
      if (!["substantially_final", "executed", "waived"].includes(row.status)) {
        groups[cat].blockingRequirements.push({
          id: row.requirementId,
          label: row.name,
          status: row.status,
        });
      }
    }
    return Object.entries(groups).map(([cat, counts]) => ({
      category: cat,
      label: getCategoryLabel(cat),
      total: counts.total,
      completed: counts.completed,
      inProgress: counts.inProgress,
      scorePct: counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0,
      blockingRequirements: counts.blockingRequirements,
    }));
  })();

  // Compute documents expiring within 90 days for ExpiryTimeline
  const now = new Date();
  const ninetyDaysOut = new Date(now.getTime() + 90 * 86_400_000);
  const expiringDocuments = documents.filter(
    (d) => d.expiresAt !== null && d.expiresAt > now && d.expiresAt <= ninetyDaysOut
  );
  const evidenceMissingRows = rows
    .filter((row) => {
      if (row.isApplicable === false) return false;
      return (
        !documents.some((document) => document.projectRequirementId === row.projectRequirementId) &&
        !externalEvidence.some((evidence) => evidence.projectRequirementId === row.projectRequirementId)
      );
    })
    .sort((a, b) => {
      if (a.isPrimaryGate !== b.isPrimaryGate) return a.isPrimaryGate ? -1 : 1;
      return a.sortOrder - b.sortOrder;
    });
  const orphanedEvidenceCount =
    documents.filter((document) => !document.projectRequirementId).length +
    externalEvidence.filter((evidence) => !evidence.projectRequirementId).length;
  const applicableRequirementCount = rows.filter((row) => row.isApplicable !== false).length;
  const linkedRequirementCount = rows.filter((row) => {
    if (row.isApplicable === false) return false;
    return (
      documents.some((document) => document.projectRequirementId === row.projectRequirementId) ||
      externalEvidence.some((evidence) => evidence.projectRequirementId === row.projectRequirementId)
    );
  }).length;
  const linkedCoveragePct =
    applicableRequirementCount > 0 ? Math.round((linkedRequirementCount / applicableRequirementCount) * 100) : 0;
  const criticalEvidenceRows = rows.filter((row) => row.isApplicable !== false && row.isPrimaryGate);
  const linkedCriticalEvidenceCount = criticalEvidenceRows.filter((row) =>
    documents.some((document) => document.projectRequirementId === row.projectRequirementId) ||
    externalEvidence.some((evidence) => evidence.projectRequirementId === row.projectRequirementId)
  ).length;

  const { scoreBps, loiReady, loiBlockers, categoryScores } = computeReadiness(
    rows.map((r) => ({
      requirementId: r.requirementId,
      status: r.isApplicable === false
        ? ("not_applicable" as RequirementStatusValue)
        : (r.status as RequirementStatusValue),
    })),
    project.dealType
  );
  const isExim = project.dealType === "exim_project_finance";
  const programConfig = getProgramConfig(project.dealType);
  const dealTypeLabel = formatDealTypeLabel(project.dealType);
  const currentStageLabel = getStageLabel(project.stage, project.dealType);
  const nextGateLabel = getNextGateLabel(project.stage, project.dealType);
  const targetGateDate = isExim
    ? (project.targetLoiDate ?? project.targetCloseDate)
    : (project.targetCloseDate ?? project.targetLoiDate);
  const targetGateDaysRemaining = targetGateDate
    ? Math.ceil(
        (new Date(targetGateDate).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) /
          86_400_000
      )
    : null;
  const operatingMetrics = buildProjectOperatingMetrics({
    stage: project.stage,
    dealType: project.dealType,
    targetLoiDate: project.targetLoiDate,
    targetCloseDate: project.targetCloseDate,
    requirements: rows,
    documents,
  });
  const gateResult = checkStageGate(operatingMetrics.nextStageId, rows);
  const gateReview = buildGateReview({
    project,
    requirements: rows,
    scoreBps,
    concept,
  });
  const gateReviewTone =
    gateReview.status === "ready"
      ? "var(--teal)"
      : gateReview.status === "at_risk"
        ? "var(--gold)"
        : "var(--accent)";
  const conceptPrompts = [
    !concept?.thesis && !project.description ? "Add a concise deal thesis and sponsor rationale." : null,
    !concept?.targetOutcome ? "State the concrete outcome this deal is trying to achieve." : null,
    !concept?.sponsorRationale ? "Explain why the sponsor is pursuing this deal now." : null,
    !concept?.knownUnknowns ? "Capture the unknowns that could materially change the capital path." : null,
    !concept?.fatalFlaws ? "Write down the fatal flaws the team needs to disprove early." : null,
    !concept?.nextActions ? "List the next actions needed to move the concept toward the next gate." : null,
    !concept?.goNoGoRecommendation ? "Record a current go / no-go recommendation before advancing." : null,
    project.capexUsdCents == null ? "Set a working CAPEX range for the team." : null,
    !targetGateDate ? "Add a target milestone date to activate urgency tracking." : null,
    isExim && !project.eximCoverType ? "Choose an initial EXIM cover path to frame lender conversations." : null,
  ].filter(Boolean) as string[];

  const conceptSummary =
    concept?.thesis ??
    project.description ??
    "No concept note has been written yet. Use this workspace to define the sponsor thesis, the strategic logic for the asset, and why this financing path is the right one.";

  const chatPresets = getProjectDetailChatPresets({
    projectName: project.name,
    dealType: project.dealType,
    scoreBps,
    loiReady,
    loiBlockerCount: loiBlockers.length,
    conceptThesis: concept?.thesis,
    targetOutcome: concept?.targetOutcome,
    knownUnknowns: concept?.knownUnknowns,
    fatalFlaws: concept?.fatalFlaws,
  });

  // ── Beacon signals: derive from live requirement data ──────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const FOURTEEN_DAYS_MS = 14 * 86_400_000;
  const beaconSignals: import("@/types").BeaconSignal[] = (() => {
    const signals: import("@/types").BeaconSignal[] = [];
    for (const row of rows) {
      if (row.isApplicable === false) continue;
      const isDone = ["substantially_final", "executed", "waived"].includes(row.status);
      if (isDone) continue;
      const isLoiBlocker = loiBlockers.includes(row.requirementId);
      const hasEvidence =
        documents.some((d) => d.projectRequirementId === row.projectRequirementId) ||
        externalEvidence.some((e) => e.projectRequirementId === row.projectRequirementId);
      const hasOwner = !!row.responsibleStakeholderId || !!row.responsibleOrganizationId;
      const targetMs = row.targetDate ? new Date(row.targetDate).setHours(0, 0, 0, 0) : null;
      const isOverdue = targetMs !== null && targetMs < today.getTime();
      const isDueSoon = targetMs !== null && !isOverdue && targetMs - today.getTime() <= FOURTEEN_DAYS_MS;

      let level: import("@/types").BeaconSignalLevel;
      let detail: string;

      if (isLoiBlocker && (isOverdue || !hasOwner || !hasEvidence)) {
        level = "critical";
        if (isOverdue) detail = `${Math.ceil((today.getTime() - targetMs!) / 86_400_000)}d overdue${!hasEvidence ? " — no linked evidence" : ""}`;
        else if (!hasOwner) detail = "No assigned owner";
        else detail = "No linked evidence";
      } else if (!hasEvidence && (isDueSoon || row.status === "in_progress")) {
        level = "warning";
        detail = isDueSoon
          ? `Due in ${Math.ceil((targetMs! - today.getTime()) / 86_400_000)}d`
          : "In progress — no linked file";
      } else if (!hasOwner && row.status === "not_started") {
        level = "info";
        detail = "Draft stage";
      } else {
        continue;
      }

      signals.push({
        level,
        label: row.name,
        detail,
        category: getCategoryLabel(row.category),
      });
    }
    // Sort: critical first, then warning, then info — cap at 8
    const ORDER: Record<import("@/types").BeaconSignalLevel, number> = { critical: 0, warning: 1, info: 2 };
    return signals.sort((a, b) => ORDER[a.level] - ORDER[b.level]).slice(0, 8);
  })();

  // ── Beacon document coverage: derive from categoryBreakdown + evidenceMissingRows ──
  const beaconDocumentCoverage: import("@/types").BeaconDocumentCoverage[] = categoryBreakdown.map((cat) => {
    const gaps = evidenceMissingRows
      .filter((r) => r.category === cat.category)
      .map((r) => r.name);
    return {
      category: cat.label,
      covered: cat.completed,
      total: cat.total,
      gap: gaps,
    };
  });

  return (
    <BeaconProvider>
      <Suspense fallback={null}>
        <FirstRunOverlay
          dealType={project.dealType}
          projectSlug={project.slug}
          projectName={project.name}
        />
      </Suspense>
    <div style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <WorkspaceBeaconSync />

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

      <div
        style={{
          position: "sticky",
          top: "0",
          zIndex: 30,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "8px 20px",
          padding: "8px 0 10px",
          borderBottom: "1px solid var(--border)",
          backgroundColor: "var(--bg)",
        }}
      >
        <ProjectWorkspaceTabs />
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <StatusReportButton projectSlug={project.slug} />
          <TourGuide dealType={project.dealType} stage={project.stage} inline />
        </div>
      </div>
      <div style={{ height: "32px" }} />

      <TimelineRiskBadge risks={timelineRisks} />
      <FinancingRiskBadge risk={financingRisk} />

      <section id="section-executive-summary" style={{ marginBottom: "40px", scrollMarginTop: "72px" }}>
        <div style={{ marginBottom: "16px" }}>
          <p className="eyebrow" style={{ marginBottom: "8px" }}>Executive summary</p>
          <h2
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: "24px",
              fontWeight: 400,
              color: "var(--ink)",
              margin: "0 0 8px",
            }}
          >
            Deal brief
          </h2>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "14px",
              color: "var(--ink-mid)",
              lineHeight: 1.6,
              margin: 0,
              maxWidth: "680px",
            }}
          >
            A single-page snapshot covering the deal thesis, current stage, next gate conditions, active blockers, and key dates.
          </p>
        </div>
        <ExecutiveSummary
          project={project}
          readinessScoreBps={scoreBps}
          breakdown={categoryBreakdown}
          gateReview={gateReview}
          timelineRisks={timelineRisks}
          upcomingMilestones={milestones
            .filter((m) => !m.completedAt && m.targetDate !== null)
            .sort((a, b) => {
              const aTime = a.targetDate ? new Date(a.targetDate).getTime() : Infinity;
              const bTime = b.targetDate ? new Date(b.targetDate).getTime() : Infinity;
              return aTime - bTime;
            })
            .slice(0, 3)}
        />
      </section>

      <section id="section-collaborators" style={{ marginBottom: "32px", scrollMarginTop: "72px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "18px",
            flexWrap: "wrap",
            marginBottom: "16px",
          }}
        >
          <div style={{ maxWidth: "680px" }}>
            <p className="eyebrow" style={{ marginBottom: "8px" }}>Workspace utilities</p>
            <h2
              style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: "24px",
                fontWeight: 400,
                color: "var(--ink)",
                margin: "0 0 8px",
              }}
            >
              Access and controls
            </h2>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "14px",
                color: "var(--ink-mid)",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              Manage collaborators, project settings, and stage controls here so they stay in utility chrome rather than competing with the operating workspaces.
            </p>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "14px" }}>
              <Link
                href="/templates"
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  fontWeight: 500,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: "var(--ink)",
                  textDecoration: "none",
                  padding: "8px 12px",
                  borderRadius: "999px",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--bg-card)",
                }}
              >
                Browse Templates
              </Link>
              <Link
                href="/projects/new"
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  fontWeight: 500,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: "var(--ink-muted)",
                  textDecoration: "none",
                  padding: "8px 12px",
                  borderRadius: "999px",
                  border: "1px solid var(--border)",
                  backgroundColor: "transparent",
                }}
              >
                New Workspace
              </Link>
            </div>
          </div>

          <div style={{ flexShrink: 0 }}>
            <ProjectEditForm
              project={serializableProject}
              canManageProject={canEditProject}
              gateReview={gateReview}
            />
          </div>
        </div>

        <CollaboratorsPanel
          projectId={project.id}
          slug={project.slug}
          ownerClerkId={project.ownerClerkId}
          currentUserId={userId}
          initialMembers={members}
          resolvedNames={Object.fromEntries(
            Array.from(resolvedUsers.entries()).map(([id, u]) => [id, u.fullName])
          )}
        />

        <ShareLinksPanel
          projectId={project.id}
          slug={project.slug}
          initialLinks={shareLinks}
        />
      </section>

      <section id="section-overview" style={{ marginBottom: "40px", scrollMarginTop: "72px" }}>
        <div style={{ marginBottom: "22px" }}>
          <p className="eyebrow" style={{ marginBottom: "10px" }}>
            {dealTypeLabel} · {countryLabel(project.countryCode)} · {project.sector}
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
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "15px",
              color: "var(--ink-mid)",
              lineHeight: 1.7,
              maxWidth: "720px",
              margin: 0,
            }}
          >
            {project.description ?? "This overview keeps the current stage, next gate, and operating pressure in one place so the team can orient quickly before moving into the deeper workspaces."}
          </p>
        </div>

        <SetupChecklist
          dealTypeLabel={dealTypeLabel}
          dealType={project.dealType}
          items={[
            {
              label: "Add a stakeholder",
              complete: stakeholders.length > 0,
              href: "#section-stakeholders",
              hintKey: "stakeholder",
            },
            {
              label: "Set a target date",
              complete: project.targetLoiDate != null || project.targetCloseDate != null,
              href: "#section-overview",
              hintKey: "date",
            },
            {
              label: "Upload a document",
              complete: documents.length > 0,
              href: "#section-documents",
              hintKey: "document",
            },
            {
              label: "Write a deal thesis",
              complete: concept?.thesis != null && concept.thesis.trim().length > 0,
              href: "#section-concept",
              hintKey: "thesis",
            },
            {
              label: "Log a meeting",
              complete: meetings.length > 0,
              href: "#section-execution",
              hintKey: "meeting",
            },
          ]}
        />

        <DecisionDesk
          projectSlug={project.slug}
          projectName={project.name}
          dealTypeLabel={dealTypeLabel}
          currentStageLabel={currentStageLabel}
          nextGateLabel={nextGateLabel}
          readinessPct={scoreBps / 100}
          gateReviewSummary={gateReview.summary}
          gateReviewStatus={gateReview.status}
          gateReviewTone={gateReviewTone}
          targetGateLabel={isExim ? "Target LOI" : "Target close"}
          daysToNextGate={operatingMetrics.daysToNextGate}
          categoryBreakdown={categoryBreakdown}
          metrics={operatingMetrics}
          gateResult={gateResult}
        />

        <StageStepper current={project.stage} dealType={project.dealType} />

        <div
          style={{
            display: "flex",
            gap: "24px 28px",
            marginBottom: "4px",
            paddingBottom: "28px",
            borderBottom: "1px solid var(--border)",
            flexWrap: "wrap",
          }}
        >
          {[
            { label: "Country", value: countryLabel(project.countryCode) },
            { label: "Sector", value: project.sector },
            {
              label: "CAPEX",
              value:
                project.capexUsdCents != null
                  ? `$${(project.capexUsdCents / 100_000_000).toFixed(0)}M`
                  : "—",
            },
            {
              label: isExim ? "Target LOI" : "Target Close",
              value: formatTargetDate(targetGateDate),
            },
            {
              label: "Readiness",
              value: `${(scoreBps / 100).toFixed(1)}%`,
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
      </section>

      <section id="section-concept" style={{ marginBottom: "40px", scrollMarginTop: "72px" }}>
        <div style={{ marginBottom: "16px" }}>
          <p className="eyebrow" style={{ marginBottom: "8px" }}>Concept workspace</p>
          <h2
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: "24px",
              fontWeight: 400,
              color: "var(--ink)",
              margin: "0 0 8px",
            }}
          >
            Deal framing
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
            This workspace holds the project thesis, the target structure, and the reasons the team believes this deal deserves active pursuit before Capital and Workplan deepen it.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)",
            gap: "18px",
            alignItems: "start",
          }}
        >
          <ProjectConceptPanel
            projectId={project.id}
            slug={project.slug}
            initialConcept={concept}
            canEdit={canEditProjectContent}
          />

          {/* Right sidebar: deal snapshot + next priorities */}
          <div style={{ display: "grid", gap: "14px" }}>

            {/* Deal snapshot */}
            <div
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: "20px 22px",
              }}
            >
              <p className="eyebrow" style={{ marginBottom: "14px" }}>Deal snapshot</p>
              <div style={{ display: "grid", gap: "12px" }}>
                {[
                  { label: "Capital path", value: dealTypeLabel, filled: true },
                  { label: "Current stage", value: currentStageLabel, filled: true },
                  {
                    label: "Target outcome",
                    value: concept?.targetOutcome ?? null,
                    filled: !!concept?.targetOutcome,
                  },
                  {
                    label: isExim ? "Target LOI" : "Target close",
                    value: formatTargetDate(targetGateDate),
                    filled: !!targetGateDate,
                  },
                  {
                    label: "Readiness",
                    value: `${Math.round(scoreBps / 100)}%`,
                    filled: scoreBps > 0,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: "12px",
                      paddingBottom: "10px",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "9px",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: "var(--ink-muted)",
                        paddingTop: "2px",
                        flexShrink: 0,
                      }}
                    >
                      {item.label}
                    </span>
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "13px",
                        color: item.filled ? "var(--ink)" : "var(--ink-muted)",
                        lineHeight: 1.45,
                        textAlign: "right",
                        fontStyle: item.filled ? "normal" : "italic",
                      }}
                    >
                      {item.value ?? "Not set"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Gate review status strip */}
              <div
                style={{
                  marginTop: "14px",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  backgroundColor: "var(--bg)",
                  border: `1px solid ${gateReviewTone}`,
                }}
              >
                <p
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "9px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: gateReviewTone,
                    margin: "0 0 4px",
                  }}
                >
                  Gate review
                </p>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "12px",
                    color: "var(--ink)",
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  {gateReview.summary}
                </p>
              </div>
            </div>

            {/* Concept completion */}
            {(() => {
              const conceptFields = [
                { label: "Thesis", done: !!(concept?.thesis || project.description) },
                { label: "Sponsor rationale", done: !!concept?.sponsorRationale },
                { label: "Target outcome", done: !!concept?.targetOutcome },
                { label: "Known unknowns", done: !!concept?.knownUnknowns },
                { label: "Fatal flaws", done: !!concept?.fatalFlaws },
                { label: "Next actions", done: !!concept?.nextActions },
                { label: "Go / no-go rec.", done: !!concept?.goNoGoRecommendation },
              ];
              const doneCount = conceptFields.filter((f) => f.done).length;
              const totalCount = conceptFields.length;
              const pct = Math.round((doneCount / totalCount) * 100);
              return (
                <div
                  style={{
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "14px",
                    padding: "20px 22px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                    <p className="eyebrow" style={{ margin: 0 }}>Concept completeness</p>
                    <span
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "11px",
                        color: pct === 100 ? "var(--teal)" : "var(--ink-muted)",
                        fontWeight: 500,
                      }}
                    >
                      {doneCount}/{totalCount}
                    </span>
                  </div>
                  <div
                    style={{
                      height: "4px",
                      borderRadius: "2px",
                      backgroundColor: "var(--border)",
                      marginBottom: "14px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        borderRadius: "2px",
                        backgroundColor: pct === 100 ? "var(--teal)" : "var(--accent)",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                  <div style={{ display: "grid", gap: "8px" }}>
                    {conceptFields.map((field) => (
                      <div key={field.label} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                          aria-hidden="true"
                          style={{
                            width: "14px",
                            height: "14px",
                            borderRadius: "3px",
                            border: `1.5px solid ${field.done ? "var(--teal)" : "var(--border)"}`,
                            backgroundColor: field.done ? "var(--teal)" : "transparent",
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {field.done ? (
                            <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                              <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          ) : null}
                        </span>
                        <span
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: "12px",
                            color: field.done ? "var(--ink)" : "var(--ink-muted)",
                            lineHeight: 1.4,
                          }}
                        >
                          {field.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Next priorities (only if there are open prompts) */}
            {conceptPrompts.length > 0 ? (
              <div
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "14px",
                  padding: "20px 22px",
                }}
              >
                <p className="eyebrow" style={{ marginBottom: "12px" }}>Open gaps</p>
                <div style={{ display: "grid", gap: "8px" }}>
                  {conceptPrompts.slice(0, 5).map((prompt) => (
                    <div key={prompt} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                      <span
                        aria-hidden="true"
                        style={{
                          marginTop: "6px",
                          width: "5px",
                          height: "5px",
                          borderRadius: "50%",
                          backgroundColor: "var(--accent)",
                          flexShrink: 0,
                        }}
                      />
                      <p
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "12px",
                          color: "var(--ink-mid)",
                          lineHeight: 1.55,
                          margin: 0,
                        }}
                      >
                        {prompt}
                      </p>
                    </div>
                  ))}
                  {conceptPrompts.length > 5 ? (
                    <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: "var(--ink-muted)", margin: "4px 0 0", letterSpacing: "0.08em" }}>
                      +{conceptPrompts.length - 5} more
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div
          style={{
            marginTop: "18px",
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            padding: "18px 20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: 0, maxWidth: "760px" }}>
              <p className="eyebrow" style={{ marginBottom: "8px" }}>Gate review</p>
              <h3
                style={{
                  fontFamily: "'DM Serif Display', Georgia, serif",
                  fontSize: "22px",
                  fontWeight: 400,
                  color: gateReviewTone,
                  margin: "0 0 8px",
                }}
              >
                {gateReview.nextStageLabel
                  ? `${gateReview.nextStageLabel} review`
                  : "Final stage"}
              </h3>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "14px",
                  color: "var(--ink-mid)",
                  lineHeight: 1.65,
                  margin: 0,
                }}
              >
                {gateReview.focusText}
              </p>
            </div>

            <div
              style={{
                padding: "8px 10px",
                borderRadius: "999px",
                border: `1px solid ${gateReviewTone}`,
                color: gateReviewTone,
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              {gateReview.summary}
            </div>
          </div>
        </div>

        <ConceptBeaconBrief
          thesis={concept?.thesis ?? null}
          knownUnknowns={concept?.knownUnknowns ?? null}
          fatalFlaws={concept?.fatalFlaws ?? null}
          nextActions={concept?.nextActions ?? null}
          goNoGoRecommendation={concept?.goNoGoRecommendation ?? null}
          gateReviewSummary={gateReview.summary}
          conceptPromptsCount={conceptPrompts.length}
          isExim={isExim}
        />
      </section>

      <section id="section-stakeholders" style={{ marginBottom: "40px", scrollMarginTop: "72px" }}>
        <div style={{ marginBottom: "16px" }}>
          <p className="eyebrow" style={{ marginBottom: "8px" }}>Parties workspace</p>
          <h2
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: "24px",
              fontWeight: 400,
              color: "var(--ink)",
              margin: 0,
            }}
          >
            Deal parties and relationship map
          </h2>
        </div>

        <WorkspaceFocusStrip
          items={[
            {
              label: "Map critical parties",
              detail:
                "Keep the sponsor, EPC, advisors, counterparties, and public actors visible in one relationship layer.",
            },
            {
              label: "Track influence and asks",
              detail:
                "Surface who matters most, what they control, and which open asks still need active handling.",
            },
            {
              label: "Watch relationship risk",
              detail:
                "Use the graph and stakeholder load to see where weak contact cadence could slow the deal.",
            },
          ]}
        />

        <StakeholderPanel
          projectId={project.id}
          slug={project.slug}
          initialStakeholders={stakeholders}
          initialDealParties={dealParties}
        />

        {isExim && (
          <EpcBidsPanel
            projectId={project.id}
            slug={project.slug}
            initialBids={epcBids}
          />
        )}
      </section>

      <section id="section-capital" style={{ marginBottom: "40px", scrollMarginTop: "72px" }}>
        <div style={{ marginBottom: "16px" }}>
          <p className="eyebrow" style={{ marginBottom: "8px" }}>Capital workspace</p>
          <h2
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: "24px",
              fontWeight: 400,
              color: "var(--ink)",
              margin: "0 0 8px",
            }}
          >
            Financing path and counterparties
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
            Capital gathers the active financing route, counterparty coverage, and the next external financing gate. It should feel program-aware without forcing every deal into EXIM language.
          </p>
        </div>

        <WorkspaceFocusStrip
          items={[
            {
              label: "Choose the active path",
              detail:
                "Make the capital route explicit so the team is not mixing EXIM, DFI, and commercial assumptions.",
            },
            {
              label: "Track counterparties",
              detail:
                "Keep lenders, DFIs, sponsors, and funders aligned around the same next gate and conditions.",
            },
            {
              label: "Pressure-test terms",
              detail:
                "Use this workspace to compare cover, timing, and conditions before the deal moves forward.",
            },
          ]}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "14px",
            marginBottom: "18px",
          }}
        >
          {[
            { label: "Financing path", value: dealTypeLabel },
            { label: "Current phase", value: currentStageLabel },
            ...(isExim ? [{
              label: "EXIM cover",
              value: project.eximCoverType ? project.eximCoverType.replace(/_/g, " ") : "Not set",
            }] : []),
            {
              label: isExim ? "Target LOI" : "Target close",
              value: formatTargetDate(targetGateDate),
            },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "16px 18px",
              }}
            >
              <p className="eyebrow" style={{ marginBottom: "8px" }}>{item.label}</p>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "var(--ink)",
                  margin: 0,
                  textTransform: "capitalize",
                }}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <FunderWorkspace
          projectId={project.id}
          slug={project.slug}
          initialFunders={funders}
          requirements={rows.map((r) => ({ requirementId: r.requirementId, name: r.name }))}
          capexUsdCents={project.capexUsdCents}
        />

        <CovenantMonitoringPanel
          projectId={project.id}
          slug={project.slug}
          initialCovenants={covenants}
        />
      </section>

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

        {programConfig.hasBlockerColumn && !loiReady && (
          <GateBlockersPanel
            blockers={loiBlockers.map((id) => ({
              id,
              name: rows.find((r) => r.requirementId === id)?.name ?? id,
            }))}
            gateLabel={programConfig.primaryGateLabel}
          />
        )}

        <ReadinessTrendlineChart projectSlug={project.slug} />

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

        <ResponsibilityMatrix requirements={rows} />
      </section>

      <section id="section-documents" style={{ marginBottom: "40px", scrollMarginTop: "72px" }}>
        <div style={{ marginBottom: "18px" }}>
          <p className="eyebrow" style={{ marginBottom: "8px" }}>Evidence workspace</p>
          <h2
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: "26px",
              fontWeight: 400,
              color: "var(--ink)",
              margin: "0 0 8px",
            }}
          >
            Evidence and document coverage
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
            Evidence replaces the old data-room framing with a clearer question: what proof exists, what is linked, and what is still missing for the next gate.
          </p>
        </div>

        <SectionSubNav
          items={[
            { id: "section-requirements", label: "Requirements" },
          ]}
        />

        <WorkspaceFocusStrip
          items={[
            {
              label: "Link proof to work",
              detail:
                "Evidence should map to requirements directly so the team can see what is actually supported.",
            },
            {
              label: "Expose missing coverage",
              detail:
                "Use the coverage view to identify where documents are absent, weak, or still unlinked.",
            },
            {
              label: "Pull from external sources",
              detail:
                "Manual and provider-backed evidence should live here beside uploaded files, not outside the workspace.",
            },
          ]}
        />

        <EvidenceActionBoard
          projectSlug={project.slug}
          linkedCoveragePct={linkedCoveragePct}
          missingEvidenceCount={evidenceMissingRows.length}
          orphanedEvidenceCount={orphanedEvidenceCount}
          expiringEvidenceCount={expiringDocuments.length}
          criticalCoverageLabel={
            criticalEvidenceRows.length > 0
              ? `${linkedCriticalEvidenceCount}/${criticalEvidenceRows.length} gate-critical requirements have linked proof.`
              : "No gate-critical evidence requirements are defined for this deal yet."
          }
          topGaps={evidenceMissingRows.slice(0, 4).map((row) => ({
            requirementId: row.requirementId,
            name: row.name,
            category: row.category,
            isPrimaryGate: row.isPrimaryGate,
          }))}
        />

        <DocumentCoverageMap
          projectName={project.name}
          requirementRows={rows}
          documents={documents}
          externalEvidence={externalEvidence}
        />
        <DocumentPanel
          projectId={project.id}
          slug={project.slug}
          initialDocuments={documents}
          externalEvidence={externalEvidence}
          requirementRows={rows}
          teamMembers={teamMembers}
          currentUserId={userId}
          actorName={actorName}
          canEdit={canEditProjectContent}
          canApprove={canEditProjectContent}
          commentsByDocumentId={commentsByDocumentId}
          approvalsByDocumentId={approvalsByDocumentId}
          watchedDocumentIds={watchedDocumentIds}
        />

        <ExpiryTimeline documents={expiringDocuments} projectSlug={project.slug} />

        <ApprovalsPanel
          approvals={approvals}
          requirementRows={rows}
          documents={documents}
        />
      </section>

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
              canEdit={canEditProjectContent}
              commentsByMeetingId={commentsByMeetingId}
              watchedMeetingIds={watchedMeetingIds}
            />
          </section>

          <section id="section-activity">
            <ActivityFeed events={activityEvents} teamMemberNamesById={teamMemberNamesById} />
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
        </section>
      </section>
    </div>
    </div>
    <BeaconPanel
      presetQuestions={chatPresets}
      pageContext={`Deal detail page for ${project.name}. Country ${project.countryCode}. Sector ${project.sector}. Stage ${project.stage.replace(/_/g, " ")}. Deal type ${project.dealType.replace(/_/g, " ")}. Readiness ${(scoreBps / 100).toFixed(1)}%.${concept?.thesis ? ` Thesis: ${concept.thesis}.` : ""}${concept?.targetOutcome ? ` Target outcome: ${concept.targetOutcome}.` : ""}${concept?.knownUnknowns ? ` Known unknowns: ${concept.knownUnknowns}.` : ""}${concept?.fatalFlaws ? ` Fatal flaws: ${concept.fatalFlaws}.` : ""}${isExim ? ` EXIM LOI blockers ${loiBlockers.length}.` : ""}`}
      context={{ page: "project_detail", projectId: project.id, projectSlug: project.slug }}
      projectName={project.name}
      dealType={project.dealType}
      readinessPct={scoreBps / 100}
      loiBlockerCount={loiBlockers.length}
      signals={beaconSignals}
      documentCoverage={beaconDocumentCoverage}
    />
    </BeaconProvider>
  );
}
