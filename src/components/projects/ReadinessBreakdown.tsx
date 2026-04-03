"use client";

import { useState } from "react";
import type { CategoryBreakdown } from "@/lib/db/requirements";
import { REQUIREMENT_STATUS_LABELS } from "@/types/requirements";
import {
  detailMonoLabelStyle,
  detailMicroMonoStyle,
  detailSerifTitleStyle,
  detailSurfaceCardStyle,
} from "./projectDetailStyles";

export type { CategoryBreakdown };

type Props = {
  breakdown: CategoryBreakdown[];
};

function barColor(scorePct: number): string {
  if (scorePct >= 70) return "#16a34a";
  if (scorePct >= 30) return "#d97706";
  return "#dc2626";
}

function statusBadgeColor(status: string): { bg: string; text: string } {
  switch (status) {
    case "not_started":
      return { bg: "#f3f4f6", text: "#6b7280" };
    case "in_progress":
      return { bg: "#dbeafe", text: "#0284c7" };
    case "draft":
      return { bg: "#fef08a", text: "#854d0e" };
    case "substantially_final":
      return { bg: "#fed7aa", text: "#92400e" };
    default:
      return { bg: "#f3f4f6", text: "#6b7280" };
  }
}

export function ReadinessBreakdown({ breakdown }: Props) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  if (breakdown.length === 0) return null;

  return (
    <div
      style={{
        ...detailSurfaceCardStyle("12px"),
        padding: "28px 32px",
        marginBottom: "24px",
      }}
    >
      {/* Header */}
      <p
        style={{
          ...detailMonoLabelStyle,
          margin: "0 0 6px",
        }}
      >
        Readiness by Category
      </p>
      <p
        style={{
          ...detailSerifTitleStyle("18px"),
          margin: "0 0 24px",
        }}
      >
        Category breakdown
      </p>

      {/* Rows */}
      <div style={{ display: "grid", gap: "18px" }}>
        {breakdown.map((item) => {
          const color = barColor(item.scorePct);
          const isExpanded = expandedCategory === item.category;

          return (
            <div key={item.category}>
              {/* Clickable row: Label + score + chevron */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "6px",
                  cursor: item.blockingRequirements.length > 0 ? "pointer" : "default",
                }}
                onClick={() => {
                  if (item.blockingRequirements.length > 0) {
                    setExpandedCategory(isExpanded ? null : item.category);
                  }
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {item.blockingRequirements.length > 0 && (
                    <span
                      style={{
                        fontSize: "12px",
                        color: "var(--ink-muted)",
                        transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                        transition: "transform 150ms ease-in-out",
                        display: "inline-block",
                      }}
                    >
                      ▶
                    </span>
                  )}
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "var(--ink)",
                    }}
                  >
                    {item.label}
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "11px",
                    fontWeight: 500,
                    color,
                  }}
                >
                  {item.scorePct}%
                </span>
              </div>

              {/* Progress bar */}
              <div
                style={{
                  height: "6px",
                  backgroundColor: "var(--border)",
                  borderRadius: "3px",
                  overflow: "hidden",
                  marginBottom: "5px",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${item.scorePct}%`,
                    backgroundColor: color,
                    borderRadius: "3px",
                  }}
                />
              </div>

              {/* Counts */}
              <p
                style={{
                  ...detailMicroMonoStyle,
                  margin: 0,
                  color: "var(--ink-muted)",
                  textTransform: "none",
                  letterSpacing: 0,
                }}
              >
                {item.completed} done · {item.inProgress} in progress · {item.total} total
              </p>

              {/* Expanded blocking requirements list */}
              {isExpanded && item.blockingRequirements.length > 0 && (
                <div
                  style={{
                    marginTop: "12px",
                    paddingTop: "12px",
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  <p
                    style={{
                      ...detailMicroMonoStyle,
                      margin: "0 0 8px",
                      color: "var(--ink-muted)",
                      textTransform: "none",
                      letterSpacing: 0,
                    }}
                  >
                    Blocking requirements:
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {item.blockingRequirements.map((req) => {
                      const badgeColor = statusBadgeColor(req.status);
                      const statusLabel =
                        REQUIREMENT_STATUS_LABELS[req.status as keyof typeof REQUIREMENT_STATUS_LABELS] ||
                        req.status;

                      return (
                        <div
                          key={req.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 12px",
                            backgroundColor: "var(--surface-subtle)",
                            borderRadius: "4px",
                            gap: "8px",
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "'Inter', sans-serif",
                              fontSize: "12px",
                              color: "var(--ink)",
                              flex: 1,
                            }}
                          >
                            {req.label}
                          </span>
                          <span
                            style={{
                              fontFamily: "'Inter', sans-serif",
                              fontSize: "11px",
                              fontWeight: 500,
                              backgroundColor: badgeColor.bg,
                              color: badgeColor.text,
                              padding: "2px 8px",
                              borderRadius: "3px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {statusLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
