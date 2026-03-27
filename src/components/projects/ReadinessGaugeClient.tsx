"use client";

import { useEffect, useState, useRef } from "react";

type Props = {
  scoreBps: number;
  loiReady: boolean;
  categoryScores: Record<string, number>;
};

const CATEGORY_LABELS: Record<string, string> = {
  contracts: "Contracts",
  financial: "Financial",
  studies: "Studies",
  permits: "Permits",
  corporate: "Corporate",
  environmental_social: "E&S",
};

function scoreColor(bps: number): string {
  if (bps >= 7500) return "var(--teal)";
  if (bps >= 4000) return "var(--gold)";
  return "var(--accent)";
}

const DURATION = 900; // ms

export function ReadinessGaugeClient({ scoreBps, loiReady, categoryScores }: Props) {
  const [displayed, setDisplayed] = useState(0);
  const [mounted, setMounted] = useState(false);
  const startTime = useRef<number | null>(null);
  const raf = useRef<number | null>(null);

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

  return (
    <div
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "4px",
        padding: "40px 48px",
        marginBottom: "32px",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "64px" }}>
        {/* Score */}
        <div style={{ minWidth: "180px" }}>
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--ink-muted)",
              margin: "0 0 8px",
            }}
          >
            Readiness Score
          </p>
          <p
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: "72px",
              fontWeight: 400,
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
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                fontWeight: 500,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: loiReady ? "var(--teal)" : "var(--gold)",
                backgroundColor: loiReady ? "var(--teal-soft)" : "var(--gold-soft)",
                padding: "4px 10px",
                borderRadius: "2px",
              }}
            >
              {loiReady ? "LOI Ready" : "LOI Pending"}
            </span>
          </div>
        </div>

        {/* Progress bar + category breakdown */}
        <div style={{ flex: 1 }}>
          {/* Overall bar */}
          <div style={{ marginBottom: "32px" }}>
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

          {/* Category breakdown */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "20px 32px",
            }}
          >
            {Object.entries(categoryScores).map(([cat, bps]) => {
              const catPct = bps / 100;
              const catColor = scoreColor(bps);
              return (
                <div key={cat}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "6px",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "10px",
                        letterSpacing: "0.10em",
                        textTransform: "uppercase",
                        color: "var(--ink-muted)",
                      }}
                    >
                      {CATEGORY_LABELS[cat] ?? cat}
                    </span>
                    <span
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "10px",
                        fontWeight: 500,
                        color: catColor,
                      }}
                    >
                      {catPct.toFixed(0)}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: "3px",
                      backgroundColor: "var(--bg)",
                      borderRadius: "2px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: mounted ? `${catPct}%` : "0%",
                        backgroundColor: catColor,
                        borderRadius: "2px",
                        transition: "width 0.9s cubic-bezier(0.16, 1, 0.3, 1)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
