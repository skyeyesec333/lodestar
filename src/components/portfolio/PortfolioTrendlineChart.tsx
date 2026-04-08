"use client";

import { useEffect, useState } from "react";

type ProjectTrendline = {
  id: string;
  name: string;
  currentBps: number;
  sevenDayBps: number | null;
  thirtyDayBps: number | null;
  isStalled: boolean;
};

type TrendlineResponse = {
  projects: ProjectTrendline[];
  avgCurrentBps: number;
  avgSevenDayBps: number | null;
  avgThirtyDayBps: number | null;
};

type DataPoint = { label: string; pct: number };

const SVG_W = 420;
const SVG_H = 140;
const PAD_X = 40;
const PAD_Y = 14;
const PLOT_W = SVG_W - PAD_X * 2;
const PLOT_H = SVG_H - PAD_Y * 2;

function bpsToPct(bps: number): number {
  return Math.round(bps / 100);
}

export function PortfolioTrendlineChart() {
  const [data, setData] = useState<TrendlineResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/portfolio/trendline")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json() as Promise<TrendlineResponse>;
      })
      .then(setData)
      .catch(() => setError(true));
  }, []);

  if (error) return null;
  if (!data) {
    return (
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: "14px",
          padding: "20px 22px",
          backgroundColor: "var(--bg-card)",
          minHeight: "180px",
        }}
      >
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "9px",
            fontWeight: 500,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "var(--ink-muted)",
          }}
        >
          Portfolio readiness trend
        </p>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "var(--ink-muted)", marginTop: "40px", textAlign: "center" }}>
          Loading...
        </p>
      </div>
    );
  }

  const points: DataPoint[] = [];
  if (data.avgThirtyDayBps !== null) points.push({ label: "30d ago", pct: bpsToPct(data.avgThirtyDayBps) });
  if (data.avgSevenDayBps !== null) points.push({ label: "7d ago", pct: bpsToPct(data.avgSevenDayBps) });
  points.push({ label: "Now", pct: bpsToPct(data.avgCurrentBps) });

  if (points.length < 2) {
    return (
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: "14px",
          padding: "20px 22px",
          backgroundColor: "var(--bg-card)",
        }}
      >
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "9px",
            fontWeight: 500,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "var(--ink-muted)",
            marginBottom: "10px",
          }}
        >
          Portfolio readiness trend
        </p>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "var(--ink-muted)" }}>
          Insufficient history — trendline data will appear once projects have 7+ days of activity.
        </p>
      </div>
    );
  }

  const maxPct = Math.max(100, ...points.map((p) => p.pct));
  const x = (i: number) => PAD_X + (i / (points.length - 1)) * PLOT_W;
  const y = (pct: number) => PAD_Y + PLOT_H - (pct / maxPct) * PLOT_H;

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.pct).toFixed(1)}`).join(" ");
  const delta = points[points.length - 1].pct - points[0].pct;
  const deltaLabel = delta >= 0 ? `+${delta}%` : `${delta}%`;
  const deltaColor = delta >= 0 ? "var(--teal)" : "var(--accent)";

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "14px",
        padding: "20px 22px",
        backgroundColor: "var(--bg-card)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "9px",
            fontWeight: 500,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "var(--ink-muted)",
            margin: 0,
          }}
        >
          Portfolio readiness trend
        </p>
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "11px",
            fontWeight: 600,
            color: deltaColor,
          }}
        >
          {deltaLabel}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{ width: "100%", height: "auto", maxHeight: "160px" }}
        aria-label={`Portfolio readiness trendline: ${points.map((p) => `${p.label}: ${p.pct}%`).join(", ")}`}
      >
        {/* Gridlines */}
        {[0, 25, 50, 75, 100].map((pct) => (
          <g key={pct}>
            <line
              x1={PAD_X}
              x2={SVG_W - PAD_X}
              y1={y(pct)}
              y2={y(pct)}
              stroke="var(--border)"
              strokeWidth="0.5"
              strokeDasharray={pct === 0 ? "none" : "3,3"}
            />
            <text
              x={PAD_X - 6}
              y={y(pct) + 3}
              textAnchor="end"
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "8px",
                fill: "var(--ink-muted)",
              }}
            >
              {pct}%
            </text>
          </g>
        ))}

        {/* Line */}
        <path d={linePath} fill="none" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.pct)} r="4" fill="var(--bg-card)" stroke="var(--teal)" strokeWidth="2" />
            <title>{`${p.label}: ${p.pct}%`}</title>
            <text
              x={x(i)}
              y={y(p.pct) - 10}
              textAnchor="middle"
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "9px",
                fontWeight: 600,
                fill: "var(--ink)",
              }}
            >
              {p.pct}%
            </text>
            <text
              x={x(i)}
              y={SVG_H - 2}
              textAnchor="middle"
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "7px",
                fill: "var(--ink-muted)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
