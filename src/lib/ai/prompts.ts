import type { ProjectRequirementRow } from "@/lib/db/requirements";
import { REQUIREMENT_STATUS_LABELS } from "@/types/requirements";
import type { SerializableProject } from "@/components/projects/ProjectEditForm";

export function buildGapAnalysisPrompt(
  project: SerializableProject,
  rows: ProjectRequirementRow[],
  scoreBps: number
): string {
  const pct = (scoreBps / 100).toFixed(1);

  const loiItems = rows.filter((r) => r.isLoiCritical);
  const notStarted = loiItems.filter((r) => r.status === "not_started");
  const inProgress = loiItems.filter((r) => ["in_progress", "draft"].includes(r.status));
  const done = loiItems.filter((r) => ["substantially_final", "executed", "waived"].includes(r.status));

  const allByCategory = rows.reduce<Record<string, typeof rows>>((acc, r) => {
    (acc[r.category] ??= []).push(r);
    return acc;
  }, {});

  const categoryLines = Object.entries(allByCategory)
    .map(([cat, items]) => {
      const statusSummary = items
        .map((r) => `  - ${r.name}: ${REQUIREMENT_STATUS_LABELS[r.status]}${r.isLoiCritical ? " [LOI]" : ""}`)
        .join("\n");
      return `${cat.toUpperCase()}:\n${statusSummary}`;
    })
    .join("\n\n");

  return `You are an expert in US EXIM Bank project finance. A project sponsor needs concise, actionable guidance on their readiness progress.

PROJECT: ${project.name}
Country: ${project.countryCode} | Sector: ${project.sector} | Stage: ${project.stage.replace(/_/g, " ")}
${project.capexUsdCents ? `CAPEX: $${(project.capexUsdCents / 100_000_000).toFixed(0)}M` : ""}
${project.eximCoverType ? `EXIM Cover: ${project.eximCoverType.replace(/_/g, " ")}` : ""}
${project.targetLoiDate ? `Target LOI: ${project.targetLoiDate.slice(0, 10)}` : ""}

READINESS SCORE: ${pct}% (${scoreBps} bps)

LOI-CRITICAL ITEMS (${loiItems.length} total):
- Not started: ${notStarted.map((r) => r.name).join(", ") || "none"}
- In progress/draft: ${inProgress.map((r) => r.name).join(", ") || "none"}
- Substantially final or better: ${done.map((r) => r.name).join(", ") || "none"}

ALL REQUIREMENTS BY CATEGORY:
${categoryLines}

Based on this status, provide a gap analysis with exactly 3 prioritized actions the sponsor should take THIS WEEK to most efficiently advance toward LOI submission.

Format your response as:
**Priority 1: [short title]**
[2-3 sentence explanation of what to do and why it matters most right now]

**Priority 2: [short title]**
[2-3 sentence explanation]

**Priority 3: [short title]**
[2-3 sentence explanation]

Then add a brief (2-3 sentence) **Outlook** paragraph summarizing the overall trajectory and any flags.

Be specific to EXIM requirements and this project's actual status. Do not hedge — give direct, expert advice.`;
}
