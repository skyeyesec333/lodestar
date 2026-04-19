import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { getCachedProjectBySlug } from "@/lib/db/projects";
import { getProjectRequirements } from "@/lib/db/requirements";
import { getProjectDocuments } from "@/lib/db/documents";
import { getProjectMeetings } from "@/lib/db/meetings";
import { getProjectStakeholders } from "@/lib/db/stakeholders";
import { getProjectConcept } from "@/lib/db/project-concepts";
import { computeReadiness, mapRequirementStatuses } from "@/lib/scoring/index";
import { getCategoryLabel, getStageLabel } from "@/lib/requirements/index";
import { buildGateReview } from "@/lib/projects/gate-review";
import { buildProjectOperatingMetrics } from "@/lib/projects/operating-metrics";
import { checkStageGate } from "@/lib/projects/stage-gate";
import { formatDealTypeLabel, getNextGateLabel, formatTargetDate } from "@/lib/projects/labels";
import { countryLabel } from "@/lib/projects/country-label";
import { StageStepper } from "@/components/projects/StageStepper";
import { DecisionDesk } from "@/components/projects/DecisionDesk";
import { SetupChecklist } from "@/components/projects/SetupChecklist";
import type { CategoryBreakdown } from "@/lib/db/requirements";

export default async function ProjectOverviewPage({
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

  const reqResult = await getProjectRequirements(project.id, project.dealType, project.sector);
  if (!reqResult.ok) throw new Error(reqResult.error.message);
  const rows = reqResult.value;

  const [documentsResult, meetingsResult, stakeholdersResult, conceptResult] = await Promise.all([
    getProjectDocuments(project.id),
    getProjectMeetings(project.id),
    getProjectStakeholders(project.id),
    getProjectConcept(project.id),
  ]);

  const documents = documentsResult.ok ? documentsResult.value.items : [];
  const meetings = meetingsResult.ok ? meetingsResult.value : [];
  const stakeholders = stakeholdersResult.ok ? stakeholdersResult.value : [];
  const concept = conceptResult.ok ? conceptResult.value : null;

  const dealTypeLabel = formatDealTypeLabel(project.dealType);
  const isExim = project.dealType === "exim_project_finance";
  const currentStageLabel = getStageLabel(project.stage, project.dealType);
  const nextGateLabel = getNextGateLabel(project.stage, project.dealType);
  const targetGateDate = isExim
    ? (project.targetLoiDate ?? project.targetCloseDate)
    : (project.targetCloseDate ?? project.targetLoiDate);

  const { scoreBps } = computeReadiness(mapRequirementStatuses(rows), project.dealType);
  const readinessPct = scoreBps / 100;

  const operatingMetrics = buildProjectOperatingMetrics({
    stage: project.stage,
    dealType: project.dealType,
    targetLoiDate: project.targetLoiDate,
    targetCloseDate: project.targetCloseDate,
    requirements: rows,
    documents,
  });
  const gateResult = checkStageGate(operatingMetrics.nextStageId, rows);
  const gateReview = buildGateReview({ project, requirements: rows, scoreBps, concept });
  const gateReviewTone =
    gateReview.status === "ready"
      ? "var(--teal)"
      : gateReview.status === "at_risk"
        ? "var(--gold)"
        : "var(--accent)";

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

  return (
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
          {project.description ??
            "This overview keeps the current stage, next gate, and operating pressure in one place so the team can orient quickly before moving into the deeper workspaces."}
        </p>
      </div>

      <StageStepper
        current={project.stage}
        dealType={project.dealType}
        actualDates={{
          loiSubmitted: project.actualLoiSubmittedDate,
          loiApproved: project.actualLoiApprovedDate,
          commitment: project.actualCommitmentDate,
          close: project.actualCloseDate,
        }}
      />

      <div
        style={{
          display: "flex",
          gap: "24px 28px",
          marginBottom: "24px",
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
            value: `${readinessPct.toFixed(1)}%`,
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

      {scoreBps === 0 && (
        <div style={{ marginBottom: "24px" }}>
          <SetupChecklist
            dealTypeLabel={dealTypeLabel}
            dealType={project.dealType}
            items={[
              {
                label: "Add a stakeholder",
                complete: stakeholders.length > 0,
                href: `/projects/${project.slug}/parties`,
                hintKey: "stakeholder",
              },
              {
                label: isExim ? "Set a target LOI date" : "Set a target gate date",
                complete: isExim
                  ? project.targetLoiDate != null
                  : project.targetCloseDate != null || project.targetLoiDate != null,
                href: `/projects/${project.slug}/overview`,
                hintKey: "date",
              },
              {
                label: "Upload a document",
                complete: documents.length > 0,
                href: `/projects/${project.slug}/evidence`,
                hintKey: "document",
              },
              {
                label: "Write a deal thesis",
                complete: concept?.thesis != null && concept.thesis.trim().length > 0,
                href: `/projects/${project.slug}/concept`,
                hintKey: "thesis",
              },
              {
                label: isExim ? "Log a meeting or EXIM call" : "Log a meeting",
                complete: meetings.length > 0,
                href: `/projects/${project.slug}/execution`,
                hintKey: "meeting",
              },
            ]}
          />
        </div>
      )}

      <DecisionDesk
        projectSlug={project.slug}
        projectName={project.name}
        dealTypeLabel={dealTypeLabel}
        currentStageLabel={currentStageLabel}
        nextGateLabel={nextGateLabel}
        readinessPct={readinessPct}
        gateReviewSummary={gateReview.summary}
        gateReviewStatus={gateReview.status}
        gateReviewTone={gateReviewTone}
        targetGateLabel={isExim ? "Target LOI" : "Target close"}
        daysToNextGate={operatingMetrics.daysToNextGate}
        categoryBreakdown={categoryBreakdown}
        metrics={operatingMetrics}
        gateResult={gateResult}
      />
    </section>
  );
}
