"use client";

import { useState, useTransition } from "react";
import type { ActionItemRow } from "@/lib/db/meetings";
import type { ActionItem } from "@/lib/ai/meeting-extraction";
import { createActionItem, updateMeetingActionItemStatus } from "@/actions/meetings";

type Props = {
  meetingId: string;
  projectId: string;
  slug: string;
  initialActionItems: ActionItemRow[];
  canEdit?: boolean;
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "var(--ink-muted)",
  medium: "var(--gold)",
  high: "var(--accent)",
  critical: "var(--accent)",
};

const PRIORITY_BG: Record<string, string> = {
  low: "transparent",
  medium: "var(--gold-soft)",
  high: "rgba(var(--accent-rgb, 220, 53, 69), 0.08)",
  critical: "rgba(var(--accent-rgb, 220, 53, 69), 0.12)",
};

function formatDate(d: Date | string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ActionItemCard({
  item,
  projectId,
  slug,
  canEdit,
}: {
  item: ActionItemRow;
  projectId: string;
  slug: string;
  canEdit: boolean;
}) {
  const [status, setStatus] = useState(item.status);
  const [, startTransition] = useTransition();

  const done = status === "completed" || status === "cancelled";

  function toggle() {
    if (!canEdit) return;
    const next = status === "completed" ? "open" : "completed";
    setStatus(next);
    startTransition(async () => {
      await updateMeetingActionItemStatus({ projectId, slug, actionItemId: item.id, status: next });
    });
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
        padding: "10px 12px",
        borderRadius: "3px",
        border: "1px solid var(--border)",
        backgroundColor: done ? "var(--bg)" : (PRIORITY_BG[item.priority] ?? "var(--bg)"),
        opacity: done ? 0.65 : 1,
        transition: "opacity 0.15s",
      }}
    >
      {/* Checkbox */}
      <button
        onClick={toggle}
        aria-label={done ? "Mark as open" : "Mark as complete"}
        style={{
          width: "16px",
          height: "16px",
          borderRadius: "3px",
          flexShrink: 0,
          marginTop: "2px",
          border: `1px solid ${done ? "var(--teal)" : "var(--border)"}`,
          backgroundColor: done ? "var(--teal)" : "transparent",
          cursor: canEdit ? "pointer" : "default",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
        }}
      >
        {done && <span style={{ color: "var(--text-inverse)", fontSize: "9px", lineHeight: 1 }}>✓</span>}
      </button>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "13px",
            fontWeight: 500,
            color: done ? "var(--ink-muted)" : "var(--ink)",
            margin: 0,
            textDecoration: done ? "line-through" : "none",
          }}
        >
          {item.title}
        </p>
        {item.description && (
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "12px",
              color: "var(--ink-muted)",
              margin: "2px 0 0",
              lineHeight: 1.5,
            }}
          >
            {item.description}
          </p>
        )}
        <div style={{ display: "flex", gap: "10px", marginTop: "4px", flexWrap: "wrap", alignItems: "center" }}>
          {/* Priority badge */}
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: PRIORITY_COLORS[item.priority] ?? "var(--ink-muted)",
            }}
          >
            {item.priority}
          </span>
          {/* Assignee pill */}
          {item.assignedTo && (
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                color: "var(--teal)",
                letterSpacing: "0.04em",
                backgroundColor: "var(--teal-soft)",
                border: "1px solid var(--teal)",
                borderRadius: "20px",
                padding: "1px 8px",
              }}
            >
              {item.assignedTo.name}
            </span>
          )}
          {/* Due date */}
          {item.dueDate && (
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                color: "var(--ink-muted)",
                letterSpacing: "0.04em",
              }}
            >
              Due {formatDate(item.dueDate)}
            </span>
          )}
          {/* Linked requirement */}
          {item.requirementName && (
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                color: "var(--gold)",
                letterSpacing: "0.04em",
              }}
            >
              #{item.requirementName}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function ActionItemsPanel({
  meetingId,
  projectId,
  slug,
  initialActionItems,
  canEdit = true,
}: Props) {
  const [actionItems, setActionItems] = useState<ActionItemRow[]>(initialActionItems);
  const [transcript, setTranscript] = useState("");
  const [showExtract, setShowExtract] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ActionItem[]>([]);
  const [addingIndex, setAddingIndex] = useState<number | null>(null);
  const [addedIndices, setAddedIndices] = useState<Set<number>>(new Set());
  const [, startAddTransition] = useTransition();

  async function handleExtract() {
    if (!transcript.trim()) {
      setExtractError("Paste some meeting notes first.");
      return;
    }
    setExtracting(true);
    setExtractError(null);
    setExtracted([]);
    setAddedIndices(new Set());
    try {
      const res = await fetch(`/api/meetings/${meetingId}/action-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, projectId }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        const msg = typeof data.error === "string" ? data.error : `Error ${res.status}`;
        setExtractError(msg);
        return;
      }
      const data = (await res.json()) as { actionItems: ActionItem[] };
      setExtracted(data.actionItems ?? []);
      if ((data.actionItems ?? []).length === 0) {
        setExtractError("No action items found in these notes.");
      }
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : "Extraction failed.");
    } finally {
      setExtracting(false);
    }
  }

  function handleAddExtracted(item: ActionItem, index: number) {
    if (addingIndex === index || addedIndices.has(index)) return;
    setAddingIndex(index);
    startAddTransition(async () => {
      const result = await createActionItem({
        projectId,
        slug,
        meetingId,
        title: item.description,
        description: null,
        priority: item.priority,
        dueDate: null,
        assignedToId: null,
        requirementId: null,
      });
      if (result.ok) {
        setActionItems((prev) => [...prev, result.value]);
        setAddedIndices((prev) => new Set([...prev, index]));
      }
      setAddingIndex(null);
    });
  }

  const inputStyle: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    fontSize: "13px",
    color: "var(--ink)",
    backgroundColor: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: "3px",
    padding: "8px 10px",
    width: "100%",
    boxSizing: "border-box",
    resize: "vertical",
    minHeight: "80px",
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "'DM Mono', monospace",
    fontSize: "10px",
    fontWeight: 500,
    letterSpacing: "0.10em",
    textTransform: "uppercase",
    color: "var(--ink-muted)",
    display: "block",
    marginBottom: "6px",
  };

  const openCount = actionItems.filter(
    (a) => a.status === "open" || a.status === "in_progress"
  ).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "var(--ink-muted)",
              margin: 0,
            }}
          >
            Action Items
          </p>
          {openCount > 0 && (
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "9px",
                fontWeight: 600,
                letterSpacing: "0.06em",
                color: "var(--gold)",
                backgroundColor: "var(--gold-soft)",
                border: "1px solid var(--gold)",
                borderRadius: "20px",
                padding: "1px 7px",
              }}
            >
              {openCount} open
            </span>
          )}
        </div>
        {canEdit && (
          <button
            onClick={() => setShowExtract((v) => !v)}
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: showExtract ? "var(--ink-muted)" : "var(--teal)",
              backgroundColor: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
            }}
          >
            {showExtract ? "Hide Extract" : "✦ Extract from notes"}
          </button>
        )}
      </div>

      {/* Existing action items */}
      {actionItems.length === 0 && !showExtract && (
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "12px",
            color: "var(--ink-muted)",
            margin: 0,
          }}
        >
          No action items yet.
        </p>
      )}
      {actionItems.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
          {actionItems.map((item) => (
            <ActionItemCard
              key={item.id}
              item={item}
              projectId={projectId}
              slug={slug}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}

      {/* Extract panel */}
      {showExtract && canEdit && (
        <div
          style={{
            borderTop: actionItems.length > 0 ? "1px solid var(--border)" : "none",
            paddingTop: actionItems.length > 0 ? "14px" : 0,
            marginTop: actionItems.length > 0 ? "4px" : 0,
          }}
        >
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--teal)",
              margin: "0 0 12px",
            }}
          >
            Extract Action Items with AI
          </p>
          <div style={{ marginBottom: "10px" }}>
            <label style={labelStyle}>Meeting Notes / Transcript</label>
            <textarea
              style={inputStyle}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste meeting notes, transcript, or summary here…"
              disabled={extracting}
            />
          </div>

          {extractError && (
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "12px",
                color: "var(--accent)",
                margin: "0 0 10px",
              }}
            >
              {extractError}
            </p>
          )}

          <button
            onClick={handleExtract}
            disabled={extracting}
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "var(--text-inverse)",
              backgroundColor: extracting ? "var(--ink-muted)" : "var(--teal)",
              border: "none",
              borderRadius: "3px",
              padding: "7px 16px",
              cursor: extracting ? "not-allowed" : "pointer",
            }}
          >
            {extracting ? "Extracting…" : "Extract with AI"}
          </button>

          {/* Extracted results */}
          {extracted.length > 0 && (
            <div style={{ marginTop: "16px" }}>
              <p
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  fontWeight: 600,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: "var(--ink-muted)",
                  margin: "0 0 8px",
                }}
              >
                {extracted.length} Action Item{extracted.length !== 1 ? "s" : ""} Found
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {extracted.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: "3px",
                      padding: "10px 12px",
                      backgroundColor: addedIndices.has(i) ? "var(--teal-soft)" : "var(--bg-card)",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "13px",
                          fontWeight: 500,
                          color: addedIndices.has(i) ? "var(--ink-muted)" : "var(--ink)",
                          margin: "0 0 4px",
                          textDecoration: addedIndices.has(i) ? "line-through" : "none",
                        }}
                      >
                        {item.description}
                      </p>
                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                        <span
                          style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: "9px",
                            fontWeight: 600,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: PRIORITY_COLORS[item.priority] ?? "var(--ink-muted)",
                          }}
                        >
                          {item.priority}
                        </span>
                        {item.assignee && (
                          <span
                            style={{
                              fontFamily: "'DM Mono', monospace",
                              fontSize: "10px",
                              color: "var(--teal)",
                              letterSpacing: "0.04em",
                              backgroundColor: "var(--teal-soft)",
                              border: "1px solid var(--teal)",
                              borderRadius: "20px",
                              padding: "1px 8px",
                            }}
                          >
                            {item.assignee}
                          </span>
                        )}
                        {item.dueDate && (
                          <span
                            style={{
                              fontFamily: "'DM Mono', monospace",
                              fontSize: "10px",
                              color: "var(--ink-muted)",
                              letterSpacing: "0.04em",
                            }}
                          >
                            Due: {item.dueDate}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddExtracted(item, i)}
                      disabled={addingIndex === i || addedIndices.has(i)}
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "9px",
                        fontWeight: 500,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: addedIndices.has(i) ? "var(--teal)" : "#fff",
                        backgroundColor: addedIndices.has(i)
                          ? "transparent"
                          : addingIndex === i
                          ? "var(--ink-muted)"
                          : "var(--accent)",
                        border: addedIndices.has(i) ? "1px solid var(--teal)" : "none",
                        borderRadius: "3px",
                        padding: "5px 10px",
                        cursor: addingIndex === i || addedIndices.has(i) ? "default" : "pointer",
                        flexShrink: 0,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {addedIndices.has(i) ? "Added ✓" : addingIndex === i ? "Adding…" : "+ Add"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
