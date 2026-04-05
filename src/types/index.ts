import type {
  ProjectSector,
  EximCoverType,
  ProjectPhase,
  DealType,
  EnvironmentalCategory,
  ProgramPath,
} from "@prisma/client";

// Re-export Prisma enums — the rest of the app imports enums from here, not @prisma/client
export type { ProjectSector, EximCoverType, ProjectPhase, DealType, EnvironmentalCategory, ProgramPath };

// ── Result / error types ──────────────────────────────────────────────────────

export type AppError = {
  code: "UNAUTHORIZED" | "NOT_FOUND" | "VALIDATION_ERROR" | "DATABASE_ERROR" | "INVALID_TRANSITION";
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
  capexUsdCents: number | null;
  dealType: DealType;
  eximCoverType: EximCoverType | null;
  stage: ProjectPhase;
  targetLoiDate: Date | null;
  targetCloseDate: Date | null;
  actualLoiSubmittedDate?: Date | null;
  actualLoiApprovedDate?: Date | null;
  actualCommitmentDate?: Date | null;
  actualCloseDate?: Date | null;
  ownerClerkId: string;
  environmentalCategory: EnvironmentalCategory | null;
  programPath: ProgramPath;
  userRole: string | null;
  subNationalLocation: string | null;
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

export type ProjectListItem = ProjectSummary & {
  capexUsdCents: number | null;
  lastActivityAt: Date | null;
};

export type ProjectListSort =
  | "created_desc"
  | "name_asc"
  | "readiness_desc"
  | "loi_asc"
  | "last_activity_desc";

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

export type {
  TeamMember,
} from "@/types/collaboration";

// ── Stakeholder domain types ──────────────────────────────────────────────────

export type Stakeholder = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  organizationId: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastContactedAt?: Date | null;
  deletedAt?: Date | null;
  deletedBy?: string | null;
};

// ── Funder domain types ───────────────────────────────────────────────────────

export type FunderRelationship = {
  id: string;
  projectId: string;
  organizationId: string;
  funderType: string;
  engagementStage: string;
  amountUsdCents: number | null;
  notes: string | null;
  lastContactDate: Date | null;
  nextFollowupDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  deletedBy?: string | null;
};

// ── Deal configuration types ──────────────────────────────────────────────────

export type DealConfig = {
  id: string;
  projectId: string;
  readinessThresholdBps: number;
  requireConcept: boolean;
  requireMilestoneDate: boolean;
};

// ── Covenant domain types ────────────────────────────────────────────────────

// ── Beacon AI panel types ─────────────────────────────────────────────────────

export type BeaconSignalLevel = "critical" | "warning" | "info";

export type BeaconSignal = {
  level: BeaconSignalLevel;
  label: string;
  detail: string;
  category: string;
};

export type BeaconDocumentCoverage = {
  category: string;
  covered: number;
  total: number;
  gap: string[];
};

export type Covenant = {
  id: string;
  projectId: string;
  funderId: string | null;
  funderName: string | null;
  title: string;
  covenantType: string;
  frequency: string;
  nextDueAt: Date | null;
  lastSatisfiedAt: Date | null;
  status: string;
  waiverGrantedAt: Date | null;
  waiverGrantedBy: string | null;
  waiverReason: string | null;
  waiverExpiresAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};
