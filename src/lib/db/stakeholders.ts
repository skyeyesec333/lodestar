import { db } from "./index";
import type {
  ActionItemPriority,
  ActionItemStatus,
  MeetingType,
  StakeholderRoleType,
} from "@prisma/client";
import type { Result } from "@/types";

export type StakeholderMeetingRow = {
  id: string;
  title: string;
  meetingDate: Date;
  meetingType: MeetingType;
  location: string | null;
  summary: string | null;
};

export type StakeholderActionItemRow = {
  id: string;
  title: string;
  status: ActionItemStatus;
  priority: ActionItemPriority;
  dueDate: Date | null;
  meetingTitle: string;
  requirementName: string | null;
};

export type StakeholderDocumentOwedRow = {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  requirementName: string | null;
  createdAt: Date;
};

export type StakeholderRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  organizationId: string | null;
  organizationName: string | null;
  organizationWebsite: string | null;
  organizationCountryCode: string | null;
  roleType: StakeholderRoleType;
  roleId: string;
  roleDescription: string | null;
  isPrimary: boolean;
  recentMeetings: StakeholderMeetingRow[];
  openActionItems: StakeholderActionItemRow[];
  meetingCount: number;
  openActionItemCount: number;
  documentsOwed: StakeholderDocumentOwedRow[];
  documentsOwedCount: number;
  lastContactAt: Date | null;
  lastMeetingOutcome: string | null;
  lastContactedAt: Date | null;
  needsFollowUp: boolean;
  followUpReason: string | null;
};

