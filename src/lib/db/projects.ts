import { cache } from "react";
import type {
  Prisma,
  ProjectSector,
  EximCoverType,
  DealType,
  EnvironmentalCategory,
  ProgramPath,
  ProjectPhase,
} from "@prisma/client";
import { db } from "./index";
import { getProjectAccessById } from "./project-access";
import { toDbError } from "@/lib/utils";
import type {
  Project,
  ProjectListItem,
  ProjectListQuery,
  ProjectListSort,
  Result,
} from "@/types";
import { dedupeDemoPortfolioProjects } from "@/lib/projects/demo-portfolio";

const projectSummarySelect = {
  id: true,
  name: true,
  slug: true,
  countryCode: true,
  sector: true,
  stage: true,
  targetLoiDate: true,
  cachedReadinessScore: true,
  capexUsdCents: true,
  createdAt: true,
  activityEvents: {
    select: {
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc" as const,
    },
    take: 1,
  },
} as const;

const projectFullSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  countryCode: true,
  sector: true,
  capexUsdCents: true,
  dealType: true,
  eximCoverType: true,
  stage: true,
  targetLoiDate: true,
  targetCloseDate: true,
  actualLoiSubmittedDate: true,
  actualLoiApprovedDate: true,
  actualCommitmentDate: true,
  actualCloseDate: true,
  ownerClerkId: true,
  environmentalCategory: true,
  programPath: true,
  userRole: true,
  subNationalLocation: true,
  cachedReadinessScore: true,
  cachedScoreUpdatedAt: true,
  graphLayout: true,
  createdAt: true,
  updatedAt: true,
} as const;

type ProjectFullRow = Prisma.ProjectGetPayload<{ select: typeof projectFullSelect }>;

