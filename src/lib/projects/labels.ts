import { getStageLabel } from "@/lib/requirements/index";

const DEAL_TYPE_LABELS: Record<string, string> = {
  exim_project_finance: "US EXIM Project Finance",
  commercial_finance: "Commercial Finance",
  development_finance: "Development Finance",
  private_equity: "Private Equity",
  other: "Undecided Path",
};

export function formatDealTypeLabel(dealType: string): string {
  return DEAL_TYPE_LABELS[dealType] ?? dealType.replace(/_/g, " ");
}

const STAGE_ORDER = [
  "concept",
  "pre_loi",
  "loi_submitted",
  "loi_approved",
  "pre_commitment",
  "final_commitment",
  "financial_close",
] as const;

export function getNextGateLabel(stage: string, dealType: string): string {
  const currentIndex = STAGE_ORDER.indexOf(stage as (typeof STAGE_ORDER)[number]);
  if (currentIndex < 0 || currentIndex >= STAGE_ORDER.length - 1) {
    return "Financial Close";
  }
  return getStageLabel(STAGE_ORDER[currentIndex + 1], dealType);
}

export function formatTargetDate(date: Date | null | undefined): string {
  if (!date) return "Not set";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}
