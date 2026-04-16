import { db } from "./index";
import { toDbError } from "@/lib/utils";
import type { CovenantType, CovenantFrequency, CovenantStatus } from "@prisma/client";
import type { Result } from "@/types";

export type CovenantRow = {
  id: string;
  projectId: string;
  funderId: string | null;
  funderName: string | null;
  title: string;
  covenantType: string;
  frequency: string;
  nextDueAt: Date | null;
  lastSatisfiedAt: Date | null;
  status: string;
  waiverGrantedAt: Date | null;
  waiverGrantedBy: string | null;
  waiverReason: string | null;
  waiverExpiresAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const covenantSelect = {
  id: true,
  projectId: true,
  funderId: true,
  title: true,
  covenantType: true,
  frequency: true,
  nextDueAt: true,
  lastSatisfiedAt: true,
  status: true,
  waiverGrantedAt: true,
  waiverGrantedBy: true,
  waiverReason: true,
  waiverExpiresAt: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  funderRelationship: {
    select: { organization: { select: { name: true } } },
  },
} as const;

function mapRow(r: {
  id: string;
  projectId: string;
  funderId: string | null;
  title: string;
  covenantType: string;
  frequency: string;
  nextDueAt: Date | null;
  lastSatisfiedAt: Date | null;
  status: string;
  waiverGrantedAt: Date | null;
  waiverGrantedBy: string | null;
  waiverReason: string | null;
  waiverExpiresAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  funderRelationship: { organization: { name: string } } | null;
}): CovenantRow {
  return {
    id: r.id,
    projectId: r.projectId,
    funderId: r.funderId,
    funderName: r.funderRelationship?.organization.name ?? null,
    title: r.title,
    covenantType: r.covenantType,
    frequency: r.frequency,
    nextDueAt: r.nextDueAt,
    lastSatisfiedAt: r.lastSatisfiedAt,
    status: r.status,
    waiverGrantedAt: r.waiverGrantedAt,
    waiverGrantedBy: r.waiverGrantedBy,
    waiverReason: r.waiverReason,
    waiverExpiresAt: r.waiverExpiresAt,
    notes: r.notes,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

/** Advance nextDueAt by one period based on frequency. */
function advanceNextDueAt(current: Date | null, frequency: string): Date | null {
  const base = current ?? new Date();
  switch (frequency) {
    case "monthly":
      return new Date(base.getTime() + 30 * 86400_000);
    case "quarterly":
      return new Date(base.getTime() + 90 * 86400_000);
    case "semi_annual":
      return new Date(base.getTime() + 182 * 86400_000);
    case "annual":
      return new Date(base.getTime() + 365 * 86400_000);
    case "one_time":
    default:
      return null; // one_time: set status to satisfied instead
  }
}

export async function getProjectCovenants(
  projectId: string
): Promise<Result<CovenantRow[]>> {
  try {
    const rows = await db.covenant.findMany({
      where: { projectId },
      orderBy: [{ nextDueAt: "asc" }, { createdAt: "asc" }],
      select: covenantSelect,
    });
    return { ok: true, value: rows.map(mapRow) };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
  }
}

export async function addCovenant(data: {
  projectId: string;
  funderId?: string | null;
  title: string;
  covenantType: string;
  frequency: string;
  nextDueAt?: Date | null;
  notes?: string | null;
}): Promise<Result<{ id: string }>> {
  try {
    const row = await db.covenant.create({
      data: {
        projectId: data.projectId,
        funderId: data.funderId ?? null,
        title: data.title,
        covenantType: data.covenantType as CovenantType,
        frequency: data.frequency as CovenantFrequency,
        nextDueAt: data.nextDueAt ?? null,
        notes: data.notes ?? null,
        status: "active",
      },
      select: { id: true },
    });
    return { ok: true, value: { id: row.id } };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
  }
}

export async function updateCovenant(
  id: string,
  data: Partial<{
    title: string;
    covenantType: string;
    frequency: string;
    nextDueAt: Date | null;
    notes: string | null;
    status: string;
    waiverReason: string | null;
    waiverExpiresAt: Date | null;
  }>,
  userId?: string
): Promise<Result<void>> {
  try {
    if (data.status === "waived" && !data.waiverReason) {
      return { ok: false, error: { code: "VALIDATION_ERROR", message: "waiverReason required when status is waived" } };
    }

    const updateData: Record<string, unknown> = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.covenantType !== undefined) updateData.covenantType = data.covenantType as CovenantType;
    if (data.frequency !== undefined) updateData.frequency = data.frequency as CovenantFrequency;
    if (data.nextDueAt !== undefined) updateData.nextDueAt = data.nextDueAt;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.status !== undefined) updateData.status = data.status as CovenantStatus;

    if (data.status === "waived") {
      updateData.waiverGrantedAt = new Date();
      updateData.waiverGrantedBy = userId || null;
      updateData.waiverReason = data.waiverReason;
      if (data.waiverExpiresAt !== undefined) updateData.waiverExpiresAt = data.waiverExpiresAt;
    } else {
      if (data.waiverReason !== undefined) updateData.waiverReason = data.waiverReason;
      if (data.waiverExpiresAt !== undefined) updateData.waiverExpiresAt = data.waiverExpiresAt;
    }

    await db.covenant.update({
      where: { id },
      data: updateData,
    });
    return { ok: true, value: undefined };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
  }
}

export async function markCovenantSatisfied(
  id: string,
  _userId: string
): Promise<Result<CovenantRow>> {
  try {
    const existing = await db.covenant.findUniqueOrThrow({
      where: { id },
      select: { frequency: true, nextDueAt: true },
    });

    const isOneTime = existing.frequency === "one_time";
    const nextDue = isOneTime ? null : advanceNextDueAt(existing.nextDueAt, existing.frequency);

    const updated = await db.covenant.update({
      where: { id },
      data: {
        lastSatisfiedAt: new Date(),
        nextDueAt: nextDue,
        status: isOneTime ? "satisfied" : "active",
      },
      select: covenantSelect,
    });

    return { ok: true, value: mapRow(updated) };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
  }
}

export async function removeCovenant(id: string): Promise<Result<void>> {
  try {
    await db.covenant.delete({ where: { id } });
    return { ok: true, value: undefined };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
  }
}
