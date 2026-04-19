"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useChartTheme } from "@/components/charts/theme";

type TrendlineData = {
  currentScoreBps: number;
  sevenDayAvgBps: number | null;
  thirtyDayAvgBps: number | null;
  velocityBpsPerDay: number | null;
  projectedGateDateISO: string | null;
  isStalled: boolean;
};

type ChartRow = {
  label: string;
  historical: number | null;
  projected: number | null;
};

type Props = { projectSlug: string };

const LOI_THRESHOLD_PCT = 65;

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function buildRows(data: TrendlineData): ChartRow[] {
  const now = new Date();
  const rows: ChartRow[] = [];

  if (data.thirtyDayAvgBps !== null) {
    rows.push({
      label: formatDateLabel(new Date(now.getTime() - 30 * 86400000)),
      historical: data.thirtyDayAvgBps / 100,
      projected: null,
    });
  }
  if (data.sevenDayAvgBps !== null) {
    rows.push({
      label: formatDateLabel(new Date(now.getTime() - 7 * 86400000)),
      historical: data.sevenDayAvgBps / 100,
      projected: null,
    });
  }

  const currentPct = data.currentScoreBps / 100;
  rows.push({
    label: formatDateLabel(now),
    historical: currentPct,
    projected: data.projectedGateDateISO ? currentPct : null,
  });

  if (data.projectedGateDateISO) {
    const projected = new Date(data.projectedGateDateISO + "T00:00:00");
    if (projected > now) {
      rows.push({
        label: `~${formatDateLabel(projected)}`,
        historical: null,
        projected: LOI_THRESHOLD_PCT,
      });
    }
  }
  return rows;
}

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

type TooltipPayloadItem = { value?: number | null; dataKey?: string | number };

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadItem[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const value = payload.find((p) => typeof p.value === "number")?.value;
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
        color: "var(--ink)",
      }}
    >
      <div style={{ color: "var(--ink-muted)", marginBottom: "2px" }}>{label}</div>
      <div>{value.toFixed(0)}%</div>
    </div>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={containerStyle}>
      <p style={eyebrowStyle}>Readiness over time</p>
      {children}
    </div>
  );
}

function Message({ text }: { text: string }) {
  return (
    <Frame>
      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "13px",
          color: "var(--ink-muted)",
          margin: 0,
        }}
      >
        {text}
      </p>
    </Frame>
  );
}

export function ReadinessTrendlineChart({ projectSlug }: Props) {
  const theme = useChartTheme();
  const [data, setData] = useState<TrendlineData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/projects/${projectSlug}/trendline`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
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

  const rows = useMemo(() => (data ? buildRows(data) : []), [data]);

  if (loading) return <Message text="Loading…" />;
  if (error) return <Message text="Could not load trendline data." />;
  if (!data) return null;
  if (rows.length < 2) return <Message text="No history yet — score changes will appear here." />;

  const currentPct = data.currentScoreBps / 100;
  const loiCrossed = currentPct >= LOI_THRESHOLD_PCT;

  const velocityLabel = data.isStalled
    ? "Stalled — no changes in 30 days"
    : data.velocityBpsPerDay !== null
    ? `${data.velocityBpsPerDay > 0 ? "+" : ""}${(data.velocityBpsPerDay / 100).toFixed(1)}% / day`
    : null;

  return (
    <div style={containerStyle}>
      <p style={eyebrowStyle}>Readiness over time</p>
      <p style={titleStyle}>Score trendline</p>

      <div style={{ width: "100%", height: 180 }}>
        <ResponsiveContainer>
          <LineChart
            data={rows}
            margin={{ top: 8, right: 24, bottom: 8, left: 0 }}
            aria-label="Readiness score trendline chart"
          >
            <CartesianGrid stroke={theme.border} strokeDasharray="3 4" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: theme.fontSizeTick, fontFamily: theme.fontMono, fill: theme.textMuted }}
              tickLine={false}
              axisLine={{ stroke: theme.border }}
              padding={{ left: 8, right: 8 }}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tick={{ fontSize: theme.fontSizeTick, fontFamily: theme.fontMono, fill: theme.textMuted }}
              tickLine={false}
              axisLine={false}
              width={32}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: theme.border, strokeDasharray: "3 3" }} />

            <ReferenceLine
              y={LOI_THRESHOLD_PCT}
              stroke={theme.gold}
              strokeDasharray="6 3"
              strokeOpacity={0.7}
              label={{
                value: "LOI gate",
                position: "insideTopRight",
                fontSize: 8,
                fontFamily: theme.fontMono,
                fill: theme.gold,
              }}
            />
            {loiCrossed && (
              <ReferenceLine
                x={rows.at(-1)?.projected != null ? rows[rows.length - 2]?.label : rows.at(-1)?.label}
                stroke={theme.teal}
                strokeDasharray="4 3"
                strokeOpacity={0.6}
                strokeWidth={1.5}
              />
            )}

            <Line
              type="monotone"
              dataKey="historical"
              stroke={theme.accent}
              strokeWidth={2}
              dot={{ r: 3.5, strokeWidth: 2, fill: theme.bgCard, stroke: theme.accent }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="projected"
              stroke={theme.accent}
              strokeWidth={1.5}
              strokeDasharray="5 4"
              strokeOpacity={0.5}
              dot={{ r: 3, strokeWidth: 1.5, fill: theme.bgCard, stroke: theme.accent, fillOpacity: 0.5 }}
              isAnimationActive={false}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "20px",
          marginTop: "4px",
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
        {loiCrossed && (
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
