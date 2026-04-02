"use client";

import { useState } from "react";
import Link from "next/link";
import type { CategoryBreakdown } from "@/lib/db/requirements";
import type { GateCheckResult } from "@/lib/projects/stage-gate";
import type { ProjectOperatingMetrics } from "@/lib/projects/operating-metrics";
import { StageGateModal } from "@/components/projects/StageGateModal";
import { ReadinessBreakdown } from "@/components/projects/ReadinessBreakdown";

type DecisionDeskProps = {
  projectSlug: string;
  projectName: string;
  dealTypeLabel: string;
  currentStageLabel: string;
  nextGateLabel: string;
  readinessPct: number;
  gateReviewSummary: string;
  gateReviewStatus: "ready" | "at_risk" | "blocked";
  gateReviewTone: string;
  targetGateLabel: string;
  daysToNextGate: number | null;
  categoryBreakdown: CategoryBreakdown[];
  metrics: ProjectOperatingMetrics;
  gateResult: GateCheckResult;
};

function formatGateDateLabel(targetGateLabel: string, daysToNextGate: number | null): string {
  if (daysToNextGate === null) return `${targetGateLabel} not set`;
  if (daysToNextGate < 0) return `${targetGateLabel} passed ${Math.abs(daysToNextGate)}d ago`;
  if (daysToNextGate === 0) return `${targetGateLabel} today`;
  return `${targetGateLabel} in ${daysToNextGate}d`;
}

