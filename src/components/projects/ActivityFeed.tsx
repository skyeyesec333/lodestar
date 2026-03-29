import { getProjectActivity, type ActivityEventRow } from "@/lib/db/activity";

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

type ActivityFeedProps = {
  projectId?: string;
  events?: ActivityEventRow[];
};

const PREVIEW_COUNT = 4;

function ActivityRow({ event }: { event: ActivityEventRow }) {
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
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            letterSpacing: "0.08em",
            color: "var(--ink-muted)",
          }}
        >
          {formatTimestamp(event.createdAt)}
        </span>
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "9px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--ink-muted)",
            border: "1px solid var(--border)",
            borderRadius: "999px",
            padding: "3px 8px",
            backgroundColor: "color-mix(in srgb, var(--teal) 6%, var(--bg-card))",
          }}
        >
          {formatEventType(event.eventType)}
        </span>
      </div>
      <p
        style={{
          margin: 0,
          fontFamily: "'Inter', sans-serif",
          fontSize: "13px",
          lineHeight: 1.55,
          color: "var(--ink)",
        }}
      >
        {event.summary}
      </p>
    </div>
  );
}

export async function ActivityFeed({ projectId, events }: ActivityFeedProps) {
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
      ) : resolvedEvents.length === 0 ? (
        <p
          style={{
            margin: 0,
            fontFamily: "'Inter', sans-serif",
            fontSize: "13px",
            lineHeight: 1.6,
            color: "var(--ink-muted)",
          }}
        >
          No activity yet. Actions you take on this deal will appear here.
        </p>
      ) : (
        <div
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
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
                <ActivityRow event={event} />
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
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "9px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--ink-muted)",
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
                    <ActivityRow event={event} />
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
