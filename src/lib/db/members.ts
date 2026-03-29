import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { db } from "./index";
import type { Result } from "@/types";

export type ProjectMemberRow = {
  id: string;
  projectId: string;
  clerkUserId: string;
  role: string; // "owner" | "editor" | "viewer"
  invitedBy: string | null;
  createdAt: Date;
};

type ProjectMemberQueryRow = {
  id: string;
  projectId: string;
  clerkUserId: string;
  role: string;
  invitedBy: string | null;
  createdAt: Date;
};

function shapeMemberRow(row: ProjectMemberQueryRow): ProjectMemberRow {
  return row;
}

export async function getProjectMembers(
  projectId: string
): Promise<Result<ProjectMemberRow[]>> {
  try {
    const rows = await db.$queryRaw<ProjectMemberQueryRow[]>(Prisma.sql`
      SELECT
        id,
        "projectId" AS "projectId",
        "clerkUserId" AS "clerkUserId",
        role,
        "invitedBy" AS "invitedBy",
        "createdAt" AS "createdAt"
      FROM project_members
      WHERE "projectId" = ${projectId}
      ORDER BY "createdAt" ASC
    `);
    return { ok: true, value: rows.map(shapeMemberRow) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

export async function addProjectMember(data: {
  projectId: string;
  clerkUserId: string;
  role: string;
  invitedBy: string;
}): Promise<Result<ProjectMemberRow>> {
  try {
    const rows = await db.$queryRaw<ProjectMemberQueryRow[]>(Prisma.sql`
      INSERT INTO project_members (
        id,
        "projectId",
        "clerkUserId",
        role,
        "invitedBy",
        "createdAt"
      )
      VALUES (
        ${randomUUID()},
        ${data.projectId},
        ${data.clerkUserId},
        ${data.role},
        ${data.invitedBy},
        ${new Date()}
      )
      ON CONFLICT ("projectId", "clerkUserId")
      DO UPDATE SET
        role = EXCLUDED.role,
        "invitedBy" = EXCLUDED."invitedBy"
      RETURNING
        id,
        "projectId" AS "projectId",
        "clerkUserId" AS "clerkUserId",
        role,
        "invitedBy" AS "invitedBy",
        "createdAt" AS "createdAt"
    `);

    const row = rows[0];
    if (!row) {
      throw new Error("Upsert returned no member row.");
    }

    return { ok: true, value: shapeMemberRow(row) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

export async function updateProjectMemberRole(
  id: string,
  role: string
): Promise<Result<void>> {
  try {
    await db.$executeRaw(Prisma.sql`
      UPDATE project_members
      SET role = ${role}
      WHERE id = ${id}
    `);
    return { ok: true, value: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

export async function removeProjectMember(id: string): Promise<Result<void>> {
  try {
    await db.$executeRaw(Prisma.sql`
      DELETE FROM project_members
      WHERE id = ${id}
    `);
    return { ok: true, value: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}