function ctaStyle(primary?: boolean): React.CSSProperties {
  return {
    fontFamily: "'DM Mono', monospace",
    fontSize: "10px",
    fontWeight: 500,
    letterSpacing: "0.10em",
    textTransform: "uppercase",
    textDecoration: "none",
    borderRadius: "999px",
    padding: "9px 14px",
    border: primary ? "none" : "1px solid var(--border)",
    color: primary ? "#ffffff" : "var(--ink)",
    backgroundColor: primary ? "var(--accent)" : "var(--bg-card)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  };
}

export function DecisionDesk({
  projectSlug,
  projectName,
  dealTypeLabel,
  currentStageLabel,
  nextGateLabel,
  readinessPct,
  gateReviewSummary,
  gateReviewStatus,
  gateReviewTone,
  targetGateLabel,
  daysToNextGate,
  categoryBreakdown,
  metrics,
  gateResult,
}: DecisionDeskProps) {
  const [isGateModalOpen, setIsGateModalOpen] = useState(false);

  const blockerPreview = metrics.hardBlockers.slice(0, 3);
  const decisionLabel =
    gateReviewStatus === "ready"
      ? "Ready to advance"
      : gateReviewStatus === "at_risk"
        ? "Needs attention"
        : "Blocked";

  return (
    <div style={{ display: "grid", gap: "18px", marginBottom: "28px" }}>
      <div
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "22px 24px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "18px",
            flexWrap: "wrap",
            marginBottom: "18px",
          }}
        >
          <div style={{ maxWidth: "760px" }}>
            <p className="eyebrow" style={{ marginBottom: "8px" }}>
              Decision Desk
            </p>
            <h2
              style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: "28px",
                fontWeight: 400,
                color: gateReviewTone,
                margin: "0 0 8px",
              }}
            >
              {decisionLabel}
            </h2>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "14px",
                color: "var(--ink-mid)",
                lineHeight: 1.65,
                margin: 0,
              }}
            >
              {projectName} is currently in {currentStageLabel} on the {dealTypeLabel} path. The next decision is {nextGateLabel}. {gateReviewSummary}
            </p>
          </div>

          <div
            style={{
              padding: "8px 10px",
              borderRadius: "999px",
              border: `1px solid ${gateReviewTone}`,
              color: gateReviewTone,
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.10em",
              textTransform: "uppercase",
            }}
          >
            {formatGateDateLabel(targetGateLabel, daysToNextGate)}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: "14px",
            marginBottom: "18px",
          }}
        >
          {[
            {
              label: "Gate blockers",
              value: String(metrics.hardBlockerCount),
              detail:
                metrics.hardBlockerCount > 0
                  ? `${metrics.softBlockerCount} softer risks behind them`
                  : "No hard blockers in the current gate review",
              tone: metrics.hardBlockerCount > 0 ? "var(--accent)" : "var(--teal)",
            },
            {
              label: "Owner gaps",
              value: String(metrics.unassignedCriticalCount),
              detail:
                metrics.unassignedCriticalCount > 0
                  ? "Gate-critical items without an accountable owner"
                  : "All critical items have ownership assigned",
              tone: metrics.unassignedCriticalCount > 0 ? "var(--gold)" : "var(--teal)",
            },
            {
              label: "Evidence gaps",
              value: String(metrics.missingEvidenceCount),
              detail:
                metrics.missingEvidenceCount > 0
                  ? `${metrics.expiringEvidenceCount} documents expiring in 90 days`
                  : "Every requirement has at least one linked current document",
              tone: metrics.missingEvidenceCount > 0 ? "var(--gold)" : "var(--teal)",
            },
            {
              label: "Readiness",
              value: `${readinessPct.toFixed(1)}%`,
              detail: `${metrics.doneCount} requirements already in a done state`,
              tone: "var(--ink)",
            },
          ].map((card) => (
            <div
              key={card.label}
              style={{
                backgroundColor: "color-mix(in srgb, var(--bg) 50%, var(--bg-card))",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "16px 18px",
              }}
            >
              <p
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--ink-muted)",
                  margin: "0 0 8px",
                }}
              >
                {card.label}
              </p>
              <p
                style={{
                  fontFamily: "'DM Serif Display', Georgia, serif",
                  fontSize: "30px",
                  lineHeight: 1,
                  color: card.tone,
                  margin: "0 0 8px",
                }}
              >
                {card.value}
              </p>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "13px",
                  lineHeight: 1.55,
                  color: "var(--ink-mid)",
                  margin: 0,
                }}
              >
                {card.detail}
              </p>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <button type="button" onClick={() => setIsGateModalOpen(true)} style={ctaStyle(true)}>
            Review Gate
          </button>
          <Link href={`/projects/${projectSlug}#section-workplan`} style={ctaStyle()}>
            Open Workplan
          </Link>
          <Link href={`/projects/${projectSlug}#section-documents`} style={ctaStyle()}>
            Open Evidence
          </Link>
          <Link href={`/projects/${projectSlug}#section-capital`} style={ctaStyle()}>
            Review Capital
          </Link>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.3fr) minmax(300px, 0.9fr)",
          gap: "18px",
          alignItems: "start",
        }}
      >
        <ReadinessBreakdown breakdown={categoryBreakdown} />

        <div
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "20px 22px",
          }}
        >
          <p className="eyebrow" style={{ marginBottom: "8px" }}>
            Top blockers
          </p>
          <h3
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: "22px",
              fontWeight: 400,
              color: "var(--ink)",
              margin: "0 0 10px",
            }}
          >
            What needs action now
          </h3>
          <div style={{ display: "grid", gap: "10px" }}>
            {blockerPreview.length > 0 ? (
              blockerPreview.map((blocker) => (
                <Link
                  key={blocker.requirementId}
                  href={`/projects/${projectSlug}#section-requirements`}
                  style={{
                    display: "grid",
                    gap: "4px",
                    textDecoration: "none",
                    padding: "12px 14px",
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    backgroundColor: "color-mix(in srgb, var(--accent) 4%, var(--bg-card))",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "9px",
                      letterSpacing: "0.10em",
                      textTransform: "uppercase",
                      color: "var(--accent)",
                    }}
                  >
                    {blocker.category.replace(/_/g, " ")}
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
                    {blocker.name}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "12px",
                      color: "var(--ink-mid)",
                    }}
                  >
                    Current status: {blocker.status.replace(/_/g, " ")}
                  </span>
                </Link>
              ))
            ) : (
              <div
                style={{
                  padding: "12px 14px",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  backgroundColor: "color-mix(in srgb, var(--teal) 4%, var(--bg-card))",
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "13px",
                  color: "var(--ink-mid)",
                  lineHeight: 1.55,
                }}
              >
                No hard blockers are currently preventing the next gate. Review softer risks before advancing.
              </div>
            )}
          </div>
        </div>
      </div>

      <StageGateModal
        open={isGateModalOpen}
        targetStageLabel={nextGateLabel}
        gateResult={gateResult}
        onConfirm={() => setIsGateModalOpen(false)}
        onCancel={() => setIsGateModalOpen(false)}
      />
    </div>
  );
}
