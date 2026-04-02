/**
 * auth-helpers.ts
 *
 * Re-exports project access utilities from project-access.ts under the names
 * specified in the architecture guide. New code should prefer importing directly
 * from project-access.ts; this file exists for compatibility.
 */

export {
  assertProjectAccess,
  getProjectAccessById,
  getProjectAccessBySlug,
  hasMinimumProjectRole,
  type ProjectAccessRole,
  type ProjectAccessContext,
} from "./project-access";
