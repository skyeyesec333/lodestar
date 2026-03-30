import type { CSSProperties } from "react";

interface PortfolioSummaryBarProps {
  totalDeals: number;
  conceptCount: number;
  preLoiCount: number;
  loiSubmittedCount: number;
  committedCount: number;
  avgReadinessBps: number | null;
}

function getAvgReadinessColor(bps: number | null): string {
  if (bps == null || bps === 0) return "var(--ink-muted)";
  if (bps >= 7500) return "var(--teal)";
  if (bps >= 4000) return "var(--gold)";
  return "var(--accent)";
}

function formatAvgReadiness(bps: number | null): string {
  if (bps == null) return "—";
  return `${(bps / 100).toFixed(1)}%`;
}

interface StatTileProps {
  label: string;
  value: string | number;
  color: string;
}

function StatTile({ label, value, color }: StatTileProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        padding: "16px 24px",
        minWidth: "120px",
        flex: "1 1 120px",
      }}
    >
      <span
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "9px",
          fontWeight: 500,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--ink-muted)",
          marginBottom: "8px",
          display: "block",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "'DM Serif Display', Georgia, serif",
          fontSize: "28px",
          fontWeight: 400,
          color,
          lineHeight: 1,
          display: "block",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function PortfolioSummaryBar({
  totalDeals,
  conceptCount,
  preLoiCount,
  loiSubmittedCount,
  committedCount,
  avgReadinessBps,
}: PortfolioSummaryBarProps) {
  const containerStyle: CSSProperties = {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "4px",
    borderBottom: "2px solid var(--border)",
    marginBottom: "24px",
    overflow: "hidden",
  };

  const dividerStyle: CSSProperties = {
    width: "1px",
    backgroundColor: "var(--border)",
    alignSelf: "stretch",
    margin: "12px 0",
  };

  return (
    <div style={containerStyle}>
      <StatTile label="Total Deals" value={totalDeals} color="var(--ink)" />
      <div style={dividerStyle} />
      <StatTile label="Concept" value={conceptCount} color="var(--ink-muted)" />
      <div style={dividerStyle} />
      <StatTile label="Pre-LOI" value={preLoiCount} color="var(--gold)" />
      <div style={dividerStyle} />
      <StatTile label="LOI Submitted" value={loiSubmittedCount} color="var(--accent)" />
      <div style={dividerStyle} />
      <StatTile label="Committed" value={committedCount} color="var(--teal)" />
      <div style={dividerStyle} />
      <StatTile
        label="Avg Readiness"
        value={formatAvgReadiness(avgReadinessBps)}
        color={getAvgReadinessColor(avgReadinessBps)}
      />
    </div>
  );
}