function toProject(row: ProjectFullRow): Project {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    countryCode: row.countryCode,
    sector: row.sector,
    capexUsdCents: row.capexUsdCents != null ? Number(row.capexUsdCents) : null,
    dealType: row.dealType,
    eximCoverType: row.eximCoverType,
    stage: row.stage,
    targetLoiDate: row.targetLoiDate,
    targetCloseDate: row.targetCloseDate,
    actualLoiSubmittedDate: row.actualLoiSubmittedDate,
    actualLoiApprovedDate: row.actualLoiApprovedDate,
    actualCommitmentDate: row.actualCommitmentDate,
    actualCloseDate: row.actualCloseDate,
    ownerClerkId: row.ownerClerkId,
    environmentalCategory: row.environmentalCategory,
    programPath: row.programPath,
    userRole: row.userRole,
    subNationalLocation: row.subNationalLocation,
    cachedReadinessScore: row.cachedReadinessScore,
    cachedScoreUpdatedAt: row.cachedScoreUpdatedAt,
    graphLayout: parseGraphLayout(row.graphLayout),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function parseGraphLayout(raw: unknown): Record<string, { x: number; y: number }> | null {
  if (!raw || typeof raw !== "object") return null;
  const out: Record<string, { x: number; y: number }> = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (
      val &&
      typeof val === "object" &&
      typeof (val as { x?: unknown }).x === "number" &&
      typeof (val as { y?: unknown }).y === "number" &&
      Number.isFinite((val as { x: number }).x) &&
      Number.isFinite((val as { y: number }).y)
    ) {
      out[key] = { x: (val as { x: number }).x, y: (val as { y: number }).y };
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

export async function getProjectsByUser(
  clerkUserId: string,
  query: ProjectListQuery = {}
): Promise<Result<ProjectListItem[]>> {
  try {
    const sort = query.sort ?? "created_desc";
    const search = query.q?.trim();
    const readinessWhere = getReadinessWhere(query.readiness);
    const filters: Array<Record<string, unknown>> = [
      {
        OR: [
          { ownerClerkId: clerkUserId },
          { members: { some: { clerkUserId } } },
        ],
      },
    ];

    if (search) {
      filters.push({
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { countryCode: { contains: search.toUpperCase(), mode: "insensitive" as const } },
          { slug: { contains: search, mode: "insensitive" as const } },
        ],
      });
    }

    if (query.sector && query.sector !== "all") {
      filters.push({ sector: query.sector });
    }

    if (query.stage && query.stage !== "all") {
      filters.push({ stage: query.stage });
    }

    if (Object.keys(readinessWhere).length > 0) {
      filters.push(readinessWhere);
    }

    const where = {
      AND: filters,
    };

    const rows = await db.project.findMany({
      where,
      select: projectSummarySelect,
      orderBy: getProjectListOrderBy(sort),
    });
    return {
      ok: true,
      value: dedupeDemoPortfolioProjects(
        rows.map((row) => ({
          id: row.id,
          name: row.name,
          slug: row.slug,
          countryCode: row.countryCode,
          sector: row.sector,
          stage: row.stage,
          targetLoiDate: row.targetLoiDate,
          cachedReadinessScore: row.cachedReadinessScore,
          capexUsdCents: row.capexUsdCents != null ? Number(row.capexUsdCents) : null,
          createdAt: row.createdAt,
          lastActivityAt: row.activityEvents[0]?.createdAt ?? null,
        }))
      ),
    };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
  }
}

function getReadinessWhere(
  readiness: ProjectListQuery["readiness"]
) {
  switch (readiness) {
    case "not_started":
      return { cachedReadinessScore: null };
    case "at_risk":
      return { cachedReadinessScore: { gte: 1, lt: 4000 } };
    case "progressing":
      return { cachedReadinessScore: { gte: 4000, lt: 7500 } };
    case "ready":
      return { cachedReadinessScore: { gte: 7500 } };
    default:
      return {};
  }
}

function getProjectListOrderBy(sort: ProjectListSort) {
  switch (sort) {
    case "name_asc":
      return [{ name: "asc" as const }];
    case "readiness_desc":
      return [
        { cachedReadinessScore: { sort: "desc" as const, nulls: "last" as const } },
        { createdAt: "desc" as const },
      ];
    case "loi_asc":
      return [
        { targetLoiDate: { sort: "asc" as const, nulls: "last" as const } },
        { createdAt: "desc" as const },
      ];
    case "last_activity_desc":
      return [
        { createdAt: "desc" as const },
      ];
    case "created_desc":
    default:
      return [{ createdAt: "desc" as const }];
  }
}

/**
 * React.cache-wrapped version of getProjectBySlug. Use inside a nested Next.js
 * layout + page tree so the project record is fetched once per request and
 * reused by every child route that needs it.
 */
export const getCachedProjectBySlug = cache(
  (slug: string, clerkUserId: string): Promise<Result<Project>> =>
    getProjectBySlug(slug, clerkUserId),
);

export type ProjectSidebarSignals = {
  workplanBlockers: number;
  evidenceExpiringSoon: number;
};

/** Cheap indexed counts powering sidebar badges. Two queries, both <50ms. */
export const getProjectSidebarSignals = cache(
  async (projectId: string): Promise<ProjectSidebarSignals> => {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 86400000);
    const [blockers, expiring] = await Promise.all([
      db.projectRequirement.count({
        where: {
          projectId,
          isApplicable: true,
          status: { notIn: ["executed", "waived", "not_applicable"] },
          targetDate: { lt: now },
        },
      }),
      db.document.count({
        where: {
          projectId,
          state: "current",
          expiresAt: { not: null, lt: in30Days, gte: now },
        },
      }),
    ]);
    return { workplanBlockers: blockers, evidenceExpiringSoon: expiring };
  },
);

export async function getProjectBySlug(
  slug: string,
  clerkUserId: string
): Promise<Result<Project>> {
  try {
    const row = await db.project.findFirst({
      where: {
        slug,
        OR: [
          { ownerClerkId: clerkUserId },
          { members: { some: { clerkUserId } } },
        ],
      },
      select: projectFullSelect,
    });
    if (!row) return { ok: false, error: { code: "NOT_FOUND", message: "Project not found." } };
    return { ok: true, value: toProject(row) };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
  }
}

export async function getProjectById(
  id: string,
  clerkUserId: string
): Promise<Result<Project>> {
  try {
    const row = await db.project.findFirst({
      where: {
        id,
        OR: [
          { ownerClerkId: clerkUserId },
          { members: { some: { clerkUserId } } },
        ],
      },
      select: projectFullSelect,
    });
    if (!row) return { ok: false, error: { code: "NOT_FOUND", message: "Project not found." } };
    return { ok: true, value: toProject(row) };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
  }
}

export async function updateProjectRecord(
  id: string,
  clerkUserId: string,
  data: {
    name?: string;
    description?: string | null;
    countryCode?: string;
    sector?: ProjectSector;
    capexUsdCents?: bigint | null;
    eximCoverType?: EximCoverType | null;
    targetLoiDate?: Date | null;
    targetCloseDate?: Date | null;
    stage?: import("@prisma/client").ProjectPhase;
    cachedReadinessScore?: number | null;
    cachedScoreUpdatedAt?: Date | null;
    actualLoiSubmittedDate?: Date | null;
    actualLoiApprovedDate?: Date | null;
    actualCommitmentDate?: Date | null;
    actualCloseDate?: Date | null;
  }
): Promise<Result<Project>> {
  const access = await getProjectAccessById(id, clerkUserId);
  if (!access) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Project not found or access denied." } };
  }
  if (access.role === "viewer") {
    return { ok: false, error: { code: "UNAUTHORIZED", message: "You do not have permission to update this project." } };
  }

  try {
    const row = await db.project.update({
      where: { id },
      data,
      select: projectFullSelect,
    });
    return { ok: true, value: toProject(row) };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
  }
}

