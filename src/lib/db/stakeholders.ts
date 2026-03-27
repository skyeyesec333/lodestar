import { db } from "./index";
import type { StakeholderRoleType } from "@prisma/client";
import type { Result } from "@/types";

export type StakeholderRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  organizationName: string | null;
  roleType: StakeholderRoleType;
  roleId: string;
  isPrimary: boolean;
};

export async function getProjectStakeholders(
  projectId: string
): Promise<Result<StakeholderRow[]>> {
  try {
    const roles = await db.stakeholderRole.findMany({
      where: { projectId },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        roleType: true,
        isPrimary: true,
        stakeholder: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            title: true,
            organization: { select: { name: true } },
          },
        },
      },
    });

    return {
      ok: true,
      value: roles.map((r) => ({
        id: r.stakeholder.id,
        name: r.stakeholder.name,
        email: r.stakeholder.email,
        phone: r.stakeholder.phone,
        title: r.stakeholder.title,
        organizationName: r.stakeholder.organization?.name ?? null,
        roleType: r.roleType,
        roleId: r.id,
        isPrimary: r.isPrimary,
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

export async function removeStakeholderRole(
  roleId: string,
  projectId: string
): Promise<Result<void>> {
  try {
    await db.stakeholderRole.deleteMany({
      where: { id: roleId, projectId },
    });
    return { ok: true, value: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}
