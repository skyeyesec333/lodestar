import { db } from "@/lib/db";
import { getRequirementsForDealType } from "@/lib/requirements/index";
import type { RequirementDef } from "@/lib/requirements/types";
import type { Result } from "@/types";
import type { RequirementStatusValue } from "@/types/requirements";

/** Basis-point threshold at which a project is considered LOI-gate-ready. */
const GATE_THRESHOLD_BPS = 6500;

/**
 * STATUS_FRACTIONS mirrors the values in scoring/index.ts — kept local so
 * this file has no circular dependency on the parent module.
 */
const STATUS_FRACTIONS: Record<RequirementStatusValue, number> = {
  not_started: 0.0,
  in_progress: 0.2,
  draft: 0.5,
  substantially_final: 0.9,
  executed: 1.0,
  waived: 1.0,
  not_applicable: 0.0,
};

export type ReadinessTrendline = {
  currentScoreBps: number;
  /** Approximate score 7 days ago. Null if insufficient history. */
  sevenDayAvgBps: number | null;
  /** Approximate score 30 days ago. Null if insufficient history. */
  thirtyDayAvgBps: number | null;
  /** Rate of change in basis points per day over the observed window. Null if insufficient history. */
  velocityBpsPerDay: number | null;
  /** ISO date string when 6500 bps is projected to be reached. Null if stalled or declining. */
  projectedGateDateISO: string | null;
  /** True if no requirement status changes were recorded in the last 30 days. */
  isStalled: boolean;
};

type RawNoteRow = {
  requirementId: string;
  statusSnapshot: string;
  createdAt: Date;
};

type RawActivityRow = {
  createdAt: Date;
};

/**
 * Computes a readiness score in basis points from a status map.
 * not_applicable requirements are excluded from the denominator.
 */
function scoreFromStatusMap(
  requirements: readonly RequirementDef[],
  statusMap: Map<string, RequirementStatusValue>
): number {
  let weightedSum = 0;
  let applicableWeight = 0;

  for (const req of requirements) {
    const status = statusMap.get(req.id) ?? "not_started";
    if (status === "not_applicable") continue;
    const fraction = STATUS_FRACTIONS[status];
    weightedSum += fraction * req.weight;
    applicableWeight += req.weight;
  }

  if (applicableWeight === 0) return 0;
  return Math.round((weightedSum / applicableWeight) * 10000);
}

/**
 * Computes a readiness trendline by reconstructing historical scores from
 * RequirementNote snapshots. Returns null for historical scores when
 * insufficient note data exists.
 */
