"use client";

import { useState } from "react";
import type { MeetingExtractionResult, ExtractedActionItem, ExtractedCommitment } from "@/lib/ai/meeting-extraction";

type Props = {
  result: MeetingExtractionResult;
  onCreateActionItem: (item: ExtractedActionItem) => Promise<void>;
  onDismiss: () => void;
};

const PRIORITY_BADGE_COLORS: Record<string, string> = {
  low: "var(--ink-muted)",
  medium: "var(--gold)",
  high: "var(--accent)",
};

export function ExtractedInsightsPanel({ result, onCreateActionItem, onDismiss }: Props) {
  const [addingIndex, setAddingIndex] = useState<number | null>(null);
  const [addedIndices, setAddedIndices] = useState<Set<number>>(new Set());

  async function handleAdd(item: ExtractedActionItem, index: number) {
    if (addingIndex === index || addedIndices.has(index)) return;
    setAddingIndex(index);
    try {
      await onCreateActionItem(item);
      setAddedIndices((prev) => new Set([...prev, index]));
    } finally {
      setAddingIndex(null);
    }
  }

  const sectionLabelStyle: React.CSSProperties = {
    fontFamily: "'DM Mono', monospace",
    fontSize: "10px",
    fontWeight: 600,
    letterSpacing: "0.10em",
    textTransform: "uppercase",
    color: "var(--ink-muted)",
    margin: "0 0 10px",
  };

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "4px",
        backgroundColor: "var(--bg-card)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 18px",
          borderBottom: "1px solid var(--border)",
          backgroundColor: "var(--bg)",
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
            margin: 0,
          }}
        >
          AI Extraction Results
        </p>
        <button
          onClick={onDismiss}
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ink-muted)",
            backgroundColor: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "2px 6px",
          }}
        >
          Dismiss
        </button>
      </div>

      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Summary */}
        {result.summary && (
          <div>
            <p style={sectionLabelStyle}>Meeting Summary</p>
            <div
              style={{
                backgroundColor: "var(--gold-soft)",
                border: "1px solid var(--gold)",
                borderRadius: "4px",
                padding: "12px 14px",
              }}
            >
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "13px",
                  lineHeight: 1.7,
                  color: "var(--ink-mid)",
                  margin: 0,
                }}
              >
                {result.summary}
              </p>
            </div>
          </div>
        )}

        {/* Action Items */}
        {result.actionItems.length > 0 && (
          <div>
            <p style={sectionLabelStyle}>Action Items Extracted</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {result.actionItems.map((item: ExtractedActionItem, i: number) => (
                <div
                  key={i}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: "3px",
                    padding: "10px 12px",
                    backgroundColor: "var(--bg)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "13px",
                          fontWeight: 500,
                          color: "var(--ink)",
                          margin: "0 0 4px",
                        }}
                      >
                        {item.title}
                      </p>
                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                        {/* Priority badge */}
                        <span
                          style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: "9px",
                            fontWeight: 600,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: PRIORITY_BADGE_COLORS[item.priority] ?? "var(--ink-muted)",
                          }}
                        >
                          {item.priority}
                        </span>
                        {item.assigneeName && (
                          <span
                            style={{
                              fontFamily: "'DM Mono', monospace",
                              fontSize: "10px",
                              color: "var(--ink-muted)",
                              letterSpacing: "0.04em",
                            }}
                          >
                            → {item.assigneeName}
                          </span>
                        )}
                        {item.dueDateText && (
                          <span
                            style={{
                              fontFamily: "'DM Mono', monospace",
                              fontSize: "10px",
                              color: "var(--ink-muted)",
                              letterSpacing: "0.04em",
                            }}
                          >
                            Due: {item.dueDateText}
                          </span>
                        )}
                        {item.requirementName && (
                          <span
                            style={{
                              fontFamily: "'DM Mono', monospace",
                              fontSize: "10px",
                              color: "var(--teal)",
                              letterSpacing: "0.04em",
                              backgroundColor: "var(--teal-soft)",
                              border: "1px solid var(--teal)",
                              borderRadius: "3px",
                              padding: "1px 6px",
                            }}
                          >
                            #{item.requirementName}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleAdd(item, i)}
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
                      {addedIndices.has(i) ? "Added ✓" : addingIndex === i ? "Adding…" : "+ Add to checklist"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Commitments */}
        {result.commitments.length > 0 && (
          <div>
            <p style={sectionLabelStyle}>Commitments</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {result.commitments.map((c: ExtractedCommitment, i: number) => (
                <div
                  key={i}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: "3px",
                    padding: "10px 12px",
                    backgroundColor: "var(--teal-soft)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "10px",
                      color: "var(--teal)",
                      flexShrink: 0,
                      marginTop: "2px",
                    }}
                  >
                    •
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "13px",
                        color: "var(--ink)",
                        margin: "0 0 4px",
                        lineHeight: 1.5,
                      }}
                    >
                      {c.text}
                    </p>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      {c.party && (
                        <span
                          style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: "10px",
                            color: "var(--teal)",
                            letterSpacing: "0.04em",
                          }}
                        >
                          {c.party}
                        </span>
                      )}
                      {c.requirementName && (
                        <span
                          style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: "10px",
                            color: "var(--gold)",
                            letterSpacing: "0.04em",
                          }}
                        >
                          #{c.requirementName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dismiss button at bottom */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
          <button
            onClick={onDismiss}
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ink-muted)",
              backgroundColor: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "3px",
              padding: "6px 14px",
              cursor: "pointer",
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
