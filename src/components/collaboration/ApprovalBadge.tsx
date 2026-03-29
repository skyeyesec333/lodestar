"use client";

import { CSSProperties, useState, useTransition } from "react";
import { upsertApprovalAction } from "@/actions/approvals";
import type { ApprovalRow } from "@/lib/db/approvals";
import type { ApprovalStatus, ApprovalTargetType } from "@prisma/client";

interface ApprovalBadgeProps {
  projectId: string;
  slug: string;
  targetType: ApprovalTargetType;
  targetId: string;
  approval: ApprovalRow | null;
  currentUserId: string;
  actorName?: string;
  /** If false, show read-only badge with no action buttons */
  canAct?: boolean;
}

const STATUS_CONFIG: Record<ApprovalStatus, { label: string; color: string; bg: string; border: string }> = {
  draft: {
    label: "Draft",
    color: "var(--ink-muted)",
    bg: "var(--bg)",
    border: "var(--border)",
  },
  in_review: {
    label: "In Review",
    color: "var(--color-warning, #f59e0b)",
    bg: "color-mix(in srgb, var(--color-warning, #f59e0b) 10%, var(--bg-card))",
    border: "color-mix(in srgb, var(--color-warning, #f59e0b) 30%, var(--border))",
  },
  approved: {
    label: "Approved",
    color: "var(--color-success, #22c55e)",
    bg: "color-mix(in srgb, var(--color-success, #22c55e) 10%, var(--bg-card))",
    border: "color-mix(in srgb, var(--color-success, #22c55e) 30%, var(--border))",
  },
  rejected: {
    label: "Rejected",
    color: "var(--color-critical, #ef4444)",
    bg: "color-mix(in srgb, var(--color-critical, #ef4444) 10%, var(--bg-card))",
    border: "color-mix(in srgb, var(--color-critical, #ef4444) 30%, var(--border))",
  },
};

export function ApprovalBadge({
  projectId,
  slug,
  targetType,
  targetId,
  approval,
  currentUserId,
  actorName,
  canAct = true,
}: ApprovalBadgeProps) {
  const [optimisticApproval, setOptimisticApproval] = useState(approval);
  const [showMenu, setShowMenu] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const currentStatus: ApprovalStatus = optimisticApproval?.status ?? "draft";
  const config = STATUS_CONFIG[currentStatus];

  function act(status: ApprovalStatus) {
    setShowMenu(false);
    setError(null);
    const note = noteInput.trim() || null;

    startTransition(async () => {
      setOptimisticApproval((prev) => ({
        ...(prev ?? {
          id: "temp",
          projectId,
          reviewerId: currentUserId,
          note: null,
          targetType,
          projectRequirementId: targetType === "requirement" ? targetId : null,
          documentId: targetType === "document" ? targetId : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        status,
        reviewerId: currentUserId,
        note,
        updatedAt: new Date(),
      } as ApprovalRow));

      const result = await upsertApprovalAction({ projectId, slug, targetType, targetId, status, note, actorName });
      if (!result.ok) {
        setError(result.error.message);
        setOptimisticApproval(optimisticApproval);
      } else {
        setOptimisticApproval(result.value);
        setNoteInput("");
      }
    });
  }

  const badgeStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "3px 8px",
    borderRadius: "20px",
    border: `1px solid ${config.border}`,
    background: config.bg,
    fontSize: "11px",
    fontWeight: 500,
    color: config.color,
    cursor: canAct ? "pointer" : "default",
    userSelect: "none",
    position: "relative",
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        style={badgeStyle}
        onClick={() => canAct && setShowMenu((v) => !v)}
        aria-expanded={showMenu}
        aria-haspopup={canAct ? "true" : undefined}
        aria-label={`Approval status: ${config.label}`}
      >
        <ApprovalDot status={currentStatus} />
        {config.label}
        {canAct && <ChevronGlyph />}
      </button>

      {showMenu && canAct && (
        <>
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close approval menu"
            style={{ position: "fixed", inset: 0, background: "none", border: "none", cursor: "default", zIndex: 200 }}
            onClick={() => setShowMenu(false)}
          />
          <div
            role="menu"
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              zIndex: 201,
              minWidth: "180px",
              borderRadius: "10px",
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              overflow: "hidden",
            }}
          >
            {/* Note input */}
            <div style={{ padding: "10px 12px 8px", borderBottom: "1px solid var(--border)" }}>
              <input
                type="text"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Optional note…"
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  color: "var(--ink)",
                  fontSize: "12px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Actions */}
            {(["draft", "in_review", "approved", "rejected"] as ApprovalStatus[]).map((status) => (
              <button
                key={status}
                type="button"
                role="menuitem"
                onClick={() => act(status)}
                disabled={isPending || currentStatus === status}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "9px 12px",
                  background: currentStatus === status ? "color-mix(in srgb, var(--accent) 8%, var(--bg-card))" : "none",
                  border: "none",
                  cursor: currentStatus === status || isPending ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  opacity: isPending ? 0.5 : 1,
                }}
              >
                <ApprovalDot status={status} />
                <span style={{ fontSize: "13px", color: STATUS_CONFIG[status].color, fontWeight: currentStatus === status ? 600 : 400 }}>
                  {STATUS_CONFIG[status].label}
                </span>
                {currentStatus === status && (
                  <span style={{ marginLeft: "auto", fontSize: "10px", color: "var(--ink-muted)" }}>current</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {error && (
        <p style={{ margin: "4px 0 0", fontSize: "11px", color: "var(--color-critical, #ef4444)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

function ApprovalDot({ status }: { status: ApprovalStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      style={{
        width: "6px",
        height: "6px",
        borderRadius: "50%",
        background: config.color,
        flexShrink: 0,
        display: "inline-block",
      }}
      aria-hidden="true"
    />
  );
}

function ChevronGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ width: "10px", height: "10px" }}>
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
