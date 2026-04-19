"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useChartTheme } from "@/components/charts/theme";

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

type Row = { label: string; pct: number };

const containerStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: "14px",
  padding: "20px 22px",
  backgroundColor: "var(--bg-card)",
  minHeight: "180px",
};

const eyebrowStyle: React.CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "9px",
  fontWeight: 500,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  color: "var(--ink-muted)",
  margin: 0,
};

function bpsToPct(bps: number): number {
  return Math.round(bps / 100);
}

type TooltipPayloadItem = { value?: number | null };

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadItem[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value;
  if (typeof value !== "number") return null;
  return (
    <div
      style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: "10px",
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "4px",
        padding: "6px 8px",
      }}
    >
      <div style={{ color: "var(--ink-muted)", marginBottom: "2px" }}>{label}</div>
      <div style={{ color: "var(--ink)" }}>{value}%</div>
    </div>
  );
}

export function PortfolioTrendlineChart() {
  const theme = useChartTheme();
  const [data, setData] = useState<TrendlineResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/portfolio/trendline")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json() as Promise<TrendlineResponse>;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo<Row[]>(() => {
    if (!data) return [];
    const list: Row[] = [];
    if (data.avgThirtyDayBps !== null) list.push({ label: "30d ago", pct: bpsToPct(data.avgThirtyDayBps) });
    if (data.avgSevenDayBps !== null) list.push({ label: "7d ago", pct: bpsToPct(data.avgSevenDayBps) });
    list.push({ label: "Now", pct: bpsToPct(data.avgCurrentBps) });
    return list;
  }, [data]);

  if (error) return null;
  if (!data) {
    return (
      <div style={containerStyle}>
        <p style={eyebrowStyle}>Portfolio readiness trend</p>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "var(--ink-muted)", marginTop: "40px", textAlign: "center" }}>
          Loading...
        </p>
      </div>
    );
  }

  if (rows.length < 2) {
    return (
      <div style={containerStyle}>
        <p style={{ ...eyebrowStyle, marginBottom: "10px" }}>Portfolio readiness trend</p>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "var(--ink-muted)" }}>
          Insufficient history — trendline data will appear once projects have 7+ days of activity.
        </p>
      </div>
    );
  }

  const delta = rows[rows.length - 1].pct - rows[0].pct;
  const deltaLabel = delta >= 0 ? `+${delta}%` : `${delta}%`;
  const deltaColor = delta >= 0 ? "var(--teal)" : "var(--accent)";
  const maxPct = Math.max(100, ...rows.map((r) => r.pct));

  return (
    <div style={containerStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <p style={eyebrowStyle}>Portfolio readiness trend</p>
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

      <div style={{ width: "100%", height: 160 }}>
        <ResponsiveContainer>
          <LineChart
            data={rows}
            margin={{ top: 16, right: 12, bottom: 4, left: -8 }}
            aria-label={`Portfolio readiness trendline: ${rows.map((r) => `${r.label}: ${r.pct}%`).join(", ")}`}
          >
            <CartesianGrid stroke={theme.border} strokeWidth={0.5} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 7, fontFamily: theme.fontMono, fill: theme.textMuted, letterSpacing: "0.06em" }}
              tickLine={false}
              axisLine={{ stroke: theme.border, strokeWidth: 0.5 }}
            />
            <YAxis
              domain={[0, maxPct]}
              ticks={[0, 25, 50, 75, 100]}
              tick={{ fontSize: 8, fontFamily: theme.fontMono, fill: theme.textMuted }}
              tickLine={false}
              axisLine={false}
              width={28}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: theme.border, strokeDasharray: "3 3" }} />
            <Line
              type="monotone"
              dataKey="pct"
              stroke={theme.teal}
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2, fill: theme.bgCard, stroke: theme.teal }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
