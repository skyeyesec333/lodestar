"use client";

import { useState, useTransition, useRef } from "react";
import { updateRequirementStatus, updateRequirementNotes } from "@/actions/requirements";
import { REQUIREMENT_STATUS_LABELS, REQUIREMENT_STATUS_ORDER } from "@/types/requirements";
import type { RequirementStatusValue } from "@/types/requirements";
import type { ProjectRequirementRow } from "@/lib/db/requirements";

const CATEGORY_ORDER = [
  "contracts",
  "financial",
  "studies",
  "permits",
  "corporate",
  "environmental_social",
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  contracts: "Contracts",
  financial: "Financial",
  studies: "Studies",
  permits: "Permits",
  corporate: "Corporate",
  environmental_social: "Environmental & Social",
};

const PHASE_LABELS: Record<string, string> = {
  loi: "LOI",
  final_commitment: "Final Commitment",
};

function statusColor(status: RequirementStatusValue): string {
  switch (status) {
    case "executed": return "var(--teal)";
    case "substantially_final": return "var(--teal)";
    case "waived": return "var(--ink-muted)";
    case "draft": return "var(--gold)";
    case "in_progress": return "var(--gold)";
    case "not_started": return "var(--border-strong)";
  }
}

function statusBg(status: RequirementStatusValue): string {
  switch (status) {
    case "executed": return "var(--teal-soft)";
    case "substantially_final": return "var(--teal-soft)";
    case "waived": return "var(--bg)";
    case "draft": return "var(--gold-soft)";
    case "in_progress": return "var(--gold-soft)";
    case "not_started": return "var(--bg)";
  }
}

type RequirementsChecklistProps = {
  projectId: string;
  rows: ProjectRequirementRow[];
};

