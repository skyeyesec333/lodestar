"use client";

import { useState } from "react";
import type { ActivityEventRow } from "@/lib/db/activity";
import {
  detailMicroMonoStyle,
  detailMonoLabelStyle,
  detailMutedBodyStyle,
  detailSurfaceCardStyle,
} from "./projectDetailStyles";

type FilterCategory = "all" | "requirements" | "documents" | "meetings" | "approvals" | "stage" | "other";

const FILTER_TABS: { key: FilterCategory; label: string }[] = [
  { key: "all", label: "All" },
  { key: "requirements", label: "Requirements" },
  { key: "documents", label: "Documents" },
  { key: "meetings", label: "Meetings" },
  { key: "approvals", label: "Approvals" },
  { key: "stage", label: "Stage" },
];

function categorizeEvent(eventType: string): FilterCategory {
  if (eventType.startsWith("requirement") || eventType.includes("requirement")) return "requirements";
  if (eventType.startsWith("document") || eventType.includes("document")) return "documents";
  if (eventType === "meeting_logged" || eventType.includes("meeting")) return "meetings";
  if (eventType.startsWith("approval") || eventType.includes("approval")) return "approvals";
  if (eventType === "stage_advanced" || eventType.includes("stage")) return "stage";
  return "other";
}

function formatTimestamp(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

function titleCase(value: string): string {
  return value.replace(/[_-]/g, " ").trim().split(/\s+/).filter(Boolean).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getActivityTypeLabel(event: ActivityEventRow): string {
  switch (event.eventType) {
    case "requirement_status_changed": return "Requirement";
    case "meeting_logged": return "Meeting";
    case "comment_added": return "Comment";
    case "mention_created": return "Mention";
    case "approval_updated": return "Approval";
    case "watch_started": return "Watching";
    case "stage_advanced": return "Stage";
    case "project_updated": return "Project";
    case "stakeholder_added":
    case "stakeholder_removed":
    case "stakeholder_updated": return "Stakeholder";
    case "document_request_created":
    case "document_request_status_updated": return "Document request";
    default: return titleCase(event.eventType.replace(/_/g, " "));
  }
}

function getActivityContextLabel(event: ActivityEventRow): string | null {
  const meta = event.metadata;
  if (!isRecord(meta)) return null;
  const status = readString(meta.status);
  const meetingType = readString(meta.meetingType);
  const title = readString(meta.title);
  const requirementName = readString(meta.requirementName);
  if (event.eventType === "meeting_logged") return meetingType ? titleCase(meetingType) : "Logged";
  if (event.eventType === "approval_updated" || event.eventType === "requirement_status_changed") {
    if (status) return titleCase(status);
  }
  if (requirementName) return requirementName;
  if (title) return title;
  const targetType = readString(meta.targetType);
  if (targetType) return titleCase(targetType);
  return null;
}

function getJumpTarget(event: ActivityEventRow, projectSlug?: string): string | null {
  if (!projectSlug) return null;
  const base = `/projects/${projectSlug}`;
  const meta = event.metadata;
  if (isRecord(meta)) {
    const targetType = readString(meta.targetType);
    switch (targetType) {
      case "requirement": return `${base}/workplan`;
      case "document":    return `${base}/evidence`;
      case "meeting":     return `${base}/execution#section-meetings`;
      case "stakeholder": return `${base}/parties`;
      default: break;
    }
  }
  switch (categorizeEvent(event.eventType)) {
    case "requirements": return `${base}/workplan`;
    case "documents":    return `${base}/evidence`;
    case "meetings":     return `${base}/execution#section-meetings`;
    case "approvals":    return `${base}/workplan`;
    case "stage":        return `${base}/overview`;
    default: return null;
  }
}

const PAGE_SIZE = 4;

type Props = {
  events: ActivityEventRow[];
  teamMemberNamesById?: Record<string, string>;
  projectSlug?: string;
};

export function ActivityFeedClient({ events, teamMemberNamesById = {}, projectSlug }: Props) {
  const [filter, setFilter] = useState<FilterCategory>("all");
  const [showAll, setShowAll] = useState(false);

  const filtered = filter === "all" ? events : events.filter((e) => categorizeEvent(e.eventType) === filter);
  const displayed = showAll ? filtered : filtered.slice(0, PAGE_SIZE);
  const hasMore = filtered.length > displayed.length;

  return (
    <div>
      {/* Filter pills */}
      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "12px" }}>
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => { setFilter(tab.key); setShowAll(false); }}
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "5px 10px",
              borderRadius: "999px",
              border: filter === tab.key ? "1px solid var(--teal)" : "1px solid var(--border)",
              backgroundColor: filter === tab.key ? "color-mix(in srgb, var(--teal) 8%, var(--bg-card))" : "transparent",
              color: filter === tab.key ? "var(--teal)" : "var(--ink-muted)",
              cursor: "pointer",
              transition: "all 0.12s ease",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div
          style={{
            ...detailSurfaceCardStyle(),
            padding: "24px 16px",
            textAlign: "center",
          }}
        >
          <p style={{ ...detailMonoLabelStyle, margin: "0 0 4px" }}>No {filter} events</p>
          <p style={{ ...detailMutedBodyStyle, margin: 0, color: "var(--ink-mid)" }}>
            Try selecting a different filter.
          </p>
        </div>
      ) : (
        <div style={{ ...detailSurfaceCardStyle(), padding: "12px 16px" }}>
          <div style={{ display: "grid" }}>
            {displayed.map((event, index) => {
              const leadLabel = event.actorName ?? teamMemberNamesById[event.clerkUserId] ?? "Team activity";
              const actorInitial = leadLabel.charAt(0).toUpperCase();
              const activityTypeLabel = getActivityTypeLabel(event);
              const activityContextLabel = getActivityContextLabel(event);
              const jumpTarget = getJumpTarget(event, projectSlug);
              const metadata = isRecord(event.metadata) ? event.metadata : null;
              const metadataLine = metadata && [readString(metadata.targetType), readString(metadata.title), readString(metadata.requirementName)].filter(Boolean).join(" · ");

              return (
                <div
                  key={event.id}
                  style={{ borderTop: index === 0 ? "none" : "1px solid var(--border)", padding: "10px 0" }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          background: "color-mix(in srgb, var(--accent) 20%, var(--bg-card))",
                          fontSize: "10px",
                          fontWeight: 600,
                          color: "var(--accent)",
                          flexShrink: 0,
                        }}
                        title={leadLabel}
                      >
                        {actorInitial}
                      </span>
                      <div style={{ display: "grid", gap: "1px" }}>
                        <span style={{ ...detailMonoLabelStyle, fontSize: "10px", letterSpacing: "0.08em", fontWeight: 400, textTransform: "none" as const, color: "var(--ink)" }}>
                          <strong style={{ fontWeight: 600 }}>{leadLabel}</strong>
                        </span>
                        <span style={{ ...detailMicroMonoStyle, color: "var(--ink-muted)", fontWeight: 400, textTransform: "none" as const }}>
                          {formatTimestamp(event.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <span style={{ ...detailMonoLabelStyle, border: "1px solid var(--border)", borderRadius: "999px", padding: "3px 8px", backgroundColor: "color-mix(in srgb, var(--teal) 6%, var(--bg-card))", color: "var(--teal)" }}>
                        {activityTypeLabel}
                      </span>
                      {activityContextLabel && (
                        <span style={{ ...detailMicroMonoStyle, border: "1px solid var(--border)", borderRadius: "999px", padding: "3px 8px", backgroundColor: "var(--bg)", color: "var(--ink-muted)" }}>
                          {activityContextLabel}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "8px", marginTop: "6px" }}>
                    <p style={{ margin: 0, ...detailMutedBodyStyle, color: "var(--ink)", flex: 1 }}>
                      {event.summary}
                    </p>
                    {jumpTarget && (
                      <a
                        href={jumpTarget}
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "9px",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: "var(--teal)",
                          textDecoration: "none",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        Jump &rarr;
                      </a>
                    )}
                  </div>
                  {metadataLine && (
                    <p style={{ margin: "2px 0 0", ...detailMicroMonoStyle, color: "var(--ink-muted)", textTransform: "none" as const }}>
                      {metadataLine}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {hasMore && (
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "10px", marginTop: "2px" }}>
              <button
                type="button"
                onClick={() => setShowAll(true)}
                style={{
                  ...detailMonoLabelStyle,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  color: "var(--teal)",
                }}
              >
                Show {filtered.length - displayed.length} more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
