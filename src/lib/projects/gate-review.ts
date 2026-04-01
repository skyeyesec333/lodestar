import type { ProjectPhase } from "@prisma/client";
import type { Project } from "@/types";
import type { ProjectRequirementRow } from "@/lib/db/requirements";
import type { ProjectConceptRow } from "@/lib/db/project-concepts";

type GateCriterionStatus = "ready" | "blocked";

export type GateCriterion = {
  id: string;
  label: string;
  detail: string;
  status: GateCriterionStatus;
};

export type GateReview = {
  gatePhase: "loi" | "final_commitment";
  nextStage: ProjectPhase | null;
  nextStageLabel: string | null;
  status: "ready" | "at_risk" | "blocked";
  summary: string;
  focusText: string;
  openGateItems: number;
  criteria: GateCriterion[];
  missingCriteria: GateCriterion[];
  canAdvance: boolean;
};

const PHASE_ORDER: ProjectPhase[] = [
  "concept",
  "pre_loi",
  "loi_submitted",
  "loi_approved",
  "pre_commitment",
  "final_commitment",
  "financial_close",
];

const EXIM_STAGE_LABELS: Record<ProjectPhase, string> = {
  concept: "Concept",
  pre_loi: "Pre-LOI",
  loi_submitted: "LOI Submitted",
  loi_approved: "LOI Approved",
  pre_commitment: "Pre-Commitment",
  final_commitment: "Final Commitment",
  financial_close: "Financial Close",
};

const GENERIC_STAGE_LABELS: Record<ProjectPhase, string> = {
  concept: "Concept",
  pre_loi: "Early Development",
  loi_submitted: "Mandate / Approval",
  loi_approved: "Due Diligence",
  pre_commitment: "Pre-Commitment",
  final_commitment: "Committed",
  financial_close: "Financial Close",
};

const OPEN_STATUSES = new Set<ProjectRequirementRow["status"]>([
  "not_started",
  "in_progress",
  "draft",
]);

function formatStageLabel(stage: ProjectPhase, dealType: string) {
  const labels =
    dealType === "exim_project_finance" ? EXIM_STAGE_LABELS : GENERIC_STAGE_LABELS;
  return labels[stage] ?? stage.replace(/_/g, " ");
}