export function RequirementsChecklist({ projectId, rows }: RequirementsChecklistProps) {
  const [statuses, setStatuses] = useState<Record<string, RequirementStatusValue>>(
    Object.fromEntries(rows.map((r) => [r.requirementId, r.status]))
  );
  const [notes, setNotes] = useState<Record<string, string>>(
    Object.fromEntries(rows.map((r) => [r.requirementId, r.notes ?? ""]))
  );
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(
    new Set(rows.filter((r) => r.notes).map((r) => r.requirementId))
  );
  const [savingNotes, setSavingNotes] = useState<Set<string>>(new Set());
  const [lastError, setLastError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [compact, setCompact] = useState(false);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  function handleStatusChange(requirementId: string, status: RequirementStatusValue) {
    const previous = statuses[requirementId];
    setStatuses((prev) => ({ ...prev, [requirementId]: status }));
    setPendingId(requirementId);
    setLastError(null);

    startTransition(async () => {
      const result = await updateRequirementStatus({ projectId, requirementId, status });
      if (!result.ok) {
        setStatuses((prev) => ({ ...prev, [requirementId]: previous }));
        setLastError(result.error.message);
      }
      setPendingId(null);
    });
  }

  function toggleNotes(requirementId: string) {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(requirementId)) {
        next.delete(requirementId);
      } else {
        next.add(requirementId);
      }
      return next;
    });
  }

  function handleNotesChange(requirementId: string, value: string) {
    setNotes((prev) => ({ ...prev, [requirementId]: value }));

    // Debounce save — 1.2s after last keystroke
    if (saveTimers.current[requirementId]) {
      clearTimeout(saveTimers.current[requirementId]);
    }
    saveTimers.current[requirementId] = setTimeout(() => {
      saveNotes(requirementId, value);
    }, 1200);
  }

  async function saveNotes(requirementId: string, value: string) {
    setSavingNotes((prev) => new Set(prev).add(requirementId));
    await updateRequirementNotes({
      projectId,
      requirementId,
      notes: value.trim() || null,
    });
    setSavingNotes((prev) => {
      const next = new Set(prev);
      next.delete(requirementId);
      return next;
    });
  }

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    items: rows.filter((r) => r.category === cat),
  }));

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "24px",
        }}
      >
        <p className="eyebrow">Requirements</p>
        <button
          onClick={() => setCompact((c) => !c)}
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            fontWeight: 500,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "var(--ink-muted)",
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: "3px",
            padding: "5px 12px",
            cursor: "pointer",
          }}
        >
          {compact ? "Spacious" : "Compact"}
        </button>
      </div>

      {lastError && (
        <div
          style={{
            backgroundColor: "var(--accent-soft)",
            border: "1px solid var(--accent)",
            borderRadius: "4px",
            padding: "10px 16px",
            marginBottom: "16px",
          }}
        >
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "var(--accent)", margin: 0 }}>
            {lastError}
          </p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
        {grouped.map(({ category, label, items }) => (
          <div key={category}>
            {/* Category header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 160px",
                gap: "16px",
                padding: compact ? "0 20px 8px" : "0 24px 10px",
                borderBottom: "1px solid var(--border)",
                marginBottom: "2px",
              }}
            >
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  fontWeight: 500,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--ink)",
                }}
              >
                {label}
              </span>
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: "var(--ink-muted)",
                }}
              >
                Status
              </span>
            </div>

            {/* Rows */}
            {items.map((row) => {
              const status = statuses[row.requirementId] ?? row.status;
              const isUpdating = pendingId === row.requirementId;
              const isExpanded = expandedNotes.has(row.requirementId);
              const noteText = notes[row.requirementId] ?? "";
              const hasNote = noteText.trim().length > 0;
              const isSavingNote = savingNotes.has(row.requirementId);

              return (
                <div
                  key={row.requirementId}
                  style={{
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderTop: "none",
                    borderLeft: row.isLoiCritical ? "3px solid var(--accent)" : "1px solid var(--border)",
                    opacity: isUpdating ? 0.6 : 1,
                    transition: "opacity 0.15s",
                  }}
                >
                  {/* Main row */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 160px",
                      gap: "16px",
                      alignItems: "center",
                      padding: compact ? "10px 20px" : "16px 24px",
                    }}
                  >
                    {/* Requirement info */}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: compact ? "0" : "2px" }}>
                        <span
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: "14px",
                            fontWeight: 500,
                            color: "var(--ink)",
                          }}
                          title={row.description}
                        >
                          {row.name}
                        </span>
                        {row.isLoiCritical && (
                          <span
                            style={{
                              fontFamily: "'DM Mono', monospace",
                              fontSize: "9px",
                              fontWeight: 500,
                              letterSpacing: "0.10em",
                              textTransform: "uppercase",
                              color: "var(--accent)",
                              backgroundColor: "var(--accent-soft)",
                              padding: "2px 6px",
                              borderRadius: "2px",
                            }}
                          >
                            LOI
                          </span>
                        )}
                        <span
                          style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: "9px",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: "var(--ink-muted)",
                            backgroundColor: "var(--bg)",
                            padding: "2px 6px",
                            borderRadius: "2px",
                          }}
                        >
                          {PHASE_LABELS[row.phaseRequired]}
                        </span>

                        {/* Notes toggle */}
                        <button
                          onClick={() => toggleNotes(row.requirementId)}
                          title={isExpanded ? "Hide notes" : hasNote ? "Edit note" : "Add note"}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontFamily: "'DM Mono', monospace",
                            fontSize: "9px",
                            letterSpacing: "0.08em",
                            color: hasNote ? "var(--accent)" : "var(--ink-muted)",
                            background: "none",
                            border: "none",
                            padding: "2px 4px",
                            cursor: "pointer",
                            opacity: isExpanded ? 1 : 0.7,
                            transition: "opacity 0.15s, color 0.15s",
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path
                              d="M2 2h8v7H7.5L6 10.5 4.5 9H2V2z"
                              stroke="currentColor"
                              strokeWidth="1"
                              strokeLinejoin="round"
                              fill={hasNote ? "currentColor" : "none"}
                              fillOpacity={hasNote ? 0.15 : 0}
                            />
                          </svg>
                          {hasNote && !isExpanded && (
                            <span style={{ textTransform: "uppercase" }}>note</span>
                          )}
                        </button>
                      </div>
                      {!compact && (
                        <p
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: "13px",
                            color: "var(--ink-muted)",
                            margin: "4px 0 0",
                            lineHeight: 1.5,
                            maxWidth: "560px",
                          }}
                        >
                          {row.description}
                        </p>
                      )}
                    </div>

                    {/* Status select */}
                    <select
                      value={status}
                      disabled={isUpdating || isPending}
                      onChange={(e) =>
                        handleStatusChange(row.requirementId, e.target.value as RequirementStatusValue)
                      }
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "11px",
                        fontWeight: 500,
                        letterSpacing: "0.06em",
                        color: statusColor(status),
                        backgroundColor: statusBg(status),
                        border: `1px solid ${statusColor(status)}`,
                        borderRadius: "3px",
                        padding: "6px 28px 6px 10px",
                        appearance: "none",
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath fill='%236b6b64' d='M5 7L1 3h8z'/%3E%3C/svg%3E")`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 8px center",
                        cursor: "pointer",
                        width: "100%",
                      }}
                    >
                      {REQUIREMENT_STATUS_ORDER.map((s) => (
                        <option key={s} value={s}>
                          {REQUIREMENT_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Notes panel */}
                  {isExpanded && (
                    <div
                      style={{
                        padding: "0 24px 16px",
                        borderTop: "1px solid var(--border)",
                        paddingTop: "12px",
                      }}
                    >
                      <textarea
                        value={noteText}
                        onChange={(e) => handleNotesChange(row.requirementId, e.target.value)}
                        placeholder="Add a note about this requirement — status context, open questions, next steps…"
                        rows={3}
                        style={{
                          width: "100%",
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "13px",
                          lineHeight: 1.6,
                          color: "var(--ink)",
                          backgroundColor: "var(--bg)",
                          border: "1px solid var(--border)",
                          borderRadius: "3px",
                          padding: "10px 12px",
                          resize: "vertical",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                      <div
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "9px",
                          letterSpacing: "0.08em",
                          color: "var(--ink-muted)",
                          marginTop: "6px",
                          textTransform: "uppercase",
                          opacity: isSavingNote ? 1 : 0,
                          transition: "opacity 0.2s",
                        }}
                      >
                        Saving…
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
