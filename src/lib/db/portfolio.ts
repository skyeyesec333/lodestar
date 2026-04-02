import { db } from "./index";
import { dedupeDemoPortfolioProjects } from "@/lib/projects/demo-portfolio";
import { buildProjectOperatingMetrics } from "@/lib/projects/operating-metrics";
import { getRequirementsForDealType } from "@/lib/requirements";
import type { DocumentRow } from "@/lib/db/documents";
import type { ProjectRequirementRow } from "@/lib/db/requirements";
import type { RequirementStatusValue } from "@/types/requirements";
import type { Result } from "@/types";

const requirementSelect = {
  id: true,
  projectId: true,
  requirementId: true,
  status: true,
  notes: true,
  isApplicable: true,
  responsibleOrganizationId: true,
  responsibleOrganization: { select: { name: true } },
  responsibleStakeholderId: true,
  responsibleStakeholder: { select: { name: true } },
  targetDate: true,
  applicabilityReason: true,
} as const;

const documentSelect = {
  id: true,
  projectId: true,
  documentGroupId: true,
  version: true,
  filename: true,
  storagePath: true,
  contentType: true,
  sizeBytes: true,
  uploadedBy: true,
  state: true,
  projectRequirementId: true,
  expiresAt: true,
  expiryAlertDismissedAt: true,
  createdAt: true,
} as const;

type RequirementStatusRow = {
  id: string;
  projectId: string;
  requirementId: string;
  status: string;
  notes: string | null;
  isApplicable: boolean;
  responsibleOrganizationId: string | null;
  responsibleOrganization: { name: string } | null;
  responsibleStakeholderId: string | null;
  responsibleStakeholder: { name: string } | null;
  targetDate: Date | null;
  applicabilityReason: string | null;
};

function buildRequirementRowsForProject(
  dealType: string,
  rows: RequirementStatusRow[]
): ProjectRequirementRow[] {
  const definitions = getRequirementsForDealType(dealType);
  const statusByRequirementId = new Map(rows.map((row) => [row.requirementId, row]));

  return definitions.map((definition) => {
    const status = statusByRequirementId.get(definition.id);
    return {
      projectRequirementId: status?.id ?? "",
      requirementId: definition.id,
      name: definition.name,
      description: definition.description,
      category: definition.category,
      phaseRequired: definition.phaseRequired,
      isLoiCritical: definition.isPrimaryGate,
      weight: definition.weight,
      sortOrder: definition.sortOrder,
      status: (status?.status ?? "not_started") as RequirementStatusValue,
      notes: status?.notes ?? null,
      isApplicable: status?.isApplicable ?? true,
      responsibleOrganizationId: status?.responsibleOrganizationId ?? null,
      responsibleOrganizationName: status?.responsibleOrganization?.name ?? null,
      responsibleStakeholderId: status?.responsibleStakeholderId ?? null,
      responsibleStakeholderName: status?.responsibleStakeholder?.name ?? null,
      targetDate: status?.targetDate ?? null,
      applicabilityReason: status?.applicabilityReason ?? null,
      recentNotes: [],
    };
  });
}

function getReadinessScore(
  cachedReadinessScore: number | null,
  metricsDoneCount: number,
  applicableCount: number
): { readinessScore: number; readinessBps: number | null } {
  if (cachedReadinessScore != null) {
    return {
      readinessScore: Math.round(cachedReadinessScore / 100),
      readinessBps: cachedReadinessScore,
    };
  }

  if (applicableCount <= 0) {
    return { readinessScore: 0, readinessBps: null };
  }

  const readinessBps = Math.round((metricsDoneCount / applicableCount) * 10_000);
  return {
    readinessScore: Math.round(readinessBps / 100),
    readinessBps,
  };
}

export type PortfolioProjectRow = {
  id: string;
  name: string;
  slug: string;
  countryCode: string;
  sector: string;
  stage: string;
  dealType: string;
  targetLoiDate: Date | null;
  targetCloseDate: Date | null;
  cachedReadinessScore: number | null;
  readinessScore: number;
  readinessBps: number | null;
  capexUsdCents: bigint | null;
  totalRequirements: number;
  completedRequirements: number;
  createdAt: Date;
  lastActivityAt: Date | null;
  requirements: ProjectRequirementRow[];
  documents: DocumentRow[];
};

