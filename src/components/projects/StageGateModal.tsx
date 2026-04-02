"use client";

import type { GateCheckResult, GateBlocker } from "@/lib/projects/stage-gate";

export type { GateCheckResult };

type Props = {
  open: boolean;
  targetStageLabel: string;
  gateResult: GateCheckResult;
  onConfirm: () => void;
  onCancel: () => void;
};

const CATEGORY_LABELS: Record<string, string> = {
  contracts: "Contracts",
  financial: "Financial",
  studies: "Studies",
  permits: "Permits",
  corporate: "Corporate",
  environmental_social: "Env & Social",
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
        backgroundColor: "var(--bg-subtle, #f5f5f5)",
        border: "1px solid var(--border)",
        borderRadius: "3px",
        padding: "2px 6px",
        flexShrink: 0,
      }}
    >
      {CATEGORY_LABELS[category] ?? category}
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
                backgroundColor: "rgba(34,197,94,0.08)",
                border: "1px solid rgba(34,197,94,0.3)",
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
                <circle cx="10" cy="10" r="10" fill="rgba(34,197,94,0.15)" />
                <path
                  d="M6 10.5L8.5 13L14 7.5"
                  stroke="rgb(22,163,74)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "14px",
                  color: "rgb(22,163,74)",
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
                  backgroundColor: "rgba(239,68,68,0.07)",
                  border: "1px solid rgba(239,68,68,0.28)",
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
                  <circle cx="9" cy="9" r="9" fill="rgba(239,68,68,0.15)" />
                  <path
                    d="M9 5v5M9 12.5v.5"
                    stroke="rgb(220,38,38)"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "13px",
                    color: "rgb(220,38,38)",
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
                  backgroundColor: "rgba(234,179,8,0.08)",
                  border: "1px solid rgba(234,179,8,0.3)",
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
                    fill="rgba(234,179,8,0.2)"
                    stroke="rgb(161,122,0)"
                    strokeWidth="1.4"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9 7v4M9 13v.5"
                    stroke="rgb(161,122,0)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "13px",
                    color: "rgb(161,122,0)",
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
                  color: "white",
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
                  color: "white",
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
                  color: "white",
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
