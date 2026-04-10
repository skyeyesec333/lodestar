import { db } from "./index";
import type { ProjectMemberRole } from "@prisma/client";
import type { Result } from "@/types";

export type ProjectMemberRow = {
  id: string;
  projectId: string;
  clerkUserId: string;
  role: string; // "owner" | "editor" | "viewer"
  invitedBy: string | null;
  createdAt: Date;
};

const memberSelect = {
  id: true,
  projectId: true,
  clerkUserId: true,
  role: true,
  invitedBy: true,
  createdAt: true,
} as const;

export async function getProjectMembers(
  projectId: string
): Promise<Result<ProjectMemberRow[]>> {
  try {
    const rows = await db.projectMember.findMany({
      where: { projectId },
      select: memberSelect,
      orderBy: { createdAt: "asc" },
    });
    return { ok: true, value: rows };
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
    const role = data.role as ProjectMemberRole;
    const row = await db.projectMember.upsert({
      where: { projectId_clerkUserId: { projectId: data.projectId, clerkUserId: data.clerkUserId } },
      create: {
        projectId: data.projectId,
        clerkUserId: data.clerkUserId,
        role,
        invitedBy: data.invitedBy,
      },
      update: {
        role,
        invitedBy: data.invitedBy,
      },
      select: memberSelect,
    });
    return { ok: true, value: row };
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
    await db.projectMember.update({
      where: { id },
      data: { role: role as ProjectMemberRole },
      select: { id: true },
    });
    return { ok: true, value: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

export async function removeProjectMember(id: string): Promise<Result<void>> {
  try {
    await db.projectMember.delete({
      where: { id },
    });
    return { ok: true, value: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}
