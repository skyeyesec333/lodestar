import { db } from "@/lib/db";
import type { Result } from "@/types";

export type FinancingRisk = {
  level: "none" | "low" | "medium" | "high";
  penaltyBps: number;
  flags: string[];
};

const PENALTY: Record<FinancingRisk["level"], number> = {
  none: 0,
  low: 200,
  medium: 500,
  high: 1000,
};

function levelOrdinal(level: FinancingRisk["level"]): number {
  return ["none", "low", "medium", "high"].indexOf(level);
}

function maxLevel(
  a: FinancingRisk["level"],
  b: FinancingRisk["level"]
): FinancingRisk["level"] {
  return levelOrdinal(a) >= levelOrdinal(b) ? a : b;
}

const AT_RISK_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export async function assessFinancingReadiness(
  projectId: string
): Promise<Result<FinancingRisk>> {
  try {
    const [tranches, covenants, project] = await Promise.all([
      db.debtTranche.findMany({
        where: { projectId },
        select: {
          id: true,
          amountUsdCents: true,
          status: true,
        },
      }),
      db.covenant.findMany({
        where: { projectId },
        select: {
          id: true,
          title: true,
          status: true,
          nextDueAt: true,
        },
      }),
      db.project.findUnique({
        where: { id: projectId },
        select: { capexUsdCents: true },
      }),
    ]);

    const now = new Date();
    const flags: string[] = [];
    let level: FinancingRisk["level"] = "none";

    // Classify covenants: breached = active + past due, at_risk = active + due within 14 days
    for (const covenant of covenants) {
      if (covenant.status === "active" && covenant.nextDueAt !== null) {
        if (covenant.nextDueAt < now) {
          level = maxLevel(level, "high");
          flags.push("Active covenant breach");
          break;
        }
      }
    }

    // Only check at_risk if not already high
    if (levelOrdinal(level) < levelOrdinal("high")) {
      for (const covenant of covenants) {
        if (covenant.status === "active" && covenant.nextDueAt !== null) {
          const msUntilDue = covenant.nextDueAt.getTime() - now.getTime();
          if (msUntilDue >= 0 && msUntilDue <= AT_RISK_WINDOW_MS) {
            level = maxLevel(level, "medium");
            flags.push("Covenant at risk");
            break;
          }
        }
      }
    }

    // Debt coverage check
    const capexUsdCents = project?.capexUsdCents ?? null;
    if (capexUsdCents !== null && capexUsdCents > 0n) {
      const committedCents = tranches.reduce((sum, t) => {
        if (t.status === "committed" || t.status === "drawn" || t.status === "repaid") {
          return sum + t.amountUsdCents;
        }
        return sum;
      }, 0n);

      const capexNum = Number(capexUsdCents);
      const committedNum = Number(committedCents);
      if (committedNum < capexNum * 0.5) {
        level = maxLevel(level, "medium");
        flags.push("Debt coverage below 50%");
      }
    }

    // Tranche commitment check
    const hasUncommittedTranche = tranches.some((t) => t.status === "term_sheet");
    if (hasUncommittedTranche) {
      level = maxLevel(level, "low");
      flags.push("Debt not yet committed");
    }

    return {
      ok: true,
      value: {
        level,
        penaltyBps: PENALTY[level],
        flags,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: { code: "DATABASE_ERROR", message: String(err) },
    };
  }
}
