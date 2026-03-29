import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
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

type FunderRelationshipQueryRow = {
  id: string;
  projectId: string;
  organizationId: string;
  organizationName: string;
  funderType: string;
  engagementStage: string;
  amountUsdCents: bigint | null;
  notes: string | null;
  lastContactDate: Date | null;
  nextFollowupDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type FunderConditionQueryRow = {
  id: string;
  description: string;
  status: string;
  projectRequirementId: string | null;
  requirementName: string | null;
  dueDate: Date | null;
  satisfiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  funderRelationshipId: string;
};

function mapCondition(row: FunderConditionQueryRow): FunderConditionRow {
  return {
    id: row.id,
    description: row.description,
    status: row.status,
    projectRequirementId: row.projectRequirementId,
    requirementName: row.requirementName,
    dueDate: row.dueDate,
    satisfiedAt: row.satisfiedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapRelationship(
  row: FunderRelationshipQueryRow,
  conditions: FunderConditionRow[]
): FunderRelationshipRow {
  return {
    id: row.id,
    projectId: row.projectId,
    organizationId: row.organizationId,
    organizationName: row.organizationName,
    funderType: row.funderType,
    engagementStage: row.engagementStage,
    amountUsdCents: row.amountUsdCents != null ? Number(row.amountUsdCents) : null,
    notes: row.notes,
    lastContactDate: row.lastContactDate,
    nextFollowupDate: row.nextFollowupDate,
    conditions,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
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

async function getRequirementName(projectRequirementId: string | null): Promise<string | null> {
  if (!projectRequirementId) return null;

  const rows = await db.$queryRaw<Array<{ requirementName: string | null }>>(Prisma.sql`
    SELECT er.name AS "requirementName"
    FROM requirement_statuses rs
    INNER JOIN exim_requirements er
      ON er.id = rs."requirementId"
    WHERE rs.id = ${projectRequirementId}
    LIMIT 1
  `);

  return rows[0]?.requirementName ?? null;
}

export async function getProjectFunders(
  projectId: string
): Promise<Result<FunderRelationshipRow[]>> {
  try {
    const [relationshipRows, conditionRows] = await Promise.all([
      db.$queryRaw<FunderRelationshipQueryRow[]>(Prisma.sql`
        SELECT
          fr.id,
          fr."projectId" AS "projectId",
          fr."organizationId" AS "organizationId",
          o.name AS "organizationName",
          fr."funderType" AS "funderType",
          fr."engagementStage" AS "engagementStage",
          fr."amountUsdCents" AS "amountUsdCents",
          fr.notes,
          fr."lastContactDate" AS "lastContactDate",
          fr."nextFollowupDate" AS "nextFollowupDate",
          fr."createdAt" AS "createdAt",
          fr."updatedAt" AS "updatedAt"
        FROM funder_relationships fr
        INNER JOIN organizations o
          ON o.id = fr."organizationId"
        WHERE fr."projectId" = ${projectId}
        ORDER BY fr."createdAt" ASC
      `),
      db.$queryRaw<FunderConditionQueryRow[]>(Prisma.sql`
        SELECT
          fc.id,
          fc.description,
          fc.status,
          fc."projectRequirementId" AS "projectRequirementId",
          er.name AS "requirementName",
          fc."dueDate" AS "dueDate",
          fc."satisfiedAt" AS "satisfiedAt",
          fc."createdAt" AS "createdAt",
          fc."updatedAt" AS "updatedAt",
          fc."funderRelationshipId" AS "funderRelationshipId"
        FROM funder_conditions fc
        INNER JOIN funder_relationships fr
          ON fr.id = fc."funderRelationshipId"
        LEFT JOIN requirement_statuses rs
          ON rs.id = fc."projectRequirementId"
        LEFT JOIN exim_requirements er
          ON er.id = rs."requirementId"
        WHERE fr."projectId" = ${projectId}
        ORDER BY fc."createdAt" ASC
      `),
    ]);

    const conditionsByRelationship = new Map<string, FunderConditionRow[]>();
    for (const row of conditionRows) {
      const shaped = mapCondition(row);
      const existing = conditionsByRelationship.get(row.funderRelationshipId);
      if (existing) {
        existing.push(shaped);
      } else {
        conditionsByRelationship.set(row.funderRelationshipId, [shaped]);
      }
    }

    return {
      ok: true,
      value: relationshipRows.map((row) => mapRelationship(row, conditionsByRelationship.get(row.id) ?? [])),
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
    });

    const rows = await db.$queryRaw<FunderRelationshipQueryRow[]>(Prisma.sql`
      INSERT INTO funder_relationships (
        id,
        "projectId",
        "organizationId",
        "funderType",
        "engagementStage",
        "amountUsdCents",
        notes,
        "lastContactDate",
        "nextFollowupDate",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${data.projectId},
        ${org.id},
        ${data.funderType},
        ${data.engagementStage ?? "identified"},
        ${data.amountUsdCents == null ? null : BigInt(data.amountUsdCents)},
        ${data.notes ?? null},
        ${data.lastContactDate ?? null},
        ${data.nextFollowupDate ?? null},
        ${new Date()},
        ${new Date()}
      )
      RETURNING
        id,
        "projectId" AS "projectId",
        "organizationId" AS "organizationId",
        "funderType" AS "funderType",
        "engagementStage" AS "engagementStage",
        "amountUsdCents" AS "amountUsdCents",
        notes,
        "lastContactDate" AS "lastContactDate",
        "nextFollowupDate" AS "nextFollowupDate",
        "createdAt" AS "createdAt",
        "updatedAt" AS "updatedAt"
    `);

    const row = rows[0];
    if (!row) {
      throw new Error("Insert returned no funder row.");
    }

    return {
      ok: true,
      value: mapRelationship(
        {
          ...row,
          organizationName: org.name,
        },
        []
      ),
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
    const sets: Prisma.Sql[] = [];
    if (data.engagementStage !== undefined) {
      sets.push(Prisma.sql`"engagementStage" = ${data.engagementStage}`);
    }
    if (data.amountUsdCents !== undefined) {
      sets.push(Prisma.sql`"amountUsdCents" = ${data.amountUsdCents == null ? null : BigInt(data.amountUsdCents)}`);
    }
    if (data.notes !== undefined) {
      sets.push(Prisma.sql`notes = ${data.notes}`);
    }
    if (data.lastContactDate !== undefined) {
      sets.push(Prisma.sql`"lastContactDate" = ${data.lastContactDate}`);
    }
    if (data.nextFollowupDate !== undefined) {
      sets.push(Prisma.sql`"nextFollowupDate" = ${data.nextFollowupDate}`);
    }
    sets.push(Prisma.sql`"updatedAt" = ${new Date()}`);

    await db.$executeRaw(Prisma.sql`
      UPDATE funder_relationships
      SET ${Prisma.join(sets, ", ")}
      WHERE id = ${id}
    `);

    return { ok: true, value: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

export async function deleteFunderRelationship(id: string): Promise<Result<void>> {
  try {
    await db.$executeRaw(Prisma.sql`
      DELETE FROM funder_relationships
      WHERE id = ${id}
    `);
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
    const rows = await db.$queryRaw<FunderConditionQueryRow[]>(Prisma.sql`
      INSERT INTO funder_conditions (
        id,
        "funderRelationshipId",
        description,
        status,
        "projectRequirementId",
        "dueDate",
        "satisfiedAt",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${data.funderRelationshipId},
        ${data.description},
        ${"open"},
        ${data.projectRequirementId ?? null},
        ${data.dueDate ?? null},
        ${null},
        ${new Date()},
        ${new Date()}
      )
      RETURNING
        id,
        description,
        status,
        "projectRequirementId" AS "projectRequirementId",
        "dueDate" AS "dueDate",
        "satisfiedAt" AS "satisfiedAt",
        "createdAt" AS "createdAt",
        "updatedAt" AS "updatedAt",
        "funderRelationshipId" AS "funderRelationshipId"
    `);

    const row = rows[0];
    if (!row) {
      throw new Error("Insert returned no condition row.");
    }

    return {
      ok: true,
      value: mapCondition({
        ...row,
        requirementName: await getRequirementName(row.projectRequirementId),
      }),
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
    const sets: Prisma.Sql[] = [Prisma.sql`status = ${status}`, Prisma.sql`"updatedAt" = ${new Date()}`];
    if (satisfiedAt !== undefined) {
      sets.push(Prisma.sql`"satisfiedAt" = ${satisfiedAt}`);
    }

    await db.$executeRaw(Prisma.sql`
      UPDATE funder_conditions
      SET ${Prisma.join(sets, ", ")}
      WHERE id = ${id}
    `);

    return { ok: true, value: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

export async function deleteFunderCondition(id: string): Promise<Result<void>> {
  try {
    await db.$executeRaw(Prisma.sql`
      DELETE FROM funder_conditions
      WHERE id = ${id}
    `);
    return { ok: true, value: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

// Satisfy the unused AppError import — it is used via Result<T> generic
const _appErrorCheck: AppError | undefined = undefined;
void _appErrorCheck;
