import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

// Data helpers
import { getCachedProjectBySlug } from "@/lib/db/projects";
import { getProjectRequirements } from "@/lib/db/requirements";
import { getProjectDocuments } from "@/lib/db/documents";
import { getProjectMeetings } from "@/lib/db/meetings";
import { getProjectStakeholders } from "@/lib/db/stakeholders";
import { getProjectMilestones } from "@/lib/db/milestones";
import { getProjectConcept } from "@/lib/db/project-concepts";
import { getProjectExternalEvidence } from "@/lib/db/external-evidence";
import { getProjectCovenants } from "@/lib/db/covenants";
import { getTimelineRisks } from "@/lib/db/timeline-risks";

// Logic
import { assessFinancingReadiness } from "@/lib/scoring/financing";
import { computeReadiness, mapRequirementStatuses } from "@/lib/scoring/index";
import { getCategoryLabel, getStageLabel } from "@/lib/requirements/index";
import { buildGateReview } from "@/lib/projects/gate-review";
import { formatDealTypeLabel, getNextGateLabel, formatTargetDate } from "@/lib/projects/labels";
import { countryLabel } from "@/lib/projects/country-label";

// Components
import { ExecutiveSummary } from "@/components/projects/ExecutiveSummary";
import { TimelineRiskBadge } from "@/components/projects/TimelineRiskBadge";
import { FinancingRiskBadge } from "@/components/projects/FinancingRiskBadge";
import { CovenantHealthBadge } from "@/components/projects/CovenantHealthBadge";
import { StatusReportButton } from "@/components/projects/StatusReportButton";
import { TourGuide } from "@/components/projects/TourGuide";

// Types
import type { FinancingRisk } from "@/lib/scoring/financing";
import type { CategoryBreakdown } from "@/lib/db/requirements";

