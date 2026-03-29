import { randomUUID } from "crypto";
import { Prisma, ProjectPhase } from "@prisma/client";
import { db } from "./index";
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

function returningMilestoneRow() {
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

export async function getProjectMilestones(projectId: string): Promise<Result<DealMilestoneRow[]>> {
  try {
    const rows = await db.$queryRaw<DealMilestoneQueryRow[]>(Prisma.sql`
      SELECT ${returningMilestoneRow()}
      FROM deal_milestones
      WHERE "projectId" = ${projectId}
      ORDER BY "sortOrder" ASC
    `);
    return { ok: true, value: rows.map(shapeRow) };
  } catch (err) {
    console.error("[getProjectMilestones]", err);
    return { ok: false, error: { code: "DATABASE_ERROR", message: "Failed to load milestones" } };
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
    // Place at end: max sortOrder + 100
    let sortOrder = data.sortOrder;
    if (sortOrder == null) {
      const last = await db.$queryRaw<Array<{ sortOrder: number }>>(Prisma.sql`
        SELECT "sortOrder" AS "sortOrder"
        FROM deal_milestones
        WHERE "projectId" = ${projectId}
        ORDER BY "sortOrder" DESC
        LIMIT 1
      `);
      sortOrder = (last[0]?.sortOrder ?? 0) + 100;
    }

    const now = new Date();
    const rows = await db.$queryRaw<DealMilestoneQueryRow[]>(Prisma.sql`
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
      RETURNING ${returningMilestoneRow()}
    `);

    const row = rows[0];
    if (!row) {
      throw new Error("Insert returned no milestone row.");
    }

    return { ok: true, value: shapeRow(row) };
  } catch (err) {
    console.error("[createMilestone]", err);
    return { ok: false, error: { code: "DATABASE_ERROR", message: "Failed to create milestone" } };
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
    const updates: Prisma.Sql[] = [];
    if (data.name !== undefined) {
      updates.push(Prisma.sql`name = ${data.name}`);
    }
    if (data.description !== undefined) {
      updates.push(Prisma.sql`description = ${data.description}`);
    }
    if (data.linkedPhase !== undefined) {
      updates.push(Prisma.sql`"linkedPhase" = ${toPhase(data.linkedPhase)}`);
    }
    if (data.targetDate !== undefined) {
      updates.push(Prisma.sql`"targetDate" = ${data.targetDate}`);
    }
    updates.push(Prisma.sql`"updatedAt" = ${new Date()}`);

    const rows = await db.$queryRaw<DealMilestoneQueryRow[]>(Prisma.sql`
      UPDATE deal_milestones
      SET ${Prisma.join(updates, ", ")}
      WHERE id = ${id}
      RETURNING ${returningMilestoneRow()}
    `);

    const row = rows[0];
    if (!row) {
      throw new Error("Milestone not found.");
    }

    return { ok: true, value: shapeRow(row) };
  } catch (err) {
    console.error("[updateMilestone]", err);
    return { ok: false, error: { code: "DATABASE_ERROR", message: "Failed to update milestone" } };
  }
}

export async function completeMilestone(id: string, clerkUserId: string): Promise<Result<DealMilestoneRow>> {
  try {
    const rows = await db.$queryRaw<DealMilestoneQueryRow[]>(Prisma.sql`
      UPDATE deal_milestones
      SET
        "completedAt" = ${new Date()},
        "completedBy" = ${clerkUserId},
        "updatedAt" = ${new Date()}
      WHERE id = ${id}
      RETURNING ${returningMilestoneRow()}
    `);

    const row = rows[0];
    if (!row) {
      throw new Error("Milestone not found.");
    }

    return { ok: true, value: shapeRow(row) };
  } catch (err) {
    console.error("[completeMilestone]", err);
    return { ok: false, error: { code: "DATABASE_ERROR", message: "Failed to complete milestone" } };
  }
}

export async function uncompleteMilestone(id: string): Promise<Result<DealMilestoneRow>> {
  try {
    const rows = await db.$queryRaw<DealMilestoneQueryRow[]>(Prisma.sql`
      UPDATE deal_milestones
      SET
        "completedAt" = NULL,
        "completedBy" = NULL,
        "updatedAt" = ${new Date()}
      WHERE id = ${id}
      RETURNING ${returningMilestoneRow()}
    `);

    const row = rows[0];
    if (!row) {
      throw new Error("Milestone not found.");
    }

    return { ok: true, value: shapeRow(row) };
  } catch (err) {
    console.error("[uncompleteMilestone]", err);
    return { ok: false, error: { code: "DATABASE_ERROR", message: "Failed to uncomplete milestone" } };
  }
}

export async function deleteMilestone(id: string): Promise<Result<void>> {
  try {
    await db.$executeRaw`
      DELETE FROM deal_milestones
      WHERE id = ${id}
    `;
    return { ok: true, value: undefined };
  } catch (err) {
    console.error("[deleteMilestone]", err);
    return { ok: false, error: { code: "DATABASE_ERROR", message: "Failed to delete milestone" } };
  }
}

export async function bulkCreateFromTemplate(
  projectId: string,
  templateSlug: string,
  anchorDate: Date,
  clerkUserId: string
): Promise<Result<number>> {
  try {
    const template = MILESTONE_TEMPLATES.find((t) => t.slug === templateSlug);
    if (!template) {
      return { ok: false, error: { code: "VALIDATION_ERROR", message: `Unknown template: ${templateSlug}` } };
    }

    await db.$transaction(
      template.milestones.map((milestone) => {
        const targetDate = new Date(anchorDate);
        targetDate.setDate(targetDate.getDate() + milestone.offsetDays);
        const now = new Date();

        return db.$executeRaw`
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
        `;
      })
    );

    return { ok: true, value: template.milestones.length };
  } catch (err) {
    console.error("[bulkCreateFromTemplate]", err);
    return { ok: false, error: { code: "DATABASE_ERROR", message: "Failed to apply template" } };
  }
}