export async function computeReadinessTrendline(
  projectId: string,
  currentScoreBps: number,
  dealType: string = "exim_project_finance",
  daysBack: number = 30
): Promise<Result<ReadinessTrendline>> {
  try {
    const requirements: readonly RequirementDef[] = getRequirementsForDealType(dealType);

    const now = new Date();
    const windowStart = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const currentRows = await db.projectRequirement.findMany({
      where: { projectId },
      select: { requirementId: true, status: true },
    });

    const currentStatusMap = new Map<string, RequirementStatusValue>(
      currentRows.map((r) => [r.requirementId, r.status as RequirementStatusValue])
    );

    const noteRows = await db.$queryRaw<RawNoteRow[]>`
      SELECT "requirementId", "statusSnapshot", "createdAt"
      FROM requirement_notes
      WHERE "projectId" = ${projectId}
        AND "createdAt" >= ${windowStart}
      ORDER BY "createdAt" DESC
    `;

    const thirtyDaysAgo = windowStart;
    const recentActivity = await db.$queryRaw<RawActivityRow[]>`
      SELECT "createdAt"
      FROM activity_events
      WHERE "projectId" = ${projectId}
        AND "eventType" LIKE '%requirement%'
        AND "createdAt" >= ${thirtyDaysAgo}
      LIMIT 1
    `;

    const hasRecentActivity =
      recentActivity.length > 0 || noteRows.length > 0;
    const isStalled = !hasRecentActivity;

    // Reconstruct historical scores by walking backwards through notes.
    // Each note's statusSnapshot tells us a requirement's status at that moment.
    // Degrades to null if insufficient note data (notes are only created on user comments).
    const notesByReq = new Map<string, RawNoteRow[]>();
    for (const note of noteRows) {
      const existing = notesByReq.get(note.requirementId);
      if (!existing) {
        notesByReq.set(note.requirementId, [note]);
      } else {
        existing.push(note);
      }
    }

    function reconstructStatusAtCutoff(
      cutoff: Date
    ): { map: Map<string, RequirementStatusValue>; hasSufficientData: boolean } {
      const reconstructed = new Map<string, RequirementStatusValue>(currentStatusMap);
      let changedRequirementCount = 0;

      for (const [reqId, notes] of notesByReq.entries()) {
        const beforeCutoff = notes.filter(
          (n) => n.createdAt.getTime() <= cutoff.getTime()
        );

        if (beforeCutoff.length > 0) {
          const snapshot = beforeCutoff[0]?.statusSnapshot;
          if (snapshot && isValidStatus(snapshot)) {
            reconstructed.set(reqId, snapshot as RequirementStatusValue);
            changedRequirementCount++;
          }
        } else {
          // All notes are after the cutoff -- revert to oldest snapshot
          const oldestNote = notes[notes.length - 1];
          if (oldestNote && isValidStatus(oldestNote.statusSnapshot)) {
            reconstructed.set(reqId, oldestNote.statusSnapshot as RequirementStatusValue);
            changedRequirementCount++;
          }
        }
      }

      return {
        map: reconstructed,
        hasSufficientData: changedRequirementCount > 0,
      };
    }

    let sevenDayAvgBps: number | null = null;
    let thirtyDayAvgBps: number | null = null;
    let velocityBpsPerDay: number | null = null;

    const sevenDayRecon = reconstructStatusAtCutoff(sevenDaysAgo);
    const thirtyDayRecon = reconstructStatusAtCutoff(windowStart);

    if (sevenDayRecon.hasSufficientData) {
      sevenDayAvgBps = scoreFromStatusMap(requirements, sevenDayRecon.map);
    }

    if (thirtyDayRecon.hasSufficientData) {
      thirtyDayAvgBps = scoreFromStatusMap(requirements, thirtyDayRecon.map);
    }

    if (thirtyDayAvgBps !== null) {
      velocityBpsPerDay = (currentScoreBps - thirtyDayAvgBps) / daysBack;
    } else if (sevenDayAvgBps !== null) {
      velocityBpsPerDay = (currentScoreBps - sevenDayAvgBps) / 7;
    }

    let projectedGateDateISO: string | null = null;

    if (velocityBpsPerDay !== null && velocityBpsPerDay > 0) {
      const bpsRemaining = GATE_THRESHOLD_BPS - currentScoreBps;
      if (bpsRemaining <= 0) {
        projectedGateDateISO = now.toISOString().slice(0, 10);
      } else {
        const daysToGate = bpsRemaining / velocityBpsPerDay;
        const projectedDate = new Date(
          now.getTime() + daysToGate * 24 * 60 * 60 * 1000
        );
        projectedGateDateISO = projectedDate.toISOString().slice(0, 10);
      }
    }

    return {
      ok: true,
      value: {
        currentScoreBps,
        sevenDayAvgBps,
        thirtyDayAvgBps,
        velocityBpsPerDay,
        projectedGateDateISO,
        isStalled,
      },
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error computing trendline";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

const VALID_STATUSES = new Set<string>([
  "not_started",
  "in_progress",
  "draft",
  "substantially_final",
  "executed",
  "waived",
  "not_applicable",
]);

function isValidStatus(value: string): value is RequirementStatusValue {
  return VALID_STATUSES.has(value);
}
