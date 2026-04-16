/**
 * Shared types for the Lodestar collaboration layer.
 * These are re-exported from src/types/index.ts.
 *
 * Row types are defined here (the canonical source) and imported by
 * the DB helpers in lib/db/ — never the other way around — to avoid
 * circular dependencies between the types and db layers.
 */

export type {
  CommentTargetType,
  WatchTargetType,
  ApprovalStatus,
  ApprovalTargetType,
} from "@prisma/client";

import type {
  CommentTargetType,
  WatchTargetType,
  ApprovalStatus,
  ApprovalTargetType,
} from "@prisma/client";

export type CommentMentionRow = {
  mentionedId: string;
};

export type CommentRow = {
  id: string;
  projectId: string;
  authorId: string;
  body: string;
  editedAt: Date | null;
  createdAt: Date;
  targetType: CommentTargetType;
  projectRequirementId: string | null;
  documentId: string | null;
  meetingId: string | null;
  mentions: CommentMentionRow[];
};

export type WatcherRow = {
  id: string;
  clerkUserId: string;
  projectId: string;
  targetType: WatchTargetType;
  targetId: string | null;
  createdAt: Date;
};

export type ApprovalRow = {
  id: string;
  projectId: string;
  reviewerId: string;
  status: ApprovalStatus;
  note: string | null;
  targetType: ApprovalTargetType;
  projectRequirementId: string | null;
  documentId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ApprovalHistoryEntry = {
  id: string;
  actorClerkId: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdAt: Date;
};

export type TeamMember = {
  clerkUserId: string;
  name: string;
  email: string | null;
  imageUrl: string | null;
  role: "owner" | "editor" | "viewer";
};
