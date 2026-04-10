type RiskLevelCounts = { none: number; low: number; medium: number; high: number };

const LEVEL_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  none:   { color: "var(--teal)",      bg: "var(--teal-soft)",   label: "None" },
  low:    { color: "var(--gold)",      bg: "var(--gold-soft)",   label: "Low" },
  medium: { color: "var(--gold)",      bg: "var(--gold-soft)",   label: "Medium" },
  high:   { color: "var(--accent)",    bg: "var(--accent-soft)", label: "High" },
};

export function PortfolioRiskSummary({
  riskLevelCounts,
  totalPenaltyBps,
  topFlags,
  projectCount,
}: {
  riskLevelCounts: RiskLevelCounts;
  totalPenaltyBps: number;
  topFlags: [string, number][];
  projectCount: number;
}) {
  const hasAnyRisk = riskLevelCounts.low + riskLevelCounts.medium + riskLevelCounts.high > 0;
  if (!hasAnyRisk && projectCount === 0) return null;

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
          marginBottom: "14px",
        }}
      >
        Financing risk rollup
      </p>

      {/* Risk level distribution */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "8px",
          marginBottom: "14px",
        }}
      >
        {(["none", "low", "medium", "high"] as const).map((level) => {
          const config = LEVEL_CONFIG[level];
          const count = riskLevelCounts[level];
          return (
            <div
              key={level}
              style={{
                border: `1px solid ${count > 0 ? config.color : "var(--border)"}`,
                borderRadius: "8px",
                padding: "10px 12px",
                backgroundColor: count > 0 ? config.bg : "var(--bg)",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  fontFamily: "'DM Serif Display', Georgia, serif",
                  fontSize: "24px",
                  lineHeight: 1,
                  color: count > 0 ? config.color : "var(--ink-muted)",
                  margin: "0 0 4px",
                }}
              >
                {count}
              </p>
              <p
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "8px",
                  fontWeight: 500,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: count > 0 ? config.color : "var(--ink-muted)",
                  margin: 0,
                }}
              >
                {config.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Total penalty */}
      {totalPenaltyBps > 0 && (
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "11px",
            color: "var(--gold)",
            marginBottom: "10px",
          }}
        >
          Total readiness penalty: −{(totalPenaltyBps / 100).toFixed(0)} bps across portfolio
        </p>
      )}

      {/* Top flags */}
      {topFlags.length > 0 && (
        <div>
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              fontWeight: 500,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "var(--ink-muted)",
              marginBottom: "6px",
            }}
          >
            Top risk flags
          </p>
          {topFlags.map(([flag, count]) => (
            <div
              key={flag}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "4px 0",
              }}
            >
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "var(--ink)" }}>
                {flag}
              </span>
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  color: "var(--ink-muted)",
                }}
              >
                {count} project{count !== 1 ? "s" : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
