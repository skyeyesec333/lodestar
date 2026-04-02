import type { FC } from "react";

type Props = {
  projectId: string;
  readinessScore: number;
  loiCriticalCount: number;
  loiCriticalDone: number;
};

function projectedLoiDate(
  loiCriticalCount: number,
  loiCriticalDone: number
): string {
  if (loiCriticalCount === 0) return "Ready to submit";
  const ratio = loiCriticalDone / loiCriticalCount;
  if (ratio >= 0.8) return "Ready to submit";

  // Remaining gap expressed as number of 10% increments needed to reach 80%
  const currentPct = ratio * 100;
  const targetPct = 80;
  const gapPct = targetPct - currentPct;
  const incrementsNeeded = gapPct / 10;
  // ~3 months per 10% increment
  const monthsNeeded = Math.ceil(incrementsNeeded * 3);

  const target = new Date();
  target.setMonth(target.getMonth() + monthsNeeded);
  return `Est. ready by ${target.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;
}

const LoiProjectionWidget: FC<Props> = ({
  loiCriticalCount,
  loiCriticalDone,
}) => {
  const ratio = loiCriticalCount > 0 ? loiCriticalDone / loiCriticalCount : 0;
  const pct = Math.round(ratio * 100);
  const projection = projectedLoiDate(loiCriticalCount, loiCriticalDone);
  const isReady = projection === "Ready to submit";

  return (
    <div
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "4px",
        padding: "20px 24px",
      }}
    >
      {/* Title row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
            LOI Readiness
          </p>
          {/* Tooltip anchor */}
          <div
            title="LOI-critical items are the subset of EXIM requirements that must be in substantially final or executed form before EXIM will issue a Letter of Interest. These are contractual, financial, and eligibility items that gate the LOI milestone."
            style={{
              width: "16px",
              height: "16px",
              borderRadius: "50%",
              border: "1px solid var(--border)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              fontWeight: 700,
              color: "var(--ink-muted)",
              cursor: "help",
              flexShrink: 0,
              userSelect: "none",
            }}
          >
            ?
          </div>
        </div>

        {/* Status badge */}
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "9px",
            fontWeight: 600,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: isReady ? "var(--teal)" : "var(--ink-muted)",
            backgroundColor: isReady ? "var(--teal-soft)" : "var(--bg)",
            border: "1px solid",
            borderColor: isReady ? "var(--teal)" : "var(--border)",
            borderRadius: "3px",
            padding: "3px 10px",
            flexShrink: 0,
          }}
        >
          {isReady ? "Ready to submit" : projection}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: "10px" }}>
        <div
          style={{
            height: "6px",
            backgroundColor: "var(--border)",
            borderRadius: "3px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              backgroundColor: isReady ? "var(--teal)" : pct >= 50 ? "var(--gold)" : "var(--accent)",
              borderRadius: "3px",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* Legend */}
      <p
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "10px",
          color: "var(--ink-muted)",
          margin: 0,
          letterSpacing: "0.04em",
        }}
      >
        {loiCriticalDone} of {loiCriticalCount} LOI-critical items complete
        {" · "}
        <span style={{ fontWeight: 600, color: "var(--ink)" }}>{pct}%</span>
      </p>
    </div>
  );
};

export { LoiProjectionWidget };
export default LoiProjectionWidget;
