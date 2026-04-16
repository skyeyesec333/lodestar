import type {
  ProjectSector,
  EximCoverType,
  ProjectPhase,
  DealType,
  EnvironmentalCategory,
  ProgramPath,
} from "@prisma/client";
import type { RequirementStatusValue } from "@/types/requirements";

export type { ProjectSector, EximCoverType, ProjectPhase, DealType, EnvironmentalCategory, ProgramPath };

export type AppError = {
  code: "UNAUTHORIZED" | "NOT_FOUND" | "VALIDATION_ERROR" | "DATABASE_ERROR" | "INVALID_TRANSITION";
  message: string;
};

export type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };


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
  CommentRow,
  CommentMentionRow,
  WatcherRow,
  ApprovalRow,
  ApprovalHistoryEntry,
} from "@/types/collaboration";


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


export type WalkthroughData = {
  projectName: string;
  dealType: string;
  stage: string;
  country: string;
  sector: string;
  readinessPct: number;
  loiReady: boolean;
  loiBlockerCount: number;
  loiBlockerNames: string[];
  categoryBreakdown: Array<{
    category: string;
    label: string;
    total: number;
    completed: number;
    scorePct: number;
  }>;
  conceptThesis: string | null;
  conceptPromptsRemaining: number;
  goNoGoRecommendation: string | null;
  stakeholderCount: number;
  epcBidCount: number;
  funderCount: number;
  covenantCount: number;
  capexUsdCents: number | null;
  eximCoverType: string | null;
  totalRequirements: number;
  doneRequirements: number;
  overdueCount: number;
  unassignedCriticalCount: number;
  missingEvidenceCount: number;
  documentCount: number;
  linkedCoveragePct: number;
  orphanedEvidenceCount: number;
  expiringDocumentCount: number;
  meetingCount: number;
  recentVelocity: number;
  daysToNextGate: number | null;
  nextGateLabel: string;
  actualLoiSubmittedDate: string | null;
  actualLoiApprovedDate: string | null;
  actualCommitmentDate: string | null;
  actualCloseDate: string | null;
};



export type RequirementInput = {
  requirementId: string;
  status: RequirementStatusValue;
};

export type ReadinessResult = {
  scoreBps: number;
  loiReady: boolean;
  loiBlockers: string[];
  categoryScores: Record<string, number>;
};


export type DealTypeValue =
  | "exim_project_finance"
  | "development_finance"
  | "commercial_finance"
  | "private_equity"
  | "blended_finance"
  | "other";

export type DealTypeResult = {
  dealType: DealTypeValue;
};

export type ProgramConfig = {
  label: string;
  primaryGateLabel: string;
  phaseLabels: Record<string, string>;
  hasBlockerColumn: boolean;
};

/** Subset safe to pass across the server/client boundary (no BigInt, no Date). */
export type SerializableProject = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  countryCode: string;
  sector: ProjectSector;
  dealType: DealType;
  capexUsdCents: number | null;
  eximCoverType: EximCoverType | null;
  stage: ProjectPhase;
  targetLoiDate: string | null;
};


export type ExistingProjectOption = {
  id: string;
  name: string;
  slug: string;
};


export type ChatPresetQuestion = {
  id: string;
  label: string;
  question: string;
};
