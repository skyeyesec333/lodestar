import Link from "next/link";

type EvidenceGapItem = {
  requirementId: string;
  name: string;
  category: string;
  isPrimaryGate: boolean;
};

type EvidenceActionBoardProps = {
  projectSlug: string;
  linkedCoveragePct: number;
  missingEvidenceCount: number;
  orphanedEvidenceCount: number;
  expiringEvidenceCount: number;
  criticalCoverageLabel: string;
  topGaps: EvidenceGapItem[];
};

function formatCategory(category: string): string {
  return category.replace(/_/g, " ");
}

export function EvidenceActionBoard({
  projectSlug,
  linkedCoveragePct,
  missingEvidenceCount,
  orphanedEvidenceCount,
  expiringEvidenceCount,
  criticalCoverageLabel,
  topGaps,
}: EvidenceActionBoardProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.1fr) minmax(280px, 0.9fr)",
        gap: "18px",
        marginBottom: "20px",
      }}
    >
      <section
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          padding: "18px 20px",
        }}
      >
        <p className="eyebrow" style={{ marginBottom: "8px" }}>
          Proof gaps
        </p>
        <h3
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: "24px",
            fontWeight: 400,
            color: "var(--ink)",
            margin: "0 0 8px",
          }}
        >
          What still needs evidence
        </h3>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "14px",
            color: "var(--ink-mid)",
            lineHeight: 1.6,
            margin: "0 0 14px",
          }}
        >
          Push proof coverage before adding more files. The highest-value next move is linking evidence to the next gate’s weak requirements.
        </p>

        <div style={{ display: "grid", gap: "10px" }}>
          {topGaps.length > 0 ? (
            topGaps.map((item) => (
              <Link
                key={item.requirementId}
                href={`/projects/${projectSlug}/workplan`}
                style={{
                  display: "grid",
                  gap: "4px",
                  textDecoration: "none",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  border: "1px solid var(--border)",
                  backgroundColor: item.isPrimaryGate
                    ? "color-mix(in srgb, var(--accent) 5%, var(--bg-card))"
                    : "color-mix(in srgb, var(--gold) 5%, var(--bg-card))",
                }}
              >
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "9px",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: item.isPrimaryGate ? "var(--accent)" : "var(--gold)",
                  }}
                >
                  {formatCategory(item.category)}
                  {item.isPrimaryGate ? " · gate critical" : ""}
                </span>
                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "13px",
                    fontWeight: 600,
                    lineHeight: 1.45,
                    color: "var(--ink)",
                  }}
                >
                  {item.name}
                </span>
              </Link>
            ))
          ) : (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                backgroundColor: "color-mix(in srgb, var(--teal) 5%, var(--bg-card))",
                fontFamily: "'Inter', sans-serif",
                fontSize: "13px",
                color: "var(--ink-mid)",
              }}
            >
              Every applicable requirement currently has at least one linked proof source.
            </div>
          )}
        </div>
      </section>

      <section
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          padding: "18px 20px",
        }}
      >
        <p className="eyebrow" style={{ marginBottom: "10px" }}>
          Evidence posture
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "12px",
            marginBottom: "12px",
          }}
        >
          {[
            { label: "Linked coverage", value: `${linkedCoveragePct}%`, tone: "var(--teal)" },
            { label: "Missing proof", value: String(missingEvidenceCount), tone: "var(--accent)" },
            { label: "Unlinked sources", value: String(orphanedEvidenceCount), tone: "var(--gold)" },
            { label: "Expiring soon", value: String(expiringEvidenceCount), tone: "var(--gold)" },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                borderRadius: "12px",
                border: "1px solid var(--border)",
                padding: "12px 14px",
                backgroundColor: "color-mix(in srgb, var(--bg) 55%, var(--bg-card))",
              }}
            >
              <p
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "9px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--ink-muted)",
                  margin: "0 0 8px",
                }}
              >
                {item.label}
              </p>
              <p
                style={{
                  fontFamily: "'DM Serif Display', Georgia, serif",
                  fontSize: "28px",
                  lineHeight: 1,
                  color: item.tone,
                  margin: 0,
                }}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "13px",
            lineHeight: 1.6,
            color: "var(--ink-mid)",
            margin: 0,
          }}
        >
          {criticalCoverageLabel}
        </p>
      </section>
    </div>
  );
}
