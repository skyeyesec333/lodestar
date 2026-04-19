"use server";

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import type {
  ProjectSector,
  EximCoverType,
  ProjectPhase,
  DealType,
  EnvironmentalCategory,
  ProgramPath,
} from "@prisma/client";
import { createProjectRecord, updateProjectRecord, getProjectById } from "@/lib/db/projects";
import { getProjectRequirements } from "@/lib/db/requirements";
import { upsertProjectConcept, getProjectConcept } from "@/lib/db/project-concepts";
import { recordActivity } from "@/lib/db/activity";
import { createDemoPortfolioForUser, createDemoProjectForUser } from "@/lib/db/demo";
import { DEMO_PROJECT_SLUG_PREFIX } from "@/lib/projects/demo-portfolio";
import { computeReadiness, mapRequirementStatuses } from "@/lib/scoring/index";
import { buildGateReview } from "@/lib/projects/gate-review";
import { generateSlug } from "@/lib/utils";
import { assertProjectAccess } from "@/lib/db/project-access";
import { db } from "@/lib/db";
import { toDbError } from "@/lib/utils";
import type { ProjectSummary, AppError, Result } from "@/types";

const SECTOR_VALUES = [
  "power",
  "transport",
  "water",
  "telecom",
  "mining",
  "other",
] as const;

const COVER_VALUES = ["comprehensive", "political_only"] as const;
const ENVIRONMENTAL_CATEGORY_VALUES = [
  "category_a",
  "category_b",
  "category_c",
  "category_fi",
] as const;
const PROGRAM_PATH_VALUES = [
  "standard",
  "ctep",
  "mmia",
  "critical_minerals",
  "engineering_multiplier",
] as const;

const DEAL_TYPE_VALUES = [
  "exim_project_finance",
  "commercial_finance",
  "development_finance",
  "private_equity",
  "blended_finance",
  "other",
] as const;

const PHASE_VALUES = [
  "concept",
  "pre_loi",
  "loi_submitted",
  "loi_approved",
  "pre_commitment",
  "final_commitment",
  "financial_close",
] as const;

const createProjectSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(120),
  dealType: z.enum(DEAL_TYPE_VALUES).default("other"),
  countryCode: z
    .string()
    .length(2, "Country code must be exactly 2 characters")
    .transform((v) => v.toUpperCase()),
  sector: z.enum(SECTOR_VALUES),
  capexUsd: z.coerce.number().positive().nullable().optional(),
  eximCoverType: z.enum(COVER_VALUES).nullable().optional(),
  environmentalCategory: z.enum(ENVIRONMENTAL_CATEGORY_VALUES).nullable().optional(),
  programPath: z.enum(PROGRAM_PATH_VALUES).optional().default("standard"),
  stage: z.enum(PHASE_VALUES).optional().default("concept"),
  targetLoiDate: z.coerce.date().nullable().optional(),
  targetCloseDate: z.coerce.date().nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  sponsorRationale: z.string().max(2000).nullable().optional(),
  targetOutcome: z.string().max(2000).nullable().optional(),
  knownUnknowns: z.string().max(2000).nullable().optional(),
  fatalFlaws: z.string().max(2000).nullable().optional(),
  nextActions: z.string().max(2000).nullable().optional(),
  goNoGoRecommendation: z.string().max(2000).nullable().optional(),
  userRole: z.enum(["sponsor", "advisor", "government", "lender"]).nullable().optional(),
  subNationalLocation: z.string().max(120).nullable().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

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

  const {
    name,
    countryCode,
    sector,
    dealType,
    capexUsd,
    eximCoverType,
    environmentalCategory,
    programPath,
    stage,
    targetLoiDate,
    targetCloseDate,
    description,
    sponsorRationale,
    targetOutcome,
    knownUnknowns,
    fatalFlaws,
    nextActions,
    goNoGoRecommendation,
    userRole,
    subNationalLocation,
  } =
    parsed.data;

  const capexUsdCents =
    capexUsd != null ? BigInt(Math.round(capexUsd * 100)) : null;

  const dbResult = await createProjectRecord({
    name,
    slug: generateSlug(name),
    description: description ?? null,
    countryCode,
    sector: sector as ProjectSector,
    dealType: dealType as DealType,
    capexUsdCents,
    eximCoverType: (eximCoverType ?? null) as EximCoverType | null,
    environmentalCategory: (environmentalCategory ?? null) as EnvironmentalCategory | null,
    programPath: programPath as ProgramPath,
    stage: stage as ProjectPhase,
    targetLoiDate: targetLoiDate ?? null,
    targetCloseDate: targetCloseDate ?? null,
    ownerClerkId: userId,
    userRole: userRole ?? null,
    subNationalLocation: subNationalLocation ?? null,
  });

  if (!dbResult.ok) return dbResult;

  const conceptResult = await upsertProjectConcept({
    projectId: dbResult.value.id,
    thesis: description ?? null,
    sponsorRationale: sponsorRationale ?? null,
    targetOutcome: targetOutcome ?? null,
    knownUnknowns: knownUnknowns ?? null,
    fatalFlaws: fatalFlaws ?? null,
    nextActions: nextActions ?? null,
    goNoGoRecommendation: goNoGoRecommendation ?? null,
  });

  if (!conceptResult.ok) return conceptResult;

  // Return summary only — omits capexUsdCents (BigInt) to keep the response serializable
  const {
    id,
    name: n,
    slug,
    countryCode: cc,
    sector: s,
    stage: createdStage,
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
      stage: createdStage,
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
  const projectResult = await getProjectById(projectId, userId);
  if (!projectResult.ok) return projectResult;

  const requirementsResult = await getProjectRequirements(
    projectId,
    projectResult.value.dealType,
    projectResult.value.sector
  );
  if (!requirementsResult.ok) return requirementsResult;
  const conceptResult = await getProjectConcept(projectId);
  if (!conceptResult.ok) return conceptResult;

  const { scoreBps } = computeReadiness(
    mapRequirementStatuses(requirementsResult.value),
    projectResult.value.dealType
  );
  const gateReview = buildGateReview({
    project: projectResult.value,
    requirements: requirementsResult.value,
    scoreBps,
    concept: conceptResult.value,
  });

  const currentIndex = PHASE_VALUES.indexOf(currentStage);
  if (currentIndex === PHASE_VALUES.length - 1) {
    return { ok: false, error: { code: "VALIDATION_ERROR", message: "Already at final stage." } };
  }
  if (!gateReview.canAdvance) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: `Gate review blocked. ${gateReview.missingCriteria
          .slice(0, 2)
          .map((criterion) => criterion.label)
          .join(" · ")}`,
      },
    };
  }

  const nextStage = PHASE_VALUES[currentIndex + 1] as ProjectPhase;

  const stageToDateField: Partial<Record<ProjectPhase, "actualLoiSubmittedDate" | "actualLoiApprovedDate" | "actualCommitmentDate" | "actualCloseDate">> = {
    loi_submitted:   "actualLoiSubmittedDate",
    loi_approved:    "actualLoiApprovedDate",
    pre_commitment:  "actualCommitmentDate",
    financial_close: "actualCloseDate",
  };

  const stageUpdateData: Parameters<typeof updateProjectRecord>[2] = { stage: nextStage };
  const dateField = stageToDateField[nextStage];
  if (dateField !== undefined && projectResult.value[dateField] == null) {
    stageUpdateData[dateField] = new Date();
  }

  const result = await updateProjectRecord(projectId, userId, stageUpdateData);
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

export async function createDemoProject(): Promise<Result<{ slug: string }>> {
  const { userId } = await auth();
  if (!userId) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "You must be signed in to create a demo project.",
      },
    };
  }

  const result = await createDemoProjectForUser(userId);
  if (!result.ok) return result;

  revalidatePath("/projects");
  revalidatePath(`/projects/${result.value.slug}`);

  return { ok: true, value: { slug: result.value.slug } };
}

export async function createDemoPortfolio(): Promise<Result<{ slug: string }>> {
  const { userId } = await auth();
  if (!userId) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "You must be signed in to create a demo portfolio.",
      },
    };
  }

  const result = await createDemoPortfolioForUser(userId);
  if (!result.ok) return result;

  revalidatePath("/projects");
  revalidatePath(`/projects/${result.value.leadSlug}`);

  return { ok: true, value: { slug: result.value.leadSlug } };
}

/**
 * Deletes every demo project owned by the current user (slug-prefix match) and
 * reseeds a fresh portfolio via `createDemoPortfolioForUser`. Cascades clean up
 * stakeholder roles, requirement statuses, funder relationships, meetings,
 * activity events, etc. Stakeholder + Organization rows are not tied to the
 * project via cascade, so we delete them afterward if they were exclusive to
 * the demo projects being wiped (i.e. no remaining roles / funder relationships
 * / sponsor records / action-item assignments).
 */
