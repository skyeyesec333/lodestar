import type {
  ProjectSector,
  EximCoverType,
  DealType,
  EnvironmentalCategory,
  ProgramPath,
  ProjectPhase,
} from "@prisma/client";
import { db } from "./index";
import type {
  Project,
  ProjectListItem,
  ProjectListQuery,
  ProjectListSort,
  Result,
} from "@/types";
import { dedupeDemoPortfolioProjects } from "@/lib/projects/demo-portfolio";

// ── Select shapes ─────────────────────────────────────────────────────────────

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
  ownerClerkId: true,
  cachedReadinessScore: true,
  cachedScoreUpdatedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

// ── Query helpers ─────────────────────────────────────────────────────────────

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
          capexUsdCents: row.capexUsdCents,
          createdAt: row.createdAt,
          lastActivityAt: row.activityEvents[0]?.createdAt ?? null,
        }))
      ),
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
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
    case "created_desc":
    default:
      return [{ createdAt: "desc" as const }];
  }
}

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
    return { ok: true, value: row };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
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
    return { ok: true, value: row };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
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
  }
): Promise<Result<Project>> {
  try {
    const row = await db.project.update({
      where: { id, ownerClerkId: clerkUserId },
      data,
      select: projectFullSelect,
    });
    return { ok: true, value: row };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

// ── Write helpers ─────────────────────────────────────────────────────────────

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
};

export async function createProjectRecord(
  input: CreateProjectInput
): Promise<Result<Project>> {
  try {
    const row = await db.project.create({
      data: input,
      select: projectFullSelect,
    });
    return { ok: true, value: row };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown database error";
    if (message.toLowerCase().includes("unique")) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "A project with that name already exists.",
        },
      };
    }
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}
