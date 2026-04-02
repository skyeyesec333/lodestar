"use server";

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { getProjectActivity, type ActivityPage } from "@/lib/db/activity";
import type { Result } from "@/types";

const getProjectActivitySchema = z.object({
  projectId: z.string().min(1),
  cursor: z.string().optional(),
  limit: z.number().int().positive().optional(),
});

export async function getProjectActivityAction(
  input: unknown
): Promise<Result<ActivityPage>> {
  const { userId } = await auth();
  if (!userId) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "You must be signed in to view project activity.",
      },
    };
  }

  const parsed = getProjectActivitySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Project id is required.",
      },
    };
  }

  return getProjectActivity(parsed.data.projectId, parsed.data.limit, parsed.data.cursor);
}
