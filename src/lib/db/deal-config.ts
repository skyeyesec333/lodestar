import { db } from "./index";
import type { Result } from "@/types";

export interface DealConfigResult {
  readinessThresholdBps: number;
  requireConcept: boolean;
  requireMilestoneDate: boolean;
}

/**
 * Fetch deal configuration for a project, returning sensible defaults if not found.
 */
export async function getDealConfig(
  projectId: string
): Promise<Result<DealConfigResult>> {
  try {
    const config = await db.dealConfig.findUnique({
      where: { projectId },
      select: {
        readinessThresholdBps: true,
        requireConcept: true,
        requireMilestoneDate: true,
      },
    });

    if (config) {
      return {
        ok: true,
        value: config,
      };
    }

    // Return sensible defaults if no config exists
    return {
      ok: true,
      value: {
        readinessThresholdBps: 6500,
        requireConcept: true,
        requireMilestoneDate: true,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}
