/**
 * Unified deal-type requirements router.
 *
 * Given a `DealType` (from Prisma schema), returns:
 *   - The requirements array for that deal type
 *   - Phase labels for UI display
 *   - Primary gate label (what the blockers panel calls the key milestone)
 *
 * All four programs (EXIM, DFI/IFC, Commercial Bank, PE) use the same
 * RequirementDef shape. EXIM requirements are adapted from their legacy
 * EximRequirementDef shape inline here.
 */

import { EXIM_REQUIREMENTS } from "@/lib/exim/requirements";
import { DFI_REQUIREMENTS } from "@/lib/dfi/requirements";
import { IFC_REQUIREMENTS } from "@/lib/ifc/requirements";
import { COMMERCIAL_REQUIREMENTS } from "@/lib/commercial/requirements";
import { PE_REQUIREMENTS } from "@/lib/pe/requirements";
import type { RequirementDef } from "./types";

// ─── DealType values (mirrors Prisma enum) ────────────────────────────────────

export type DealTypeValue =
  | "exim_project_finance"
  | "development_finance"
  | "commercial_finance"
  | "private_equity"
  | "other";

// ─── Program config ───────────────────────────────────────────────────────────

export interface ProgramConfig {
  /** Display name for the program (used in headings). */
  label: string;
  /** What the primary approval milestone is called (for blockers panel). */
  primaryGateLabel: string;
  /** Short code for the phase badge in the checklist. */
  phaseLabels: Record<string, string>;
  /** Whether this program has a "LOI-critical" style blocker column. */
  hasBlockerColumn: boolean;
}

const PROGRAM_CONFIGS: Record<DealTypeValue, ProgramConfig> = {
  exim_project_finance: {
    label: "EXIM Project Finance",
    primaryGateLabel: "LOI Submission",
    phaseLabels: {
      loi: "LOI",
      final_commitment: "Final Commitment",
    },
    hasBlockerColumn: true,
  },
  development_finance: {
    label: "Development Finance (DFI/IFC)",
    primaryGateLabel: "Board Approval",
    phaseLabels: {
      concept: "Concept",
      board_approval: "Board Approval",
      financial_close: "Financial Close",
    },
    hasBlockerColumn: true,
  },
  commercial_finance: {
    label: "Commercial Bank Project Finance",
    primaryGateLabel: "Credit Approval",
    phaseLabels: {
      credit_approval: "Credit Approval",
      cp_to_close: "CP to Close",
      covenant: "Covenant",
    },
    hasBlockerColumn: true,
  },
  private_equity: {
    label: "Private Equity / Sponsor Finance",
    primaryGateLabel: "IC Approval",
    phaseLabels: {
      screening: "Screening",
      ic_approval: "IC Approval",
      post_ic: "Post-IC",
    },
    hasBlockerColumn: true,
  },
  other: {
    label: "Deal Workplan",
    primaryGateLabel: "Key Milestone",
    phaseLabels: {
      screening: "Early Stage",
      ic_approval: "Key Approval",
      post_ic: "Execution",
    },
    hasBlockerColumn: false,
  },
};

export function getProgramConfig(dealType: string): ProgramConfig {
  return PROGRAM_CONFIGS[dealType as DealTypeValue] ?? PROGRAM_CONFIGS.other;
}

// ─── Stage label resolver ─────────────────────────────────────────────────────

const EXIM_STAGE_LABELS: Record<string, string> = {
  concept: "Concept",
  pre_loi: "Pre-LOI",
  loi_submitted: "LOI Submitted",
  loi_approved: "LOI Approved",
  pre_commitment: "Pre-Commitment",
  final_commitment: "Final Commitment",
  financial_close: "Financial Close",
};

const GENERIC_STAGE_LABELS: Record<string, string> = {
  concept: "Concept",
  pre_loi: "Early Development",
  loi_submitted: "Mandate / Approval",
  loi_approved: "Due Diligence",
  pre_commitment: "Pre-Commitment",
  final_commitment: "Committed",
  financial_close: "Financial Close",
};

/** Returns the display label for a ProjectPhase given the deal type. */
export function getStageLabel(stage: string, dealType: string): string {
  const labels = dealType === "exim_project_finance" ? EXIM_STAGE_LABELS : GENERIC_STAGE_LABELS;
  return labels[stage] ?? stage.replace(/_/g, " ");
}

// ─── Taxonomy resolver ────────────────────────────────────────────────────────

/**
 * Adapts the legacy EximRequirementDef shape to RequirementDef.
 * EXIM requirements use `isLoiCritical` and typed phases — we normalize here.
 */
function adaptEximRequirements(): RequirementDef[] {
  return EXIM_REQUIREMENTS.map((r) => ({
    id: r.id,
    category: r.category,
    name: r.name,
    description: r.description,
    phaseRequired: r.phaseRequired,
    isPrimaryGate: r.isLoiCritical,
    weight: r.weight,
    sortOrder: r.sortOrder,
    phaseLabel: r.phaseRequired === "loi" ? "LOI" : "Final Commitment",
    defaultOwner: "Sponsor",
    applicableSectors: r.applicableSectors,
  }));
}

/**
 * Adapts IFC requirements (legacy IfcRequirementDef) to RequirementDef.
 */
function adaptIfcRequirements(): RequirementDef[] {
  return IFC_REQUIREMENTS.map((r) => ({
    id: r.id,
    category: r.category,
    name: r.name,
    description: r.description,
    phaseRequired: r.phaseRequired,
    isPrimaryGate: r.isLoiCritical,
    weight: r.weight,
    sortOrder: r.sortOrder,
    phaseLabel: r.phaseLabel,
    defaultOwner: r.defaultOwner,
    applicableSectors: r.applicableSectors,
  }));
}

/**
 * Returns the requirements taxonomy for the given deal type.
 *
 * - exim_project_finance → EXIM 43-item taxonomy
 * - development_finance  → IFC/DFI 60-item taxonomy
 * - commercial_finance   → Commercial Bank 75-item taxonomy
 * - private_equity       → PE/Sponsor 70-item taxonomy
 * - other                → PE taxonomy (most generic workplan)
 */
export function getRequirementsForDealType(dealType: string): RequirementDef[] {
  switch (dealType as DealTypeValue) {
    case "exim_project_finance":
      return adaptEximRequirements();

    case "development_finance":
      // Use the expanded IFC taxonomy (which covers all major DFIs)
      // The generic DFI taxonomy in lib/dfi/ is an alternative if needed.
      return adaptIfcRequirements();

    case "commercial_finance":
      return [...COMMERCIAL_REQUIREMENTS];

    case "private_equity":
      return [...PE_REQUIREMENTS];

    case "other":
    default:
      return [...PE_REQUIREMENTS];
  }
}

/**
 * Returns all requirement IDs for the given deal type.
 * Used by getProjectRequirements to detect which rows need to be created.
 */
export function getRequirementIdsForDealType(dealType: string): string[] {
  return getRequirementsForDealType(dealType).map((r) => r.id);
}

/**
 * Returns the primary gate IDs (hard blockers for the key milestone) for a deal type.
 */
export function getPrimaryGateIds(dealType: string): string[] {
  return getRequirementsForDealType(dealType)
    .filter((r) => r.isPrimaryGate)
    .map((r) => r.id);
}

/**
 * Quick lookup by requirement ID for a given deal type.
 */
export function getRequirementById(
  dealType: string,
  requirementId: string
): RequirementDef | undefined {
  return getRequirementsForDealType(dealType).find((r) => r.id === requirementId);
}
