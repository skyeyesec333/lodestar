/**
 * Shared types for the Lodestar collaboration layer.
 * These are re-exported from src/types/index.ts.
 */

export type { CommentRow, CommentMentionRow } from "@/lib/db/comments";
export type { WatcherRow } from "@/lib/db/watchers";
export type { ApprovalRow } from "@/lib/db/approvals";

export type {
  CommentTargetType,
  WatchTargetType,
  ApprovalStatus,
  ApprovalTargetType,
} from "@prisma/client";

/**
 * A project team member resolvable for @mention autocomplete.
 * Sourced from ProjectMember rows + Clerk user profile data.
 */
export type TeamMember = {
  clerkUserId: string;
  name: string;
  email: string | null;
  imageUrl: string | null;
  role: "owner" | "editor" | "viewer";
};
