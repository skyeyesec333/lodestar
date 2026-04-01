import { describe, expect, it } from "vitest";
import { dedupeDemoPortfolioProjects } from "@/lib/projects/demo-portfolio";
import type { ProjectListItem } from "@/types";

function buildProject(overrides: Partial<ProjectListItem>): ProjectListItem {
  return {
    id: overrides.id ?? "project-1",
    name: overrides.name ?? "Project",
    slug: overrides.slug ?? "project-1",
    countryCode: overrides.countryCode ?? "TZ",
    sector: overrides.sector ?? "power",
    stage: overrides.stage ?? "concept",
    targetLoiDate: overrides.targetLoiDate ?? null,
    cachedReadinessScore: overrides.cachedReadinessScore ?? null,
    createdAt: overrides.createdAt ?? new Date("2026-03-30T00:00:00.000Z"),
    capexUsdCents: overrides.capexUsdCents ?? null,
    lastActivityAt: overrides.lastActivityAt ?? null,
  };
}

describe("dedupeDemoPortfolioProjects", () => {
  it("collapses repeated demo entries by name while preserving first occurrence", () => {
    const projects = [
      buildProject({
        id: "newer-kisongo",
        name: "Kisongo Thermal Power Project",
        slug: "lodestar-demo-project-999999-abcd",
      }),
      buildProject({
        id: "rufiji",
        name: "Rufiji Water Treatment Expansion",
        slug: "lodestar-demo-project-888888-abcd",
      }),
      buildProject({
        id: "older-kisongo",
        name: "Kisongo Thermal Power Project",
        slug: "lodestar-demo-project-777777-abcd",
      }),
    ];

    expect(dedupeDemoPortfolioProjects(projects).map((project) => project.id)).toEqual([
      "newer-kisongo",
      "rufiji",
    ]);
  });

  it("does not merge non-demo projects that happen to share a name", () => {
    const projects = [
      buildProject({
        id: "demo-kisongo",
        name: "Kisongo Thermal Power Project",
        slug: "lodestar-demo-project-999999-abcd",
      }),
      buildProject({
        id: "real-kisongo",
        name: "Kisongo Thermal Power Project",
        slug: "kisongo-thermal-power-project-prod",
      }),
    ];

    expect(dedupeDemoPortfolioProjects(projects).map((project) => project.id)).toEqual([
      "demo-kisongo",
      "real-kisongo",
    ]);
  });
});
