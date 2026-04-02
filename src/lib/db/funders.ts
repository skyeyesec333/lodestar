import { db } from "./index";
import type { AppError, Result } from "@/types";

export type FunderConditionRow = {
  id: string;
  description: string;
  status: string; // "open" | "in_progress" | "satisfied" | "waived"
  projectRequirementId: string | null;
  requirementName: string | null;
  dueDate: Date | null;
  satisfiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type FunderRelationshipRow = {
  id: string;
  projectId: string;
  organizationId: string;
  organizationName: string;
  funderType: string; // "exim" | "dfi" | "commercial_bank" | "equity" | "mezzanine" | "other"
  engagementStage: string; // "identified" | "initial_contact" | "due_diligence" | "term_sheet" | "committed" | "declined"
  amountUsdCents: number | null;
  notes: string | null;
  lastContactDate: Date | null;
  nextFollowupDate: Date | null;
  conditions: FunderConditionRow[];
  createdAt: Date;
  updatedAt: Date;
};

function shapeCondition(raw: {
  id: string;
  description: string;
  status: string;
  projectRequirementId: string | null;
  dueDate: Date | null;
  satisfiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  projectRequirement: {
    requirement: {
      name: string;
    };
  } | null;
}): FunderConditionRow {
  return {
    id: raw.id,
    description: raw.description,
    status: raw.status,
    projectRequirementId: raw.projectRequirementId,
    requirementName: raw.projectRequirement?.requirement.name ?? null,
    dueDate: raw.dueDate,
    satisfiedAt: raw.satisfiedAt,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

async function findOrCreateOrg(name: string): Promise<{ id: string; name: string }> {
  const existing = await db.organization.findFirst({
    where: { name },
    select: { id: true, name: true },
  });
  if (existing) return existing;
  return db.organization.create({
    data: { name },
    select: { id: true, name: true },
  });
}

void findOrCreateOrg;

export async function getProjectFunders(
  projectId: string
): Promise<Result<FunderRelationshipRow[]>> {
  try {
    const relationships = await db.funderRelationship.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        projectId: true,
        organizationId: true,
        funderType: true,
        engagementStage: true,
        amountUsdCents: true,
        notes: true,
        lastContactDate: true,
        nextFollowupDate: true,
        createdAt: true,
        updatedAt: true,
        organization: {
          select: { name: true },
        },
        conditions: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            description: true,
            status: true,
            projectRequirementId: true,
            dueDate: true,
            satisfiedAt: true,
            createdAt: true,
            updatedAt: true,
            projectRequirement: {
              select: {
                requirement: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
    });

    return {
      ok: true,
      value: relationships.map((r) => ({
        id: r.id,
        projectId: r.projectId,
        organizationId: r.organizationId,
        organizationName: r.organization.name,
        funderType: r.funderType as string,
        engagementStage: r.engagementStage as string,
        amountUsdCents: r.amountUsdCents != null ? Number(r.amountUsdCents) : null,
        notes: r.notes,
        lastContactDate: r.lastContactDate,
        nextFollowupDate: r.nextFollowupDate,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        conditions: r.conditions.map(shapeCondition),
      })),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

export async function createFunderRelationship(data: {
  projectId: string;
  organizationName: string;
  funderType: string;
  engagementStage?: string;
  amountUsdCents?: number | null;
  notes?: string | null;
  lastContactDate?: Date | null;
  nextFollowupDate?: Date | null;
}): Promise<Result<FunderRelationshipRow>> {
  try {
    const slug = data.organizationName.toLowerCase().replace(/\s+/g, "-");
    const org = await db.organization.upsert({
      where: { id: `funder-org-${slug}` },
      update: {},
      create: {
        id: `funder-org-${slug}`,
        name: data.organizationName,
        isUsEntity: false,
        countryCode: null,
      },
      select: { id: true, name: true },
    });

    const created = await db.funderRelationship.create({
      data: {
        projectId: data.projectId,
        organizationId: org.id,
        funderType: data.funderType as import("@prisma/client").FunderType,
        engagementStage: (data.engagementStage ?? "identified") as import("@prisma/client").FunderEngagementStage,
        amountUsdCents: data.amountUsdCents != null ? BigInt(data.amountUsdCents) : null,
        notes: data.notes ?? null,
        lastContactDate: data.lastContactDate ?? null,
        nextFollowupDate: data.nextFollowupDate ?? null,
      },
      select: {
        id: true,
        projectId: true,
        organizationId: true,
        funderType: true,
        engagementStage: true,
        amountUsdCents: true,
        notes: true,
        lastContactDate: true,
        nextFollowupDate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      ok: true,
      value: {
        id: created.id,
        projectId: created.projectId,
        organizationId: created.organizationId,
        organizationName: org.name,
        funderType: created.funderType as string,
        engagementStage: created.engagementStage as string,
        amountUsdCents: created.amountUsdCents != null ? Number(created.amountUsdCents) : null,
        notes: created.notes,
        lastContactDate: created.lastContactDate,
        nextFollowupDate: created.nextFollowupDate,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
        conditions: [],
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

export async function updateFunderRelationship(
  id: string,
  data: {
    engagementStage?: string;
    amountUsdCents?: number | null;
    notes?: string | null;
    lastContactDate?: Date | null;
    nextFollowupDate?: Date | null;
  }
): Promise<Result<void>> {
  try {
    const updateData: Parameters<typeof db.funderRelationship.update>[0]["data"] = {};

    if (data.engagementStage !== undefined) {
      updateData.engagementStage = data.engagementStage as import("@prisma/client").FunderEngagementStage;
    }
    if (data.amountUsdCents !== undefined) {
      updateData.amountUsdCents = data.amountUsdCents != null ? BigInt(data.amountUsdCents) : null;
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }
    if (data.lastContactDate !== undefined) {
      updateData.lastContactDate = data.lastContactDate;
    }
    if (data.nextFollowupDate !== undefined) {
      updateData.nextFollowupDate = data.nextFollowupDate;
    }

    await db.funderRelationship.update({
      where: { id },
      data: updateData,
      select: { id: true },
    });

    return { ok: true, value: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

export async function deleteFunderRelationship(id: string): Promise<Result<void>> {
  try {
    await db.funderRelationship.delete({ where: { id } });
    return { ok: true, value: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

export async function addFunderCondition(data: {
  funderRelationshipId: string;
  description: string;
  dueDate?: Date | null;
  projectRequirementId?: string | null;
}): Promise<Result<FunderConditionRow>> {
  try {
    const created = await db.funderCondition.create({
      data: {
        funderRelationshipId: data.funderRelationshipId,
        description: data.description,
        status: "open",
        projectRequirementId: data.projectRequirementId ?? null,
        dueDate: data.dueDate ?? null,
        satisfiedAt: null,
      },
      select: {
        id: true,
        description: true,
        status: true,
        projectRequirementId: true,
        dueDate: true,
        satisfiedAt: true,
        createdAt: true,
        updatedAt: true,
        projectRequirement: {
          select: {
            requirement: {
              select: { name: true },
            },
          },
        },
      },
    });

    return {
      ok: true,
      value: shapeCondition(created),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

export async function updateFunderConditionStatus(
  id: string,
  status: string,
  satisfiedAt?: Date | null
): Promise<Result<void>> {
  try {
    const updateData: Parameters<typeof db.funderCondition.update>[0]["data"] = {
      status: status as import("@prisma/client").FunderConditionStatus,
    };
    if (satisfiedAt !== undefined) {
      updateData.satisfiedAt = satisfiedAt;
    }

    await db.funderCondition.update({
      where: { id },
      data: updateData,
      select: { id: true },
    });

    return { ok: true, value: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

export async function deleteFunderCondition(id: string): Promise<Result<void>> {
  try {
    await db.funderCondition.delete({ where: { id } });
    return { ok: true, value: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

// Satisfy the unused AppError import — it is used via Result<T> generic
const _appErrorCheck: AppError | undefined = undefined;
void _appErrorCheck;
