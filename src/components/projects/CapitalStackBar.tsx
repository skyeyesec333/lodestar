"use client";

import type { CSSProperties } from "react";

export type CapitalStackTranche = {
  relationshipId: string;
  organizationName: string;
  funderType: string;
  engagementStage: string;
  amountUsdCents: number | null;
  openConditionCount: number;
};

type CapitalStackBarProps = {
  tranches: CapitalStackTranche[];
  capexUsdCents: number | null;
};

// Funder type → segment color (solid fill, full opacity)
const SEGMENT_COLOR: Record<string, string> = {
  exim:            "var(--teal)",
  dfi:             "var(--gold)",
  commercial_bank: "var(--ink-mid)",
  equity:          "var(--equity)",
  mezzanine:       "var(--mezz)",
  other:           "var(--ink-muted)",
};

const SEGMENT_BG: Record<string, string> = {
  exim:            "var(--teal-soft)",
  dfi:             "var(--gold-soft)",
  commercial_bank: "var(--border)",
  equity:          "var(--equity-soft)",
  mezzanine:       "var(--mezz-soft)",
  other:           "var(--bg)",
};

const FUNDER_TYPE_LABELS: Record<string, string> = {
  exim:            "EXIM Bank",
  dfi:             "DFI",
  commercial_bank: "Commercial Bank",
  equity:          "Equity",
  mezzanine:       "Mezzanine",
  other:           "Other",
};

// Priority order for funder type sorting
const FUNDER_TYPE_PRIORITY: Record<string, number> = {
  exim: 0,
  dfi: 1,
  commercial_bank: 2,
  equity: 3,
  mezzanine: 4,
  other: 5,
};

// Opacity based on engagement stage
function stageOpacity(stage: string): number {
  if (stage === "committed" || stage === "term_sheet") return 1;
  if (stage === "declined") return 0.3;
  return 0.6;
}

function formatUsd(cents: number): string {
  const millions = cents / 100_000_000;
  if (millions >= 1) return `$${millions.toFixed(0)}M`;
  const thousands = cents / 100_000;
  if (thousands >= 1) return `$${thousands.toFixed(0)}K`;
  return `$${(cents / 100).toFixed(0)}`;
}

