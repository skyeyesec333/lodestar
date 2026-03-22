/**
 * Shared types for the EXIM requirements domain.
 *
 * These types are used across the application — scoring logic, server
 * actions, API routes, and components all import from here.
 */

/** The six valid status values for a requirement on a project. */
export type RequirementStatusValue =
  | "not_started"
  | "in_progress"
  | "draft"
  | "substantially_final"
  | "executed"
  | "waived";

/** Ordered status progression for UI display and validation. */
export const REQUIREMENT_STATUS_ORDER: readonly RequirementStatusValue[] = [
  "not_started",
  "in_progress",
  "draft",
  "substantially_final",
  "executed",
  "waived",
];

/** Human-readable labels for each status. */
export const REQUIREMENT_STATUS_LABELS: Record<RequirementStatusValue, string> =
  {
    not_started: "Not Started",
    in_progress: "In Progress",
    draft: "Draft",
    substantially_final: "Substantially Final",
    executed: "Executed",
    waived: "Waived",
  };
