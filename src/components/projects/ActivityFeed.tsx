import type { ActivityEventRow } from "@/lib/db/activity";

const EVENT_ICONS: Record<string, string> = {
  requirement_status_changed: "◆",
  stage_advanced:             "▲",
  project_updated:            "✎",
  project_created:            "★",
  stakeholder_added:          "●",
  stakeholder_removed:        "○",
  stakeholder_updated:        "✎",
  document_request_added:     "↗",
  document_request_updated:   "◆",
};

const EVENT_COLORS: Record<string, string> = {
  requirement_status_changed: "var(--ink-muted)",
  stage_advanced:             "var(--teal)",
  project_updated:            "var(--gold)",
  project_created:            "var(--accent)",
  stakeholder_added:          "var(--teal)",
  stakeholder_removed:        "var(--ink-muted)",
  stakeholder_updated:        "var(--gold)",
  document_request_added:     "var(--accent)",
  document_request_updated:   "var(--teal)",
};

function timeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type Props = {
  events: ActivityEventRow[];
};

export function ActivityFeed({ events }: Props) {
  return (
    <div style={{ marginBottom: "32px" }}>
      <p className="eyebrow" style={{ marginBottom: "20px" }}>Activity</p>

      {events.length === 0 ? (
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "11px",
            letterSpacing: "0.08em",
            color: "var(--ink-muted)",
            textTransform: "uppercase",
          }}
        >
          No activity yet — changes will appear here
        </p>
      ) : (
        <div style={{ position: "relative" }}>
          {/* Vertical line */}
          <div
            style={{
              position: "absolute",
              left: "7px",
              top: "8px",
              bottom: "8px",
              width: "1px",
              backgroundColor: "var(--border)",
            }}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {events.map((event, i) => {
              const icon = EVENT_ICONS[event.eventType] ?? "·";
              const color = EVENT_COLORS[event.eventType] ?? "var(--ink-muted)";

              return (
                <div
                  key={event.id}
                  style={{
                    display: "flex",
                    gap: "16px",
                    alignItems: "flex-start",
                    paddingBottom: i < events.length - 1 ? "16px" : "0",
                  }}
                >
                  {/* Dot */}
                  <div
                    style={{
                      width: "15px",
                      height: "15px",
                      borderRadius: "50%",
                      backgroundColor: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: "1px",
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    <span style={{ fontSize: "6px", color, lineHeight: 1 }}>{icon}</span>
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "13px",
                        color: "var(--ink)",
                        lineHeight: 1.5,
                      }}
                    >
                      {event.label}
                    </span>
                    <span
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "10px",
                        letterSpacing: "0.06em",
                        color: "var(--ink-muted)",
                        marginLeft: "10px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {timeAgo(event.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
