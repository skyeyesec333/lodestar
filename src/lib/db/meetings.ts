import { db } from "./index";
import type { MeetingType, ActionItemStatus, ActionItemPriority } from "@prisma/client";
import type { Result } from "@/types";

export type MeetingRow = {
  id: string;
  title: string;
  meetingType: MeetingType;
  meetingDate: Date;
  durationMinutes: number | null;
  location: string | null;
  summary: string | null;
  createdAt: Date;
  attendees: { id: string; stakeholder: { id: string; name: string; title: string | null } }[];
  actionItems: ActionItemRow[];
};

export type ActionItemRow = {
  id: string;
  title: string;
  description: string | null;
  status: ActionItemStatus;
  priority: ActionItemPriority;
  dueDate: Date | null;
  completedAt: Date | null;
  projectRequirementId: string | null;
  requirementId: string | null;
  requirementName: string | null;
  requirementCurrentStatus: string | null;
  assignedTo: { id: string; name: string } | null;
};

const meetingSelect = {
  id: true,
  title: true,
  meetingType: true,
  meetingDate: true,
  durationMinutes: true,
  location: true,
  summary: true,
  createdAt: true,
  attendees: {
    select: {
      id: true,
      stakeholder: { select: { id: true, name: true, title: true } },
    },
  },
  actionItems: {
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      dueDate: true,
      completedAt: true,
      projectRequirementId: true,
      assignedTo: { select: { id: true, name: true } },
      projectRequirement: {
        select: {
          status: true,
          requirement: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

function shapeMeeting(row: {
  id: string;
  title: string;
  meetingType: MeetingType;
  meetingDate: Date;
  durationMinutes: number | null;
  location: string | null;
  summary: string | null;
  createdAt: Date;
  attendees: { id: string; stakeholder: { id: string; name: string; title: string | null } }[];
  actionItems: {
    id: string;
    title: string;
    description: string | null;
    status: ActionItemStatus;
    priority: ActionItemPriority;
    dueDate: Date | null;
    completedAt: Date | null;
    projectRequirementId: string | null;
    assignedTo: { id: string; name: string } | null;
    projectRequirement: { status: string; requirement: { id: string; name: string } } | null;
  }[];
}): MeetingRow {
  return {
    id: row.id,
    title: row.title,
    meetingType: row.meetingType,
    meetingDate: row.meetingDate,
    durationMinutes: row.durationMinutes,
    location: row.location,
    summary: row.summary,
    createdAt: row.createdAt,
    attendees: row.attendees,
    actionItems: row.actionItems.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      status: a.status,
      priority: a.priority,
      dueDate: a.dueDate,
      completedAt: a.completedAt,
      projectRequirementId: a.projectRequirementId,
      requirementId: a.projectRequirement?.requirement.id ?? null,
      requirementName: a.projectRequirement?.requirement.name ?? null,
      requirementCurrentStatus: a.projectRequirement?.status ?? null,
      assignedTo: a.assignedTo,
    })),
  };
}

export async function getProjectMeetings(
  projectId: string
): Promise<Result<MeetingRow[]>> {
  try {
    const rows = await db.meeting.findMany({
      where: { projectId },
      select: meetingSelect,
      orderBy: { meetingDate: "desc" },
    });
    return { ok: true, value: rows.map(shapeMeeting) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

export async function createMeetingRecord(input: {
  projectId: string;
  title: string;
  meetingType: MeetingType;
  meetingDate: Date;
  durationMinutes: number | null;
  location: string | null;
  summary: string | null;
  createdBy: string;
  attendeeStakeholderIds: string[];
}): Promise<Result<MeetingRow>> {
  try {
    const row = await db.meeting.create({
      data: {
        projectId: input.projectId,
        title: input.title,
        meetingType: input.meetingType,
        meetingDate: input.meetingDate,
        durationMinutes: input.durationMinutes,
        location: input.location,
        summary: input.summary,
        createdBy: input.createdBy,
        attendees: {
          create: input.attendeeStakeholderIds.map((stakeholderId) => ({
            stakeholderId,
          })),
        },
      },
      select: meetingSelect,
    });
    return { ok: true, value: shapeMeeting(row) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

export async function createActionItemRecord(input: {
  meetingId: string;
  projectId: string;
  title: string;
  description: string | null;
  priority: ActionItemPriority;
  dueDate: Date | null;
  assignedToId: string | null;
  projectRequirementId: string | null;
}): Promise<Result<ActionItemRow>> {
  try {
    const row = await db.actionItem.create({
      data: {
        meetingId: input.meetingId,
        projectId: input.projectId,
        title: input.title,
        description: input.description,
        priority: input.priority,
        dueDate: input.dueDate,
        assignedToId: input.assignedToId,
        projectRequirementId: input.projectRequirementId,
        status: "open",
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        dueDate: true,
        completedAt: true,
        projectRequirementId: true,
        assignedTo: { select: { id: true, name: true } },
        projectRequirement: {
          select: {
            status: true,
            requirement: { select: { id: true, name: true } },
          },
        },
      },
    });
    return {
      ok: true,
      value: {
        id: row.id,
        title: row.title,
        description: row.description,
        status: row.status,
        priority: row.priority,
        dueDate: row.dueDate,
        completedAt: row.completedAt,
        projectRequirementId: row.projectRequirementId,
        requirementId: row.projectRequirement?.requirement.id ?? null,
        requirementName: row.projectRequirement?.requirement.name ?? null,
        requirementCurrentStatus: row.projectRequirement?.status ?? null,
        assignedTo: row.assignedTo,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

export async function getMeetingById(
  meetingId: string,
  projectId: string
): Promise<Result<MeetingRow & { projectId: string }>> {
  try {
    const row = await db.meeting.findUnique({
      where: { id: meetingId },
      select: { ...meetingSelect, projectId: true },
    });
    if (!row || row.projectId !== projectId) {
      return { ok: false, error: { code: "NOT_FOUND", message: "Meeting not found." } };
    }
    return { ok: true, value: { ...shapeMeeting(row), projectId: row.projectId } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

export async function getMeetingByIdNoProject(
  meetingId: string
): Promise<Result<{ projectId: string; summary: string | null }>> {
  try {
    const row = await db.meeting.findUnique({
      where: { id: meetingId },
      select: { projectId: true, summary: true },
    });
    if (!row) {
      return { ok: false, error: { code: "NOT_FOUND", message: "Meeting not found." } };
    }
    return { ok: true, value: { projectId: row.projectId, summary: row.summary } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

export async function updateActionItemStatus(
  actionItemId: string,
  projectId: string,
  status: ActionItemStatus
): Promise<Result<void>> {
  try {
    await db.actionItem.update({
      where: { id: actionItemId, projectId },
      data: {
        status,
        completedAt: status === "completed" ? new Date() : null,
      },
      select: { id: true },
    });
    return { ok: true, value: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}
