/**
 * Readiness score calculation.
 *
 * The score is a weighted percentage reflecting how close a project's
 * EXIM requirements are to completion. Computed at application layer,
 * cached on `projects.cachedReadinessScore` as basis points (0–10000).
 */

import {
  EXIM_REQUIREMENTS,
  LOI_CRITICAL_IDS,
  TOTAL_WEIGHT,
  REQUIREMENTS_BY_ID,
} from "../exim/requirements";
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

  /** Whether all LOI-critical items are at substantially_final or better. */
  loiReady: boolean;

  /** IDs of LOI-critical requirements that are NOT yet at substantially_final or better. */
  loiBlockers: string[];

  /** Per-category breakdown: category → basis points. */
  categoryScores: Record<string, number>;
}

/**
 * Computes the readiness score for a project given its current
 * requirement statuses.
 *
 * Requirements not present in `statuses` are treated as `not_started`.
 * Requirements with status `not_applicable` are excluded from both the
 * numerator and denominator — they do not affect the score or LOI blockers.
 */
export function computeReadiness(statuses: RequirementInput[]): ReadinessResult {
  const statusMap = new Map(statuses.map((s) => [s.requirementId, s.status]));

  let weightedSum = 0;
  let applicableWeight = 0;
  const categoryWeightedSums: Record<string, number> = {};
  const categoryWeights: Record<string, number> = {};
  const loiBlockers: string[] = [];

  for (const req of EXIM_REQUIREMENTS) {
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
      req.isLoiCritical &&
      status !== "substantially_final" &&
      status !== "executed" &&
      status !== "waived"
    ) {
      loiBlockers.push(req.id);
    }
  }

  // Guard against edge case of all requirements marked not_applicable
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
