"use client";

import { useEffect, useState, useTransition } from "react";
import { animate } from "framer-motion";
import {
  detailMicroMonoStyle,
  detailMonoLabelStyle,
  detailSurfaceCardStyle,
} from "./projectDetailStyles";
import { recalculateReadiness } from "@/actions/projects";
import { getCategoryLabel } from "@/lib/requirements/index";

type Props = {
  scoreBps: number;
  loiReady: boolean;
  categoryScores: Record<string, number>;
  dealType?: string;
  projectId: string;
  projectSlug: string;
  cachedScoreUpdatedAt: Date | null;
};


const CATEGORY_ORDER = [
  "contracts",
  "financial",
  "studies",
  "environmental_social",
  "corporate",
  "permits",
] as const;

function scoreColor(bps: number): string {
  if (bps >= 7500) return "var(--teal)";
  if (bps >= 4000) return "var(--gold)";
  return "var(--accent)";
}

function getRelativeTime(date: Date | null): string {
  if (!date) return "Never";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? "s" : ""} ago`;
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

export function ReadinessGaugeClient({ scoreBps, loiReady, categoryScores, dealType, projectId, projectSlug, cachedScoreUpdatedAt }: Props) {
  const isExim = !dealType || dealType === "exim_project_finance";
  const [displayed, setDisplayed] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setMounted(true);
    const controls = animate(displayed, scoreBps, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (value) => setDisplayed(Math.round(value)),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoreBps]);

  const pct = displayed / 100;
  const finalPct = scoreBps / 100;
  const color = scoreColor(displayed);
  const orderedCategoryScores = CATEGORY_ORDER
    .map((key) => ({
      key,
      label: getCategoryLabel(key),
      scoreBps: categoryScores[key],
    }))
    .filter((entry) => typeof entry.scoreBps === "number");
  const strongestCategory =
    orderedCategoryScores.length > 0
      ? [...orderedCategoryScores].sort((a, b) => b.scoreBps - a.scoreBps)[0]
      : null;
  const weakestCategory =
    orderedCategoryScores.length > 0
      ? [...orderedCategoryScores].sort((a, b) => a.scoreBps - b.scoreBps)[0]
      : null;

  return (
    <div
      style={{
        ...detailSurfaceCardStyle("4px"),
        padding: "32px 36px",
        marginBottom: "32px",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "24px",
        }}
      >
        {/* Radial gauge */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
          <svg width="160" height="160" viewBox="0 0 160 160" aria-label={`Readiness score: ${pct.toFixed(1)} percent`}>
            {/* Background track */}
            <circle
              cx="80" cy="80" r="68"
              fill="none"
              stroke="var(--border)"
              strokeWidth="8"
            />
            {/* Progress arc */}
            <circle
              cx="80" cy="80" r="68"
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${mounted ? (finalPct / 100) * 427.3 : 0} 427.3`}
              transform="rotate(-90 80 80)"
              style={{ transition: "stroke-dasharray 0.9s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.3s ease" }}
            />
            {/* Center text */}
            <text
              x="80" y="72"
              textAnchor="middle"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "36px", fill: color }}
            >
              {pct.toFixed(1)}
            </text>
            <text
              x="80" y="96"
              textAnchor="middle"
              style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", fill: "var(--ink-muted)" }}
            >
              READINESS
            </text>
          </svg>
        </div>

        {/* LOI badge — centered */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
          <span
            style={{
              ...detailMonoLabelStyle,
              fontSize: "10px",
              letterSpacing: "0.10em",
              color: loiReady ? "var(--teal)" : "var(--gold)",
              backgroundColor: loiReady ? "var(--teal-soft)" : "var(--gold-soft)",
              padding: "4px 10px",
              borderRadius: "2px",
            }}
          >
            {isExim ? (loiReady ? "LOI Ready" : "LOI Pending") : (loiReady ? "Gate Ready" : "Gate Pending")}
          </span>
        </div>

        {/* Stat cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "12px",
          }}
        >
          {[
            {
              label: "Gate status",
              value: loiReady ? "LOI ready" : "LOI pending",
              tone: loiReady ? "var(--teal)" : "var(--gold)",
            },
            {
              label: "Strongest category",
              value: strongestCategory ? `${strongestCategory.label} ${(strongestCategory.scoreBps / 100).toFixed(0)}%` : "—",
              tone: strongestCategory ? "var(--teal)" : "var(--ink-muted)",
            },
            {
              label: "Weakest category",
              value: weakestCategory ? `${weakestCategory.label} ${(weakestCategory.scoreBps / 100).toFixed(0)}%` : "—",
              tone: weakestCategory ? "var(--accent)" : "var(--ink-muted)",
            },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                padding: "12px 14px",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                backgroundColor: "color-mix(in srgb, var(--bg) 68%, var(--bg-card))",
              }}
            >
              <p
                style={{
                  ...detailMonoLabelStyle,
                  margin: "0 0 8px",
                }}
              >
                {item.label}
              </p>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "13px",
                  fontWeight: 600,
                  lineHeight: 1.45,
                  color: item.tone,
                  margin: 0,
                }}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* Category breakdown bars */}
        {orderedCategoryScores.length > 0 ? (
          <div style={{ display: "grid", gap: "10px" }}>
            {orderedCategoryScores.map((entry) => (
              <div key={entry.key} style={{ display: "grid", gap: "5px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                  }}
                >
                  <span
                    style={{
                      ...detailMonoLabelStyle,
                      letterSpacing: "0.10em",
                    }}
                  >
                    {entry.label}
                  </span>
                  <span
                    style={{
                      ...detailMicroMonoStyle,
                      fontWeight: 400,
                      textTransform: "none",
                      color: "var(--ink-mid)",
                    }}
                  >
                    {(entry.scoreBps / 100).toFixed(0)}%
                  </span>
                </div>
                <div
                  style={{
                    height: "3px",
                    backgroundColor: "var(--border)",
                    borderRadius: "2px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: mounted ? `${entry.scoreBps / 100}%` : "0%",
                      backgroundColor: "var(--teal)",
                      borderRadius: "2px",
                      transition: "width 0.9s cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Recalculate button + timestamp */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "space-between" }}>
          <span
            style={{
              ...detailMicroMonoStyle,
              color: "var(--ink-muted)",
            }}
          >
            Last updated: {getRelativeTime(cachedScoreUpdatedAt)}
          </span>
          <button
            aria-label="Recalculate readiness score"
            onClick={() => {
              startTransition(async () => {
                await recalculateReadiness(projectId, projectSlug);
              });
            }}
            disabled={isPending}
            style={{
              padding: "6px 12px",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              border: "1px solid var(--border)",
              borderRadius: "4px",
              backgroundColor: isPending ? "var(--bg-card)" : "var(--bg)",
              color: isPending ? "var(--ink-muted)" : "var(--ink)",
              cursor: isPending ? "default" : "pointer",
              opacity: isPending ? 0.6 : 1,
              transition: "all 0.2s ease",
            }}
          >
            {isPending ? "Calculating..." : "Recalculate"}
          </button>
        </div>
      </div>

      {scoreBps === 0 && (
        <div
          style={{
            marginTop: "16px",
            padding: "12px 14px",
            borderRadius: "8px",
            backgroundColor: "color-mix(in srgb, var(--accent) 6%, var(--bg))",
            border: "1px solid color-mix(in srgb, var(--accent) 20%, var(--border))",
          }}
        >
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--accent)",
              margin: "0 0 4px",
            }}
          >
            Starting point
          </p>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "12px",
              color: "var(--ink-mid)",
              lineHeight: 1.55,
              margin: 0,
            }}
          >
            Your score starts at 0% — this is your baseline, not a problem with your deal. Work through the Workplan below and mark requirements as they progress.
          </p>
        </div>
      )}
    </div>
  );
}
