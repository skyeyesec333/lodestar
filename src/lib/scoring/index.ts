/**
 * Readiness score calculation.
 *
 * The score is a weighted percentage reflecting how close a project's
 * requirements are to completion. Computed at application layer,
 * cached on `projects.cachedReadinessScore` as basis points (0–10000).
 *
 * `computeReadiness` now accepts any requirements taxonomy via the
 * `requirements` parameter, enabling all four deal types (EXIM, DFI,
 * Commercial Bank, PE) to share the same scoring logic.
 *
 * For backwards compatibility, `computeReadiness` without a `requirements`
 * argument still operates on the EXIM taxonomy.
 */

import {
  EXIM_REQUIREMENTS,
  LOI_CRITICAL_IDS,
} from "../exim/requirements";
import { getRequirementsForDealType } from "../requirements/index";
import type { RequirementDef } from "../requirements/types";
import type { RequirementStatusValue } from "../../types/requirements";

/**
 * Maps each requirement status to a completion fraction (0.0–1.0).
 * These fractions are multiplied by the requirement's weight to
 * produce the weighted score contribution.
 *
 * not_applicable is handled separately: the requirement is excluded from
 * both numerator and denominator, so it does not affect the score at all.
 */
const STATUS_FRACTIONS: Record<RequirementStatusValue, number> = {
  not_started: 0.0,
  in_progress: 0.2,
  draft: 0.5,
  substantially_final: 0.9,
  executed: 1.0,
  waived: 1.0,
  not_applicable: 0.0, // sentinel — filtered out before scoring (see below)
};

interface RequirementInput {
  requirementId: string;
  status: RequirementStatusValue;
}

interface ReadinessResult {
  /** Readiness score in basis points (0–10000). e.g. 7543 = 75.43% */
  scoreBps: number;

  /** Whether all primary-gate items are at substantially_final or better. */
  loiReady: boolean;

  /** IDs of primary-gate requirements that are NOT yet at substantially_final or better. */
  loiBlockers: string[];

  /** Per-category breakdown: category → basis points. */
  categoryScores: Record<string, number>;
}

/**
 * Core scoring logic — operates on any RequirementDef array.
 */
function scoreRequirements(
  requirements: readonly RequirementDef[],
  statuses: RequirementInput[]
): ReadinessResult {
  const statusMap = new Map(statuses.map((s) => [s.requirementId, s.status]));

  let weightedSum = 0;
  let applicableWeight = 0;
  const categoryWeightedSums: Record<string, number> = {};
  const categoryWeights: Record<string, number> = {};
  const loiBlockers: string[] = [];

  for (const req of requirements) {
    const status = statusMap.get(req.id) ?? "not_started";

    // not_applicable: fully excluded from scoring and blocker logic
    if (status === "not_applicable") continue;

    const fraction = STATUS_FRACTIONS[status];
    const contribution = fraction * req.weight;

    weightedSum += contribution;
    applicableWeight += req.weight;

    categoryWeightedSums[req.category] =
      (categoryWeightedSums[req.category] ?? 0) + contribution;
    categoryWeights[req.category] =
      (categoryWeights[req.category] ?? 0) + req.weight;

    if (
      req.isPrimaryGate &&
      status !== "substantially_final" &&
      status !== "executed" &&
      status !== "waived"
    ) {
      loiBlockers.push(req.id);
    }
  }

  const scoreBps =
    applicableWeight === 0
      ? 0
      : Math.round((weightedSum / applicableWeight) * 10000);

  const categoryScores: Record<string, number> = {};
  for (const [cat, sum] of Object.entries(categoryWeightedSums)) {
    categoryScores[cat] = Math.round((sum / categoryWeights[cat]) * 10000);
  }

  return {
    scoreBps,
    loiReady: loiBlockers.length === 0,
    loiBlockers,
    categoryScores,
  };
}

/**
 * Computes the readiness score for a project given its current requirement
 * statuses. When `dealType` is provided, routes to the appropriate taxonomy.
 * Defaults to EXIM for backwards compatibility.
 *
 * Requirements not present in `statuses` are treated as `not_started`.
 * Requirements with status `not_applicable` are excluded from both the
 * numerator and denominator.
 */
export function computeReadiness(
  statuses: RequirementInput[],
  dealType?: string
): ReadinessResult {
  if (dealType && dealType !== "exim_project_finance") {
    const requirements = getRequirementsForDealType(dealType);
    return scoreRequirements(requirements, statuses);
  }

  // EXIM path — uses legacy EximRequirementDef adapted to RequirementDef shape
  const eximAsGeneric: RequirementDef[] = EXIM_REQUIREMENTS.map((r) => ({
    id: r.id,
    category: r.category,
    name: r.name,
    description: r.description,
    phaseRequired: r.phaseRequired,
    isPrimaryGate: r.isLoiCritical,
    weight: r.weight,
    sortOrder: r.sortOrder,
    phaseLabel: r.phaseRequired === "loi" ? "LOI" : "Final Commitment",
    defaultOwner: "Sponsor",
    applicableSectors: r.applicableSectors,
  }));

  return scoreRequirements(eximAsGeneric, statuses);
}

// Re-export for code that imports these directly from scoring/index
export { LOI_CRITICAL_IDS };
export type { ReadinessResult };