export type OverdueLoiProject = {
  id: string;
  name: string;
  slug: string;
  targetLoiDate: Date;
};

/**
 * Returns projects where targetLoiDate is in the past and the project has not
 * yet reached loi_submitted or any later phase.
 */
export async function getOverdueLoiProjects(
  clerkUserId: string
): Promise<Result<OverdueLoiProject[]>> {
  try {
    const closedPhases: ProjectPhase[] = [
      "loi_submitted",
      "loi_approved",
      "pre_commitment",
      "final_commitment",
      "financial_close",
    ];
    const rows = await db.project.findMany({
      where: {
        OR: [
          { ownerClerkId: clerkUserId },
          { members: { some: { clerkUserId } } },
        ],
        targetLoiDate: { lt: new Date() },
        stage: { notIn: closedPhases },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        targetLoiDate: true,
      },
      orderBy: { targetLoiDate: "asc" },
    });
    return {
      ok: true,
      value: rows.filter(
        (r): r is OverdueLoiProject => r.targetLoiDate !== null
      ),
    };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
  }
}

export type PublicProjectSummary = {
  id: string;
  name: string;
  countryCode: string;
  sector: string;
  stage: string;
  dealType: string;
  capexUsdCents: number | null;
  cachedReadinessScore: number | null;
  description: string | null;
  subNationalLocation: string | null;
};

export async function getProjectByIdPublic(
  id: string
): Promise<Result<PublicProjectSummary>> {
  try {
    const row = await db.project.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        countryCode: true,
        sector: true,
        stage: true,
        dealType: true,
        capexUsdCents: true,
        cachedReadinessScore: true,
        description: true,
        subNationalLocation: true,
      },
    });
    if (!row) return { ok: false, error: { code: "NOT_FOUND", message: "Project not found." } };
    return {
      ok: true,
      value: { ...row, capexUsdCents: row.capexUsdCents != null ? Number(row.capexUsdCents) : null },
    };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
  }
}

export type CreateProjectInput = {
  name: string;
  slug: string;
  description: string | null;
  countryCode: string;
  sector: ProjectSector;
  dealType: DealType;
  capexUsdCents: bigint | null;
  eximCoverType: EximCoverType | null;
  environmentalCategory: EnvironmentalCategory | null;
  programPath: ProgramPath;
  stage: ProjectPhase;
  targetLoiDate: Date | null;
  targetCloseDate: Date | null;
  ownerClerkId: string;
  userRole: string | null;
  subNationalLocation: string | null;
};

export async function createProjectRecord(
  input: CreateProjectInput
): Promise<Result<Project>> {
  try {
    const row = await db.project.create({
      data: input,
      select: projectFullSelect,
    });
    return { ok: true, value: toProject(row) };
  } catch (err) {
    const dbErr = toDbError(err);
    if (dbErr.message.toLowerCase().includes("unique")) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "A project with that name already exists.",
        },
      };
    }
    return { ok: false, error: dbErr };
  }
}
