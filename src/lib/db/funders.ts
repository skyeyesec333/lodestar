import { db } from "./index";
import { toDbError } from "@/lib/utils";
import type { Result } from "@/types";

export type FunderConditionRow = {
  id: string;
  description: string;
  status: string; // "open" | "in_progress" | "satisfied" | "waived"
  projectRequirementId: string | null;
  requirementName: string | null;
  dueDate: Date | null;
  satisfiedAt: Date | null;
  satisfiedByUserId: string | null;
  evidenceDocumentId: string | null;
  evidenceDocumentFilename: string | null;
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
  satisfiedByUserId?: string | null;
  evidenceDocumentId?: string | null;
  evidenceDocument?: { filename: string } | null;
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
    satisfiedByUserId: raw.satisfiedByUserId ?? null,
    evidenceDocumentId: raw.evidenceDocumentId ?? null,
    evidenceDocumentFilename: raw.evidenceDocument?.filename ?? null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export async function getProjectFunders(
  projectId: string
): Promise<Result<FunderRelationshipRow[]>> {
  try {
    const relationships = await db.funderRelationship.findMany({
      where: { projectId, deletedAt: null },
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
            satisfiedByUserId: true,
            evidenceDocumentId: true,
            evidenceDocument: { select: { filename: true } },
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
    return { ok: false, error: toDbError(err) };
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
    return { ok: false, error: toDbError(err) };
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
    return { ok: false, error: toDbError(err) };
  }
}

export async function deleteFunderRelationship(id: string, userId?: string | null): Promise<Result<void>> {
  try {
    await db.funderRelationship.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId ?? null },
      select: { id: true },
    });
    return { ok: true, value: undefined };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
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
        satisfiedByUserId: true,
        evidenceDocumentId: true,
        evidenceDocument: { select: { filename: true } },
        createdAt: true,
        updatedAt: true,
        projectRequirement: {
          select: {
            requirement: {
              select: { name: true } },
          },
        },
      },
    });

    return {
      ok: true,
      value: shapeCondition(created),
    };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
  }
}

export async function updateFunderConditionStatus(
  id: string,
  status: string,
  satisfiedAt?: Date | null
): Promise<Result<void>> {
  try {
    const existingCondition = await db.funderCondition.findUnique({
      where: { id },
      select: { status: true, satisfiedAt: true },
    });
    if (!existingCondition) {
      return { ok: false, error: { code: "NOT_FOUND", message: "Condition not found." } };
    }

    if (existingCondition.status === "satisfied" && status !== "satisfied") {
      return { ok: false, error: { code: "VALIDATION_ERROR", message: "Cannot revert a satisfied condition. Create a new condition if requirements have changed." } };
    }

    const updateData: Parameters<typeof db.funderCondition.update>[0]["data"] = {
      status: status as import("@prisma/client").FunderConditionStatus,
    };

    if (status === "satisfied" && !existingCondition.satisfiedAt) {
      updateData.satisfiedAt = new Date();
    } else if (satisfiedAt !== undefined) {
      updateData.satisfiedAt = satisfiedAt;
    }

    await db.funderCondition.update({
      where: { id },
      data: updateData,
      select: { id: true },
    });

    return { ok: true, value: undefined };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
  }
}

export async function deleteFunderCondition(id: string): Promise<Result<void>> {
  try {
    await db.funderCondition.delete({ where: { id } });
    return { ok: true, value: undefined };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
  }
}

export async function confirmConditionSatisfaction(
  conditionId: string,
  userId: string,
  evidenceDocumentId?: string
): Promise<Result<void>> {
  try {
    await db.funderCondition.update({
      where: { id: conditionId },
      data: {
        status: "satisfied" as import("@prisma/client").FunderConditionStatus,
        satisfiedAt: new Date(),
        satisfiedByUserId: userId,
        ...(evidenceDocumentId ? { evidenceDocumentId } : {}),
      },
      select: { id: true },
    });
    return { ok: true, value: undefined };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
  }
}


