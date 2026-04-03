import { db } from "@/lib/db";
import { EXIM_REQUIREMENTS } from "@/lib/exim/requirements";
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

// ── Internal types ────────────────────────────────────────────────────────────

type RawNoteRow = {
  requirementId: string;
  statusSnapshot: string;
  createdAt: Date;
};

type RawActivityRow = {
  createdAt: Date;
};

// ── Score computation helper ──────────────────────────────────────────────────

/**
 * Computes a readiness score in basis points from a map of requirement statuses.
 * Requirements absent from the map are treated as not_started.
 * Requirements with status not_applicable are excluded from the denominator.
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

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Computes a readiness trendline for a project.
 *
 * Historical scores are reconstructed from RequirementNote rows, which carry
 * a statusSnapshot field recording the requirement's status at note creation time.
 * By walking backwards through these snapshots we can approximate what the score
 * looked like at a given point in the past.
 *
 * If there are not enough note rows to reconstruct a historical score, the
 * sevenDayAvgBps and thirtyDayAvgBps fields are returned as null.
 * isStalled and projectedGateDateISO are always computed.
 *
 * @param projectId - The project UUID.
 * @param currentScoreBps - The project's current cached readiness score in basis points.
 * @param dealType - The project's deal type string (defaults to EXIM).
 * @param daysBack - How far back to look for history (default 30).
 */
export async function computeReadinessTrendline(
  projectId: string,
  currentScoreBps: number,
  dealType?: string,
  daysBack: number = 30
): Promise<Result<ReadinessTrendline>> {
  try {
    // ── 1. Resolve taxonomy ──────────────────────────────────────────────────
    const requirements: readonly RequirementDef[] =
      dealType && dealType !== "exim_project_finance"
        ? getRequirementsForDealType(dealType)
        : EXIM_REQUIREMENTS.map((r) => ({
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

    const now = new Date();
    const windowStart = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // ── 2. Fetch current statuses ────────────────────────────────────────────
    const currentRows = await db.projectRequirement.findMany({
      where: { projectId },
      select: { requirementId: true, status: true },
    });

    const currentStatusMap = new Map<string, RequirementStatusValue>(
      currentRows.map((r) => [r.requirementId, r.status as RequirementStatusValue])
    );

    // ── 3. Fetch requirement notes (status-snapshot history) ─────────────────
    // RequirementNote.statusSnapshot records the requirement's status at note time.
    // We fetch all notes since the beginning of our window so we can revert changes.
    const noteRows = await db.$queryRaw<RawNoteRow[]>`
      SELECT "requirementId", "statusSnapshot", "createdAt"
      FROM requirement_notes
      WHERE "projectId" = ${projectId}
        AND "createdAt" >= ${windowStart}
      ORDER BY "createdAt" DESC
    `;

    // ── 4. Determine isStalled via ActivityEvent ─────────────────────────────
    const thirtyDaysAgo = windowStart;
    const recentActivity = await db.$queryRaw<RawActivityRow[]>`
      SELECT "createdAt"
      FROM activity_events
      WHERE "projectId" = ${projectId}
        AND "eventType" LIKE '%requirement%'
        AND "createdAt" >= ${thirtyDaysAgo}
      LIMIT 1
    `;

    // Also check requirement notes as a secondary signal for activity
    const hasRecentActivity =
      recentActivity.length > 0 || noteRows.length > 0;
    const isStalled = !hasRecentActivity;

    // ── 5. Reconstruct historical scores ─────────────────────────────────────
    // Strategy: start from currentStatusMap and walk backwards through notes.
    // For each note, the statusSnapshot tells us what status that requirement
    // had *at that moment*. We can use notes older than a cutoff to reconstruct
    // the approximate state at that cutoff.
    //
    // Limitation: notes are only created when a user explicitly comments, so
    // gaps in notes mean gaps in history. We degrade to null if insufficient data.

    // Group notes by requirementId, keeping all within window
    const notesByReq = new Map<string, RawNoteRow[]>();
    for (const note of noteRows) {
      const existing = notesByReq.get(note.requirementId);
      if (!existing) {
        notesByReq.set(note.requirementId, [note]);
      } else {
        existing.push(note);
      }
    }

    // Helper: reconstruct status map as it was at a given cutoff date.
    // For requirements that have notes before the cutoff, use the most recent
    // note before the cutoff as the status proxy. For requirements with no notes
    // in the window at all, assume the current status was unchanged (conservative).
    function reconstructStatusAtCutoff(
      cutoff: Date
    ): { map: Map<string, RequirementStatusValue>; hasSufficientData: boolean } {
      const reconstructed = new Map<string, RequirementStatusValue>(currentStatusMap);
      let changedRequirementCount = 0;

      for (const [reqId, notes] of notesByReq.entries()) {
        // Notes are sorted desc by createdAt; find the most recent one BEFORE cutoff
        const beforeCutoff = notes.filter(
          (n) => n.createdAt.getTime() <= cutoff.getTime()
        );

        if (beforeCutoff.length > 0) {
          // The most recent note before the cutoff gives us the status at that time
          const snapshot = beforeCutoff[0]?.statusSnapshot;
          if (snapshot && isValidStatus(snapshot)) {
            reconstructed.set(reqId, snapshot as RequirementStatusValue);
            changedRequirementCount++;
          }
        } else {
          // Notes exist in the window but all are after the cutoff — means this
          // requirement changed *after* the cutoff. Revert to the oldest snapshot
          // we have (the one just before the period started, which is the last entry
          // in the desc-sorted array for this req).
          const oldestNote = notes[notes.length - 1];
          if (oldestNote && isValidStatus(oldestNote.statusSnapshot)) {
            reconstructed.set(reqId, oldestNote.statusSnapshot as RequirementStatusValue);
            changedRequirementCount++;
          }
        }
      }

      // We consider data "sufficient" if at least one requirement changed in the window
      return {
        map: reconstructed,
        hasSufficientData: changedRequirementCount > 0,
      };
    }

    // ── 6. Compute approximate historical scores ─────────────────────────────
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

    // Velocity: use the longest window with sufficient data for best accuracy
    if (thirtyDayAvgBps !== null) {
      velocityBpsPerDay = (currentScoreBps - thirtyDayAvgBps) / daysBack;
    } else if (sevenDayAvgBps !== null) {
      velocityBpsPerDay = (currentScoreBps - sevenDayAvgBps) / 7;
    }

    // ── 7. Project gate-crossing date ────────────────────────────────────────
    let projectedGateDateISO: string | null = null;

    if (velocityBpsPerDay !== null && velocityBpsPerDay > 0) {
      const bpsRemaining = GATE_THRESHOLD_BPS - currentScoreBps;
      if (bpsRemaining <= 0) {
        // Already past the threshold
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

// ── Utility ───────────────────────────────────────────────────────────────────

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
