import { randomUUID } from "crypto";
import { Prisma, ProjectPhase } from "@prisma/client";
import { db } from "./index";
import { toDbError } from "@/lib/utils";
import type { Result } from "@/types";
import { MILESTONE_TEMPLATES } from "@/lib/exim/milestone-templates";

function toPhase(s: string | null | undefined): ProjectPhase | null {
  if (!s) return null;
  const valid = Object.values(ProjectPhase) as string[];
  return valid.includes(s) ? (s as ProjectPhase) : null;
}

export type DealMilestoneRow = {
  id: string;
  name: string;
  description: string | null;
  linkedPhase: string | null;
  targetDate: Date | null;
  completedAt: Date | null;
  completedBy: string | null;
  sortOrder: number;
  createdAt: Date;
};

type DealMilestoneQueryRow = {
  id: string;
  name: string;
  description: string | null;
  linkedPhase: string | null;
  targetDate: Date | null;
  completedAt: Date | null;
  completedBy: string | null;
  sortOrder: number;
  createdAt: Date;
};

type MilestonesStorage = "missing" | "camel" | "snake";

function shapeRow(r: DealMilestoneQueryRow): DealMilestoneRow {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    linkedPhase: r.linkedPhase,
    targetDate: r.targetDate,
    completedAt: r.completedAt,
    completedBy: r.completedBy,
    sortOrder: r.sortOrder,
    createdAt: r.createdAt,
  };
}

