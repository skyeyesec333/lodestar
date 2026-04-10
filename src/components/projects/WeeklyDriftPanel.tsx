import type { CSSProperties } from "react";
import {
  detailMicroMonoStyle,
  detailMonoLabelStyle,
  detailMutedBodyStyle,
  detailSurfaceCardStyle,
} from "./projectDetailStyles";

export type WeeklyDriftEvent = {
  id: string;
  eventType: string;
  summary: string;
  createdAt: Date | string;
};

export type WeeklyDriftPanelProps = {
  events: WeeklyDriftEvent[];
  asOf?: Date | string;
  projectCreatedAt?: Date | string | null;
  targetLoiDate?: Date | string | null;
  targetCloseDate?: Date | string | null;
  title?: string;
};

type TrendState = "accelerating" | "steady" | "cooling" | "stalled";

type TimelinePoint = {
  label: string;
  count: number;
};

const MS_PER_DAY = 86_400_000;
const DAYS = 7;

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function formatDate(date: Date | null): string {
  if (!date) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatMonthDay(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatRelativeDays(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

function eventLabel(eventType: string): string {
  return eventType.replace(/_/g, " ");
}

function trendLabel(state: TrendState): string {
  switch (state) {
    case "accelerating":
      return "Momentum building";
    case "steady":
      return "Steady movement";
    case "cooling":
      return "Slowing";
    case "stalled":
      return "Stalled";
  }
}

function trendTone(state: TrendState): { color: string; background: string; border: string } {
  switch (state) {
    case "accelerating":
      return {
        color: "var(--teal)",
        background: "color-mix(in srgb, var(--teal) 10%, var(--bg-card))",
        border: "var(--teal)",
      };
    case "steady":
      return {
        color: "var(--gold)",
        background: "color-mix(in srgb, var(--gold) 10%, var(--bg-card))",
        border: "var(--gold)",
      };
    case "cooling":
      return {
        color: "var(--accent)",
        background: "color-mix(in srgb, var(--accent) 10%, var(--bg-card))",
        border: "var(--accent)",
      };
    case "stalled":
      return {
        color: "var(--ink-muted)",
        background: "color-mix(in srgb, var(--ink-muted) 8%, var(--bg-card))",
        border: "var(--border)",
      };
  }
}

function getTrendState(recent: number, prior: number): TrendState {
  if (recent === 0) return "stalled";
  if (recent >= prior + 2) return "accelerating";
  if (recent === prior) return "steady";
  if (recent < prior) return "cooling";
  return "steady";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function bucketEvents(events: WeeklyDriftEvent[], asOf: Date): TimelinePoint[] {
  const midnight = startOfDay(asOf);
  const buckets = Array.from({ length: DAYS }, (_, index) => {
    const day = new Date(midnight);
    day.setDate(day.getDate() - (DAYS - 1 - index));
    return {
      label: formatMonthDay(day),
      count: 0,
      key: startOfDay(day).getTime(),
    };
  });

  for (const event of events) {
    const date = toDate(event.createdAt);
    if (!date) continue;
    const dayKey = startOfDay(date).getTime();
    const bucket = buckets.find((entry) => entry.key === dayKey);
    if (bucket) {
      bucket.count += 1;
    }
  }

  return buckets.map(({ label, count }) => ({ label, count }));
}

function summarizeEventTypes(events: WeeklyDriftEvent[]): Array<{ label: string; count: number }> {
  const counts = new Map<string, number>();
  for (const event of events) {
    counts.set(event.eventType, (counts.get(event.eventType) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([label, count]) => ({ label: eventLabel(label), count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 4);
}

export function WeeklyDriftPanel({
  events,
  asOf = new Date(),
  projectCreatedAt = null,
  targetLoiDate = null,
  targetCloseDate = null,
  title = "Weekly Drift",
}: WeeklyDriftPanelProps) {
  const resolvedAsOf = toDate(asOf) ?? new Date();
  const now = startOfDay(resolvedAsOf);
  const recentWindowStart = new Date(now);
  recentWindowStart.setDate(recentWindowStart.getDate() - 7);
  const priorWindowStart = new Date(now);
  priorWindowStart.setDate(priorWindowStart.getDate() - 14);

  const normalizedEvents = [...events]
    .map((event) => ({ ...event, createdAt: toDate(event.createdAt) }))
    .filter((event): event is WeeklyDriftEvent & { createdAt: Date } => event.createdAt !== null)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const recentEvents = normalizedEvents.filter((event) => event.createdAt >= recentWindowStart);
  const priorEvents = normalizedEvents.filter(
    (event) => event.createdAt >= priorWindowStart && event.createdAt < recentWindowStart
  );

  const trend = getTrendState(recentEvents.length, priorEvents.length);
  const trendToneValue = trendTone(trend);
  const timeline = bucketEvents(recentEvents, now);
  const peakCount = Math.max(1, ...timeline.map((point) => point.count));
  const totalEvents = normalizedEvents.length;
  const lastEvent = normalizedEvents[0] ?? null;
  const lastEventDays = lastEvent
    ? Math.max(0, Math.floor((now.getTime() - startOfDay(lastEvent.createdAt).getTime()) / MS_PER_DAY))
    : null;

  const loiDate = toDate(targetLoiDate);
  const closeDate = toDate(targetCloseDate);
  const createdDate = toDate(projectCreatedAt);
  const daysToLoi = loiDate
    ? Math.ceil((startOfDay(loiDate).getTime() - now.getTime()) / MS_PER_DAY)
    : null;
  const daysToClose = closeDate
    ? Math.ceil((startOfDay(closeDate).getTime() - now.getTime()) / MS_PER_DAY)
    : null;

  const coverageSummary = summarizeEventTypes(recentEvents);
  const weekDelta = recentEvents.length - priorEvents.length;
  const hasTimelineActivity = timeline.some((point) => point.count > 0);
  const changeLabel =
    priorEvents.length === 0
      ? recentEvents.length === 0
        ? "No movement"
        : `+${recentEvents.length} this week`
      : `${weekDelta >= 0 ? "+" : ""}${weekDelta} vs prior week`;

  const itemTone =
    trend === "accelerating"
      ? "var(--teal)"
      : trend === "cooling"
        ? "var(--accent)"
        : trend === "steady"
          ? "var(--gold)"
          : "var(--ink-muted)";

  const cardStyle: CSSProperties = {
    ...detailSurfaceCardStyle(),
    padding: "18px",
    marginBottom: "24px",
  };

  const statLabelStyle: CSSProperties = {
    ...detailMonoLabelStyle,
  };

  return (
    <section style={cardStyle}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "grid", gap: "4px" }}>
          <p className="eyebrow" style={{ marginBottom: 0 }}>
            {title}
          </p>
          <p
            style={{
              margin: 0,
              ...detailMutedBodyStyle,
              fontSize: "14px",
              lineHeight: 1.6,
              maxWidth: "640px",
            }}
          >
            Shows recent movement, comparison to the previous week, and where the deal is drifting
            relative to LOI and close.
          </p>
        </div>

        <span
          style={{
            ...detailMonoLabelStyle,
            color: trendToneValue.color,
            border: `1px solid ${trendToneValue.border}`,
            backgroundColor: trendToneValue.background,
            borderRadius: "999px",
            padding: "6px 10px",
            whiteSpace: "nowrap",
          }}
        >
          {trendLabel(trend)}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "12px",
          marginBottom: "18px",
        }}
      >
        <StatBlock label="This week" value={recentEvents.length} accent={itemTone} />
        <StatBlock label="Prior week" value={priorEvents.length} accent="var(--ink-mid)" />
        <StatBlock label="Delta" value={changeLabel} accent={itemTone} compact />
        <StatBlock
          label="Last movement"
          value={lastEvent ? `${lastEventDays === 0 ? "Today" : formatRelativeDays(lastEventDays ?? 0)} ago` : "No activity"}
          accent={lastEvent ? "var(--ink)" : "var(--ink-muted)"}
          compact
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "16px",
        }}
      >
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "14px 14px 12px",
            backgroundColor: "color-mix(in srgb, var(--teal) 4%, var(--bg-card))",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: "12px",
              marginBottom: "10px",
            }}
          >
            <span style={statLabelStyle}>Seven day trace</span>
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "9px",
                letterSpacing: "0.08em",
                color: "var(--ink-muted)",
              }}
            >
              {formatDate(recentWindowStart)} to {formatDate(now)}
            </span>
          </div>

          {hasTimelineActivity ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${timeline.length}, minmax(0, 1fr))`,
                alignItems: "end",
                gap: "8px",
                height: "118px",
              }}
            >
              {timeline.map((point) => {
                const height = clamp((point.count / peakCount) * 100, 8, 100);
                return (
                  <div key={point.label} style={{ display: "grid", gap: "8px", alignItems: "end" }}>
                    <div
                      style={{
                        height: "100%",
                        display: "flex",
                        alignItems: "end",
                      }}
                    >
                      <div
                        title={`${point.label}: ${point.count} event${point.count === 1 ? "" : "s"}`}
                        style={{
                          width: "100%",
                          minHeight: "8px",
                          height: `${height}%`,
                          borderRadius: "8px",
                          background:
                            point.count > 0
                              ? `linear-gradient(180deg, color-mix(in srgb, ${itemTone} 26%, var(--bg-card)) 0%, ${itemTone} 100%)`
                              : "color-mix(in srgb, var(--border) 60%, var(--bg-card))",
                          border: point.count > 0 ? `1px solid color-mix(in srgb, ${itemTone} 28%, var(--border))` : "1px solid var(--border)",
                        }}
                      />
                    </div>
                    <div style={{ display: "grid", gap: "3px", justifyItems: "center" }}>
                    <span
                      style={{
                        ...detailMicroMonoStyle,
                        letterSpacing: "0.08em",
                        fontWeight: 400,
                        textTransform: "none",
                      }}
                    >
                        {point.label}
                      </span>
                      <span
                        style={{
                          ...detailMicroMonoStyle,
                          letterSpacing: "0.08em",
                          fontWeight: 400,
                          textTransform: "none",
                        }}
                      >
                        {point.count}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                height: "118px",
                borderRadius: "8px",
                border: "1px dashed var(--border)",
                backgroundColor: "color-mix(in srgb, var(--bg-card) 92%, var(--teal))",
                display: "grid",
                placeItems: "center",
                textAlign: "center",
                padding: "16px",
              }}
            >
              <div style={{ display: "grid", gap: "4px", maxWidth: "280px" }}>
                <span style={statLabelStyle}>No activity recorded</span>
                <span
                  style={{
                    margin: 0,
                    ...detailMutedBodyStyle,
                    lineHeight: 1.5,
                  }}
                >
                  The last seven days are empty. This usually means the deal is stalled or the log has not been populated yet.
                </span>
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "14px",
            backgroundColor: "var(--bg-card)",
            display: "grid",
            gap: "12px",
          }}
        >
          <div style={{ display: "grid", gap: "6px" }}>
            <span style={statLabelStyle}>Deal drift signals</span>
            <p
              style={{
                margin: 0,
                ...detailMutedBodyStyle,
                lineHeight: 1.6,
                color: "var(--ink)",
              }}
            >
              {recentEvents.length === 0
                ? "No activity in the last seven days. The deal is drifting and should be checked for stalled owners or missing next steps."
                : trend === "accelerating"
                  ? "Activity is increasing. The deal is moving, and the current risk is coordination drift rather than inactivity."
                  : trend === "cooling"
                    ? "Movement is slowing compared with the prior week. PMs should look for blocked owners, incomplete documents, or stale follow-ups."
                    : "The deal is active but not accelerating. Progress exists, but it may need sharper ownership to avoid slipping."}
            </p>
          </div>

          <div style={{ display: "grid", gap: "8px" }}>
            <span style={statLabelStyle}>Recent event types</span>
            {coverageSummary.length > 0 ? (
              <div style={{ display: "grid", gap: "8px" }}>
                {coverageSummary.map((entry) => (
                  <div
                    key={entry.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "10px",
                    }}
                  >
                    <span
                      style={{
                        ...detailMonoLabelStyle,
                        letterSpacing: "0.08em",
                      }}
                    >
                      {entry.label}
                    </span>
                    <span
                      style={{
                        ...detailMonoLabelStyle,
                        fontSize: "10px",
                        fontWeight: 400,
                        letterSpacing: "0.08em",
                        textTransform: "none",
                        color: "var(--ink)",
                      }}
                    >
                      {entry.count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p
                style={{
                  margin: 0,
                  ...detailMutedBodyStyle,
                  lineHeight: 1.6,
                }}
              >
                No events in the lookback window.
              </p>
            )}
          </div>

          <div
            style={{
              borderTop: "1px solid var(--border)",
              paddingTop: "10px",
              display: "grid",
              gap: "6px",
            }}
          >
            <span style={statLabelStyle}>Schedule pressure</span>
            <PressureRow
              label="LOI"
              value={daysToLoi === null ? "Not set" : daysToLoi >= 0 ? `${daysToLoi} days remaining` : `${Math.abs(daysToLoi)} days past`}
              tone={daysToLoi === null ? "var(--ink-muted)" : daysToLoi <= 30 ? "var(--accent)" : daysToLoi <= 90 ? "var(--gold)" : "var(--teal)"}
            />
            <PressureRow
              label="Close"
              value={daysToClose === null ? "Not set" : daysToClose >= 0 ? `${daysToClose} days remaining` : `${Math.abs(daysToClose)} days past`}
              tone={daysToClose === null ? "var(--ink-muted)" : daysToClose <= 60 ? "var(--accent)" : daysToClose <= 120 ? "var(--gold)" : "var(--teal)"}
            />
            <PressureRow
              label="Age"
              value={createdDate ? `${Math.max(0, Math.floor((now.getTime() - startOfDay(createdDate).getTime()) / MS_PER_DAY))} days since kickoff` : "Unknown"}
              tone="var(--ink-muted)"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function StatBlock({
  label,
  value,
  accent,
  compact = false,
}: {
  label: string;
  value: string | number;
  accent: string;
  compact?: boolean;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: compact ? "12px 14px" : "14px",
        backgroundColor: "color-mix(in srgb, var(--bg-card) 94%, transparent)",
        minHeight: "84px",
      }}
    >
      <div style={{ display: "grid", gap: "8px" }}>
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "9px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--ink-muted)",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: compact ? "13px" : "15px",
            fontWeight: 600,
            lineHeight: 1.4,
            color: accent,
          }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

function PressureRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: "12px",
      }}
    >
      <span
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "9px",
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: "var(--ink-muted)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "10px",
          letterSpacing: "0.08em",
          color: tone,
        }}
      >
        {value}
      </span>
    </div>
  );
}