export default async function ProjectSummaryPage({
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
    throw new Error(`Project load failed: ${projectResult.error.message}`);
  }
  const project = projectResult.value;

  const reqResult = await getProjectRequirements(project.id, project.dealType, project.sector);
  if (!reqResult.ok) throw new Error(`Failed to load requirements: ${reqResult.error.message}`);
  const rows = reqResult.value;

  const [
    documentsResult,
    externalEvidenceResult,
    meetingsResult,
    stakeholdersResult,
    conceptResult,
    milestonesResult,
    timelineRisksResult,
    financingRiskResult,
    covenantsResult,
  ] = await Promise.all([
    getProjectDocuments(project.id),
    getProjectExternalEvidence(project.id),
    getProjectMeetings(project.id),
    getProjectStakeholders(project.id),
    getProjectConcept(project.id),
    getProjectMilestones(project.id),
    getTimelineRisks(project.id),
    assessFinancingReadiness(project.id),
    getProjectCovenants(project.id),
  ]);

  const documents = documentsResult.ok ? documentsResult.value.items : [];
  const externalEvidence = externalEvidenceResult.ok ? externalEvidenceResult.value : [];
  const meetings = meetingsResult.ok ? meetingsResult.value : [];
  const stakeholders = stakeholdersResult.ok ? stakeholdersResult.value : [];
  const concept = conceptResult.ok ? conceptResult.value : null;
  const milestones = milestonesResult.ok ? milestonesResult.value : [];
  const timelineRisks = timelineRisksResult.ok ? timelineRisksResult.value : [];
  const DEFAULT_FINANCING_RISK: FinancingRisk = { level: "none", penaltyBps: 0, flags: [] };
  const financingRisk = financingRiskResult.ok ? financingRiskResult.value : DEFAULT_FINANCING_RISK;
  const covenants = covenantsResult.ok ? covenantsResult.value : [];

  // ── Readiness + gate ────────────────────────────────────────────────────────
  const { scoreBps, loiReady, loiBlockers } = computeReadiness(
    mapRequirementStatuses(rows),
    project.dealType
  );
  const isExim = project.dealType === "exim_project_finance";
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
  const gateReview = buildGateReview({ project, requirements: rows, scoreBps, concept });

  // ── Category breakdown ──────────────────────────────────────────────────────
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

  // ── Evidence coverage ───────────────────────────────────────────────────────
  const applicableRequirementCount = rows.filter((r) => r.isApplicable !== false).length;
  const linkedRequirementCount = rows.filter((r) => {
    if (r.isApplicable === false) return false;
    return (
      documents.some((d) => d.projectRequirementId === r.projectRequirementId) ||
      externalEvidence.some((e) => e.projectRequirementId === r.projectRequirementId)
    );
  }).length;
  const linkedCoveragePct =
    applicableRequirementCount > 0
      ? Math.round((linkedRequirementCount / applicableRequirementCount) * 100)
      : 0;

  const evidenceMissingRows = rows.filter((r) => {
    if (r.isApplicable === false) return false;
    return (
      !documents.some((d) => d.projectRequirementId === r.projectRequirementId) &&
      !externalEvidence.some((e) => e.projectRequirementId === r.projectRequirementId)
    );
  });
  const orphanedEvidenceCount =
    documents.filter((d) => !d.projectRequirementId).length +
    externalEvidence.filter((e) => !e.projectRequirementId).length;

  const now = new Date();
  const ninetyDaysOut = new Date(now.getTime() + 90 * 86_400_000);
  const expiringDocuments = documents.filter(
    (d) => d.expiresAt !== null && d.expiresAt > now && d.expiresAt <= ninetyDaysOut
  );

  // ── Covenants + milestones ──────────────────────────────────────────────────
  const fourteenDaysFromNow = new Date(now.getTime() + 14 * 86_400_000);
  const covenantHealth = {
    active: covenants.filter(
      (c) => c.status === "active" && (!c.nextDueAt || new Date(c.nextDueAt) > fourteenDaysFromNow)
    ).length,
    breached: covenants.filter((c) => c.status === "breached").length,
    atRisk: covenants.filter(
      (c) => c.status === "active" && c.nextDueAt && new Date(c.nextDueAt) <= fourteenDaysFromNow
    ).length,
    satisfied: covenants.filter((c) => c.status === "satisfied").length,
    waived: covenants.filter((c) => c.status === "waived").length,
  };
  const milestonesDone = milestones.filter((m) => m.completedAt !== null).length;
  const milestonesTotal = milestones.length;

  // ── Next-action CTAs ────────────────────────────────────────────────────────
  const blockerCount = loiBlockers.length;
  const missingEvidenceCount = evidenceMissingRows.length;
  const ctas: Array<{ href: string; label: string; tone?: "critical" | "warning" | "info" }> = [];
  if (blockerCount > 0) {
    ctas.push({
      href: `/projects/${project.slug}/workplan`,
      label: `Fix ${blockerCount} ${isExim ? "LOI" : "gate"} blocker${blockerCount === 1 ? "" : "s"} in Workplan`,
      tone: "critical",
    });
  }
  if (missingEvidenceCount > 0) {
    ctas.push({
      href: `/projects/${project.slug}/evidence`,
      label: `Link proof to ${missingEvidenceCount} requirement${missingEvidenceCount === 1 ? "" : "s"} in Evidence`,
      tone: "warning",
    });
  }
  if (expiringDocuments.length > 0) {
    ctas.push({
      href: `/projects/${project.slug}/evidence`,
      label: `${expiringDocuments.length} document${expiringDocuments.length === 1 ? "" : "s"} expiring within 90 days`,
      tone: "warning",
    });
  }
  if (meetings.length === 0) {
    ctas.push({
      href: `/projects/${project.slug}/execution`,
      label: "Log your first meeting in Execution",
      tone: "info",
    });
  }
  if (stakeholders.length === 0) {
    ctas.push({
      href: `/projects/${project.slug}/parties`,
      label: "Add the first stakeholder in Parties",
      tone: "info",
    });
  }
  if (!concept?.thesis) {
    ctas.push({
      href: `/projects/${project.slug}/concept`,
      label: "Write the deal thesis in Concept",
      tone: "info",
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  const readinessPct = scoreBps / 100;
  const readinessTone =
    readinessPct >= 75 ? "var(--teal)" : readinessPct >= 50 ? "var(--gold)" : "var(--accent)";
  const coverageTone =
    linkedCoveragePct >= 75
      ? "var(--teal)"
      : linkedCoveragePct >= 40
        ? "var(--gold)"
        : "var(--accent)";
  const blockerTone = blockerCount === 0 ? "var(--teal)" : "var(--accent)";

  return (
    <>
      <header style={{ marginBottom: "28px" }}>
        <p className="eyebrow" style={{ marginBottom: "10px" }}>
          {dealTypeLabel} · {countryLabel(project.countryCode)} · {project.sector}
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
            marginBottom: "10px",
          }}
        >
          <h1
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: "36px",
              fontWeight: 400,
              color: "var(--ink)",
              margin: 0,
              lineHeight: 1.1,
              letterSpacing: "-0.01em",
            }}
          >
            {project.name}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            <StatusReportButton projectSlug={project.slug} />
            <TourGuide dealType={project.dealType} stage={project.stage} inline />
          </div>
        </div>
        {project.description && (
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "14px",
              color: "var(--ink-mid)",
              lineHeight: 1.7,
              maxWidth: "720px",
              margin: 0,
            }}
          >
            {project.description}
          </p>
        )}
      </header>

      {/* Risk badges */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          alignItems: "center",
          marginBottom: "22px",
        }}
      >
        <TimelineRiskBadge risks={timelineRisks} />
        <FinancingRiskBadge risk={financingRisk} projectSlug={project.slug} />
        <CovenantHealthBadge {...covenantHealth} />
        {milestonesTotal > 0 && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 10px",
              borderRadius: "999px",
              border: "1px solid var(--border)",
              backgroundColor: "var(--bg-card)",
              color: "var(--ink-mid)",
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              fontWeight: 500,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
            }}
          >
            Milestones: {milestonesDone}/{milestonesTotal}
          </span>
        )}
      </div>

      {/* KPI tiles */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          marginBottom: "28px",
        }}
      >
        <KpiTile
          label="Readiness"
          value={`${readinessPct.toFixed(1)}%`}
          tone={readinessTone}
          sub={`${currentStageLabel} · next: ${nextGateLabel}`}
        />
        <KpiTile
          label={isExim ? "Target LOI" : "Target close"}
          value={formatTargetDate(targetGateDate)}
          sub={targetGateDaysRemaining !== null ? `${targetGateDaysRemaining}d remaining` : undefined}
        />
        <KpiTile
          label={isExim ? "Open LOI blockers" : "Open gate blockers"}
          value={String(blockerCount)}
          tone={blockerTone}
          sub={blockerCount === 0 ? "All clear" : undefined}
        />
        <KpiTile
          label="Evidence coverage"
          value={`${linkedCoveragePct}%`}
          tone={coverageTone}
          sub={
            orphanedEvidenceCount > 0
              ? `${orphanedEvidenceCount} orphaned`
              : `${linkedRequirementCount}/${applicableRequirementCount} linked`
          }
        />
      </section>

      {/* Executive summary */}
      <section style={{ marginBottom: "28px" }}>
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

      {/* Next actions */}
      {ctas.length > 0 && (
        <section style={{ marginBottom: "28px" }}>
          <p className="eyebrow" style={{ marginBottom: "12px" }}>Next actions</p>
          <div style={{ display: "grid", gap: "8px" }}>
            {ctas.map((cta) => (
              <NextActionCta key={`${cta.href}-${cta.label}`} {...cta} />
            ))}
          </div>
        </section>
      )}

    </>
  );
}

