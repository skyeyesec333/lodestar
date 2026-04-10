"use client";

import { useEffect } from "react";
import type { GateCheckResult, GateBlocker } from "@/lib/projects/stage-gate";
import { getCategoryLabel } from "@/lib/requirements/index";

export type { GateCheckResult };

type Props = {
  open: boolean;
  targetStageLabel: string;
  gateResult: GateCheckResult;
  onConfirm: () => void;
  onCancel: () => void;
};


function CategoryBadge({ category }: { category: string }) {
  return (
    <span
      style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: "9px",
        fontWeight: 500,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--ink-muted)",
        backgroundColor: "var(--bg)",
        border: "1px solid var(--border)",
        borderRadius: "3px",
        padding: "2px 6px",
        flexShrink: 0,
      }}
    >
      {getCategoryLabel(category)}
    </span>
  );
}

function BlockerRow({ blocker }: { blocker: GateBlocker }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "8px 0",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <CategoryBadge category={blocker.category} />
      <span
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "13px",
          color: "var(--ink)",
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {blocker.name}
      </span>
    </div>
  );
}

const btnBase: React.CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "11px",
  fontWeight: 500,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  borderRadius: "3px",
  padding: "9px 18px",
  cursor: "pointer",
  border: "none",
  transition: "opacity 0.15s",
};

export function StageGateModal({
  open,
  targetStageLabel,
  gateResult,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  const { canAdvance, hardBlockers, softBlockers } = gateResult;

  const allClear = canAdvance && softBlockers.length === 0;
  const hasHard = hardBlockers.length > 0;
  const hasSoft = canAdvance && softBlockers.length > 0;

  return (
    /* Backdrop */
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Advance to ${targetStageLabel}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      {/* Panel */}
      <div
        style={{
          backgroundColor: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          width: "min(520px, 92vw)",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              fontWeight: 500,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "var(--ink-muted)",
              margin: "0 0 4px",
            }}
          >
            Stage Gate
          </p>
          <h2
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "18px",
              fontWeight: 600,
              color: "var(--ink)",
              margin: 0,
            }}
          >
            Advance to {targetStageLabel}
          </h2>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          {allClear && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                backgroundColor: "color-mix(in srgb, var(--teal) 8%, var(--bg))",
                border: "1px solid color-mix(in srgb, var(--teal) 30%, transparent)",
                borderRadius: "4px",
                padding: "14px 16px",
              }}
            >
              {/* Green checkmark SVG */}
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="10" cy="10" r="10" fill="color-mix(in srgb, var(--teal) 15%, transparent)" />
                <path
                  d="M6 10.5L8.5 13L14 7.5"
                  stroke="var(--teal)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "14px",
                  color: "var(--teal)",
                  fontWeight: 500,
                }}
              >
                All requirements met. Ready to advance.
              </span>
            </div>
          )}

          {hasHard && (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  backgroundColor: "color-mix(in srgb, var(--accent) 7%, var(--bg))",
                  border: "1px solid color-mix(in srgb, var(--accent) 28%, transparent)",
                  borderRadius: "4px",
                  padding: "12px 16px",
                  marginBottom: "16px",
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle cx="9" cy="9" r="9" fill="color-mix(in srgb, var(--accent) 15%, transparent)" />
                  <path
                    d="M9 5v5M9 12.5v.5"
                    stroke="var(--accent)"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "13px",
                    color: "var(--accent)",
                    fontWeight: 500,
                  }}
                >
                  {hardBlockers.length} LOI-critical item
                  {hardBlockers.length !== 1 ? "s" : ""} incomplete
                </span>
              </div>
              <div>
                {hardBlockers.map((b) => (
                  <BlockerRow key={b.requirementId} blocker={b} />
                ))}
              </div>
            </>
          )}

          {hasSoft && (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  backgroundColor: "color-mix(in srgb, var(--gold) 8%, var(--bg))",
                  border: "1px solid color-mix(in srgb, var(--gold) 30%, transparent)",
                  borderRadius: "4px",
                  padding: "12px 16px",
                  marginBottom: "16px",
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M9 1.5L1 16.5h16L9 1.5z"
                    fill="color-mix(in srgb, var(--gold) 20%, transparent)"
                    stroke="var(--gold)"
                    strokeWidth="1.4"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9 7v4M9 13v.5"
                    stroke="var(--gold)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "13px",
                    color: "var(--gold)",
                    fontWeight: 500,
                  }}
                >
                  {softBlockers.length} item
                  {softBlockers.length !== 1 ? "s" : ""} not yet started
                </span>
              </div>
              <div>
                {softBlockers.map((b) => (
                  <BlockerRow key={b.requirementId} blocker={b} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
          }}
        >
          {allClear && (
            <>
              <button
                onClick={onCancel}
                style={{
                  ...btnBase,
                  backgroundColor: "transparent",
                  border: "1px solid var(--border)",
                  color: "var(--ink-muted)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                style={{
                  ...btnBase,
                  backgroundColor: "var(--accent)",
                  color: "var(--text-inverse)",
                }}
              >
                Confirm
              </button>
            </>
          )}

          {hasHard && (
            <>
              <button
                onClick={onCancel}
                style={{
                  ...btnBase,
                  backgroundColor: "var(--accent)",
                  color: "var(--text-inverse)",
                }}
              >
                Stay &amp; Fix
              </button>
              <button
                onClick={onConfirm}
                style={{
                  ...btnBase,
                  backgroundColor: "transparent",
                  border: "1px solid var(--border)",
                  color: "var(--ink-muted)",
                }}
              >
                Advance Anyway
              </button>
            </>
          )}

          {hasSoft && (
            <>
              <button
                onClick={onCancel}
                style={{
                  ...btnBase,
                  backgroundColor: "transparent",
                  border: "1px solid var(--border)",
                  color: "var(--ink-muted)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                style={{
                  ...btnBase,
                  backgroundColor: "var(--accent)",
                  color: "var(--text-inverse)",
                }}
              >
                Confirm Advance
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
