/**
 * Shared types for the EXIM requirements domain.
 *
 * These types are used across the application — scoring logic, server
 * actions, API routes, and components all import from here.
 */

/**
 * The seven valid status values for a requirement on a project.
 *
 * Progression: not_started → in_progress → draft → substantially_final → executed
 * Side exits: waived (EXIM explicitly excused), not_applicable (structurally inapplicable)
 *
 * not_applicable: excluded from scoring numerator AND denominator.
 * waived: counts as 1.0 (fully satisfied) in scoring.
 */
export type RequirementStatusValue =
  | "not_started"
  | "in_progress"
  | "draft"
  | "substantially_final"
  | "executed"
  | "waived"
  | "not_applicable";

/** Ordered status progression for UI display and validation. */
export const REQUIREMENT_STATUS_ORDER: readonly RequirementStatusValue[] = [
  "not_started",
  "in_progress",
  "draft",
  "substantially_final",
  "executed",
  "waived",
  "not_applicable",
];

/** The financing programs supported by the application. */
export type ProgramId = "exim" | "ifc";

/** Human-readable labels for each status. */
export const REQUIREMENT_STATUS_LABELS: Record<RequirementStatusValue, string> =
  {
    not_started: "Not Started",
    in_progress: "In Progress",
    draft: "Draft",
    substantially_final: "Substantially Final",
    executed: "Executed",
    waived: "Waived",
    not_applicable: "Not Applicable",
  };