export async function resetDemoPortfolio(): Promise<Result<{ slug: string }>> {
  const { userId } = await auth();
  if (!userId) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "You must be signed in to reset the demo portfolio.",
      },
    };
  }

  try {
    const demoProjects = await db.project.findMany({
      where: {
        ownerClerkId: userId,
        slug: { startsWith: DEMO_PROJECT_SLUG_PREFIX },
      },
      select: {
        id: true,
        slug: true,
        stakeholderRoles: { select: { stakeholder: { select: { id: true, organizationId: true } } } },
        funderRelationships: { select: { organizationId: true } },
        sponsors: { select: { organizationId: true } },
      },
    });

    const stakeholderIds = new Set<string>();
    const organizationIds = new Set<string>();
    for (const project of demoProjects) {
      for (const role of project.stakeholderRoles) {
        stakeholderIds.add(role.stakeholder.id);
        if (role.stakeholder.organizationId) organizationIds.add(role.stakeholder.organizationId);
      }
      for (const funder of project.funderRelationships) {
        organizationIds.add(funder.organizationId);
      }
      for (const sponsor of project.sponsors) {
        organizationIds.add(sponsor.organizationId);
      }
    }

    // Cascade-delete projects first. StakeholderRole, FunderRelationship,
    // ProjectSponsor, ProjectRequirement, ActivityEvent, Meeting, etc. are all
    // marked `onDelete: Cascade` on the project relation.
    if (demoProjects.length > 0) {
      await db.project.deleteMany({
        where: { id: { in: demoProjects.map((p) => p.id) } },
      });
    }

    // Drop stakeholders that no longer have any roles / action items / attendances.
    if (stakeholderIds.size > 0) {
      await db.stakeholder.deleteMany({
        where: {
          id: { in: Array.from(stakeholderIds) },
          roles: { none: {} },
          actionItems: { none: {} },
          attendances: { none: {} },
          responsibleRequirements: { none: {} },
          secondaryResponsibilities: { none: {} },
          documentRequests: { none: {} },
        },
      });
    }

    // Drop organizations that no longer have any references.
    if (organizationIds.size > 0) {
      await db.organization.deleteMany({
        where: {
          id: { in: Array.from(organizationIds) },
          stakeholders: { none: {} },
          funderRelationships: { none: {} },
          projectSponsors: { none: {} },
          dealParties: { none: {} },
          epcBids: { none: {} },
          responsibleRequirements: { none: {} },
        },
      });
    }

    const result = await createDemoPortfolioForUser(userId);
    if (!result.ok) return result;

    revalidatePath("/projects");
    revalidatePath(`/projects/${result.value.leadSlug}`);

    return { ok: true, value: { slug: result.value.leadSlug } };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
  }
}

export async function recalculateReadiness(
  projectId: string,
  slug: string
): Promise<Result<number>> {
  const { userId } = await auth();
  if (!userId) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "You must be signed in.",
      },
    };
  }

  const projectResult = await getProjectById(projectId, userId);
  if (!projectResult.ok) return projectResult;

  const requirementsResult = await getProjectRequirements(
    projectId,
    projectResult.value.dealType,
    projectResult.value.sector
  );
  if (!requirementsResult.ok) return requirementsResult;

  const { scoreBps } = computeReadiness(
    mapRequirementStatuses(requirementsResult.value),
    projectResult.value.dealType
  );

  const result = await updateProjectRecord(projectId, userId, {
    cachedReadinessScore: scoreBps,
    cachedScoreUpdatedAt: new Date(),
  });

  if (!result.ok) return result;

  await recordActivity(projectId, userId, "readiness_recalculated", "Readiness score recalculated");

  revalidatePath(`/projects/${slug}`);

  return { ok: true, value: scoreBps };
}

const graphLayoutSchema = z.object({
  projectId: z.string().min(1),
  layout: z
    .record(
      z.string().min(1),
      z.object({
        x: z.number().finite(),
        y: z.number().finite(),
      })
    )
    .refine((r) => Object.keys(r).length <= 100, { message: "Too many nodes in layout." }),
});

export async function saveStakeholderGraphLayout(raw: unknown): Promise<Result<void>> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: { code: "UNAUTHORIZED", message: "Not signed in" } };

  const parsed = graphLayoutSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } };
  }

  const access = await assertProjectAccess(parsed.data.projectId, userId, "editor");
  if (!access.ok) return access;

  try {
    await db.project.update({
      where: { id: parsed.data.projectId },
      data: { graphLayout: parsed.data.layout },
      select: { id: true },
    });
    return { ok: true, value: undefined };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
  }
}
