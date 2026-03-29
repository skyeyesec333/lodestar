import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { db } from "./index";
import type { AppError, Result } from "@/types";

export type EpcBidRow = {
  id: string;
  projectId: string;
  organizationId: string;
  organizationName: string;
  organizationCountryCode: string | null;
  isUsEntity: boolean;
  bidAmountUsdCents: number | null;
  usContentPct: number | null;
  qualificationStatus: string;
  disqualificationReason: string | null;
  submittedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type EpcBidQueryRow = {
  id: string;
  projectId: string;
  organizationId: string;
  organizationName: string;
  organizationCountryCode: string | null;
  isUsEntity: boolean;
  bidAmountUsdCents: bigint | null;
  usContentPct: number | null;
  qualificationStatus: string;
  disqualificationReason: string | null;
  submittedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function mapBidRow(row: EpcBidQueryRow): EpcBidRow {
  return {
    id: row.id,
    projectId: row.projectId,
    organizationId: row.organizationId,
    organizationName: row.organizationName,
    organizationCountryCode: row.organizationCountryCode,
    isUsEntity: row.isUsEntity,
    bidAmountUsdCents: row.bidAmountUsdCents != null ? Number(row.bidAmountUsdCents) : null,
    usContentPct: row.usContentPct,
    qualificationStatus: row.qualificationStatus,
    disqualificationReason: row.disqualificationReason,
    submittedAt: row.submittedAt,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getProjectEpcBids(
  projectId: string
): Promise<Result<EpcBidRow[]>> {
  try {
    const rows = await db.$queryRaw<EpcBidQueryRow[]>(Prisma.sql`
      SELECT
        b.id,
        b."projectId" AS "projectId",
        b."organizationId" AS "organizationId",
        o.name AS "organizationName",
        o."countryCode" AS "organizationCountryCode",
        o."isUsEntity" AS "isUsEntity",
        b."bidAmountUsdCents" AS "bidAmountUsdCents",
        b."usContentPct" AS "usContentPct",
        b."qualificationStatus" AS "qualificationStatus",
        b."disqualificationReason" AS "disqualificationReason",
        b."submittedAt" AS "submittedAt",
        b.notes,
        b."createdAt" AS "createdAt",
        b."updatedAt" AS "updatedAt"
      FROM epc_bids b
      INNER JOIN organizations o
        ON o.id = b."organizationId"
      WHERE b."projectId" = ${projectId}
      ORDER BY b."createdAt" ASC
    `);

    return { ok: true, value: rows.map(mapBidRow) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

export async function createEpcBid(data: {
  projectId: string;
  organizationName: string;
  isUsEntity: boolean;
  organizationCountryCode?: string;
  bidAmountUsdCents?: number | null;
  usContentPct?: number | null;
  notes?: string | null;
}): Promise<Result<EpcBidRow>> {
  try {
    // Upsert organization by name (case-insensitive match not worth the complexity —
    // use exact name match; advisors can adjust if needed)
    const org = await db.organization.upsert({
      where: { id: `epc-org-${data.organizationName.toLowerCase().replace(/\s+/g, "-")}` },
      update: {
        isUsEntity: data.isUsEntity,
        ...(data.organizationCountryCode ? { countryCode: data.organizationCountryCode } : {}),
      },
      create: {
        id: `epc-org-${data.organizationName.toLowerCase().replace(/\s+/g, "-")}`,
        name: data.organizationName,
        isUsEntity: data.isUsEntity,
        countryCode: data.organizationCountryCode ?? null,
      },
    });

    const rows = await db.$queryRaw<EpcBidQueryRow[]>(Prisma.sql`
      INSERT INTO epc_bids (
        id,
        "projectId",
        "organizationId",
        "bidAmountUsdCents",
        "usContentPct",
        "qualificationStatus",
        notes,
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${data.projectId},
        ${org.id},
        ${data.bidAmountUsdCents == null ? null : BigInt(data.bidAmountUsdCents)},
        ${data.usContentPct ?? null},
        ${"under_review"},
        ${data.notes ?? null},
        ${new Date()},
        ${new Date()}
      )
      RETURNING
        id,
        "projectId" AS "projectId",
        "organizationId" AS "organizationId",
        "bidAmountUsdCents" AS "bidAmountUsdCents",
        "usContentPct" AS "usContentPct",
        "qualificationStatus" AS "qualificationStatus",
        "disqualificationReason" AS "disqualificationReason",
        "submittedAt" AS "submittedAt",
        notes,
        "createdAt" AS "createdAt",
        "updatedAt" AS "updatedAt"
    `);

    const bid = rows[0];
    if (!bid) {
      throw new Error("Insert returned no bid row.");
    }

    return {
      ok: true,
      value: {
        ...mapBidRow({
          ...bid,
          organizationName: org.name,
          organizationCountryCode: org.countryCode,
          isUsEntity: org.isUsEntity,
        }),
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

export async function updateEpcBidStatus(
  bidId: string,
  status: string,
  disqualificationReason?: string | null
): Promise<Result<void>> {
  try {
    await db.$executeRaw(Prisma.sql`
      UPDATE epc_bids
      SET
        "qualificationStatus" = ${status},
        "disqualificationReason" = ${disqualificationReason ?? null},
        "updatedAt" = ${new Date()}
      WHERE id = ${bidId}
    `);
    return { ok: true, value: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

export async function updateEpcBidDetails(
  bidId: string,
  data: {
    bidAmountUsdCents?: number | null;
    usContentPct?: number | null;
    notes?: string | null;
    submittedAt?: Date | null;
  }
): Promise<Result<void>> {
  try {
    const sets: Prisma.Sql[] = [];
    if (data.bidAmountUsdCents !== undefined) {
      sets.push(
        Prisma.sql`"bidAmountUsdCents" = ${
          data.bidAmountUsdCents == null ? null : BigInt(data.bidAmountUsdCents)
        }`
      );
    }
    if (data.usContentPct !== undefined) {
      sets.push(Prisma.sql`"usContentPct" = ${data.usContentPct}`);
    }
    if (data.notes !== undefined) {
      sets.push(Prisma.sql`notes = ${data.notes}`);
    }
    if (data.submittedAt !== undefined) {
      sets.push(Prisma.sql`"submittedAt" = ${data.submittedAt}`);
    }
    sets.push(Prisma.sql`"updatedAt" = ${new Date()}`);

    await db.$executeRaw(Prisma.sql`
      UPDATE epc_bids
      SET ${Prisma.join(sets, ", ")}
      WHERE id = ${bidId}
    `);
    return { ok: true, value: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

export async function deleteEpcBid(bidId: string): Promise<Result<void>> {
  try {
    await db.$executeRaw(Prisma.sql`
      DELETE FROM epc_bids
      WHERE id = ${bidId}
    `);
    return { ok: true, value: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}
