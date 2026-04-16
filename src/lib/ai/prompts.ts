import type { ProjectRequirementRow } from "@/lib/db/requirements";
import { REQUIREMENT_STATUS_LABELS } from "@/types/requirements";
import type { SerializableProject } from "@/types";
import { getProgramConfig } from "@/lib/requirements/index";

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

function buildMilestoneSlippageBlock(targetLoiDate: string | null, gateLabel = "Gate"): string {
  if (!targetLoiDate) return `${gateLabel} target date not set`;

  const today = new Date();
  const target = new Date(targetLoiDate);
  const daysToGate = daysBetween(today, target);

  if (daysToGate < 0) {
    return `WARNING: ${gateLabel} target date passed ${Math.abs(daysToGate)} days ago`;
  }
  if (daysToGate <= 30) {
    return `ALERT: ${gateLabel} target date is ${daysToGate} days away`;
  }
  return `${gateLabel} target is on track`;
}

function getDealTypeGuidance(dealType: string): string {
  switch (dealType) {
    case "exim_project_finance":
      return "Focus on LOI-critical items, US content certification (>51%), EPC term sheet status, and off-take agreement creditworthiness. EXIM's LOI submission requires substantially final form on all LOI-critical items.";
    case "development_finance":
      return "Focus on ESMS (Environmental and Social Management System), environmental categorization, additionality demonstration, and SEP (Stakeholder Engagement Plan). DFIs require IFC Performance Standards compliance.";
    case "commercial_finance":
      return "Focus on DSCR covenant compliance, financial close conditions precedent, MAC clause definitions, and lender due diligence package completeness. Commercial banks require a fully executed term sheet before credit approval.";
    case "private_equity":
      return "Focus on management team references, LP mandate compliance memo, exit strategy documentation, and ESG baseline. PE sponsors need a clear path to exit and LP approval before deploying capital.";
    case "blended_finance":
      return "Focus on donor grant agreement execution, concessional window approval criteria, additionality memo completeness, and results framework alignment. Blended finance requires demonstrating that concessional capital crowds in — not crowds out — commercial investment.";
    default:
      return "Focus on the highest-weighted incomplete items, prioritizing any items that gate the next project stage.";
  }
}

function getGapAnalysisPersona(dealType: string): string {
  switch (dealType) {
    case "exim_project_finance":
      return "expert in US EXIM Bank project finance and LOI submission requirements";
    case "private_equity":
      return "expert in PE infrastructure investment committee processes and sponsor finance";
    case "development_finance":
      return "expert in DFI project finance appraisal and board approval processes";
    case "commercial_finance":
      return "expert in commercial bank project finance credit processes and credit committee approval";
    case "blended_finance":
      return "expert in blended finance structuring, donor coordination, and concessional window approval";
    default:
      return "expert in infrastructure project finance and deal readiness";
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
  const programConfig = getProgramConfig(effectiveDealType);
  const gateLabel = programConfig.primaryGateLabel;

  const primaryGateItems = rows.filter((r) => r.isPrimaryGate);
  const notStarted = primaryGateItems.filter((r) => r.status === "not_started");
  const inProgress = primaryGateItems.filter((r) => ["in_progress", "draft"].includes(r.status));
  const done = primaryGateItems.filter((r) => ["substantially_final", "executed", "waived"].includes(r.status));

  const allByCategory = rows.reduce<Record<string, typeof rows>>((acc, r) => {
    (acc[r.category] ??= []).push(r);
    return acc;
  }, {});

  const categoryLines = Object.entries(allByCategory)
    .map(([cat, items]) => {
      const statusSummary = items
        .map((r) => `  - ${r.name}: ${REQUIREMENT_STATUS_LABELS[r.status]}${r.isPrimaryGate ? ` [${gateLabel}]` : ""}`)
        .join("\n");
      return `${cat.toUpperCase()}:\n${statusSummary}`;
    })
    .join("\n\n");

  const targetDateLabel = effectiveDealType === "exim_project_finance" ? "Target LOI Date" : "Target Gate Date";
  const daysToGateLabel = effectiveDealType === "exim_project_finance" ? "Days to LOI" : "Days to Gate";

  return `You are an ${getGapAnalysisPersona(effectiveDealType)}. A project sponsor needs concise, actionable guidance on their readiness progress.

DEAL TYPE FOCUS: ${getDealTypeGuidance(effectiveDealType)}

PROJECT: ${project.name}
Country: ${project.countryCode} | Sector: ${project.sector} | Stage: ${project.stage.replace(/_/g, " ")}
${project.capexUsdCents ? `CAPEX: $${(project.capexUsdCents / 100_000_000).toFixed(0)}M` : ""}
${project.eximCoverType ? `EXIM Cover: ${project.eximCoverType.replace(/_/g, " ")}` : ""}

PROJECT CONTEXT
- Sector: ${project.sector || "not specified"}
- Host Country: ${project.countryCode || "not specified"}
- Current Stage: ${project.stage.replace(/_/g, " ")}
- ${targetDateLabel}: ${project.targetLoiDate ? formatDate(project.targetLoiDate) : "not set"}
- ${daysToGateLabel}: ${project.targetLoiDate ? (() => { const d = daysBetween(new Date(), new Date(project.targetLoiDate)); return d >= 0 ? `${d} days remaining` : `${Math.abs(d)} days overdue`; })() : "N/A"}

OVERDUE REQUIREMENTS (target date passed, not yet executed)
${buildOverdueBlock(rows)}

MILESTONE SLIPPAGE
${buildMilestoneSlippageBlock(project.targetLoiDate, gateLabel)}

READINESS SCORE: ${pct}% (${scoreBps} bps)

PRIMARY GATE ITEMS — ${gateLabel} (${primaryGateItems.length} total):
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

Be specific to the requirements for this deal type and this project's actual status. Do not hedge — give direct, expert advice.`;
}
