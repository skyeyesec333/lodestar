import type { ProjectListItem } from "@/types";

export const DEMO_PROJECT_SLUG_PREFIX = "lodestar-demo-project-";

export function isDemoProjectSlug(slug: string): boolean {
  return slug.startsWith(DEMO_PROJECT_SLUG_PREFIX);
}

export function dedupeDemoPortfolioProjects<T extends Pick<ProjectListItem, "name" | "slug">>(
  projects: readonly T[]
): T[] {
  const seenDemoNames = new Set<string>();

  return projects.filter((project) => {
    if (!isDemoProjectSlug(project.slug)) {
      return true;
    }

    const normalizedName = project.name.trim().toLowerCase();
    if (seenDemoNames.has(normalizedName)) {
      return false;
    }

    seenDemoNames.add(normalizedName);
    return true;
  });
}
