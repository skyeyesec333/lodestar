import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { db } from "./index";
import type { Result } from "@/types";

export type ProjectConceptRow = {
  id: string;
  projectId: string;
  thesis: string | null;
  sponsorRationale: string | null;
  targetOutcome: string | null;
  knownUnknowns: string | null;
  fatalFlaws: string | null;
  nextActions: string | null;
  goNoGoRecommendation: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ProjectConceptQueryRow = ProjectConceptRow;

function shapeConceptRow(row: ProjectConceptQueryRow): ProjectConceptRow {
  return row;
}

export async function getProjectConcept(
  projectId: string
): Promise<Result<ProjectConceptRow | null>> {
  try {
    const rows = await db.$queryRaw<ProjectConceptQueryRow[]>(Prisma.sql`
      SELECT
        id,
        "projectId" AS "projectId",
        thesis,
        "sponsorRationale" AS "sponsorRationale",
        "targetOutcome" AS "targetOutcome",
        "knownUnknowns" AS "knownUnknowns",
        "fatalFlaws" AS "fatalFlaws",
        "nextActions" AS "nextActions",
        "goNoGoRecommendation" AS "goNoGoRecommendation",
        "createdAt" AS "createdAt",
        "updatedAt" AS "updatedAt"
      FROM project_concepts
      WHERE "projectId" = ${projectId}
      LIMIT 1
    `);

    return { ok: true, value: rows[0] ? shapeConceptRow(rows[0]) : null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

export async function upsertProjectConcept(data: {
  projectId: string;
  thesis: string | null;
  sponsorRationale: string | null;
  targetOutcome: string | null;
  knownUnknowns: string | null;
  fatalFlaws: string | null;
  nextActions: string | null;
  goNoGoRecommendation: string | null;
}): Promise<Result<ProjectConceptRow>> {
  try {
    const rows = await db.$queryRaw<ProjectConceptQueryRow[]>(Prisma.sql`
      INSERT INTO project_concepts (
        id,
        "projectId",
        thesis,
        "sponsorRationale",
        "targetOutcome",
        "knownUnknowns",
        "fatalFlaws",
        "nextActions",
        "goNoGoRecommendation",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${data.projectId},
        ${data.thesis},
        ${data.sponsorRationale},
        ${data.targetOutcome},
        ${data.knownUnknowns},
        ${data.fatalFlaws},
        ${data.nextActions},
        ${data.goNoGoRecommendation},
        ${new Date()},
        ${new Date()}
      )
      ON CONFLICT ("projectId")
      DO UPDATE SET
        thesis = EXCLUDED.thesis,
        "sponsorRationale" = EXCLUDED."sponsorRationale",
        "targetOutcome" = EXCLUDED."targetOutcome",
        "knownUnknowns" = EXCLUDED."knownUnknowns",
        "fatalFlaws" = EXCLUDED."fatalFlaws",
        "nextActions" = EXCLUDED."nextActions",
        "goNoGoRecommendation" = EXCLUDED."goNoGoRecommendation",
        "updatedAt" = now()
      RETURNING
        id,
        "projectId" AS "projectId",
        thesis,
        "sponsorRationale" AS "sponsorRationale",
        "targetOutcome" AS "targetOutcome",
        "knownUnknowns" AS "knownUnknowns",
        "fatalFlaws" AS "fatalFlaws",
        "nextActions" AS "nextActions",
        "goNoGoRecommendation" AS "goNoGoRecommendation",
        "createdAt" AS "createdAt",
        "updatedAt" AS "updatedAt"
    `);

    const row = rows[0];
    if (!row) {
      throw new Error("Upsert returned no concept row.");
    }

    return { ok: true, value: shapeConceptRow(row) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}
