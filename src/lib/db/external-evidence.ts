import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { db } from "./index";
import { toDbError } from "@/lib/utils";
import type { Result } from "@/types";

export const EXTERNAL_EVIDENCE_PROVIDERS = [
  "google_drive",
  "sharepoint",
  "onedrive",
  "dropbox",
  "box",
  "vdr",
  "other",
] as const;

export const EXTERNAL_EVIDENCE_SOURCE_TYPES = ["file", "folder"] as const;

export type ExternalEvidenceProvider = (typeof EXTERNAL_EVIDENCE_PROVIDERS)[number];
export type ExternalEvidenceSourceType = (typeof EXTERNAL_EVIDENCE_SOURCE_TYPES)[number];

export type ExternalEvidenceRow = {
  id: string;
  projectId: string;
  projectRequirementId: string | null;
  provider: ExternalEvidenceProvider;
  sourceType: ExternalEvidenceSourceType;
  title: string;
  url: string;
  notes: string | null;
  linkedBy: string;
  linkedAt: Date;
};

type ExternalEvidenceQueryRow = ExternalEvidenceRow;

function shapeRow(row: ExternalEvidenceQueryRow): ExternalEvidenceRow {
  return row;
}

export async function getProjectExternalEvidence(
  projectId: string
): Promise<Result<ExternalEvidenceRow[]>> {
  try {
    const rows = await db.$queryRaw<ExternalEvidenceQueryRow[]>(Prisma.sql`
      SELECT
        id,
        "projectId" AS "projectId",
        "projectRequirementId" AS "projectRequirementId",
        provider,
        "sourceType" AS "sourceType",
        title,
        url,
        notes,
        "linkedBy" AS "linkedBy",
        "linkedAt" AS "linkedAt"
      FROM external_evidence_sources
      WHERE "projectId" = ${projectId}
      ORDER BY "linkedAt" DESC
    `);

    return { ok: true, value: rows.map(shapeRow) };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
  }
}

export async function createExternalEvidenceSource(data: {
  projectId: string;
  projectRequirementId: string | null;
  provider: ExternalEvidenceProvider;
  sourceType: ExternalEvidenceSourceType;
  title: string;
  url: string;
  notes: string | null;
  linkedBy: string;
}): Promise<Result<ExternalEvidenceRow>> {
  try {
    const rows = await db.$queryRaw<ExternalEvidenceQueryRow[]>(Prisma.sql`
      INSERT INTO external_evidence_sources (
        id,
        "projectId",
        "projectRequirementId",
        provider,
        "sourceType",
        title,
        url,
        notes,
        "linkedBy",
        "linkedAt"
      )
      VALUES (
        ${randomUUID()},
        ${data.projectId},
        ${data.projectRequirementId},
        ${data.provider},
        ${data.sourceType},
        ${data.title},
        ${data.url},
        ${data.notes},
        ${data.linkedBy},
        now()
      )
      RETURNING
        id,
        "projectId" AS "projectId",
        "projectRequirementId" AS "projectRequirementId",
        provider,
        "sourceType" AS "sourceType",
        title,
        url,
        notes,
        "linkedBy" AS "linkedBy",
        "linkedAt" AS "linkedAt"
    `);

    const row = rows[0];
    if (!row) throw new Error("External evidence insert returned no row.");
    return { ok: true, value: shapeRow(row) };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
  }
}

export async function deleteExternalEvidenceSource(data: {
  id: string;
  projectId: string;
}): Promise<Result<{ id: string }>> {
  try {
    const rows = await db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      DELETE FROM external_evidence_sources
      WHERE id = ${data.id} AND "projectId" = ${data.projectId}
      RETURNING id
    `);

    const row = rows[0];
    if (!row) {
      return { ok: false, error: { code: "NOT_FOUND", message: "External evidence source not found." } };
    }
    return { ok: true, value: row };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
  }
}