export async function getProjectStakeholders(
  projectId: string
): Promise<Result<StakeholderRow[]>> {
  try {
    const roles = await db.stakeholderRole.findMany({
      where: { projectId, stakeholder: { deletedAt: null } },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        roleType: true,
        description: true,
        isPrimary: true,
        stakeholder: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            title: true,
            lastContactedAt: true,
            organization: {
              select: {
                id: true,
                name: true,
                website: true,
                countryCode: true,
              },
            },
            attendances: {
              where: {
                meeting: { projectId },
              },
              orderBy: {
                meeting: { meetingDate: "desc" },
              },
              select: {
                meeting: {
                  select: {
                    id: true,
                    title: true,
                    meetingDate: true,
                    meetingType: true,
                    location: true,
                    summary: true,
                  },
                },
              },
            },
            actionItems: {
              where: {
                projectId,
                status: { in: ["open", "in_progress"] },
              },
              orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
              select: {
                id: true,
                title: true,
                description: true,
                status: true,
                priority: true,
                dueDate: true,
                meeting: {
                  select: {
                    title: true,
                  },
                },
                projectRequirement: {
                  select: {
                    requirement: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return {
      ok: true,
      value: roles.map((r) => ({
        ...(() => {
          const recentMeetings = r.stakeholder.attendances.map((attendance) => ({
            id: attendance.meeting.id,
            title: attendance.meeting.title,
            meetingDate: attendance.meeting.meetingDate,
            meetingType: attendance.meeting.meetingType,
            location: attendance.meeting.location,
            summary: attendance.meeting.summary,
          }));

          const openActionItems = r.stakeholder.actionItems.map((actionItem) => ({
            id: actionItem.id,
            title: actionItem.title,
            status: actionItem.status,
            priority: actionItem.priority,
            dueDate: actionItem.dueDate,
            meetingTitle: actionItem.meeting.title,
            requirementName: actionItem.projectRequirement?.requirement.name ?? null,
          }));

          const documentsOwed = r.stakeholder.actionItems
            .filter((actionItem) => actionItem.projectRequirement?.requirement.name ?? actionItem.description)
            .slice(0, 4)
            .map((actionItem) => ({
              id: actionItem.id,
              title: actionItem.title,
              description: actionItem.description,
              dueDate: actionItem.dueDate,
              requirementName: actionItem.projectRequirement?.requirement.name ?? null,
              createdAt: actionItem.dueDate ?? new Date(),
            }));

          const lastMeeting = recentMeetings[0] ?? null;
          const now = Date.now();
          const hasOverdueItem = openActionItems.some(
            (actionItem) =>
              actionItem.dueDate !== null && new Date(actionItem.dueDate).getTime() < now
          );
          const hasAgingContact =
            lastMeeting !== null &&
            now - new Date(lastMeeting.meetingDate).getTime() > 1000 * 60 * 60 * 24 * 21;

          const followUpReason = hasOverdueItem
            ? `${openActionItems.filter((actionItem) => actionItem.dueDate !== null && new Date(actionItem.dueDate).getTime() < now).length} overdue item${openActionItems.filter((actionItem) => actionItem.dueDate !== null && new Date(actionItem.dueDate).getTime() < now).length === 1 ? "" : "s"}`
            : documentsOwed.length > 0
            ? `${documentsOwed.length} open document request${documentsOwed.length === 1 ? "" : "s"}`
            : openActionItems.length > 0
            ? `${openActionItems.length} open action item${openActionItems.length === 1 ? "" : "s"}`
            : hasAgingContact
            ? "No recent contact in 21+ days"
            : null;

          return {
            recentMeetings: recentMeetings.slice(0, 3),
            openActionItems: openActionItems.slice(0, 4),
            meetingCount: recentMeetings.length,
            openActionItemCount: openActionItems.length,
            documentsOwed,
            documentsOwedCount: documentsOwed.length,
            lastContactAt: lastMeeting?.meetingDate ?? null,
            lastMeetingOutcome: lastMeeting?.summary ?? null,
            needsFollowUp: followUpReason !== null,
            followUpReason,
          };
        })(),
        id: r.stakeholder.id,
        name: r.stakeholder.name,
        email: r.stakeholder.email,
        phone: r.stakeholder.phone,
        title: r.stakeholder.title,
        organizationId: r.stakeholder.organization?.id ?? null,
        organizationName: r.stakeholder.organization?.name ?? null,
        organizationWebsite: r.stakeholder.organization?.website ?? null,
        organizationCountryCode: r.stakeholder.organization?.countryCode ?? null,
        roleType: r.roleType,
        roleId: r.id,
        roleDescription: r.description,
        isPrimary: r.isPrimary,
        lastContactedAt: r.stakeholder.lastContactedAt ?? null,
      })),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

export async function addStakeholderToProject(
  projectId: string,
  data: {
    name: string;
    email: string | null;
    phone: string | null;
    title: string | null;
    organizationName: string | null;
    roleType: StakeholderRoleType;
    isPrimary: boolean;
  }
): Promise<Result<void>> {
  try {
    await db.$transaction(async (tx) => {
      // Find or create organization if provided
      let organizationId: string | null = null;
      if (data.organizationName?.trim()) {
        const trimmed = data.organizationName.trim();
        const existing = await tx.organization.findFirst({
          where: { name: trimmed },
          select: { id: true },
        });
        if (existing) {
          organizationId = existing.id;
        } else {
          const org = await tx.organization.create({
            data: { name: trimmed },
            select: { id: true },
          });
          organizationId = org.id;
        }
      }

      // Create stakeholder
      const stakeholder = await tx.stakeholder.create({
        data: {
          name: data.name,
          email: data.email || null,
          phone: data.phone || null,
          title: data.title || null,
          organizationId,
        },
        select: { id: true },
      });

      // Create role
      await tx.stakeholderRole.create({
        data: {
          stakeholderId: stakeholder.id,
          projectId,
          roleType: data.roleType,
          isPrimary: data.isPrimary,
        },
      });
    });

    return { ok: true, value: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

export async function updateStakeholderInProject(
  projectId: string,
  roleId: string,
  data: {
    name: string;
    email: string | null;
    phone: string | null;
    title: string | null;
    organizationName: string | null;
    roleDescription: string | null;
  }
): Promise<Result<void>> {
  try {
    await db.$transaction(async (tx) => {
      const role = await tx.stakeholderRole.findFirst({
        where: { id: roleId, projectId },
        select: { id: true, stakeholderId: true },
      });

      if (!role) {
        throw new Error("Stakeholder role not found.");
      }

      let organizationId: string | null = null;
      if (data.organizationName?.trim()) {
        const trimmed = data.organizationName.trim();
        const existing = await tx.organization.findFirst({
          where: { name: trimmed },
          select: { id: true },
        });
        if (existing) {
          organizationId = existing.id;
        } else {
          const organization = await tx.organization.create({
            data: { name: trimmed },
            select: { id: true },
          });
          organizationId = organization.id;
        }
      }

      await tx.stakeholder.update({
        where: { id: role.stakeholderId },
        data: {
          name: data.name,
          email: data.email || null,
          phone: data.phone || null,
          title: data.title || null,
          organizationId,
        },
        select: { id: true },
      });

      await tx.stakeholderRole.update({
        where: { id: role.id },
        data: {
          description: data.roleDescription || null,
        },
        select: { id: true },
      });
    });

    return { ok: true, value: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

export async function removeStakeholderRole(
  roleId: string,
  projectId: string,
  replacementRoleId?: string | null,
  userId?: string | null
): Promise<Result<void>> {
  try {
    await db.$transaction(async (tx) => {
      const role = await tx.stakeholderRole.findFirst({
        where: { id: roleId, projectId },
        select: { id: true, roleType: true, isPrimary: true, stakeholderId: true },
      });

      if (!role) {
        return;
      }

      if (role.isPrimary) {
        if (!replacementRoleId) {
          throw new Error("Primary contacts must be reassigned before removal.");
        }

        const replacement = await tx.stakeholderRole.findFirst({
          where: {
            id: replacementRoleId,
            projectId,
            roleType: role.roleType,
            NOT: { id: role.id },
          },
          select: { id: true },
        });

        if (!replacement) {
          throw new Error("Choose another stakeholder in the same role to become primary first.");
        }

        await tx.stakeholderRole.updateMany({
          where: {
            projectId,
            roleType: role.roleType,
          },
          data: {
            isPrimary: false,
          },
        });

        await tx.stakeholderRole.update({
          where: { id: replacement.id },
          data: { isPrimary: true },
        });
      }

      await tx.stakeholderRole.delete({
        where: { id: role.id },
      });

      await tx.stakeholder.update({
        where: { id: role.stakeholderId },
        data: { deletedAt: new Date(), deletedBy: userId ?? null },
        select: { id: true },
      });
    });
    return { ok: true, value: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

export async function updateLastContacted(
  stakeholderId: string
): Promise<Result<void>> {
  try {
    await db.stakeholder.update({
      where: { id: stakeholderId },
      data: { lastContactedAt: new Date() },
      select: { id: true },
    });
    return { ok: true, value: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}
