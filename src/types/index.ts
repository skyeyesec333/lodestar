import type {
  ProjectSector,
  EximCoverType,
  ProjectPhase,
} from "@prisma/client";

// Re-export Prisma enums — the rest of the app imports enums from here, not @prisma/client
export type { ProjectSector, EximCoverType, ProjectPhase };

// ── Result / error types ──────────────────────────────────────────────────────

export type AppError = {
  code: "UNAUTHORIZED" | "NOT_FOUND" | "VALIDATION_ERROR" | "DATABASE_ERROR";
  message: string;
};

export type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// ── Project domain types ──────────────────────────────────────────────────────

export type Project = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  countryCode: string;
  sector: ProjectSector;
  capexUsdCents: bigint | null;
  eximCoverType: EximCoverType | null;
  stage: ProjectPhase;
  targetLoiDate: Date | null;
  targetCloseDate: Date | null;
  ownerClerkId: string;
  cachedReadinessScore: number | null;
  cachedScoreUpdatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Lean projection used for list views. */
export type ProjectSummary = Pick<
  Project,
  | "id"
  | "name"
  | "slug"
  | "countryCode"
  | "sector"
  | "stage"
  | "targetLoiDate"
  | "cachedReadinessScore"
  | "createdAt"
>;

export type ProjectListSort =
  | "created_desc"
  | "name_asc"
  | "readiness_desc"
  | "loi_asc";

export type ProjectReadinessFilter =
  | "all"
  | "not_started"
  | "at_risk"
  | "progressing"
  | "ready";

export type ProjectListQuery = {
  q?: string;
  sector?: ProjectSector | "all";
  stage?: ProjectPhase | "all";
  readiness?: ProjectReadinessFilter;
  sort?: ProjectListSort;
};

export type {
  ChatCitation,
  ChatContextDocument,
  ChatMessage,
  ChatRequest,
  ChatRole,
  ChatRuntimeContext,
} from "@/types/chat";