// ── Local components ──────────────────────────────────────────────────────────

function KpiTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: string;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: "14px 16px",
        backgroundColor: "var(--bg-card)",
      }}
    >
      <p
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "9px",
          fontWeight: 500,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--ink-muted)",
          margin: "0 0 8px",
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: "'DM Serif Display', Georgia, serif",
          fontSize: "26px",
          fontWeight: 400,
          color: tone ?? "var(--ink)",
          margin: 0,
          lineHeight: 1.1,
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </p>
      {sub && (
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "9px",
            letterSpacing: "0.08em",
            color: "var(--ink-muted)",
            margin: "8px 0 0",
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

function NextActionCta({
  href,
  label,
  tone,
}: {
  href: string;
  label: string;
  tone?: "critical" | "warning" | "info";
}) {
  const borderColor =
    tone === "critical"
      ? "color-mix(in srgb, var(--accent) 40%, var(--border))"
      : tone === "warning"
        ? "color-mix(in srgb, var(--gold) 40%, var(--border))"
        : "var(--border)";
  const dotColor =
    tone === "critical" ? "var(--accent)" : tone === "warning" ? "var(--gold)" : "var(--teal)";
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        padding: "12px 16px",
        border: `1px solid ${borderColor}`,
        borderRadius: "8px",
        textDecoration: "none",
        backgroundColor: "var(--bg-card)",
        transition: "border-color 150ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
        <span
          aria-hidden="true"
          style={{
            display: "inline-block",
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: dotColor,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "13px",
            color: "var(--ink)",
            minWidth: 0,
          }}
        >
          {label}
        </span>
      </span>
      <span
        aria-hidden="true"
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "11px",
          color: "var(--teal)",
          letterSpacing: "0.08em",
          flexShrink: 0,
        }}
      >
        →
      </span>
    </Link>
  );
}
