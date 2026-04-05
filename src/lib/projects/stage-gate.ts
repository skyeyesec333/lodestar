import type { ProjectRequirementRow } from "@/lib/db/requirements";

export type GateBlocker = {
  requirementId: string;
  name: string;
  category: string;
  status: string;
  isPrimaryGate: boolean;
};

export type GateCheckResult = {
  /** true if no hard blockers */
  canAdvance: boolean;
  /** isPrimaryGate items not in substantially_final/executed (and applicable) */
  hardBlockers: GateBlocker[];
  /** non-critical items not yet started */
  softBlockers: GateBlocker[];
};

const DONE_STATUSES = new Set(["substantially_final", "executed"]);

/**
 * Pure function — no async, no DB calls.
 * Inspects `requirements` against `targetStage` and returns a gate check result.
 */
export function checkStageGate(
  targetStage: string,
  requirements: ProjectRequirementRow[]
): GateCheckResult {
  const applicable = requirements.filter((r) => r.isApplicable !== false);

  const isLoiStage =
    targetStage === "loi_submitted" || targetStage === "loi_approved";
  const isFinalStage =
    targetStage === "final_commitment" || targetStage === "financial_close";

  let hardBlockers: GateBlocker[] = [];
  let softBlockers: GateBlocker[] = [];

  if (isLoiStage) {
    hardBlockers = applicable
      .filter((r) => r.isPrimaryGate && !DONE_STATUSES.has(r.status))
      .map(toBlocker);
    softBlockers = applicable
      .filter((r) => !r.isPrimaryGate && r.status === "not_started")
      .map(toBlocker);
  } else if (isFinalStage) {
    hardBlockers = applicable
      .filter((r) => !DONE_STATUSES.has(r.status))
      .map(toBlocker);
    softBlockers = [];
  } else {
    // Earlier stages (concept → pre_loi, pre_loi → loi_submitted path skipped above)
    hardBlockers = [];
    softBlockers = applicable
      .filter((r) => r.status === "not_started")
      .map(toBlocker);
  }

  return {
    canAdvance: hardBlockers.length === 0,
    hardBlockers,
    softBlockers,
  };
}

function toBlocker(r: ProjectRequirementRow): GateBlocker {
  return {
    requirementId: r.requirementId,
    name: r.name,
    category: r.category,
    status: r.status,
    isPrimaryGate: r.isPrimaryGate,
  };
}
