import { getProgramConfig } from "@/lib/requirements/index";

type Props = {
  loiBlockerCount: number;
  recentVelocity: number;
  targetLoiDate: Date | null;
  dealType: string;
  actualLoiSubmittedDate?: Date | null;
};

export function LoiProjectionWidget({ loiBlockerCount, recentVelocity, targetLoiDate, dealType, actualLoiSubmittedDate }: Props) {
  const config = getProgramConfig(dealType);
  const gateLabel = config.primaryGateLabel;

  let body: React.ReactNode;
  let statusColor = "var(--teal)";
  let statusBg = "var(--teal-soft)";
  let statusBorder = "var(--teal)";
  let statusLabel = "";

  if (loiBlockerCount === 0) {
    statusLabel = "No blockers";
    body = (
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "var(--ink-mid)", margin: 0, lineHeight: 1.5 }}>
        On track — no {gateLabel} blockers remaining.
      </p>
    );
  } else if (recentVelocity === 0) {
    statusColor = "var(--ink-muted)";
    statusBg = "var(--bg)";
    statusBorder = "var(--border)";
    statusLabel = "Insufficient data";
    body = (
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "var(--ink-mid)", margin: 0, lineHeight: 1.5 }}>
        No requirement completions in the last 28 days — cannot project a timeline.
      </p>
    );
  } else {
    const weeksToReady = Math.ceil(loiBlockerCount / recentVelocity);
    const projectedReady = new Date(Date.now() + weeksToReady * 7 * 86_400_000);

    let scheduleNote: React.ReactNode = null;
    if (targetLoiDate) {
      const targetMs = new Date(targetLoiDate).getTime();
      const diffWeeks = Math.round((projectedReady.getTime() - targetMs) / (7 * 86_400_000));
      if (diffWeeks <= 0) {
        scheduleNote = (
          <span style={{ color: "var(--teal)", fontWeight: 500 }}>On schedule.</span>
        );
      } else {
        statusColor = "var(--gold)";
        statusBg = "var(--gold-soft)";
        statusBorder = "var(--gold)";
        scheduleNote = (
          <span style={{ color: "var(--gold)", fontWeight: 500 }}>Behind schedule by ~{diffWeeks} week{diffWeeks !== 1 ? "s" : ""}.</span>
        );
      }
    }

    statusLabel = `~${weeksToReady}w to ${gateLabel}`;
    body = (
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "var(--ink-mid)", margin: 0, lineHeight: 1.5 }}>
        At current pace ({recentVelocity.toFixed(1)} req/week), ready in{" "}
        <strong style={{ color: "var(--ink)" }}>~{weeksToReady} week{weeksToReady !== 1 ? "s" : ""}</strong>
        {" "}(est.{" "}
        {projectedReady.toLocaleDateString("en-US", { month: "short", year: "numeric" })}).
        {scheduleNote && <>{" "}{scheduleNote}</>}
      </p>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "4px",
        padding: "16px 20px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          marginBottom: "10px",
          flexWrap: "wrap",
        }}
      >
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
          {gateLabel} Projection
        </p>
        {statusLabel && (
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              fontWeight: 600,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: statusColor,
              backgroundColor: statusBg,
              border: `1px solid ${statusBorder}`,
              borderRadius: "3px",
              padding: "3px 10px",
              flexShrink: 0,
            }}
          >
            {statusLabel}
          </span>
        )}
      </div>
      {body}
      {actualLoiSubmittedDate && (
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "12px",
            color: "var(--teal)",
            margin: "8px 0 0",
          }}
        >
          {gateLabel} submitted {Math.floor((Date.now() - new Date(actualLoiSubmittedDate).getTime()) / 86_400_000)} days ago
        </p>
      )}
    </div>
  );
}

export default LoiProjectionWidget;
