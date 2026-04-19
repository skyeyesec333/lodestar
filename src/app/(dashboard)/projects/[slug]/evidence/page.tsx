import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { getCachedProjectBySlug } from "@/lib/db/projects";
import { getProjectDocuments } from "@/lib/db/documents";
import { getProjectExternalEvidence } from "@/lib/db/external-evidence";
import { getProjectDocumentRequests } from "@/lib/db/document-requests";
import { getProjectRequirements } from "@/lib/db/requirements";
import { getProjectStakeholders } from "@/lib/db/stakeholders";
import { getProjectMembers } from "@/lib/db/members";
import { getApprovalsByProject } from "@/lib/db/approvals";
import { getCommentsByProject } from "@/lib/db/comments";
import { getUserWatchList } from "@/lib/db/watchers";
import { resolveClerkUsers } from "@/lib/clerk/resolve-users";
import { buildTeamMembers } from "@/lib/projects/team";
import { DocumentPanel } from "@/components/documents/DocumentPanel";
import { DocumentRequestPanel } from "@/components/documents/DocumentRequestPanel";
import { DocumentCoverageMap } from "@/components/projects/DocumentCoverageMap";
import { ExpiryTimeline } from "@/components/documents/ExpiryTimeline";
import { EvidenceActionBoard } from "@/components/projects/EvidenceActionBoard";
import { ApprovalsPanel } from "@/components/projects/ApprovalsPanel";
import { WorkspaceFocusStrip } from "@/components/projects/WorkspaceFocusStrip";

export default async function ProjectEvidencePage({
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
    documentsResult,
    externalEvidenceResult,
    docRequestsResult,
    reqResult,
    stakeholdersResult,
    membersResult,
    approvalsResult,
    commentsResult,
    watchListResult,
  ] = await Promise.all([
    getProjectDocuments(project.id),
    getProjectExternalEvidence(project.id),
    getProjectDocumentRequests(project.id),
    getProjectRequirements(project.id, project.dealType, project.sector),
    getProjectStakeholders(project.id),
    getProjectMembers(project.id),
    getApprovalsByProject(project.id),
    getCommentsByProject(project.id),
    getUserWatchList(userId, project.id),
  ]);
  if (!reqResult.ok) throw new Error(reqResult.error.message);

  const documents = documentsResult.ok ? documentsResult.value.items : [];
  const externalEvidence = externalEvidenceResult.ok ? externalEvidenceResult.value : [];
  const documentRequests = docRequestsResult.ok ? docRequestsResult.value : [];
  const rows = reqResult.value;
  const stakeholders = stakeholdersResult.ok ? stakeholdersResult.value : [];
  const members = membersResult.ok ? membersResult.value : [];
  const approvals = approvalsResult.ok ? approvalsResult.value : [];
  const comments = commentsResult.ok ? commentsResult.value : [];
  const watchList = watchListResult.ok ? watchListResult.value : [];

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
  const actorName = teamMembers.find((member) => member.clerkUserId === userId)?.name;

  const commentsByDocumentId: Record<string, typeof comments> = {};
  for (const comment of comments) {
    if (comment.documentId) {
      commentsByDocumentId[comment.documentId] ??= [];
      commentsByDocumentId[comment.documentId].push(comment);
    }
  }

  const approvalsByDocumentId = Object.fromEntries(
    approvals
      .filter((approval) => approval.documentId)
      .map((approval) => [approval.documentId!, approval])
  );

  const watchedDocumentIds = new Set(
    watchList
      .filter((watch) => watch.targetType === "document" && watch.targetId)
      .map((watch) => watch.targetId!)
  );

  const now = new Date();
  const ninetyDaysOut = new Date(now.getTime() + 90 * 86_400_000);
  const expiringDocuments = documents.filter(
    (d) => d.expiresAt !== null && d.expiresAt > now && d.expiresAt <= ninetyDaysOut
  );

  const evidenceMissingRows = rows
    .filter((row) => {
      if (row.isApplicable === false) return false;
      return (
        !documents.some((d) => d.projectRequirementId === row.projectRequirementId) &&
        !externalEvidence.some((e) => e.projectRequirementId === row.projectRequirementId)
      );
    })
    .sort((a, b) => {
      if (a.isPrimaryGate !== b.isPrimaryGate) return a.isPrimaryGate ? -1 : 1;
      return a.sortOrder - b.sortOrder;
    });

  const orphanedEvidenceCount =
    documents.filter((d) => !d.projectRequirementId).length +
    externalEvidence.filter((e) => !e.projectRequirementId).length;

  const applicableRequirementCount = rows.filter((row) => row.isApplicable !== false).length;
  const linkedRequirementCount = rows.filter((row) => {
    if (row.isApplicable === false) return false;
    return (
      documents.some((d) => d.projectRequirementId === row.projectRequirementId) ||
      externalEvidence.some((e) => e.projectRequirementId === row.projectRequirementId)
    );
  }).length;
  const linkedCoveragePct =
    applicableRequirementCount > 0
      ? Math.round((linkedRequirementCount / applicableRequirementCount) * 100)
      : 0;

  const criticalEvidenceRows = rows.filter((row) => row.isApplicable !== false && row.isPrimaryGate);
  const linkedCriticalEvidenceCount = criticalEvidenceRows.filter((row) =>
    documents.some((d) => d.projectRequirementId === row.projectRequirementId) ||
    externalEvidence.some((e) => e.projectRequirementId === row.projectRequirementId)
  ).length;

  return (
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

      <DocumentRequestPanel
        projectId={project.id}
        slug={project.slug}
        initialRequests={documentRequests}
        stakeholders={stakeholders.map((s) => ({ id: s.id, name: s.name }))}
        requirementOptions={rows.map((r) => ({
          projectRequirementId: r.projectRequirementId,
          name: r.name,
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
  );
}
