import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { getCachedProjectBySlug } from "@/lib/db/projects";
import { getProjectStakeholders } from "@/lib/db/stakeholders";
import { getProjectDealParties } from "@/lib/db/deal-parties";
import { getProjectFunders } from "@/lib/db/funders";
import { getProjectRequirements } from "@/lib/db/requirements";
import { getProjectEpcBids } from "@/lib/db/epc-bids";
import { StakeholderPanel } from "@/components/stakeholders/StakeholderPanel";
import { WorkspaceFocusStrip } from "@/components/projects/WorkspaceFocusStrip";
import { SectionSkeleton } from "@/components/ui/SectionSkeleton";

const EpcBidsPanel = dynamic(
  () => import("@/components/projects/EpcBidsPanel").then((m) => ({ default: m.EpcBidsPanel })),
  { loading: () => <SectionSkeleton /> }
);

export default async function ProjectPartiesPage({
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
  const isExim = project.dealType === "exim_project_finance";

  const [stakeholdersResult, dealPartiesResult, fundersResult, reqResult, epcBidsResult] =
    await Promise.all([
      getProjectStakeholders(project.id),
      getProjectDealParties(project.id),
      getProjectFunders(project.id),
      getProjectRequirements(project.id, project.dealType, project.sector),
      isExim ? getProjectEpcBids(project.id) : Promise.resolve({ ok: true as const, value: [] }),
    ]);
  if (!reqResult.ok) throw new Error(reqResult.error.message);

  const stakeholders = stakeholdersResult.ok ? stakeholdersResult.value : [];
  const dealParties = dealPartiesResult.ok ? dealPartiesResult.value : [];
  const funders = fundersResult.ok ? fundersResult.value : [];
  const rows = reqResult.value;
  const epcBids = epcBidsResult.ok ? epcBidsResult.value : [];

  return (
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
        projectName={project.name}
        readinessBps={project.cachedReadinessScore}
        funderRelationships={funders}
        requirements={rows}
        graphLayout={project.graphLayout}
      />

      {isExim && (
        <Suspense fallback={<SectionSkeleton />}>
          <EpcBidsPanel
            projectId={project.id}
            slug={project.slug}
            initialBids={epcBids}
          />
        </Suspense>
      )}
    </section>
  );
}
