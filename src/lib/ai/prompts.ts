import type { ProjectRequirementRow } from "@/lib/db/requirements";
import { REQUIREMENT_STATUS_LABELS } from "@/types/requirements";
import type { SerializableProject } from "@/components/projects/ProjectEditForm";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function buildOverdueBlock(rows: ProjectRequirementRow[]): string {
  const today = new Date();
  const overdue = rows.filter((r) => {
    if (!r.targetDate) return false;
    if (r.status === "executed" || r.status === "waived" || r.status === "not_applicable") return false;
    return new Date(r.targetDate) < today;
  });

  if (overdue.length === 0) return "No overdue requirements";

  return overdue
    .map((r) => {
      const daysLate = daysBetween(new Date(r.targetDate!), today);
      return `- ${r.name}: ${REQUIREMENT_STATUS_LABELS[r.status]}, ${daysLate} days overdue (target ${formatDate(r.targetDate!.toString())})`;
    })
    .join("\n");
}

function buildMilestoneSlippageBlock(targetLoiDate: string | null): string {
  if (!targetLoiDate) return "LOI target date not set";

  const today = new Date();
  const target = new Date(targetLoiDate);
  const daysToLoi = daysBetween(today, target);

  if (daysToLoi < 0) {
    return `WARNING: LOI target date passed ${Math.abs(daysToLoi)} days ago`;
  }
  if (daysToLoi <= 30) {
    return `ALERT: LOI target date is ${daysToLoi} days away`;
  }
  return "LOI target is on track";
}

function getDealTypeGuidance(dealType: string): string {
  switch (dealType) {
    case "exim_project_finance":
      return "Focus on LOI-critical items, US content certification (>51%), EPC term sheet status, and off-take agreement creditworthiness. EXIM's LOI submission requires substantially final form on all LOI-critical items.";
    case "development_finance":
      return "Focus on ESMS (Environmental and Social Management System), environmental categorization, additionality demonstration, and SEP (Stakeholder Engagement Plan). DFIs require IFC Performance Standards compliance.";
    case "commercial_finance":
      return "Focus on DSCR covenant compliance, financial close conditions precedent, MAC clause definitions, and lender due diligence package completeness. Commercial banks require a fully executed term sheet before credit approval.";
    case "blended_finance":
      return "Focus on concessional window approval, additionality memo, first-loss tranche term sheet, and the blended finance structure rationale. Donor grant agreements must be in place before commercial lenders commit.";
    case "private_equity":
      return "Focus on management team references, LP mandate compliance memo, exit strategy documentation, and ESG baseline. PE sponsors need a clear path to exit and LP approval before deploying capital.";
    default:
      return "Focus on the highest-weighted incomplete items, prioritizing any items that gate the next project stage.";
  }
}

export function buildGapAnalysisPrompt(
  project: SerializableProject,
  rows: ProjectRequirementRow[],
  scoreBps: number,
  dealType?: string
): string {
  const pct = (scoreBps / 100).toFixed(1);
  const effectiveDealType = dealType ?? project.dealType ?? "exim_project_finance";

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

  const isExim = effectiveDealType === "exim_project_finance";
  const gateLabel = isExim ? "LOI submission" : "next gate";

  return `You are an expert in project finance. A project sponsor needs concise, actionable guidance on their readiness progress.

DEAL TYPE FOCUS: ${getDealTypeGuidance(effectiveDealType)}

PROJECT: ${project.name}
Country: ${project.countryCode} | Sector: ${project.sector} | Stage: ${project.stage.replace(/_/g, " ")}
${project.capexUsdCents ? `CAPEX: $${(project.capexUsdCents / 100_000_000).toFixed(0)}M` : ""}
${project.eximCoverType ? `EXIM Cover: ${project.eximCoverType.replace(/_/g, " ")}` : ""}

PROJECT CONTEXT
- Sector: ${project.sector || "not specified"}
- Host Country: ${project.countryCode || "not specified"}
- Current Stage: ${project.stage.replace(/_/g, " ")}
- Target LOI Date: ${project.targetLoiDate ? formatDate(project.targetLoiDate) : "not set"}
- Days to LOI: ${project.targetLoiDate ? (() => { const d = daysBetween(new Date(), new Date(project.targetLoiDate)); return d >= 0 ? `${d} days remaining` : `${Math.abs(d)} days overdue`; })() : "N/A"}

OVERDUE REQUIREMENTS (target date passed, not yet executed)
${buildOverdueBlock(rows)}

MILESTONE SLIPPAGE
${buildMilestoneSlippageBlock(project.targetLoiDate)}

READINESS SCORE: ${pct}% (${scoreBps} bps)

LOI-CRITICAL ITEMS (${loiItems.length} total):
- Not started: ${notStarted.map((r) => r.name).join(", ") || "none"}
- In progress/draft: ${inProgress.map((r) => r.name).join(", ") || "none"}
- Substantially final or better: ${done.map((r) => r.name).join(", ") || "none"}

ALL REQUIREMENTS BY CATEGORY:
${categoryLines}

Based on this status, provide a gap analysis with exactly 3 prioritized actions the sponsor should take THIS WEEK to most efficiently advance toward ${gateLabel}.

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
