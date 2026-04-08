type Props = {
  totalDeals: number;
  totalCapexCents: number;
  avgReadiness: number;
  stagnantCount: number;
  upcomingDeadlineCount: number;
  riskFlags: Array<[string, number]>;
  distribution: { not_started: number; at_risk: number; progressing: number; ready: number };
};

function formatCapex(cents: number): string {
  if (cents === 0) return "$0";
  const millions = cents / 100_000_000;
  if (millions >= 1000) return `$${(millions / 1000).toFixed(1)}B`;
  if (millions >= 1) return `$${millions.toFixed(1)}M`;
  const thousands = cents / 100_000;
  return `$${thousands.toFixed(0)}K`;
}

function readinessColor(pct: number): string {
  if (pct >= 75) return "var(--teal)";
  if (pct >= 50) return "var(--gold)";
  return "var(--accent)";
}

function buildSummary(props: Props): string {
  const parts: string[] = [];
  const { totalDeals, avgReadiness, stagnantCount, upcomingDeadlineCount, distribution } = props;

  parts.push(`${totalDeals} active deal${totalDeals !== 1 ? "s" : ""} with ${Math.round(avgReadiness)}% average readiness.`);

  if (distribution.ready > 0) {
    parts.push(`${distribution.ready} deal${distribution.ready !== 1 ? "s" : ""} at gate-ready status.`);
  }

  if (stagnantCount > 0) {
    parts.push(`${stagnantCount} deal${stagnantCount !== 1 ? "s" : ""} stagnant (below 50% readiness, inactive 14+ days).`);
  }

  if (upcomingDeadlineCount > 0) {
    parts.push(`${upcomingDeadlineCount} deadline${upcomingDeadlineCount !== 1 ? "s" : ""} within 90 days.`);
  }

  return parts.join(" ");
}

export function ExecutiveDashboard(props: Props) {
  const { totalDeals, totalCapexCents, avgReadiness, stagnantCount, upcomingDeadlineCount, riskFlags } = props;

  const kpis = [
    { label: "Active Deals", value: String(totalDeals) },
    { label: "Pipeline CAPEX", value: formatCapex(totalCapexCents) },
    { label: "Avg Readiness", value: `${Math.round(avgReadiness)}%`, color: readinessColor(avgReadiness) },
    { label: "Stagnant Deals", value: String(stagnantCount), color: stagnantCount > 0 ? "var(--accent)" : "var(--teal)" },
    { label: "Upcoming Deadlines", value: String(upcomingDeadlineCount), color: upcomingDeadlineCount > 3 ? "var(--gold)" : undefined },
  ];

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "14px",
        backgroundColor: "var(--bg-card)",
        padding: "24px 28px",
        marginBottom: "8px",
      }}
    >
      <p
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "9px",
          fontWeight: 500,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--ink-muted)",
          margin: "0 0 16px",
        }}
      >
        Executive Summary
      </p>

      {/* KPI tiles */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            style={{
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "14px 16px",
              backgroundColor: "var(--bg)",
            }}
          >
            <p
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "8px",
                fontWeight: 500,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--ink-muted)",
                margin: "0 0 6px",
              }}
            >
              {kpi.label}
            </p>
            <p
              style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: "22px",
                fontWeight: 400,
                color: kpi.color ?? "var(--ink)",
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Narrative summary */}
      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "13px",
          color: "var(--ink-mid)",
          lineHeight: 1.65,
          margin: "0 0 12px",
          maxWidth: "720px",
        }}
      >
        {buildSummary(props)}
      </p>

      {/* Top risk flags */}
      {riskFlags.length > 0 && (
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {riskFlags.map(([flag, count]) => (
            <span
              key={flag}
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "9px",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                padding: "4px 10px",
                borderRadius: "999px",
                border: "1px solid color-mix(in srgb, var(--accent) 30%, var(--border))",
                color: "var(--accent)",
                backgroundColor: "color-mix(in srgb, var(--accent) 5%, var(--bg-card))",
              }}
            >
              {flag.replace(/_/g, " ")} ({count})
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