export function buildGateReview({
  project,
  requirements,
  scoreBps,
  concept,
}: {
  project: Pick<Project, "stage" | "dealType" | "targetLoiDate" | "targetCloseDate" | "eximCoverType">;
  requirements: ProjectRequirementRow[];
  scoreBps: number;
  concept?: Pick<
    ProjectConceptRow,
    "thesis" | "targetOutcome" | "goNoGoRecommendation" | "nextActions"
  > | null;
}): GateReview {
  const isExim = project.dealType === "exim_project_finance";
  const currentIndex = PHASE_ORDER.indexOf(project.stage);
  const nextStage =
    currentIndex >= 0 && currentIndex < PHASE_ORDER.length - 1
      ? PHASE_ORDER[currentIndex + 1]
      : null;

  const gatePhase =
    project.stage === "final_commitment" || project.stage === "financial_close"
      ? "final_commitment"
      : "loi";
  const targetGateDate = isExim
    ? project.targetLoiDate ?? project.targetCloseDate
    : project.targetCloseDate ?? project.targetLoiDate;
  const applicableGateRows = requirements.filter(
    (row) =>
      row.phaseRequired === gatePhase &&
      row.isApplicable &&
      row.status !== "not_applicable"
  );
  const openGateRows = applicableGateRows.filter((row) => OPEN_STATUSES.has(row.status));
  const ownerlessGateRows = applicableGateRows.filter(
    (row) => !row.responsibleOrganizationId && !row.responsibleStakeholderId
  );
  const undatedGateRows = applicableGateRows.filter((row) => !row.targetDate);
  const readinessThreshold = isExim ? 6500 : 6000;

  const criteria: GateCriterion[] = [
    {
      id: "concept",
      label: "Concept framing",
      detail:
        concept?.thesis && concept?.targetOutcome && concept?.goNoGoRecommendation
          ? "Concept record captures thesis, target outcome, and a current go / no-go view"
          : "Add thesis, target outcome, and a current go / no-go recommendation before advancing",
      status:
        concept?.thesis && concept?.targetOutcome && concept?.goNoGoRecommendation
          ? "ready"
          : "blocked",
    },
    {
      id: "readiness",
      label: "Readiness threshold",
      detail:
        scoreBps >= readinessThreshold
          ? `${(scoreBps / 100).toFixed(1)}% clears the gate threshold`
          : `${(scoreBps / 100).toFixed(1)}% is below the ${(readinessThreshold / 100).toFixed(
              0
            )}% review threshold`,
      status: scoreBps >= readinessThreshold ? "ready" : "blocked",
    },
    {
      id: "gate_items",
      label: "Gate-band requirements",
      detail:
        openGateRows.length === 0
          ? `All ${gatePhase === "loi" ? "LOI-band" : "commitment-band"} requirements are advanced past draft`
          : `${openGateRows.length} requirement${
              openGateRows.length === 1 ? "" : "s"
            } still sit in not started, in progress, or draft`,
      status: openGateRows.length === 0 ? "ready" : "blocked",
    },
    {
      id: "owners",
      label: "Owners assigned",
      detail:
        ownerlessGateRows.length === 0
          ? "Each gate item has an accountable owner"
          : `${ownerlessGateRows.length} gate item${
              ownerlessGateRows.length === 1 ? "" : "s"
            } still lack an organization or stakeholder owner`,
      status: ownerlessGateRows.length === 0 ? "ready" : "blocked",
    },
    {
      id: "dates",
      label: "Target dates assigned",
      detail:
        undatedGateRows.length === 0
          ? "Every gate item carries a target date"
          : `${undatedGateRows.length} gate item${
              undatedGateRows.length === 1 ? "" : "s"
            } still need a target date`,
      status: undatedGateRows.length === 0 ? "ready" : "blocked",
    },
    {
      id: "next_actions",
      label: "Next actions captured",
      detail: concept?.nextActions
        ? "Concept record includes the next actions needed to drive the gate"
        : "Add the next actions the team will use to clear the remaining gate work",
      status: concept?.nextActions ? "ready" : "blocked",
    },
    {
      id: "milestone",
      label: "Milestone date",
      detail: targetGateDate
        ? `Target milestone is set for ${targetGateDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}`
        : "No target milestone date is set yet",
      status: targetGateDate ? "ready" : "blocked",
    },
    ...((isExim
      ? [
          {
            id: "cover",
            label: "EXIM cover path",
            detail: project.eximCoverType
              ? `Initial cover path set to ${project.eximCoverType.replace(/_/g, " ")}`
              : "Choose an initial EXIM cover path before advancing",
            status: project.eximCoverType ? "ready" : "blocked",
          } satisfies GateCriterion,
        ]
      : []) as GateCriterion[]),
  ];

  const missingCriteria = criteria.filter((criterion) => criterion.status === "blocked");
  const canAdvance = nextStage !== null && missingCriteria.length === 0;
  const status: GateReview["status"] = canAdvance
    ? "ready"
    : missingCriteria.length <= 2
      ? "at_risk"
      : "blocked";

  return {
    gatePhase,
    nextStage,
    nextStageLabel: nextStage ? formatStageLabel(nextStage, project.dealType) : null,
    status,
    summary: canAdvance
      ? `Ready to review for ${nextStage ? formatStageLabel(nextStage, project.dealType) : "the next gate"}`
      : `${missingCriteria.length} gate condition${
          missingCriteria.length === 1 ? "" : "s"
        } still need attention`,
    focusText: canAdvance
      ? "The gate conditions are satisfied. Capture any final context, then advance the stage intentionally."
      : missingCriteria[0]?.detail ??
        "Review the blocked conditions before moving the stage.",
    openGateItems: openGateRows.length,
    criteria,
    missingCriteria,
    canAdvance,
  };
}
