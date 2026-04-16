/**
 * Readiness score calculation.
 *
 * The score is a weighted percentage reflecting how close a project's
 * requirements are to completion. Computed at application layer,
 * cached on `projects.cachedReadinessScore` as basis points (0–10000).
 *
 * `computeReadiness` accepts a `dealType` and routes to the appropriate
 * taxonomy, enabling all deal types (EXIM, DFI, Commercial Bank, PE,
 * Blended) to share the same scoring logic.
 */

import { getRequirementsForDealType } from "../requirements/index";
import type { RequirementDef } from "../requirements/types";
import type { RequirementStatusValue } from "../../types/requirements";
import type { ReadinessResult, RequirementInput } from "@/types";

const STATUS_FRACTIONS: Record<RequirementStatusValue, number> = {
  not_started: 0.0,
  in_progress: 0.2,
  draft: 0.5,
  substantially_final: 0.9,
  executed: 1.0,
  waived: 1.0,
  not_applicable: 0.0,
};

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
 * statuses and deal type.
 *
 * Requirements not present in `statuses` are treated as `not_started`.
 * Requirements with status `not_applicable` are excluded from both the
 * numerator and denominator.
 */
export function computeReadiness(
  statuses: RequirementInput[],
  dealType: string = "exim_project_finance"
): ReadinessResult {
  const requirements = getRequirementsForDealType(dealType);
  return scoreRequirements(requirements, statuses);
}

export function mapRequirementStatuses(
  rows: ReadonlyArray<{ requirementId: string; status: string; isApplicable: boolean | null }>
): RequirementInput[] {
  return rows.map((r) => ({
    requirementId: r.requirementId,
    status: r.isApplicable === false
      ? ("not_applicable" as RequirementStatusValue)
      : (r.status as RequirementStatusValue),
  }));
}

export type { ReadinessResult };

export { computeReadinessTrendline } from "./trendline";
export type { ReadinessTrendline } from "./trendline";
