import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { getCachedProjectBySlug } from "@/lib/db/projects";
import { getProjectFunders } from "@/lib/db/funders";
import { getProjectRequirements } from "@/lib/db/requirements";
import { getProjectStakeholders } from "@/lib/db/stakeholders";
import { getProjectDebtTranches } from "@/lib/db/debt-tranches";
import { getProjectCovenants } from "@/lib/db/covenants";
import { getStageLabel } from "@/lib/requirements/index";
import { formatDealTypeLabel, formatTargetDate } from "@/lib/projects/labels";
import { WorkspaceFocusStrip } from "@/components/projects/WorkspaceFocusStrip";
import { SectionSkeleton } from "@/components/ui/SectionSkeleton";

const FunderWorkspace = dynamic(
  () => import("@/components/projects/FunderWorkspace").then((m) => ({ default: m.FunderWorkspace })),
  { loading: () => <SectionSkeleton /> }
);
const CovenantMonitoringPanel = dynamic(
  () => import("@/components/projects/CovenantMonitoringPanel").then((m) => ({ default: m.CovenantMonitoringPanel })),
  { loading: () => <SectionSkeleton /> }
);

export default async function ProjectCapitalPage({
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

  const [fundersResult, reqResult, stakeholdersResult, debtTranchesResult, covenantsResult] =
    await Promise.all([
      getProjectFunders(project.id),
      getProjectRequirements(project.id, project.dealType, project.sector),
      getProjectStakeholders(project.id),
      getProjectDebtTranches(project.id),
      getProjectCovenants(project.id),
    ]);
  if (!reqResult.ok) throw new Error(reqResult.error.message);

  const funders = fundersResult.ok ? fundersResult.value : [];
  const rows = reqResult.value;
  const stakeholders = stakeholdersResult.ok ? stakeholdersResult.value : [];
  const debtTranches = debtTranchesResult.ok ? debtTranchesResult.value : [];
  const covenants = covenantsResult.ok ? covenantsResult.value : [];

  const isExim = project.dealType === "exim_project_finance";
  const dealTypeLabel = formatDealTypeLabel(project.dealType);
  const currentStageLabel = getStageLabel(project.stage, project.dealType);
  const targetGateDate = isExim
    ? (project.targetLoiDate ?? project.targetCloseDate)
    : (project.targetCloseDate ?? project.targetLoiDate);

  return (
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

      <Suspense fallback={<SectionSkeleton />}>
        <FunderWorkspace
          projectId={project.id}
          slug={project.slug}
          initialFunders={funders}
          requirements={rows.map((r) => ({ requirementId: r.requirementId, name: r.name }))}
          stakeholders={stakeholders.map((s) => ({ id: s.id, name: s.name }))}
          capexUsdCents={project.capexUsdCents}
          debtTranches={debtTranches}
        />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <CovenantMonitoringPanel
          projectId={project.id}
          slug={project.slug}
          initialCovenants={covenants}
        />
      </Suspense>
    </section>
  );
}
