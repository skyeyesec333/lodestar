type Bucket = { not_started: number; at_risk: number; progressing: number; ready: number };

type Props = { distribution: Bucket; total: number };

const SEGMENTS: Array<{ key: keyof Bucket; label: string; color: string; bg: string }> = [
  { key: "ready",       label: "Ready",       color: "var(--teal)",       bg: "var(--teal)" },
  { key: "progressing", label: "Progressing", color: "var(--gold)",       bg: "var(--gold)" },
  { key: "at_risk",     label: "At risk",     color: "var(--accent)",     bg: "var(--accent)" },
  { key: "not_started", label: "Not started", color: "var(--border-strong)", bg: "var(--border-strong)" },
];

export function ReadinessDistributionBar({ distribution, total }: Props) {
  if (total === 0) return null;

  return (
    <div
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "4px",
        padding: "20px 24px",
      }}
    >
      <p
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "10px",
          fontWeight: 500,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--ink-muted)",
          margin: "0 0 14px",
        }}
      >
        Readiness Distribution
      </p>

      {/* Stacked bar */}
      <div
        style={{
          display: "flex",
          height: "12px",
          borderRadius: "6px",
          overflow: "hidden",
          gap: "1px",
          marginBottom: "12px",
        }}
      >
        {SEGMENTS.map(({ key, bg }) => {
          const count = distribution[key];
          if (count === 0) return null;
          const pct = (count / total) * 100;
          return (
            <div
              key={key}
              style={{
                width: `${pct}%`,
                backgroundColor: bg,
                flexShrink: 0,
                minWidth: "2px",
              }}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
        {SEGMENTS.map(({ key, label, color }) => {
          const count = distribution[key];
          const pct = Math.round((count / total) * 100);
          return (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  color: "var(--ink-muted)",
                  letterSpacing: "0.06em",
                }}
              >
                {label}
              </span>
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  fontWeight: 600,
                  color: "var(--ink)",
                }}
              >
                {count} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
