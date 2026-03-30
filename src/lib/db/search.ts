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

export type SearchResults = {
  projects: SearchProjectRow[];
  stakeholders: SearchStakeholderRow[];
};

export async function searchDealsAndStakeholders(
  userId: string,
  q: string
): Promise<Result<SearchResults>> {
  try {
    const [projects, stakeholders] = await Promise.all([
      db.project.findMany({
        where: {
          ownerClerkId: userId,
          name: {
            contains: q,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          stage: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      }),
      db.stakeholder.findMany({
        where: {
          name: {
            contains: q,
            mode: "insensitive",
          },
          roles: {
            some: {
              project: {
                ownerClerkId: userId,
              },
            },
          },
        },
        select: {
          id: true,
          name: true,
          title: true,
          organization: {
            select: {
              name: true,
            },
          },
          roles: {
            where: {
              project: {
                ownerClerkId: userId,
              },
            },
            select: {
              project: {
                select: {
                  slug: true,
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
            take: 1,
          },
        },
        orderBy: {
          name: "asc",
        },
        take: 5,
      }),
    ]);

    return {
      ok: true,
      value: {
        projects,
        stakeholders: stakeholders.map((stakeholder) => ({
          id: stakeholder.id,
          name: stakeholder.name,
          title: stakeholder.title,
          organizationName: stakeholder.organization?.name ?? null,
          projectSlug: stakeholder.roles[0]?.project.slug ?? null,
        })),
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}
