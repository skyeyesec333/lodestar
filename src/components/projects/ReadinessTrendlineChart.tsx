"use client";

import { useEffect, useState } from "react";

type TrendlineData = {
  currentScoreBps: number;
  sevenDayAvgBps: number | null;
  thirtyDayAvgBps: number | null;
  velocityBpsPerDay: number | null;
  projectedGateDateISO: string | null;
  isStalled: boolean;
};

type DataPoint = {
  label: string;
  scorePct: number;
  isProjected?: boolean;
  isLoiThreshold?: boolean;
};

type Props = {
  projectSlug: string;
};

const LOI_THRESHOLD_BPS = 6500;

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function buildDataPoints(data: TrendlineData): DataPoint[] {
  const now = new Date();
  const points: DataPoint[] = [];

  if (data.thirtyDayAvgBps !== null) {
    const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    points.push({ label: formatDateLabel(d), scorePct: data.thirtyDayAvgBps / 100 });
  }

  if (data.sevenDayAvgBps !== null) {
    const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    points.push({ label: formatDateLabel(d), scorePct: data.sevenDayAvgBps / 100 });
  }

  points.push({ label: formatDateLabel(now), scorePct: data.currentScoreBps / 100 });

  if (data.projectedGateDateISO) {
    const projected = new Date(data.projectedGateDateISO + "T00:00:00");
    if (projected > now) {
      points.push({
        label: formatDateLabel(projected),
        scorePct: LOI_THRESHOLD_BPS / 100,
        isProjected: true,
      });
    }
  }

  return points;
}

const CHART_WIDTH = 520;
const CHART_HEIGHT = 160;
const PAD_LEFT = 44;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 36;

const PLOT_W = CHART_WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_H = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

function toX(index: number, total: number): number {
  if (total <= 1) return PAD_LEFT + PLOT_W / 2;
  return PAD_LEFT + (index / (total - 1)) * PLOT_W;
}

function toY(scorePct: number): number {
  const clamped = Math.min(100, Math.max(0, scorePct));
  return PAD_TOP + PLOT_H - (clamped / 100) * PLOT_H;
}

