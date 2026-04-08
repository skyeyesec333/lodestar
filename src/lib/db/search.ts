import { db } from "./index";
import type { Result } from "@/types";

export type SearchProjectRow = {
  id: string;
  name: string;
  slug: string;
  stage: string;
};

export type SearchStakeholderRow = {
  id: string;
  name: string;
  title: string | null;
  organizationName: string | null;
  projectSlug: string | null;
};

export type SearchRequirementRow = {
  id: string;
  name: string;
  projectName: string;
  projectSlug: string;
  status: string;
};

export type SearchDocumentRow = {
  id: string;
  filename: string;
  projectName: string;
  projectSlug: string;
};

export type SearchFunderRow = {
  id: string;
  organizationName: string;
  projectName: string;
  projectSlug: string;
  engagementStage: string;
};

export type SearchResults = {
  projects: SearchProjectRow[];
  stakeholders: SearchStakeholderRow[];
  requirements: SearchRequirementRow[];
  documents: SearchDocumentRow[];
  funders: SearchFunderRow[];
};

export async function searchDealsAndStakeholders(
  userId: string,
  q: string
): Promise<Result<SearchResults>> {
  try {
    const ownerFilter = { ownerClerkId: userId };

    const [projects, stakeholders, requirementRows, documentRows, funderRows] = await Promise.all([
      db.project.findMany({
        where: {
          ...ownerFilter,
          name: { contains: q, mode: "insensitive" },
        },
        select: { id: true, name: true, slug: true, stage: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      db.stakeholder.findMany({
        where: {
          name: { contains: q, mode: "insensitive" },
          roles: { some: { project: ownerFilter } },
        },
        select: {
          id: true,
          name: true,
          title: true,
          organization: { select: { name: true } },
          roles: {
            where: { project: ownerFilter },
            select: { project: { select: { slug: true } } },
            orderBy: { createdAt: "asc" },
            take: 1,
          },
        },
        orderBy: { name: "asc" },
        take: 5,
      }),
      db.projectRequirement.findMany({
        where: {
          project: ownerFilter,
          requirement: { name: { contains: q, mode: "insensitive" } },
        },
        select: {
          id: true,
          status: true,
          requirement: { select: { name: true } },
          project: { select: { name: true, slug: true } },
        },
        take: 5,
      }),
      db.document.findMany({
        where: {
          project: ownerFilter,
          state: "current",
          filename: { contains: q, mode: "insensitive" },
        },
        select: {
          id: true,
          filename: true,
          project: { select: { name: true, slug: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      db.funderRelationship.findMany({
        where: {
          project: ownerFilter,
          deletedAt: null,
          organization: { name: { contains: q, mode: "insensitive" } },
        },
        select: {
          id: true,
          engagementStage: true,
          organization: { select: { name: true } },
          project: { select: { name: true, slug: true } },
        },
        take: 5,
      }),
    ]);

    return {
      ok: true,
      value: {
        projects,
        stakeholders: stakeholders.map((s) => ({
          id: s.id,
          name: s.name,
          title: s.title,
          organizationName: s.organization?.name ?? null,
          projectSlug: s.roles[0]?.project.slug ?? null,
        })),
        requirements: requirementRows.map((r) => ({
          id: r.id,
          name: r.requirement.name,
          projectName: r.project.name,
          projectSlug: r.project.slug,
          status: r.status,
        })),
        documents: documentRows.map((d) => ({
          id: d.id,
          filename: d.filename,
          projectName: d.project.name,
          projectSlug: d.project.slug,
        })),
        funders: funderRows.map((f) => ({
          id: f.id,
          organizationName: f.organization.name,
          projectName: f.project.name,
          projectSlug: f.project.slug,
          engagementStage: f.engagementStage,
        })),
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}
