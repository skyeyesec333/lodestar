"use server";

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { assertProjectAccess } from "@/lib/db/project-access";
import { upsertProjectConcept } from "@/lib/db/project-concepts";
import type { ProjectConceptRow } from "@/lib/db/project-concepts";
import type { Result } from "@/types";

const updateProjectConceptSchema = z.object({
  projectId: z.string().min(1),
  slug: z.string().min(1),
  thesis: z.string().max(5000).nullable().optional(),
  sponsorRationale: z.string().max(5000).nullable().optional(),
  targetOutcome: z.string().max(3000).nullable().optional(),
  knownUnknowns: z.string().max(5000).nullable().optional(),
  fatalFlaws: z.string().max(5000).nullable().optional(),
  nextActions: z.string().max(5000).nullable().optional(),
  goNoGoRecommendation: z.string().max(3000).nullable().optional(),
});

export async function updateProjectConceptAction(
  raw: unknown
): Promise<Result<ProjectConceptRow>> {
  const { userId } = await auth();
  if (!userId) {
    return {
      ok: false,
      error: { code: "UNAUTHORIZED", message: "You must be signed in." },
    };
  }

  const parsed = updateProjectConceptSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    };
  }

  const {
    projectId,
    slug,
    thesis,
    sponsorRationale,
    targetOutcome,
    knownUnknowns,
    fatalFlaws,
    nextActions,
    goNoGoRecommendation,
  } = parsed.data;

  const access = await assertProjectAccess(projectId, userId, "editor");
  if (!access.ok) return access;

  const result = await upsertProjectConcept({
    projectId,
    thesis: thesis ?? null,
    sponsorRationale: sponsorRationale ?? null,
    targetOutcome: targetOutcome ?? null,
    knownUnknowns: knownUnknowns ?? null,
    fatalFlaws: fatalFlaws ?? null,
    nextActions: nextActions ?? null,
    goNoGoRecommendation: goNoGoRecommendation ?? null,
  });

  if (!result.ok) return result;

  revalidatePath(`/projects/${slug}`);
  return result;
}
