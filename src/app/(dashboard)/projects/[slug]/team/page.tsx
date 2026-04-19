import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCachedProjectBySlug } from "@/lib/db/projects";
import { getProjectMembers } from "@/lib/db/members";
import { getShareLinksForProject } from "@/lib/db/share-links";
import { getProjectConcept } from "@/lib/db/project-concepts";
import { getProjectRequirements } from "@/lib/db/requirements";
import { resolveClerkUsers } from "@/lib/clerk/resolve-users";
import { computeReadiness, mapRequirementStatuses } from "@/lib/scoring/index";
import { buildGateReview } from "@/lib/projects/gate-review";
import { ProjectEditForm } from "@/components/projects/ProjectEditForm";
import { CollaboratorsPanel } from "@/components/projects/CollaboratorsPanel";
import { ShareLinksPanel } from "@/components/projects/ShareLinksPanel";
import type { SerializableProject } from "@/types";

export default async function ProjectTeamPage({
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

  const [membersResult, shareLinksResult, conceptResult, reqResult] = await Promise.all([
    getProjectMembers(project.id),
    getShareLinksForProject(project.id),
    getProjectConcept(project.id),
    getProjectRequirements(project.id, project.dealType, project.sector),
  ]);
  if (!reqResult.ok) throw new Error(reqResult.error.message);

  const members = membersResult.ok ? membersResult.value : [];
  const shareLinks = shareLinksResult.ok ? shareLinksResult.value : [];
  const concept = conceptResult.ok ? conceptResult.value : null;
  const rows = reqResult.value;

  const memberClerkIds = [
    project.ownerClerkId,
    ...members.map((m) => m.clerkUserId).filter((id) => id !== project.ownerClerkId),
  ];
  const allClerkIds = [...new Set(memberClerkIds)];
  const resolvedUsers = await resolveClerkUsers(allClerkIds);

  const currentProjectRole =
    project.ownerClerkId === userId
      ? "owner"
      : members.find((m) => m.clerkUserId === userId)?.role === "editor"
        ? "editor"
        : "viewer";
  const canEditProject = currentProjectRole === "owner";

  const { scoreBps } = computeReadiness(mapRequirementStatuses(rows), project.dealType);
  const gateReview = buildGateReview({
    project,
    requirements: rows,
    scoreBps,
    concept,
  });

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

  return (
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
  );
}
