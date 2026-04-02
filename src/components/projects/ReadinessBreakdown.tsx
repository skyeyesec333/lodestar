import type { CategoryBreakdown } from "@/lib/db/requirements";
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

export function ReadinessBreakdown({ breakdown }: Props) {
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
          return (
            <div key={item.category}>
              {/* Label + score */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "6px",
                }}
              >
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
