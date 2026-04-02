"use client";

import { useState, useTransition } from "react";
import { bulkUpdateRequirementStatus } from "@/actions/requirements";
import type { RequirementStatusValue } from "@/types/requirements";

type Props = {
  projectId: string;
  slug: string;
  selectedIds: string[];
  onClear: () => void;
};

const STATUS_OPTIONS: Array<{ value: RequirementStatusValue; label: string }> = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "draft", label: "Draft" },
  { value: "substantially_final", label: "Substantially Final" },
  { value: "executed", label: "Executed" },
];

export function BulkStatusBar({ projectId, slug, selectedIds, onClear }: Props) {
  const [status, setStatus] = useState<RequirementStatusValue>("in_progress");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (selectedIds.length === 0) return null;

  function handleApply() {
    setError(null);
    startTransition(async () => {
      const result = await bulkUpdateRequirementStatus({
        projectId,
        requirementIds: selectedIds,
        status,
        slug,
      });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      onClear();
    });
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: "var(--bg-card)",
        borderTop: "1px solid var(--border)",
        padding: "12px 24px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        flexWrap: "wrap",
        boxShadow: "0 -2px 12px rgba(0,0,0,0.08)",
      }}
    >
      {/* Selection badge */}
      <span
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "10px",
          fontWeight: 600,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: "#fff",
          backgroundColor: "var(--accent)",
          borderRadius: "3px",
          padding: "3px 10px",
          flexShrink: 0,
        }}
      >
        {selectedIds.length} selected
      </span>

      <span
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "13px",
          color: "var(--ink-muted)",
          flexShrink: 0,
        }}
      >
        Set status to:
      </span>

      {/* Status select */}
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as RequirementStatusValue)}
        disabled={isPending}
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "13px",
          color: "var(--ink)",
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "4px",
          padding: "6px 10px",
          cursor: isPending ? "not-allowed" : "pointer",
        }}
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Apply button */}
      <button
        onClick={handleApply}
        disabled={isPending}
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "10px",
          fontWeight: 500,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: "#fff",
          backgroundColor: isPending ? "var(--teal-soft)" : "var(--teal)",
          border: "none",
          borderRadius: "3px",
          padding: "8px 18px",
          cursor: isPending ? "not-allowed" : "pointer",
          opacity: isPending ? 0.7 : 1,
          flexShrink: 0,
        }}
      >
        {isPending ? "Applying…" : "Apply"}
      </button>

      {/* Clear button */}
      <button
        onClick={onClear}
        disabled={isPending}
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "10px",
          fontWeight: 500,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: "var(--ink-muted)",
          backgroundColor: "transparent",
          border: "1px solid var(--border)",
          borderRadius: "3px",
          padding: "8px 14px",
          cursor: isPending ? "not-allowed" : "pointer",
          flexShrink: 0,
        }}
      >
        Clear
      </button>

      {/* Error message */}
      {error && (
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "12px",
            color: "var(--accent)",
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
}
