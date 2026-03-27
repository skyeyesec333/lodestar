"use server";

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { ProjectSector, EximCoverType, ProjectPhase } from "@prisma/client";
import { createProjectRecord, updateProjectRecord } from "@/lib/db/projects";
import { recordActivity } from "@/lib/db/activity";
import type { ProjectSummary, AppError, Result } from "@/types";

// ── Slug utility ──────────────────────────────────────────────────────────────

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}

// ── Validation schema ─────────────────────────────────────────────────────────

const SECTOR_VALUES = [
  "power",
  "transport",
  "water",
  "telecom",
  "mining",
  "other",
] as const;

const COVER_VALUES = ["comprehensive", "political_only"] as const;

const createProjectSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(120),
  countryCode: z
    .string()
    .length(2, "Country code must be exactly 2 characters")
    .transform((v) => v.toUpperCase()),
  sector: z.enum(SECTOR_VALUES),
  capexUsd: z.coerce.number().positive().nullable().optional(),
  eximCoverType: z.enum(COVER_VALUES).nullable().optional(),
  targetLoiDate: z.coerce.date().nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

const PHASE_VALUES = [
  "concept",
  "pre_loi",
  "loi_submitted",
  "loi_approved",
  "pre_commitment",
  "final_commitment",
  "financial_close",
] as const;

const updateProjectSchema = z.object({
  projectId: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
  countryCode: z.string().length(2).transform((v) => v.toUpperCase()).optional(),
  sector: z.enum(SECTOR_VALUES).optional(),
  capexUsd: z.coerce.number().positive().nullable().optional(),
  eximCoverType: z.enum(COVER_VALUES).nullable().optional(),
  targetLoiDate: z.coerce.date().nullable().optional(),
});

// ── Server action ─────────────────────────────────────────────────────────────

/**
 * Creates a new project for the authenticated user.
 * Returns ProjectSummary (no BigInt fields) to avoid serialization issues
 * across the server/client boundary.
 */
export async function createProject(
  input: CreateProjectInput
): Promise<Result<ProjectSummary>> {
  const { userId } = await auth();
  if (!userId) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "You must be signed in to create a project.",
      },
    };
  }

  const parsed = createProjectSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: first?.message ?? "Invalid form data.",
      },
    };
  }

  const { name, countryCode, sector, capexUsd, eximCoverType, targetLoiDate, description } =
    parsed.data;

  const capexUsdCents =
    capexUsd != null ? BigInt(Math.round(capexUsd * 100)) : null;

  const dbResult = await createProjectRecord({
    name,
    slug: generateSlug(name),
    description: description ?? null,
    countryCode,
    sector: sector as ProjectSector,
    capexUsdCents,
    eximCoverType: (eximCoverType ?? null) as EximCoverType | null,
    targetLoiDate: targetLoiDate ?? null,
    targetCloseDate: null,
    ownerClerkId: userId,
  });

  if (!dbResult.ok) return dbResult;

  // Return summary only — omits capexUsdCents (BigInt) to keep the response serializable
  const {
    id,
    name: n,
    slug,
    countryCode: cc,
    sector: s,
    stage,
    targetLoiDate: loiDate,
    cachedReadinessScore,
    createdAt,
  } =
    dbResult.value;

  return {
    ok: true,
    value: {
      id,
      name: n,
      slug,
      countryCode: cc,
      sector: s,
      stage,
      targetLoiDate: loiDate,
      cachedReadinessScore,
      createdAt,
    },
  };
}

export async function updateProject(input: unknown): Promise<Result<{ slug: string }>> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: { code: "UNAUTHORIZED", message: "You must be signed in." } };
  }

  const parsed = updateProjectSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input." },
    };
  }

  const { projectId, slug, name, description, countryCode, sector, capexUsd, eximCoverType, targetLoiDate } =
    parsed.data;

  const capexUsdCents =
    capexUsd !== undefined
      ? capexUsd != null ? BigInt(Math.round(capexUsd * 100)) : null
      : undefined;

  const result = await updateProjectRecord(projectId, userId, {
    ...(name !== undefined && { name }),
    ...(description !== undefined && { description }),
    ...(countryCode !== undefined && { countryCode }),
    ...(sector !== undefined && { sector: sector as ProjectSector }),
    ...(capexUsdCents !== undefined && { capexUsdCents }),
    ...(eximCoverType !== undefined && { eximCoverType: eximCoverType as EximCoverType | null }),
    ...(targetLoiDate !== undefined && { targetLoiDate }),
  });

  if (!result.ok) return result;

  await recordActivity(projectId, userId, "project_updated", "Project details updated");

  revalidatePath(`/projects/${slug}`);
  revalidatePath("/projects");

  return { ok: true, value: { slug: result.value.slug } };
}

export async function advanceProjectStage(
  input: unknown
): Promise<Result<{ stage: ProjectPhase }>> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: { code: "UNAUTHORIZED", message: "You must be signed in." } };
  }

  const parsed = z.object({ projectId: z.string().min(1), slug: z.string().min(1), currentStage: z.enum(PHASE_VALUES) }).safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid input." },
    };
  }

  const { projectId, slug, currentStage } = parsed.data;
  const currentIndex = PHASE_VALUES.indexOf(currentStage);
  if (currentIndex === PHASE_VALUES.length - 1) {
    return { ok: false, error: { code: "VALIDATION_ERROR", message: "Already at final stage." } };
  }

  const nextStage = PHASE_VALUES[currentIndex + 1] as ProjectPhase;

  const result = await updateProjectRecord(projectId, userId, { stage: nextStage });
  if (!result.ok) return result;

  const stageLabel = nextStage.replace(/_/g, " ");
  await recordActivity(projectId, userId, "stage_advanced",
    `Stage advanced to ${stageLabel}`,
    { from: currentStage, to: nextStage }
  );

  revalidatePath(`/projects/${slug}`);
  revalidatePath("/projects");

  return { ok: true, value: { stage: nextStage } };
}
