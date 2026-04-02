import { getProgramConfig } from "@/lib/requirements";
import { buildProjectOperatingMetrics, getDaysUntilDate } from "@/lib/projects/operating-metrics";
import type { PortfolioProjectRow } from "@/lib/db/portfolio";

export type PortfolioTriageLaneId =
  | "needs_sponsor_attention"
  | "gate_at_risk"
  | "ownerless_blockers"
  | "stalled_momentum"
  | "healthy";

export type PortfolioTriageProject = PortfolioProjectRow & {
  metrics: ReturnType<typeof buildProjectOperatingMetrics>;
  laneId: PortfolioTriageLaneId;
  laneLabel: string;
  laneReason: string;
  laneTone: string;
  laneBadgeVariant: "default" | "secondary" | "outline" | "destructive";
  daysInactive: number | null;
  primaryGateLabel: string;
};

export type PortfolioTriageLane = {
  id: PortfolioTriageLaneId;
  label: string;
  description: string;
  tone: string;
  badgeVariant: "default" | "secondary" | "outline" | "destructive";
  projects: PortfolioTriageProject[];
};

export type PortfolioTriageSummary = {
  totalProjects: number;
  needsSponsorAttention: number;
  gateAtRisk: number;
  ownerlessBlockers: number;
  stalledMomentum: number;
  healthy: number;
};

export type PortfolioTriageBoardModel = {
  summary: PortfolioTriageSummary;
  lanes: PortfolioTriageLane[];
};

const LANE_META: Record<
  PortfolioTriageLaneId,
  Omit<PortfolioTriageLane, "id" | "projects">
> = {
  needs_sponsor_attention: {
    label: "Needs sponsor attention",
    description: "Near-term decision points that need an executive nudge or exception.",
    tone: "var(--accent)",
    badgeVariant: "default",
  },
  gate_at_risk: {
    label: "Gate at risk",
    description: "Projects with a near gate date and open blockers or evidence gaps.",
    tone: "var(--gold)",
    badgeVariant: "secondary",
  },
  ownerless_blockers: {
    label: "Ownerless blockers",
    description: "Gate-critical items that still do not have an accountable owner.",
    tone: "var(--accent)",
    badgeVariant: "destructive",
  },
  stalled_momentum: {
    label: "Stalled momentum",
    description: "Deals that have gone quiet and need the PM to re-engage.",
    tone: "var(--ink-muted)",
    badgeVariant: "outline",
  },
  healthy: {
    label: "Healthy",
    description: "Projects that are current and not carrying immediate gate risk.",
    tone: "var(--teal)",
    badgeVariant: "outline",
  },
};

function getDaysSince(date: Date | null, referenceDate: Date): number | null {
  if (!date) return null;
  const delta = getDaysUntilDate(date, referenceDate);
  return delta == null ? null : Math.max(0, -delta);
}

function classifyProject(
  project: PortfolioProjectRow,
  referenceDate: Date
): PortfolioTriageProject {
  const metrics = buildProjectOperatingMetrics({
    stage: project.stage,
    dealType: project.dealType,
    targetLoiDate: project.targetLoiDate,
    targetCloseDate: project.targetCloseDate,
    requirements: project.requirements,
    documents: project.documents,
    referenceDate,
  });

  const readinessScore = project.readinessScore;
  const daysToNextGate = metrics.daysToNextGate;
  const daysInactive = getDaysSince(project.lastActivityAt, referenceDate);
  const primaryGateLabel = getProgramConfig(project.dealType).primaryGateLabel;

  const hasUrgentGateWindow = daysToNextGate !== null && daysToNextGate <= 14;
  const hasNearTermGateWindow = daysToNextGate !== null && daysToNextGate <= 30;
  const nearReady = readinessScore >= 70;
  const atRiskReadiness = readinessScore < 60;

  let laneId: PortfolioTriageLaneId = "healthy";
  let laneReason = "The project is moving and does not need intervention right now.";

  if (metrics.unassignedCriticalCount > 0) {
    laneId = "ownerless_blockers";
    laneReason =
      metrics.unassignedCriticalCount === 1
        ? "One gate-critical item still needs an owner."
        : `${metrics.unassignedCriticalCount} gate-critical items still need owners.`;
  } else if (hasUrgentGateWindow && nearReady && (metrics.hardBlockerCount > 0 || metrics.missingEvidenceCount > 0)) {
    laneId = "needs_sponsor_attention";
    laneReason =
      metrics.hardBlockerCount > 0
        ? `Gate is due in ${daysToNextGate}d and still has hard blockers that need sponsor action.`
        : `Gate is due in ${daysToNextGate}d and the evidence package needs sponsor attention.`;
  } else if (
    hasNearTermGateWindow &&
    (metrics.hardBlockerCount > 0 || metrics.missingEvidenceCount > 0 || atRiskReadiness)
  ) {
    laneId = "gate_at_risk";
    laneReason =
      metrics.hardBlockerCount > 0
        ? `The next gate is in ${daysToNextGate}d and there are open blockers.`
        : `The next gate is in ${daysToNextGate}d and proof coverage or readiness is still thin.`;
  } else if (daysInactive !== null && daysInactive >= 21 && project.stage !== "financial_close") {
    laneId = "stalled_momentum";
    laneReason = `No activity for ${daysInactive}d while the deal is still active.`;
  }

  const laneMeta = LANE_META[laneId];

  return {
    ...project,
    metrics,
    laneId,
    laneLabel: laneMeta.label,
    laneReason,
    laneTone: laneMeta.tone,
    laneBadgeVariant: laneMeta.badgeVariant,
    daysInactive,
    primaryGateLabel,
  };
}

function sortProjects(a: PortfolioTriageProject, b: PortfolioTriageProject): number {
  const aGate = a.metrics.daysToNextGate ?? Number.POSITIVE_INFINITY;
  const bGate = b.metrics.daysToNextGate ?? Number.POSITIVE_INFINITY;
  if (aGate !== bGate) return aGate - bGate;

  if (a.metrics.hardBlockerCount !== b.metrics.hardBlockerCount) {
    return b.metrics.hardBlockerCount - a.metrics.hardBlockerCount;
  }

  if (a.readinessScore !== b.readinessScore) {
    return a.readinessScore - b.readinessScore;
  }

  return a.name.localeCompare(b.name);
}

export function buildPortfolioTriageBoard(
  projects: PortfolioProjectRow[],
  referenceDate: Date = new Date()
): PortfolioTriageBoardModel {
  const classified = projects.map((project) => classifyProject(project, referenceDate));
  const sorted = [...classified].sort(sortProjects);

  const laneIds: PortfolioTriageLaneId[] = [
    "needs_sponsor_attention",
    "gate_at_risk",
    "ownerless_blockers",
    "stalled_momentum",
    "healthy",
  ];

  const lanes: PortfolioTriageLane[] = laneIds.map((laneId) => {
    const laneProjects = sorted.filter((project) => project.laneId === laneId);
    const meta = LANE_META[laneId];
    return {
      id: laneId,
      label: meta.label,
      description: meta.description,
      tone: meta.tone,
      badgeVariant: meta.badgeVariant,
      projects: laneProjects,
    };
  });

  return {
    summary: {
      totalProjects: projects.length,
      needsSponsorAttention: lanes[0]?.projects.length ?? 0,
      gateAtRisk: lanes[1]?.projects.length ?? 0,
      ownerlessBlockers: lanes[2]?.projects.length ?? 0,
      stalledMomentum: lanes[3]?.projects.length ?? 0,
      healthy: lanes[4]?.projects.length ?? 0,
    },
    lanes,
  };
}
