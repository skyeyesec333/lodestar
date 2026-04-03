import { computeReadiness } from "./index";
import type { ProjectRequirementRow } from "@/lib/db/requirements";
import type { RequirementStatusValue } from "@/types/requirements";

export type RequirementChange = {
  requirementId: string;
  newStatus: RequirementStatusValue;
};

export type SimulationResult = {
  currentScoreBps: number;
  simulatedScoreBps: number;
  deltaScoreBps: number;
  loiReady: boolean;
  changedRequirements: Array<{
    requirementId: string;
    label: string;
    fromStatus: string;
    toStatus: string;
    scoreDeltaBps: number;
  }>;
};

function rowsToStatuses(
  rows: ProjectRequirementRow[]
): Array<{ requirementId: string; status: RequirementStatusValue }> {
  return rows.map((r) => ({
    requirementId: r.requirementId,
    status: r.isApplicable === false
      ? ("not_applicable" as RequirementStatusValue)
      : r.status,
  }));
}

export function simulateRequirementChanges(
  currentRows: ProjectRequirementRow[],
  changes: RequirementChange[],
  currentScoreBps: number,
  dealType?: string
): SimulationResult {
  const changeMap = new Map(changes.map((c) => [c.requirementId, c.newStatus]));

  const simulatedStatuses = currentRows.map((r) => {
    const override = changeMap.get(r.requirementId);
    return {
      requirementId: r.requirementId,
      status: override ?? (r.isApplicable === false ? "not_applicable" as RequirementStatusValue : r.status),
    };
  });

  const simulatedResult = computeReadiness(simulatedStatuses, dealType);

  const baselineStatuses = rowsToStatuses(currentRows);

  const changedRequirements = changes.map((change) => {
    const row = currentRows.find((r) => r.requirementId === change.requirementId);
    const originalStatus = row
      ? (row.isApplicable === false ? "not_applicable" : row.status)
      : "not_started";
    const label = row?.name ?? change.requirementId;

    const marginalStatuses = baselineStatuses.map((s) =>
      s.requirementId === change.requirementId
        ? { requirementId: s.requirementId, status: change.newStatus }
        : s
    );
    const marginalResult = computeReadiness(marginalStatuses, dealType);

    return {
      requirementId: change.requirementId,
      label,
      fromStatus: originalStatus,
      toStatus: change.newStatus,
      scoreDeltaBps: marginalResult.scoreBps - currentScoreBps,
    };
  });

  return {
    currentScoreBps,
    simulatedScoreBps: simulatedResult.scoreBps,
    deltaScoreBps: simulatedResult.scoreBps - currentScoreBps,
    loiReady: simulatedResult.loiReady,
    changedRequirements,
  };
}
