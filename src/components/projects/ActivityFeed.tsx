import { getProjectActivity, type ActivityEventRow } from "@/lib/db/activity";
import {
  detailMicroMonoStyle,
  detailMonoLabelStyle,
  detailMutedBodyStyle,
  detailSurfaceCardStyle,
} from "./projectDetailStyles";

function formatTimestamp(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

function formatEventType(eventType: string): string {
  return eventType.replace(/_/g, " ");
}

function titleCase(value: string): string {
  return value
    .replace(/[_-]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getActivityTypeLabel(event: ActivityEventRow): string {
  switch (event.eventType) {
    case "requirement_status_changed":
      return "Requirement";
    case "meeting_logged":
      return "Meeting";
    case "comment_added":
      return "Comment";
    case "mention_created":
      return "Mention";
    case "approval_updated":
      return "Approval";
    case "watch_started":
      return "Watching";
    case "stage_advanced":
      return "Stage";
    case "project_updated":
      return "Project";
    case "stakeholder_added":
    case "stakeholder_removed":
    case "stakeholder_updated":
      return "Stakeholder";
    case "document_request_created":
    case "document_request_status_updated":
      return "Document request";
    default:
      return titleCase(formatEventType(event.eventType));
  }
}

function getActivityContextLabel(event: ActivityEventRow): string | null {
  const meta = event.metadata;
  if (!isRecord(meta)) return null;

  const targetType = readString(meta.targetType);
  const status = readString(meta.status);
  const meetingType = readString(meta.meetingType);
  const title = readString(meta.title);
  const requirementName = readString(meta.requirementName);

  if (event.eventType === "meeting_logged") {
    return meetingType ? titleCase(meetingType) : "Logged";
  }

  if (event.eventType === "approval_updated" || event.eventType === "requirement_status_changed") {
    if (status) return titleCase(status);
  }

  if (requirementName) return requirementName;
  if (title) return title;
  if (targetType) return titleCase(targetType);

  return null;
}

function getActivityLeadLabel(event: ActivityEventRow): string {
  if (event.actorName) return event.actorName;
  const fallback = event.metadata && isRecord(event.metadata) ? readString(event.metadata.actorName) : null;
  return fallback ?? "Team activity";
}

type ActivityFeedProps = {
  projectId?: string;
  events?: ActivityEventRow[];
  teamMemberNamesById?: Record<string, string>;
};

const PREVIEW_COUNT = 4;

function ActivityRow({
  event,
  teamMemberNamesById = {},
}: {
  event: ActivityEventRow;
  teamMemberNamesById?: Record<string, string>;
}) {
  const metadata = isRecord(event.metadata) ? event.metadata : null;
  const activityTypeLabel = getActivityTypeLabel(event);
  const activityContextLabel = getActivityContextLabel(event);
  const leadLabel = event.actorName ?? teamMemberNamesById[event.clerkUserId] ?? getActivityLeadLabel(event);
  const actorInitial = leadLabel.charAt(0).toUpperCase();
  const metadataLine =
    metadata &&
    [readString(metadata.targetType), readString(metadata.title), readString(metadata.requirementName)]
      .filter(Boolean)
      .join(" · ");

  return (
    <div
      style={{
        display: "grid",
        gap: "6px",
        padding: "10px 0",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {actorInitial ? (
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
          ) : null}
          <div style={{ display: "grid", gap: "1px" }}>
            <span
              style={{
                ...detailMonoLabelStyle,
                fontSize: "10px",
                letterSpacing: "0.08em",
                fontWeight: 400,
                textTransform: "none",
                color: "var(--ink)",
              }}
            >
              <strong style={{ fontWeight: 600, color: "var(--ink)" }}>{leadLabel}</strong>
            </span>
            <span
              style={{
                ...detailMicroMonoStyle,
                color: "var(--ink-muted)",
                fontWeight: 400,
                textTransform: "none",
              }}
            >
              {formatTimestamp(event.createdAt)}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <span
            style={{
              ...detailMonoLabelStyle,
              border: "1px solid var(--border)",
              borderRadius: "999px",
              padding: "3px 8px",
              backgroundColor: "color-mix(in srgb, var(--teal) 6%, var(--bg-card))",
              color: "var(--teal)",
            }}
          >
            {activityTypeLabel}
          </span>
          {activityContextLabel && (
            <span
              style={{
                ...detailMicroMonoStyle,
                border: "1px solid var(--border)",
                borderRadius: "999px",
                padding: "3px 8px",
                backgroundColor: "var(--bg)",
                color: "var(--ink-muted)",
              }}
            >
              {activityContextLabel}
            </span>
          )}
        </div>
      </div>
      <p
          style={{
            margin: 0,
            ...detailMutedBodyStyle,
            color: "var(--ink)",
          }}
      >
        {event.summary}
      </p>
      {metadataLine && (
        <p
          style={{
            margin: 0,
            ...detailMicroMonoStyle,
            color: "var(--ink-muted)",
            textTransform: "none",
          }}
        >
          {metadataLine}
        </p>
      )}
    </div>
  );
}

export async function ActivityFeed({ projectId, events, teamMemberNamesById = {} }: ActivityFeedProps) {
  let resolvedEvents = events ?? [];
  let errorMessage: string | null = null;

  if (!events && projectId) {
    const result = await getProjectActivity(projectId);
    if (result.ok) {
      resolvedEvents = result.value;
    } else {
      errorMessage = result.error.message;
    }
  }

  const previewEvents = resolvedEvents.slice(0, PREVIEW_COUNT);
  const overflowEvents = resolvedEvents.slice(PREVIEW_COUNT);
  const hasOverflow = overflowEvents.length > 0;
  const totalLabel = resolvedEvents.length === 1 ? "1 event" : `${resolvedEvents.length} events`;
  const hasSparseActivity = resolvedEvents.length <= 1;

  return (
    <div style={{ marginBottom: "32px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "grid", gap: "4px" }}>
          <p className="eyebrow" style={{ marginBottom: 0 }}>
            Deal Activity
          </p>
          <p
            style={{
              margin: 0,
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ink-muted)",
            }}
          >
            {totalLabel} loaded · latest {previewEvents.length} shown
          </p>
        </div>
      </div>

      {errorMessage ? (
        <p
          style={{
            margin: 0,
            fontFamily: "'Inter', sans-serif",
            fontSize: "13px",
            lineHeight: 1.6,
            color: "var(--accent)",
          }}
        >
          Failed to load activity: {errorMessage}
        </p>
      ) : hasSparseActivity ? (
        <div
          style={{
            ...detailSurfaceCardStyle(),
            padding: "14px 16px",
            display: "grid",
            gap: "14px",
            minHeight: "196px",
            alignContent: "start",
          }}
        >
          {previewEvents[0] ? (
            <div
              style={{
                ...detailSurfaceCardStyle("10px"),
                padding: "10px 12px",
                backgroundColor: "color-mix(in srgb, var(--bg) 55%, var(--bg-card))",
              }}
            >
              <ActivityRow event={previewEvents[0]} teamMemberNamesById={teamMemberNamesById} />
            </div>
          ) : null}

          <div style={{ display: "grid", gap: "8px" }}>
            <p
              style={{
                margin: 0,
                ...detailMonoLabelStyle,
              }}
            >
              {previewEvents[0] ? "Activity just started" : "No activity yet"}
            </p>
            <p
              style={{
                margin: 0,
                ...detailMutedBodyStyle,
                lineHeight: 1.6,
                color: "var(--ink-mid)",
                maxWidth: "42ch",
              }}
            >
              {previewEvents[0]
                ? "This deal only has one recorded event so far. Meeting logs, requirement changes, document uploads, and stage movement will start to fill this surface in."
                : "Actions you take on this deal will appear here. Once meetings, documents, requirements, and stage changes start moving, this panel becomes the operating history."}
            </p>
          </div>
        </div>
      ) : (
        <div
          style={{
            ...detailSurfaceCardStyle(),
            padding: "12px 16px",
          }}
        >
          <div style={{ display: "grid" }}>
            {previewEvents.map((event, index) => (
              <div
                key={event.id}
                style={{
                  borderTop: index === 0 ? "none" : "1px solid var(--border)",
                }}
              >
                  <ActivityRow event={event} teamMemberNamesById={teamMemberNamesById} />
              </div>
            ))}
          </div>

          {hasOverflow ? (
            <details
              style={{
                marginTop: "2px",
                borderTop: "1px solid var(--border)",
                paddingTop: "10px",
              }}
            >
              <summary
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                  cursor: "pointer",
                  listStyle: "none",
                  ...detailMonoLabelStyle,
                }}
              >
                <span>Show {overflowEvents.length} more</span>
                <span aria-hidden="true" style={{ fontSize: "12px", lineHeight: 1 }}>
                  ▾
                </span>
              </summary>

              <div style={{ display: "grid", marginTop: "2px" }}>
                {overflowEvents.map((event, index) => (
                  <div
                    key={event.id}
                    style={{
                      borderTop: index === 0 ? "none" : "1px solid var(--border)",
                    }}
                  >
                    <ActivityRow event={event} teamMemberNamesById={teamMemberNamesById} />
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </div>
      )}
    </div>
  );
}
