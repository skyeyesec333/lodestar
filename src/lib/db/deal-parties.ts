import { Prisma } from "@prisma/client";
import { db } from "./index";
import { toDbError } from "@/lib/utils";
import type { Result } from "@/types";
import type { DealPartyType } from "@/lib/exim/deal-parties";
import { DEAL_PARTY_REQUIREMENT_MAP } from "@/lib/exim/deal-parties";
import { randomUUID } from "crypto";

export type DealPartyRow = {
  id: string;
  projectId: string;
  organizationId: string;
  organizationName: string;
  partyType: string;
  notes: string | null;
  createdAt: Date;
};

type DealPartyQueryRow = {
  id: string;
  projectId: string;
  organizationId: string;
  organizationName: string;
  partyType: string;
  notes: string | null;
  createdAt: Date;
};

type DealPartiesStorage = "missing" | "camel" | "snake";

async function detectDealPartiesStorage(): Promise<DealPartiesStorage> {
  const columns = await db.$queryRaw<Array<{ columnName: string }>>(Prisma.sql`
    SELECT column_name AS "columnName"
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'deal_parties'
  `);

  if (columns.length === 0) {
    return "missing";
  }

  const names = new Set(columns.map((column) => column.columnName));
  if (names.has("projectId")) {
    return "camel";
  }

  if (names.has("project_id")) {
    return "snake";
  }

  return "missing";
}

async function getDealPartiesRows(projectId: string, storage: Exclude<DealPartiesStorage, "missing">) {
  if (storage === "camel") {
    return db.$queryRaw<DealPartyQueryRow[]>(Prisma.sql`
      SELECT
        dp.id,
        dp."projectId" AS "projectId",
        dp."organizationId" AS "organizationId",
        o.name AS "organizationName",
        dp."partyType" AS "partyType",
        dp.notes,
        dp."createdAt" AS "createdAt"
      FROM deal_parties dp
      INNER JOIN organizations o
        ON o.id = dp."organizationId"
      WHERE dp."projectId" = ${projectId}
      ORDER BY dp."createdAt" ASC
    `);
  }

  return db.$queryRaw<DealPartyQueryRow[]>(Prisma.sql`
    SELECT
      dp.id,
      dp.project_id AS "projectId",
      dp.organization_id AS "organizationId",
      o.name AS "organizationName",
      dp.party_type::text AS "partyType",
      dp.notes,
      dp.created_at AS "createdAt"
    FROM deal_parties dp
    INNER JOIN organizations o
      ON o.id = dp.organization_id
    WHERE dp.project_id = ${projectId}
    ORDER BY dp.created_at ASC
  `);
}

export async function getProjectDealParties(projectId: string): Promise<Result<DealPartyRow[]>> {
  try {
    const storage = await detectDealPartiesStorage();
    if (storage === "missing") {
      return { ok: true, value: [] };
    }

    const rows = await getDealPartiesRows(projectId, storage);

    return {
      ok: true,
      value: rows,
    };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
  }
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

export async function addDealParty(
  projectId: string,
  organizationName: string,
  partyType: DealPartyType,
  notes: string | null
): Promise<Result<DealPartyRow>> {
  try {
    const storage = await detectDealPartiesStorage();
    if (storage === "missing") {
      return {
        ok: false,
        error: {
          code: "DATABASE_ERROR",
          message: "Deal party storage is not available in this database yet.",
        },
      };
    }

    const org = await findOrCreateOrg(organizationName);

    const rows =
      storage === "camel"
        ? await db.$queryRaw<DealPartyQueryRow[]>(Prisma.sql`
            INSERT INTO deal_parties (
              id,
              "projectId",
              "organizationId",
              "partyType",
              notes
            )
            VALUES (
              ${randomUUID()},
              ${projectId},
              ${org.id},
              ${partyType},
              ${notes}
            )
            RETURNING
              id,
              "projectId" AS "projectId",
              "organizationId" AS "organizationId",
              ${org.name}::text AS "organizationName",
              "partyType" AS "partyType",
              notes,
              "createdAt" AS "createdAt"
          `)
        : await db.$queryRaw<DealPartyQueryRow[]>(Prisma.sql`
            INSERT INTO deal_parties (
              id,
              project_id,
              organization_id,
              party_type,
              notes
            )
            VALUES (
              ${randomUUID()},
              ${projectId},
              ${org.id},
              ${partyType}::"DealPartyType",
              ${notes}
            )
            RETURNING
              id,
              project_id AS "projectId",
              organization_id AS "organizationId",
              ${org.name}::text AS "organizationName",
              party_type::text AS "partyType",
              notes,
              created_at AS "createdAt"
          `);

    const party = rows[0];
    if (!party) {
      throw new Error("Insert returned no rows.");
    }

    // Auto-assign requirements mapped to this party type (only where currently unassigned)
    const reqIds = DEAL_PARTY_REQUIREMENT_MAP[partyType] ?? [];
    if (reqIds.length > 0) {
      await db.projectRequirement.updateMany({
        where: {
          projectId,
          requirementId: { in: reqIds },
          responsibleOrganizationId: null,
        },
        data: { responsibleOrganizationId: org.id },
      });
    }

    return {
      ok: true,
      value: party,
    };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
  }
}

export async function removeDealParty(dealPartyId: string): Promise<Result<void>> {
  try {
    const storage = await detectDealPartiesStorage();
    if (storage === "missing") {
      return {
        ok: false,
        error: {
          code: "DATABASE_ERROR",
          message: "Deal party storage is not available in this database yet.",
        },
      };
    }

    await db.$executeRaw(Prisma.sql`
      DELETE FROM deal_parties
      WHERE id = ${dealPartyId}
    `);
    return { ok: true, value: undefined };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
  }
}