async function detectMilestonesStorage(): Promise<MilestonesStorage> {
  const columns = await db.$queryRaw<Array<{ columnName: string }>>(Prisma.sql`
    SELECT column_name AS "columnName"
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'deal_milestones'
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

function returningMilestoneRow(storage: Exclude<MilestonesStorage, "missing">) {
  if (storage === "camel") {
    return Prisma.sql`
      id,
      name,
      description,
      "linkedPhase" AS "linkedPhase",
      "targetDate" AS "targetDate",
      "completedAt" AS "completedAt",
      "completedBy" AS "completedBy",
      "sortOrder" AS "sortOrder",
      "createdAt" AS "createdAt"
    `;
  }

  return Prisma.sql`
    id,
    name,
    description,
    linked_phase::text AS "linkedPhase",
    target_date AS "targetDate",
    completed_at AS "completedAt",
    completed_by AS "completedBy",
    sort_order AS "sortOrder",
    created_at AS "createdAt"
  `;
}

export async function getProjectMilestones(projectId: string): Promise<Result<DealMilestoneRow[]>> {
  try {
    const storage = await detectMilestonesStorage();
    if (storage === "missing") {
      return { ok: true, value: [] };
    }

    const rows =
      storage === "camel"
        ? await db.$queryRaw<DealMilestoneQueryRow[]>(Prisma.sql`
            SELECT ${returningMilestoneRow(storage)}
            FROM deal_milestones
            WHERE "projectId" = ${projectId}
            ORDER BY "sortOrder" ASC
          `)
        : await db.$queryRaw<DealMilestoneQueryRow[]>(Prisma.sql`
            SELECT ${returningMilestoneRow(storage)}
            FROM deal_milestones
            WHERE project_id = ${projectId}
            ORDER BY sort_order ASC
          `);
    return { ok: true, value: rows.map(shapeRow) };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
  }
}

export async function createMilestone(
  projectId: string,
  clerkUserId: string,
  data: {
    name: string;
    description?: string | null;
    linkedPhase?: string | null;
    targetDate?: Date | null;
    sortOrder?: number;
  }
): Promise<Result<DealMilestoneRow>> {
  try {
    const storage = await detectMilestonesStorage();
    if (storage === "missing") {
      return {
        ok: false,
        error: { code: "DATABASE_ERROR", message: "Milestone storage is not available in this database yet." },
      };
    }

    // Place at end: max sortOrder + 100
    let sortOrder = data.sortOrder;
    if (sortOrder == null) {
      const last =
        storage === "camel"
          ? await db.$queryRaw<Array<{ sortOrder: number }>>(Prisma.sql`
              SELECT "sortOrder" AS "sortOrder"
              FROM deal_milestones
              WHERE "projectId" = ${projectId}
              ORDER BY "sortOrder" DESC
              LIMIT 1
            `)
          : await db.$queryRaw<Array<{ sortOrder: number }>>(Prisma.sql`
              SELECT sort_order AS "sortOrder"
              FROM deal_milestones
              WHERE project_id = ${projectId}
              ORDER BY sort_order DESC
              LIMIT 1
            `);
      sortOrder = (last[0]?.sortOrder ?? 0) + 100;
    }

    const now = new Date();
    const rows =
      storage === "camel"
        ? await db.$queryRaw<DealMilestoneQueryRow[]>(Prisma.sql`
            INSERT INTO deal_milestones (
              id,
              "projectId",
              name,
              description,
              "linkedPhase",
              "targetDate",
              "sortOrder",
              "createdBy",
              "createdAt",
              "updatedAt"
            )
            VALUES (
              ${randomUUID()},
              ${projectId},
              ${data.name},
              ${data.description ?? null},
              ${toPhase(data.linkedPhase)},
              ${data.targetDate ?? null},
              ${sortOrder},
              ${clerkUserId},
              ${now},
              ${now}
            )
            RETURNING ${returningMilestoneRow(storage)}
          `)
        : await db.$queryRaw<DealMilestoneQueryRow[]>(Prisma.sql`
            INSERT INTO deal_milestones (
              id,
              project_id,
              name,
              description,
              linked_phase,
              target_date,
              sort_order,
              created_by,
              created_at,
              updated_at
            )
            VALUES (
              ${randomUUID()},
              ${projectId},
              ${data.name},
              ${data.description ?? null},
              ${toPhase(data.linkedPhase)}::"ProjectPhase",
              ${data.targetDate ?? null},
              ${sortOrder},
              ${clerkUserId},
              ${now},
              ${now}
            )
            RETURNING ${returningMilestoneRow(storage)}
          `);

    const row = rows[0];
    if (!row) {
      throw new Error("Insert returned no milestone row.");
    }

    return { ok: true, value: shapeRow(row) };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
  }
}

export async function updateMilestone(
  id: string,
  data: {
    name?: string;
    description?: string | null;
    linkedPhase?: string | null;
    targetDate?: Date | null;
  }
): Promise<Result<DealMilestoneRow>> {
  try {
    const storage = await detectMilestonesStorage();
    if (storage === "missing") {
      return {
        ok: false,
        error: { code: "DATABASE_ERROR", message: "Milestone storage is not available in this database yet." },
      };
    }

    const updates: Prisma.Sql[] = [];
    if (data.name !== undefined) {
      updates.push(Prisma.sql`name = ${data.name}`);
    }
    if (data.description !== undefined) {
      updates.push(Prisma.sql`description = ${data.description}`);
    }
    if (data.linkedPhase !== undefined) {
      updates.push(
        storage === "camel"
          ? Prisma.sql`"linkedPhase" = ${toPhase(data.linkedPhase)}`
          : Prisma.sql`linked_phase = ${toPhase(data.linkedPhase)}::"ProjectPhase"`
      );
    }
    if (data.targetDate !== undefined) {
      updates.push(
        storage === "camel"
          ? Prisma.sql`"targetDate" = ${data.targetDate}`
          : Prisma.sql`target_date = ${data.targetDate}`
      );
    }
    updates.push(storage === "camel" ? Prisma.sql`"updatedAt" = ${new Date()}` : Prisma.sql`updated_at = ${new Date()}`);

    const rows = await db.$queryRaw<DealMilestoneQueryRow[]>(Prisma.sql`
      UPDATE deal_milestones
      SET ${Prisma.join(updates, ", ")}
      WHERE id = ${id}
      RETURNING ${returningMilestoneRow(storage)}
    `);

    const row = rows[0];
    if (!row) {
      throw new Error("Milestone not found.");
    }

    return { ok: true, value: shapeRow(row) };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
  }
}

export async function completeMilestone(id: string, clerkUserId: string): Promise<Result<DealMilestoneRow>> {
  try {
    const storage = await detectMilestonesStorage();
    if (storage === "missing") {
      return {
        ok: false,
        error: { code: "DATABASE_ERROR", message: "Milestone storage is not available in this database yet." },
      };
    }

    const rows =
      storage === "camel"
        ? await db.$queryRaw<DealMilestoneQueryRow[]>(Prisma.sql`
            UPDATE deal_milestones
            SET
              "completedAt" = ${new Date()},
              "completedBy" = ${clerkUserId},
              "updatedAt" = ${new Date()}
            WHERE id = ${id}
            RETURNING ${returningMilestoneRow(storage)}
          `)
        : await db.$queryRaw<DealMilestoneQueryRow[]>(Prisma.sql`
            UPDATE deal_milestones
            SET
              completed_at = ${new Date()},
              completed_by = ${clerkUserId},
              updated_at = ${new Date()}
            WHERE id = ${id}
            RETURNING ${returningMilestoneRow(storage)}
          `);

    const row = rows[0];
    if (!row) {
      throw new Error("Milestone not found.");
    }

    return { ok: true, value: shapeRow(row) };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
  }
}

export async function uncompleteMilestone(id: string): Promise<Result<DealMilestoneRow>> {
  try {
    const storage = await detectMilestonesStorage();
    if (storage === "missing") {
      return {
        ok: false,
        error: { code: "DATABASE_ERROR", message: "Milestone storage is not available in this database yet." },
      };
    }

    const rows =
      storage === "camel"
        ? await db.$queryRaw<DealMilestoneQueryRow[]>(Prisma.sql`
            UPDATE deal_milestones
            SET
              "completedAt" = NULL,
              "completedBy" = NULL,
              "updatedAt" = ${new Date()}
            WHERE id = ${id}
            RETURNING ${returningMilestoneRow(storage)}
          `)
        : await db.$queryRaw<DealMilestoneQueryRow[]>(Prisma.sql`
            UPDATE deal_milestones
            SET
              completed_at = NULL,
              completed_by = NULL,
              updated_at = ${new Date()}
            WHERE id = ${id}
            RETURNING ${returningMilestoneRow(storage)}
          `);

    const row = rows[0];
    if (!row) {
      throw new Error("Milestone not found.");
    }

    return { ok: true, value: shapeRow(row) };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
  }
}

export async function deleteMilestone(id: string): Promise<Result<void>> {
  try {
    const storage = await detectMilestonesStorage();
    if (storage === "missing") {
      return {
        ok: false,
        error: { code: "DATABASE_ERROR", message: "Milestone storage is not available in this database yet." },
      };
    }

    await db.$executeRaw`
      DELETE FROM deal_milestones
      WHERE id = ${id}
    `;
    return { ok: true, value: undefined };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
  }
}

export async function bulkCreateFromTemplate(
  projectId: string,
  templateSlug: string,
  anchorDate: Date,
  clerkUserId: string
): Promise<Result<number>> {
  try {
    const storage = await detectMilestonesStorage();
    if (storage === "missing") {
      return {
        ok: false,
        error: { code: "DATABASE_ERROR", message: "Milestone storage is not available in this database yet." },
      };
    }

    const template = MILESTONE_TEMPLATES.find((t) => t.slug === templateSlug);
    if (!template) {
      return { ok: false, error: { code: "VALIDATION_ERROR", message: `Unknown template: ${templateSlug}` } };
    }

    await db.$transaction(
      template.milestones.map((milestone) => {
        const targetDate = new Date(anchorDate);
        targetDate.setDate(targetDate.getDate() + milestone.offsetDays);
        const now = new Date();

        return storage === "camel"
          ? db.$executeRaw`
              INSERT INTO deal_milestones (
                id,
                "projectId",
                name,
                description,
                "linkedPhase",
                "targetDate",
                "sortOrder",
                "createdBy",
                "createdAt",
                "updatedAt"
              )
              VALUES (
                ${randomUUID()},
                ${projectId},
                ${milestone.name},
                ${milestone.description ?? null},
                ${toPhase(milestone.linkedPhase)},
                ${targetDate},
                ${milestone.sortOrder},
                ${clerkUserId},
                ${now},
                ${now}
              )
            `
          : db.$executeRaw`
              INSERT INTO deal_milestones (
                id,
                project_id,
                name,
                description,
                linked_phase,
                target_date,
                sort_order,
                created_by,
                created_at,
                updated_at
              )
              VALUES (
                ${randomUUID()},
                ${projectId},
                ${milestone.name},
                ${milestone.description ?? null},
                ${toPhase(milestone.linkedPhase)}::"ProjectPhase",
                ${targetDate},
                ${milestone.sortOrder},
                ${clerkUserId},
                ${now},
                ${now}
              )
            `;
      })
    );

    return { ok: true, value: template.milestones.length };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
  }
}
