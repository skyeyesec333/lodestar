import { db } from "./index";
import { toDbError } from "@/lib/utils";
import type { DebtTrancheType, DebtTrancheStatus, Prisma } from "@prisma/client";
import type { Result } from "@/types";

export type DebtTrancheRow = {
  id: string;
  projectId: string;
  funderId: string | null;
  funderName: string | null;
  name: string;
  type: string;
  amountUsdCents: number;
  tenorYears: number | null;
  interestRateBps: number | null;
  drawSchedule: Prisma.JsonValue | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function getProjectDebtTranches(
  projectId: string
): Promise<Result<DebtTrancheRow[]>> {
  try {
    const rows = await db.debtTranche.findMany({
      where: { projectId },
      orderBy: [{ type: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        projectId: true,
        funderId: true,
        name: true,
        type: true,
        amountUsdCents: true,
        tenorYears: true,
        interestRateBps: true,
        drawSchedule: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        funderRelationship: {
          select: { organization: { select: { name: true } } },
        },
      },
    });

    return {
      ok: true,
      value: rows.map((r) => ({
        id: r.id,
        projectId: r.projectId,
        funderId: r.funderId,
        funderName: r.funderRelationship?.organization.name ?? null,
        name: r.name,
        type: r.type,
        amountUsdCents: Number(r.amountUsdCents),
        tenorYears: r.tenorYears,
        interestRateBps: r.interestRateBps,
        drawSchedule: r.drawSchedule,
        status: r.status,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
  }
}

export async function addDebtTranche(data: {
  projectId: string;
  funderId?: string | null;
  name: string;
  type: string;
  amountUsdCents: number;
  tenorYears?: number | null;
  interestRateBps?: number | null;
  drawSchedule?: Prisma.JsonValue | null;
  status?: string;
}): Promise<Result<{ id: string }>> {
  try {
    const row = await db.debtTranche.create({
      data: {
        projectId: data.projectId,
        funderId: data.funderId ?? null,
        name: data.name,
        type: data.type as DebtTrancheType,
        amountUsdCents: BigInt(data.amountUsdCents),
        tenorYears: data.tenorYears ?? null,
        interestRateBps: data.interestRateBps ?? null,
        drawSchedule: data.drawSchedule ?? undefined,
        status: ((data.status ?? "term_sheet") as DebtTrancheStatus),
      },
      select: { id: true },
    });
    return { ok: true, value: { id: row.id } };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
  }
}

export async function updateDebtTranche(
  id: string,
  data: Partial<{
    name: string;
    type: string;
    amountUsdCents: number;
    tenorYears: number | null;
    interestRateBps: number | null;
    drawSchedule: Prisma.JsonValue | null;
    status: string;
    funderId: string | null;
  }>
): Promise<Result<void>> {
  try {
    await db.debtTranche.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.type !== undefined && { type: data.type as DebtTrancheType }),
        ...(data.amountUsdCents !== undefined && {
          amountUsdCents: BigInt(data.amountUsdCents),
        }),
        ...(data.tenorYears !== undefined && { tenorYears: data.tenorYears }),
        ...(data.interestRateBps !== undefined && {
          interestRateBps: data.interestRateBps,
        }),
        ...(data.drawSchedule !== undefined && { drawSchedule: data.drawSchedule ?? undefined }),
        ...(data.status !== undefined && { status: data.status as DebtTrancheStatus }),
        ...(data.funderId !== undefined && { funderId: data.funderId }),
      },
    });
    return { ok: true, value: undefined };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
  }
}

export async function removeDebtTranche(id: string): Promise<Result<void>> {
  try {
    await db.debtTranche.delete({ where: { id } });
    return { ok: true, value: undefined };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
  }
}
