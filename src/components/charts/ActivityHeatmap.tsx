"use client";

import { ResponsiveCalendar } from "@nivo/calendar";
import { getNivoTheme, useChartTheme } from "@/components/charts/theme";
import type { ActivityHeatmapPoint } from "@/lib/db/activity";

type Props = {
  data: ActivityHeatmapPoint[];
  title?: string;
  description?: string;
  /** ISO YYYY-MM-DD; defaults to 365 days ago */
  from?: string;
  /** ISO YYYY-MM-DD; defaults to today */
  to?: string;
};

function isoDay(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function ActivityHeatmap({ data, title = "Activity", description, from, to }: Props) {
  const theme = useChartTheme();

  const now = new Date();
  const resolvedTo = to ?? isoDay(now);
  const resolvedFrom = from ?? isoDay(new Date(now.getTime() - 365 * 86400000));

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "8px",
        backgroundColor: "var(--bg-card)",
        padding: "16px 20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", marginBottom: "8px" }}>
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            fontWeight: 500,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--ink-muted)",
            margin: 0,
          }}
        >
          {title}
        </p>
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            color: "var(--ink-muted)",
          }}
        >
          {total} event{total === 1 ? "" : "s"} · 12 mo
        </span>
      </div>

      {description && (
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "12px",
            color: "var(--ink-muted)",
            margin: "0 0 10px",
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      )}

      <div style={{ height: 170, width: "100%" }}>
        <ResponsiveCalendar
          data={data}
          from={resolvedFrom}
          to={resolvedTo}
          emptyColor={theme.border}
          colors={[
            "color-mix(in srgb, var(--teal) 20%, var(--bg-card))",
            "color-mix(in srgb, var(--teal) 40%, var(--bg-card))",
            "color-mix(in srgb, var(--teal) 65%, var(--bg-card))",
            theme.teal,
          ]}
          margin={{ top: 10, right: 10, bottom: 10, left: 24 }}
          yearSpacing={24}
          monthBorderColor={theme.bgCard}
          dayBorderWidth={2}
          dayBorderColor={theme.bgCard}
          theme={getNivoTheme(theme)}
          legends={[]}
        />
      </div>
    </div>
  );
}
