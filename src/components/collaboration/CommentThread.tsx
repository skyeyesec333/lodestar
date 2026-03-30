"use client";

import { CSSProperties, useCallback, useOptimistic, useState, useTransition } from "react";
import { MentionInput } from "./MentionInput";
import { addCommentAction, editCommentAction, deleteCommentAction } from "@/actions/comments";
import type { CommentRow } from "@/lib/db/comments";
import type { CommentTargetType } from "@prisma/client";
import type { TeamMember } from "@/types/collaboration";

interface CommentThreadProps {
  projectId: string;
  slug: string;
  targetType: CommentTargetType;
  targetId: string;
  initialComments: CommentRow[];
  currentUserId: string;
  teamMembers: TeamMember[];
  actorName?: string;
  compact?: boolean;
}

type OptimisticComment = CommentRow & { pending?: boolean };

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function renderCommentBody(body: string, teamMembers: TeamMember[]): React.ReactNode {
  const parts = body.split(/(@\w[\w\s]*?)(?=\s|$|@)/g);
  return parts.map((part, i) => {
    if (part.startsWith("@")) {
      const name = part.slice(1).trim();
      const member = teamMembers.find(
        (m) => m.name.toLowerCase() === name.toLowerCase()
      );
      if (member) {
        return (
          <span
            key={i}
            style={{
              color: "var(--accent)",
              fontWeight: 500,
              background: "color-mix(in srgb, var(--accent) 10%, transparent)",
              borderRadius: "3px",
              padding: "0 2px",
            }}
          >
            {part}
          </span>
        );
      }
    }
    return part;
  });
}

