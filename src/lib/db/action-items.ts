import { db } from "./index";
import { toDbError } from "@/lib/utils";
import type { Result } from "@/types";

export type OverdueActionItem = {
  id: string;
  title: string;
  dueDate: Date;
  daysOverdue: number;
  assigneeName: string | null;
  requirementName: string | null;
  meetingTitle: string | null;
};

export async function getOverdueActionItems(
  projectId: string,
): Promise<Result<OverdueActionItem[]>> {
  try {
    const now = new Date();

    const rows = await db.actionItem.findMany({
      where: {
        projectId,
        status: "open",
        dueDate: { lt: now },
      },
      orderBy: { dueDate: "asc" },
      take: 20,
      select: {
        id: true,
        title: true,
        dueDate: true,
        assignedTo: {
          select: { name: true },
        },
        projectRequirement: {
          select: { requirement: { select: { name: true } } },
        },
        meeting: {
          select: { title: true },
        },
      },
    });

    const items: OverdueActionItem[] = rows.map((row) => {
      const dueDate = row.dueDate!;
      const diffMs = now.getTime() - dueDate.getTime();
      const daysOverdue = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

      return {
        id: row.id,
        title: row.title,
        dueDate,
        daysOverdue,
        assigneeName: row.assignedTo?.name ?? null,
        requirementName: row.projectRequirement?.requirement.name ?? null,
        meetingTitle: row.meeting?.title ?? null,
      };
    });

    return { ok: true, value: items };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
  }
}