export function CapitalStackBar({ tranches, capexUsdCents }: CapitalStackBarProps) {
  if (tranches.length === 0) return null;

  const sorted = [...tranches].sort(
    (a, b) => (FUNDER_TYPE_PRIORITY[a.funderType] ?? 99) - (FUNDER_TYPE_PRIORITY[b.funderType] ?? 99)
  );

  const withAmount = sorted.filter((t) => t.amountUsdCents != null && t.amountUsdCents > 0);
  const withoutAmount = sorted.filter((t) => t.amountUsdCents == null || t.amountUsdCents === 0);

  const allLackAmounts = withAmount.length === 0;
  const totalFunded = withAmount.reduce((sum, t) => sum + (t.amountUsdCents ?? 0), 0);
  const gap = capexUsdCents != null && totalFunded < capexUsdCents ? capexUsdCents - totalFunded : null;

  return (
    <div style={{ marginBottom: "24px" }}>
      {/* Section eyebrow */}
      <p style={eyebrowStyle}>Capital Stack</p>

      {/* Total / CAPEX context line */}
      {!allLackAmounts && (
        <p style={contextLineStyle}>
          {formatUsd(totalFunded)} committed
          {capexUsdCents != null && (
            <span style={{ color: "var(--ink-muted)" }}>
              {" "}/ {formatUsd(capexUsdCents)} CAPEX
            </span>
          )}
          {gap != null && gap > 0 && (
            <span style={{ color: "var(--accent)", marginLeft: "8px" }}>
              {formatUsd(gap)} gap
            </span>
          )}
        </p>
      )}

      {allLackAmounts && (
        <p style={advisoryStyle}>
          Add financing amounts to see a proportional capital stack.
        </p>
      )}

      {/* Bar */}
      <div
        style={{
          display: "flex",
          height: "52px",
          borderRadius: "4px",
          overflow: "hidden",
          border: "1px solid var(--border)",
        }}
      >
        {allLackAmounts
          ? // Equal-width qualitative view
            sorted.map((t) => (
              <SegmentCell
                key={t.relationshipId}
                tranche={t}
                flexValue={1}
                showCpBadge={t.openConditionCount > 0}
              />
            ))
          : // Proportional view
            withAmount.map((t) => (
              <SegmentCell
                key={t.relationshipId}
                tranche={t}
                flexValue={t.amountUsdCents!}
                showCpBadge={t.openConditionCount > 0}
              />
            ))}

        {/* Gap segment */}
        {!allLackAmounts && gap != null && gap > 0 && (
          <div
            style={{
              flex: gap,
              minWidth: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px dashed var(--border)",
              backgroundColor: "transparent",
              padding: "0 6px",
              overflow: "hidden",
            }}
          >
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "9px",
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink-muted)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              Gap {formatUsd(gap)}
            </span>
          </div>
        )}
      </div>

      {/* Unallocated chips */}
      {!allLackAmounts && withoutAmount.length > 0 && (
        <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
          <span style={{ ...eyebrowStyle, margin: 0, marginRight: "4px" }}>Unallocated:</span>
          {withoutAmount.map((t) => (
            <span
              key={t.relationshipId}
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "9px",
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: SEGMENT_COLOR[t.funderType] ?? "var(--ink-muted)",
                border: `1px solid ${SEGMENT_COLOR[t.funderType] ?? "var(--border)"}`,
                borderRadius: "100px",
                padding: "3px 8px",
                opacity: stageOpacity(t.engagementStage),
              }}
            >
              {t.organizationName}
            </span>
          ))}
        </div>
      )}

      {/* Legend */}
      <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "12px" }}>
        {(allLackAmounts ? sorted : withAmount).map((t) => (
          <div key={t.relationshipId} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "2px",
                backgroundColor: SEGMENT_BG[t.funderType] ?? "var(--bg)",
                border: `1px solid ${SEGMENT_COLOR[t.funderType] ?? "var(--border)"}`,
                opacity: stageOpacity(t.engagementStage),
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "9px",
                letterSpacing: "0.06em",
                color: "var(--ink-muted)",
                whiteSpace: "nowrap",
              }}
            >
              {t.organizationName}
              {t.amountUsdCents != null && ` · ${formatUsd(t.amountUsdCents)}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Segment cell ──────────────────────────────────────────────────────────────

function SegmentCell({
  tranche,
  flexValue,
  showCpBadge,
}: {
  tranche: CapitalStackTranche;
  flexValue: number;
  showCpBadge: boolean;
}) {
  const bg = SEGMENT_BG[tranche.funderType] ?? "var(--bg)";
  const borderColor = SEGMENT_COLOR[tranche.funderType] ?? "var(--border)";
  const opacity = stageOpacity(tranche.engagementStage);
  const isDeclined = tranche.engagementStage === "declined";

  return (
    <div
      title={`${tranche.organizationName} · ${FUNDER_TYPE_LABELS[tranche.funderType] ?? tranche.funderType}${tranche.amountUsdCents != null ? " · " + formatUsd(tranche.amountUsdCents) : ""}${tranche.openConditionCount > 0 ? ` · ${tranche.openConditionCount} open CP${tranche.openConditionCount !== 1 ? "s" : ""}` : ""}`}
      style={{
        flex: flexValue,
        minWidth: "32px",
        position: "relative",
        backgroundColor: bg,
        borderRight: `1px solid var(--border)`,
        opacity,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "4px 8px",
        overflow: "hidden",
        ...(isDeclined ? { backgroundImage: "repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(0,0,0,0.05) 4px, rgba(0,0,0,0.05) 8px)" } : {}),
      }}
    >
      {/* Org name */}
      <span
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "9px",
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: borderColor,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          lineHeight: 1.3,
        }}
      >
        {tranche.organizationName}
      </span>

      {/* Amount */}
      {tranche.amountUsdCents != null && (
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "9px",
            letterSpacing: "0.04em",
            color: "var(--ink-mid)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            lineHeight: 1.3,
          }}
        >
          {formatUsd(tranche.amountUsdCents)}
        </span>
      )}

      {/* Open CP badge */}
      {showCpBadge && (
        <span
          style={{
            position: "absolute",
            bottom: "3px",
            right: "4px",
            fontFamily: "'DM Mono', monospace",
            fontSize: "8px",
            fontWeight: 600,
            color: "var(--accent)",
            backgroundColor: "var(--accent-soft)",
            border: "1px solid var(--accent)",
            borderRadius: "100px",
            padding: "1px 4px",
            lineHeight: 1.4,
            whiteSpace: "nowrap",
          }}
        >
          {tranche.openConditionCount} CP
        </span>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const eyebrowStyle: CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "9px",
  fontWeight: 500,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--ink-muted)",
  margin: "0 0 8px",
};

const contextLineStyle: CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: "12px",
  color: "var(--ink-mid)",
  margin: "0 0 10px",
};

const advisoryStyle: CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: "12px",
  color: "var(--ink-muted)",
  margin: "0 0 10px",
  fontStyle: "italic",
};
