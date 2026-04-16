import { db } from "./index";
import { toDbError } from "@/lib/utils";
import type { Result } from "@/types";

export type ShareLinkRow = {
  id: string;
  token: string;
  projectId: string;
  label: string | null;
  expiresAt: Date | null;
  viewCount: number;
  lastViewedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
};

export type ResolvedShareToken = {
  projectId: string;
  projectSlug: string;
  projectName: string;
  isValid: boolean;
};

const shareLinkSelect = {
  id: true,
  token: true,
  projectId: true,
  label: true,
  expiresAt: true,
  viewCount: true,
  lastViewedAt: true,
  revokedAt: true,
  createdAt: true,
} as const;

export async function createShareLink(data: {
  projectId: string;
  createdBy: string;
  label?: string | null;
  expiresAt?: Date | null;
}): Promise<Result<ShareLinkRow>> {
  try {
    const row = await db.projectShareLink.create({
      data: {
        projectId: data.projectId,
        createdBy: data.createdBy,
        label: data.label ?? null,
        expiresAt: data.expiresAt ?? null,
      },
      select: shareLinkSelect,
    });
    return { ok: true, value: row };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
  }
}

export async function getShareLinksForProject(
  projectId: string
): Promise<Result<ShareLinkRow[]>> {
  try {
    const rows = await db.projectShareLink.findMany({
      where: { projectId },
      select: shareLinkSelect,
      orderBy: { createdAt: "desc" },
    });
    return { ok: true, value: rows };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
  }
}

export async function revokeShareLink(
  id: string,
  _userId: string
): Promise<Result<void>> {
  try {
    await db.projectShareLink.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    return { ok: true, value: undefined };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
  }
}

export async function resolveShareToken(
  token: string
): Promise<Result<ResolvedShareToken>> {
  try {
    const link = await db.projectShareLink.findUnique({
      where: { token },
      select: {
        id: true,
        revokedAt: true,
        expiresAt: true,
        project: {
          select: {
            id: true,
            slug: true,
            name: true,
          },
        },
      },
    });

    if (!link) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "Share link not found." },
      };
    }

    const now = new Date();
    const isRevoked = link.revokedAt !== null;
    const isExpired = link.expiresAt !== null && link.expiresAt < now;
    const isValid = !isRevoked && !isExpired;

    // Log view even for revoked/expired links (audit trail)
    await db.projectShareLink.update({
      where: { id: link.id },
      data: {
        viewCount: { increment: 1 },
        lastViewedAt: now,
      },
    });

    return {
      ok: true,
      value: {
        projectId: link.project.id,
        projectSlug: link.project.slug,
        projectName: link.project.name,
        isValid,
      },
    };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
  }
}
