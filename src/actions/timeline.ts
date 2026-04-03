"use server";

import { auth } from "@clerk/nextjs/server";
import { getTimelineRisks } from "@/lib/db/timeline-risks";
import type { TimelineRisk } from "@/lib/db/timeline-risks";
import type { Result } from "@/types";

export async function flagTimelineRisks(projectId: string): Promise<Result<TimelineRisk[]>> {
  const { userId } = await auth();
  if (!userId) {
    return {
      ok: false,
      error: { code: "UNAUTHORIZED", message: "You must be signed in." },
    };
  }

  return getTimelineRisks(projectId);
}