export function ReadinessTrendlineChart({ projectSlug }: Props) {
  const [data, setData] = useState<TrendlineData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/projects/${projectSlug}/trendline`)
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Request failed (${res.status})`);
        }
        return res.json() as Promise<TrendlineData>;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load trendline");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectSlug]);

  const containerStyle: React.CSSProperties = {
    border: "1px solid var(--border)",
    borderRadius: "8px",
    backgroundColor: "var(--bg-card)",
    padding: "20px 20px 16px",
    marginBottom: "32px",
  };

  const eyebrowStyle: React.CSSProperties = {
    fontFamily: "'DM Mono', monospace",
    fontSize: "10px",
    fontWeight: 500,
    letterSpacing: "0.10em",
    textTransform: "uppercase",
    color: "var(--ink-muted)",
    marginBottom: "4px",
  };

  const titleStyle: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--ink)",
    margin: "0 0 14px",
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <p style={eyebrowStyle}>Readiness over time</p>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "13px",
            color: "var(--ink-muted)",
            margin: 0,
          }}
        >
          Loading…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={containerStyle}>
        <p style={eyebrowStyle}>Readiness over time</p>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "13px",
            color: "var(--ink-muted)",
            margin: 0,
          }}
        >
          Could not load trendline data.
        </p>
      </div>
    );
  }

  if (!data) return null;

  const points = buildDataPoints(data);

  if (points.length < 2) {
    return (
      <div style={containerStyle}>
        <p style={eyebrowStyle}>Readiness over time</p>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "13px",
            color: "var(--ink-muted)",
            margin: 0,
          }}
        >
          No history yet — score changes will appear here.
        </p>
      </div>
    );
  }

  const solidPoints = points.filter((p) => !p.isProjected);
  const projectedPoint = points.find((p) => p.isProjected);

  const solidPolyline = solidPoints
    .map((p, i) => `${toX(i, points.length)},${toY(p.scorePct)}`)
    .join(" ");

  const projectedPolyline =
    projectedPoint && solidPoints.length > 0
      ? [
          `${toX(solidPoints.length - 1, points.length)},${toY(solidPoints[solidPoints.length - 1].scorePct)}`,
          `${toX(points.length - 1, points.length)},${toY(projectedPoint.scorePct)}`,
        ].join(" ")
      : null;

  const loiY = toY(LOI_THRESHOLD_BPS / 100);
  const loiIsVisible = loiY >= PAD_TOP && loiY <= PAD_TOP + PLOT_H;

  const loiCrossedAt = data.currentScoreBps >= LOI_THRESHOLD_BPS;
  const loiCrossX = loiCrossedAt
    ? (() => {
        const todayIdx = solidPoints.length - 1;
        return toX(todayIdx, points.length);
      })()
    : null;

  const velocityLabel = (() => {
    if (data.isStalled) return "Stalled — no changes in 30 days";
    if (data.velocityBpsPerDay === null) return null;
    const sign = data.velocityBpsPerDay > 0 ? "+" : "";
    return `${sign}${(data.velocityBpsPerDay / 100).toFixed(1)}% / day`;
  })();

  return (
    <div style={containerStyle}>
      <p style={eyebrowStyle}>Readiness over time</p>
      <p style={titleStyle}>Score trendline</p>

      <div style={{ overflowX: "auto" }}>
        <svg
          width={CHART_WIDTH}
          height={CHART_HEIGHT}
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          aria-label="Readiness score trendline chart"
          style={{ display: "block", maxWidth: "100%" }}
        >
          {/* Y-axis gridlines at 0%, 25%, 50%, 75%, 100% */}
          {[0, 25, 50, 75, 100].map((pct) => {
            const y = toY(pct);
            return (
              <g key={pct}>
                <line
                  x1={PAD_LEFT}
                  y1={y}
                  x2={PAD_LEFT + PLOT_W}
                  y2={y}
                  stroke="var(--border)"
                  strokeWidth={1}
                  strokeDasharray="3 4"
                />
                <text
                  x={PAD_LEFT - 6}
                  y={y + 4}
                  textAnchor="end"
                  fontSize={9}
                  fontFamily="'DM Mono', monospace"
                  fill="var(--ink-muted)"
                >
                  {pct}
                </text>
              </g>
            );
          })}

          {/* LOI threshold line at 65% */}
          {loiIsVisible && (
            <g>
              <line
                x1={PAD_LEFT}
                y1={loiY}
                x2={PAD_LEFT + PLOT_W}
                y2={loiY}
                stroke="var(--gold)"
                strokeWidth={1}
                strokeDasharray="6 3"
                opacity={0.7}
              />
              <text
                x={PAD_LEFT + PLOT_W - 2}
                y={loiY - 4}
                textAnchor="end"
                fontSize={8}
                fontFamily="'DM Mono', monospace"
                fill="var(--gold)"
              >
                LOI gate
              </text>
            </g>
          )}

          {/* LOI crossed marker — vertical line at today if score is past threshold */}
          {loiCrossedAt && loiCrossX !== null && (
            <line
              x1={loiCrossX}
              y1={PAD_TOP}
              x2={loiCrossX}
              y2={PAD_TOP + PLOT_H}
              stroke="var(--teal)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              opacity={0.6}
            />
          )}

          {/* Solid line: historical data */}
          <polyline
            points={solidPolyline}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Dashed projected line to gate */}
          {projectedPolyline && (
            <polyline
              points={projectedPolyline}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              opacity={0.5}
              strokeLinecap="round"
            />
          )}

          {/* Data point dots (solid only) */}
          {solidPoints.map((p, i) => (
            <circle
              key={i}
              cx={toX(i, points.length)}
              cy={toY(p.scorePct)}
              r={3.5}
              fill="var(--bg-card, var(--bg))"
              stroke="var(--accent)"
              strokeWidth={2}
            />
          ))}

          {/* Projected endpoint dot */}
          {projectedPoint && (
            <circle
              cx={toX(points.length - 1, points.length)}
              cy={toY(projectedPoint.scorePct)}
              r={3}
              fill="var(--bg-card, var(--bg))"
              stroke="var(--accent)"
              strokeWidth={1.5}
              opacity={0.5}
            />
          )}

          {/* X-axis labels */}
          {points.map((p, i) => (
            <text
              key={i}
              x={toX(i, points.length)}
              y={PAD_TOP + PLOT_H + 20}
              textAnchor="middle"
              fontSize={9}
              fontFamily="'DM Mono', monospace"
              fill={p.isProjected ? "var(--ink-muted)" : "var(--ink-muted)"}
              opacity={p.isProjected ? 0.6 : 1}
            >
              {p.isProjected ? `~${p.label}` : p.label}
            </text>
          ))}
        </svg>
      </div>

      {/* Footer row: velocity + projected gate */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "20px",
          marginTop: "8px",
          flexWrap: "wrap",
        }}
      >
        {velocityLabel && (
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              color: data.isStalled ? "var(--gold)" : "var(--ink-muted)",
              letterSpacing: "0.05em",
            }}
          >
            {velocityLabel}
          </span>
        )}
        {data.projectedGateDateISO && (
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              color: "var(--teal)",
              letterSpacing: "0.05em",
            }}
          >
            Projected LOI gate:{" "}
            {formatDateLabel(new Date(data.projectedGateDateISO + "T00:00:00"))}
          </span>
        )}
        {data.currentScoreBps >= LOI_THRESHOLD_BPS && (
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              color: "var(--teal)",
              letterSpacing: "0.05em",
            }}
          >
            LOI gate reached
          </span>
        )}
      </div>
    </div>
  );
}
