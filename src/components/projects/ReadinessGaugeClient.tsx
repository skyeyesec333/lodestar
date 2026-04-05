"use client";

import { useEffect, useState, useRef, useTransition } from "react";
import {
  detailMicroMonoStyle,
  detailMonoLabelStyle,
  detailSerifTitleStyle,
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

const DURATION = 900; // ms

export function ReadinessGaugeClient({ scoreBps, loiReady, categoryScores, dealType, projectId, projectSlug, cachedScoreUpdatedAt }: Props) {
  const isExim = !dealType || dealType === "exim_project_finance";
  const [displayed, setDisplayed] = useState(0);
  const [mounted, setMounted] = useState(false);
  const startTime = useRef<number | null>(null);
  const raf = useRef<number | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setMounted(true);
    const animate = (ts: number) => {
      if (startTime.current === null) startTime.current = ts;
      const elapsed = ts - startTime.current;
      const progress = Math.min(elapsed / DURATION, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(scoreBps * eased));
      if (progress < 1) {
        raf.current = requestAnimationFrame(animate);
      }
    };
    raf.current = requestAnimationFrame(animate);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
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
          gridTemplateColumns: "minmax(180px, 280px) minmax(0, 1fr)",
          alignItems: "start",
          gap: "24px",
        }}
      >
        {/* Score */}
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              ...detailMonoLabelStyle,
              fontSize: "10px",
              margin: "0 0 8px",
            }}
          >
            Next Gate Readiness
          </p>
          <p
            style={{
              ...detailSerifTitleStyle("64px"),
              color,
              margin: "0 0 4px",
              lineHeight: 1,
              transition: "color 0.3s ease",
            }}
          >
            {pct.toFixed(1)}
            <span style={{ fontSize: "32px", color: "var(--ink-muted)" }}>%</span>
          </p>

          {/* LOI badge */}
          <div style={{ marginTop: "16px" }}>
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

          {orderedCategoryScores.length > 0 ? (
            <div style={{ marginTop: "20px", display: "grid", gap: "10px" }}>
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

          <div style={{ marginTop: "20px", display: "flex", alignItems: "center", gap: "10px", justifyContent: "space-between" }}>
            <span
              style={{
                ...detailMicroMonoStyle,
                color: "var(--ink-muted)",
              }}
            >
              Last updated: {getRelativeTime(cachedScoreUpdatedAt)}
            </span>
            <button
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

        {/* Progress bar */}
        <div style={{ display: "grid", gap: "14px", alignContent: "start" }}>
          <div>
            <div
              style={{
                height: "6px",
                backgroundColor: "var(--bg)",
                borderRadius: "3px",
                overflow: "hidden",
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: mounted ? `${finalPct}%` : "0%",
                  backgroundColor: scoreColor(scoreBps),
                  borderRadius: "3px",
                  transition: "width 0.9s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              />
            </div>
          </div>

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
