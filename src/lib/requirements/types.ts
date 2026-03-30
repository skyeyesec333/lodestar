/**
 * Shared types for all deal-type requirement taxonomies.
 *
 * Each deal type (EXIM, DFI, Commercial Bank, PE) has its own requirements
 * module, but all share this common shape so that scoring, UI, and DB
 * code can operate on any taxonomy without branching.
 */

// ─── Phase constants ─────────────────────────────────────────────────────────

/**
 * EXIM phases (legacy — kept for backward-compat with phaseRequired field).
 * Other deal types map their phases to the closest equivalent.
 */
export const EXIM_PHASES = ["loi", "final_commitment"] as const;
export type EximPhase = (typeof EXIM_PHASES)[number];

/** DFI (IFC/AfDB/DFC) deal phases */
export const DFI_PHASES = [
  "concept",
  "board_approval",
  "financial_close",
] as const;
export type DfiPhase = (typeof DFI_PHASES)[number];

/** Commercial bank project finance phases */
export const COMMERCIAL_PHASES = [
  "credit_approval",
  "cp_to_close",
  "covenant",
] as const;
export type CommercialPhase = (typeof COMMERCIAL_PHASES)[number];

/** Private equity / sponsor finance phases */
export const PE_PHASES = [
  "screening",
  "ic_approval",
  "post_ic",
] as const;
export type PePhase = (typeof PE_PHASES)[number];

/** Union of all phase values across all deal types */
export type AnyPhase = EximPhase | DfiPhase | CommercialPhase | PePhase;

// ─── Categories ───────────────────────────────────────────────────────────────

export const REQUIREMENT_CATEGORIES = [
  "contracts",
  "financial",
  "studies",
  "permits",
  "corporate",
  "environmental_social",
  "insurance",
  "construction",
] as const;
export type RequirementCategory = (typeof REQUIREMENT_CATEGORIES)[number];

// ─── Core shape ───────────────────────────────────────────────────────────────

/**
 * Universal requirement definition — all four deal-type taxonomies use this shape.
 * `phaseRequired` is typed as string to accommodate each deal type's own phase enum.
 */
export interface RequirementDef {
  readonly id: string;
  readonly category: RequirementCategory;
  readonly name: string;
  readonly description: string;
  /**
   * Phase at which this item must be complete.
   * Value comes from the deal-type-specific phase enum (e.g. DfiPhase).
   */
  readonly phaseRequired: string;
  /**
   * Whether this item is a hard gate for the deal type's primary approval milestone
   * (LOI for EXIM, board approval for DFI, credit approval for commercial bank,
   * IC approval for PE). Drives the blockers panel and readiness gauge color.
   */
  readonly isPrimaryGate: boolean;
  readonly weight: number;
  readonly sortOrder: number;
  /** Human-readable label for the phase (shown in checklist badge). */
  readonly phaseLabel: string;
  /** Typical owner: "Sponsor", "Lender", "Third-party consultant", etc. */
  readonly defaultOwner: string;
  readonly applicableSectors?: readonly string[];
}