export function CommentThread({
  projectId,
  slug,
  targetType,
  targetId,
  initialComments,
  currentUserId,
  teamMembers,
  actorName,
  compact = false,
}: CommentThreadProps) {
  const [comments, setOptimisticComments] = useOptimistic<OptimisticComment[], OptimisticComment[]>(
    initialComments,
    (_, next) => next
  );
  const [isPending, startTransition] = useTransition();

  const [body, setBody] = useState("");
  const [mentionedIds, setMentionedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editMentionedIds, setEditMentionedIds] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(!compact);
  const [error, setError] = useState<string | null>(null);

  const handleMentionsChange = useCallback((ids: string[]) => setMentionedIds(ids), []);
  const handleEditMentionsChange = useCallback((ids: string[]) => setEditMentionedIds(ids), []);

  async function handleSubmit() {
    const trimmed = body.trim();
    if (!trimmed) return;

    const optimistic: OptimisticComment = {
      id: `temp-${Date.now()}`,
      projectId,
      authorId: currentUserId,
      body: trimmed,
      editedAt: null,
      createdAt: new Date(),
      targetType,
      projectRequirementId: targetType === "requirement" ? targetId : null,
      documentId: targetType === "document" ? targetId : null,
      meetingId: targetType === "meeting" ? targetId : null,
      mentions: mentionedIds.map((mentionedId) => ({ mentionedId })),
      pending: true,
    };

    setBody("");
    setMentionedIds([]);
    setError(null);

    startTransition(async () => {
      setOptimisticComments([...comments, optimistic]);
      const result = await addCommentAction({ projectId, slug, targetType, targetId, body: trimmed, mentionedIds, actorName });
      if (!result.ok) {
        setError(result.error.message);
        setOptimisticComments(comments.filter((c) => c.id !== optimistic.id));
      }
    });
  }

  async function handleEdit(commentId: string) {
    const trimmed = editBody.trim();
    if (!trimmed) return;
    setError(null);

    startTransition(async () => {
      const result = await editCommentAction({ projectId, slug, commentId, body: trimmed, mentionedIds: editMentionedIds });
      if (!result.ok) {
        setError(result.error.message);
      } else {
        setEditingId(null);
        setOptimisticComments(
          comments.map((c) => (c.id === commentId ? { ...result.value } : c))
        );
      }
    });
  }

  async function handleDelete(commentId: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteCommentAction({ projectId, slug, commentId });
      if (!result.ok) {
        setError(result.error.message);
      } else {
        setOptimisticComments(comments.filter((c) => c.id !== commentId));
      }
    });
  }

  const visibleCount = comments.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Header toggle */}
      {compact && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: "var(--ink-muted)",
            fontSize: "12px",
          }}
        >
          <CommentCountGlyph />
          {visibleCount > 0 ? `${visibleCount} comment${visibleCount === 1 ? "" : "s"}` : "Add comment"}
          <span style={{ transition: "transform 0.15s", transform: expanded ? "rotate(180deg)" : "none", display: "flex" }}>
            <ChevronGlyph />
          </span>
        </button>
      )}

      {expanded && (
        <>
          {/* Comment list */}
          {comments.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {comments.map((comment) => {
                const isOwn = comment.authorId === currentUserId;
                const isEditing = editingId === comment.id;

                return (
                  <div
                    key={comment.id}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      background: comment.pending ? "color-mix(in srgb, var(--border) 30%, var(--bg-card))" : "var(--bg-card)",
                      opacity: comment.pending ? 0.7 : 1,
                      transition: "opacity 0.2s",
                    }}
                  >
                    {/* Author row */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                      <AuthorAvatar authorId={comment.authorId} teamMembers={teamMembers} />
                      <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--ink)" }}>
                        {teamMembers.find((m) => m.clerkUserId === comment.authorId)?.name ?? "Team member"}
                      </span>
                      <span style={{ fontSize: "11px", color: "var(--ink-muted)", marginLeft: "auto" }}>
                        {formatRelativeTime(new Date(comment.createdAt))}
                      </span>
                      {comment.editedAt && (
                        <span style={{ fontSize: "10px", color: "var(--ink-muted)", fontStyle: "italic" }}>edited</span>
                      )}
                      {isOwn && !isEditing && !comment.pending && (
                        <div style={{ display: "flex", gap: "4px" }}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(comment.id);
                              setEditBody(comment.body);
                              setEditMentionedIds(comment.mentions.map((m) => m.mentionedId));
                            }}
                            style={actionButtonStyle}
                            aria-label="Edit comment"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(comment.id)}
                            style={{ ...actionButtonStyle, color: "var(--color-critical, #ef4444)" }}
                            aria-label="Delete comment"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Body or edit form */}
                    {isEditing ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <MentionInput
                          value={editBody}
                          onChange={setEditBody}
                          onMentionsChange={handleEditMentionsChange}
                          teamMembers={teamMembers}
                          rows={3}
                        />
                        <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                          <button type="button" onClick={() => setEditingId(null)} style={cancelButtonStyle}>
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleEdit(comment.id)}
                            disabled={!editBody.trim() || isPending}
                            style={submitButtonStyle(!!editBody.trim() && !isPending)}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: "13px", color: "var(--ink)", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {renderCommentBody(comment.body, teamMembers)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* New comment input */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <MentionInput
              value={body}
              onChange={setBody}
              onMentionsChange={handleMentionsChange}
              teamMembers={teamMembers}
              placeholder="Comment — type @ to mention a teammate…"
              disabled={isPending}
              rows={compact ? 2 : 3}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px", alignItems: "center" }}>
              {error && (
                <span style={{ fontSize: "11px", color: "var(--color-critical, #ef4444)", flex: 1 }}>
                  {error}
                </span>
              )}
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={!body.trim() || isPending}
                style={submitButtonStyle(!!body.trim() && !isPending)}
              >
                Comment
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AuthorAvatar({ authorId, teamMembers }: { authorId: string; teamMembers: TeamMember[] }) {
  const member = teamMembers.find((m) => m.clerkUserId === authorId);
  return (
    <div
      style={{
        width: "20px",
        height: "20px",
        borderRadius: "50%",
        background: "color-mix(in srgb, var(--accent) 20%, var(--bg-card))",
        display: "grid",
        placeItems: "center",
        fontSize: "10px",
        fontWeight: 600,
        color: "var(--accent)",
        flexShrink: 0,
      }}
    >
      {member?.name.charAt(0).toUpperCase() ?? "?"}
    </div>
  );
}

function CommentCountGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ width: "14px", height: "14px" }}>
      <path
        d="M7 17.4 3.8 20V6.8A2.8 2.8 0 0 1 6.6 4h10.8a2.8 2.8 0 0 1 2.8 2.8v7.4a2.8 2.8 0 0 1-2.8 2.8H7Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ width: "12px", height: "12px" }}>
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const actionButtonStyle: CSSProperties = {
  background: "none",
  border: "none",
  padding: "0 4px",
  fontSize: "11px",
  color: "var(--ink-muted)",
  cursor: "pointer",
  lineHeight: 1,
};

const cancelButtonStyle: CSSProperties = {
  padding: "5px 10px",
  borderRadius: "6px",
  border: "1px solid var(--border)",
  background: "none",
  color: "var(--ink-muted)",
  fontSize: "12px",
  cursor: "pointer",
};

function submitButtonStyle(active: boolean): CSSProperties {
  return {
    padding: "5px 12px",
    borderRadius: "6px",
    border: "none",
    background: active ? "var(--accent)" : "var(--border)",
    color: active ? "#fff" : "var(--ink-muted)",
    fontSize: "12px",
    cursor: active ? "pointer" : "default",
    fontWeight: 500,
    transition: "background 0.15s",
  };
}
