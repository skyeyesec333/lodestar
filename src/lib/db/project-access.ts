import { db } from "./index";
import type { AppError, Result } from "@/types";

export type ProjectAccessRole = "owner" | "editor" | "viewer";

export type ProjectAccessContext = {
  projectId: string;
  slug: string;
  role: ProjectAccessRole;
  dealType: string;
};

const accessSelect = {
  id: true,
  slug: true,
  dealType: true,
  ownerClerkId: true,
  members: {
    select: {
      role: true,
    },
    take: 1,
  },
} as const;

function normalizeRole(raw: string | null | undefined): ProjectAccessRole | null {
  if (raw === "owner" || raw === "editor" || raw === "viewer") return raw;
  return null;
}

function resolveRole(row: {
  ownerClerkId: string;
  members: Array<{ role: string }>;
}, clerkUserId: string): ProjectAccessRole | null {
  if (row.ownerClerkId === clerkUserId) return "owner";
  return normalizeRole(row.members[0]?.role);
}

function roleRank(role: ProjectAccessRole): number {
  switch (role) {
    case "owner":
      return 3;
    case "editor":
      return 2;
    case "viewer":
    default:
      return 1;
  }
}

export function hasMinimumProjectRole(
  role: ProjectAccessRole,
  minimumRole: ProjectAccessRole
): boolean {
  return roleRank(role) >= roleRank(minimumRole);
}

export async function getProjectAccessById(
  projectId: string,
  clerkUserId: string
): Promise<ProjectAccessContext | null> {
  const row = await db.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerClerkId: clerkUserId },
        { members: { some: { clerkUserId } } },
      ],
    },
    select: {
      ...accessSelect,
      members: {
        where: { clerkUserId },
        select: { role: true },
        take: 1,
      },
    },
  });

  if (!row) return null;
  const role = resolveRole(row, clerkUserId);
  if (!role) return null;
  return { projectId: row.id, slug: row.slug, role, dealType: row.dealType };
}

export async function getProjectAccessBySlug(
  slug: string,
  clerkUserId: string
): Promise<ProjectAccessContext | null> {
  const row = await db.project.findFirst({
    where: {
      slug,
      OR: [
        { ownerClerkId: clerkUserId },
        { members: { some: { clerkUserId } } },
      ],
    },
    select: {
      ...accessSelect,
      members: {
        where: { clerkUserId },
        select: { role: true },
        take: 1,
      },
    },
  });

  if (!row) return null;
  const role = resolveRole(row, clerkUserId);
  if (!role) return null;
  return { projectId: row.id, slug: row.slug, role, dealType: row.dealType };
}

export async function assertProjectAccess(
  projectId: string,
  clerkUserId: string,
  minimumRole: ProjectAccessRole = "viewer"
): Promise<Result<ProjectAccessContext, AppError>> {
  const access = await getProjectAccessById(projectId, clerkUserId);
  if (!access) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Project not found or access denied." } };
  }

  if (!hasMinimumProjectRole(access.role, minimumRole)) {
    return { ok: false, error: { code: "UNAUTHORIZED", message: "You do not have permission to perform this action." } };
  }

  return { ok: true, value: access };
}