export async function getPortfolioStats(
  clerkUserId: string
): Promise<Result<PortfolioProjectRow[]>> {
  try {
    const projects = await db.project.findMany({
      where: {
        OR: [
          { ownerClerkId: clerkUserId },
          { members: { some: { clerkUserId } } },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        countryCode: true,
        sector: true,
        stage: true,
        dealType: true,
        targetLoiDate: true,
        targetCloseDate: true,
        cachedReadinessScore: true,
        capexUsdCents: true,
        createdAt: true,
        activityEvents: {
          select: { createdAt: true },
          orderBy: { createdAt: "desc" as const },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const baseRows = dedupeDemoPortfolioProjects(
      projects.map((project) => ({
        id: project.id,
        name: project.name,
        slug: project.slug,
        countryCode: project.countryCode,
        sector: project.sector,
        stage: project.stage,
        dealType: project.dealType,
        targetLoiDate: project.targetLoiDate,
        targetCloseDate: project.targetCloseDate,
        cachedReadinessScore: project.cachedReadinessScore,
        capexUsdCents: project.capexUsdCents,
        createdAt: project.createdAt,
        lastActivityAt: project.activityEvents[0]?.createdAt ?? null,
      }))
    );

    const projectIds = new Set(baseRows.map((project) => project.id));

    const [statusRows, documentRows] = await Promise.all([
      db.projectRequirement.findMany({
        where: { projectId: { in: Array.from(projectIds) } },
        select: requirementSelect,
      }),
      db.document.findMany({
        where: {
          projectId: { in: Array.from(projectIds) },
          state: "current",
        },
        select: documentSelect,
        orderBy: [{ projectId: "asc" }, { createdAt: "desc" }],
      }),
    ]);

    const statusesByProjectId = new Map<string, RequirementStatusRow[]>();
    for (const row of statusRows as RequirementStatusRow[]) {
      const existing = statusesByProjectId.get(row.projectId);
      if (existing) existing.push(row);
      else statusesByProjectId.set(row.projectId, [row]);
    }

    const documentsByProjectId = new Map<string, DocumentRow[]>();
    for (const row of documentRows) {
      const existing = documentsByProjectId.get(row.projectId);
      const shaped: DocumentRow = {
        ...row,
        sizeBytes: Number(row.sizeBytes),
      };
      if (existing) existing.push(shaped);
      else documentsByProjectId.set(row.projectId, [shaped]);
    }

    const rows: PortfolioProjectRow[] = baseRows.map((project) => {
      const statusRowsForProject = statusesByProjectId.get(project.id) ?? [];
      const documents = documentsByProjectId.get(project.id) ?? [];
      const requirements = buildRequirementRowsForProject(project.dealType, statusRowsForProject);
      const metrics = buildProjectOperatingMetrics({
        stage: project.stage,
        dealType: project.dealType,
        targetLoiDate: project.targetLoiDate,
        targetCloseDate: project.targetCloseDate,
        requirements,
        documents,
      });
      const applicableRequirements = requirements.filter(
        (requirement) => requirement.isApplicable !== false
      );
      const readiness = getReadinessScore(
        project.cachedReadinessScore,
        metrics.doneCount,
        applicableRequirements.length
      );

      return {
        id: project.id,
        name: project.name,
        slug: project.slug,
        countryCode: project.countryCode,
        sector: String(project.sector),
        stage: project.stage,
        dealType: project.dealType,
        targetLoiDate: project.targetLoiDate,
        targetCloseDate: project.targetCloseDate,
        cachedReadinessScore: project.cachedReadinessScore,
        readinessScore: readiness.readinessScore,
        readinessBps: readiness.readinessBps,
        capexUsdCents: project.capexUsdCents,
        totalRequirements: applicableRequirements.length,
        completedRequirements: metrics.doneCount,
        createdAt: project.createdAt,
        lastActivityAt: project.lastActivityAt,
        requirements,
        documents,
      };
    });

    return { ok: true, value: rows };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}
