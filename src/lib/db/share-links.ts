import { db } from "./index";
import type { Result } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Select shape ──────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

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
    const message = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
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
    const message = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
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
    const message = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
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

    // Increment view count and update lastViewedAt regardless of validity
    // (so revoked/expired views are still logged for audit purposes)
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
    const message = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}
