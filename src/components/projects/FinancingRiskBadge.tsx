"use client";

import { useState } from "react";
import Link from "next/link";
import type { FinancingRisk } from "@/lib/scoring/financing";
import { Badge } from "@/components/ui/badge";
import React from "react";

type Props = {
  risk: FinancingRisk;
  projectSlug?: string;
};

type BadgeColors = {
  badgeStyle: React.CSSProperties;
  flagColor: string;
};

const BADGE_COLORS: Record<Exclude<FinancingRisk["level"], "none">, BadgeColors> = {
  low: {
    badgeStyle: { backgroundColor: "var(--gold-soft)", color: "var(--gold)", borderColor: "var(--gold)" },
    flagColor: "var(--gold)",
  },
  medium: {
    badgeStyle: { backgroundColor: "var(--gold-soft)", color: "var(--gold)", borderColor: "var(--gold)" },
    flagColor: "var(--gold)",
  },
  high: {
    badgeStyle: { backgroundColor: "var(--accent-soft)", color: "var(--accent)", borderColor: "var(--accent)" },
    flagColor: "var(--accent)",
  },
};

const FLAG_ACTIONS: Record<string, { action: string; segment: string }> = {
  "Active covenant breach": {
    action: "Review covenants in the Capital workspace",
    segment: "capital",
  },
  "Covenant at risk": {
    action: "Check covenant due dates in the Capital workspace",
    segment: "capital",
  },
  "Debt coverage below 50%": {
    action: "Add or update debt tranches in the Capital workspace",
    segment: "capital",
  },
  "Debt not yet committed": {
    action: "Advance tranche status from term sheet to committed",
    segment: "capital",
  },
};

export function FinancingRiskBadge({ risk, projectSlug }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (risk.level === "none") return null;

  const colors = BADGE_COLORS[risk.level];

  return (
    <div style={{ marginBottom: "16px" }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: "pointer", display: "inline-block" }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setExpanded(!expanded); }}
      >
        <Badge
          variant="outline"
          style={{ fontFamily: "'DM Mono', monospace", letterSpacing: "0.05em", ...colors.badgeStyle }}
        >
          Financing Risk: {risk.level} {expanded ? "▾" : "▸"}
        </Badge>
      </div>

      {!expanded && risk.flags.length > 0 && (
        <ul
          style={{
            margin: "6px 0 0 2px",
            padding: 0,
            listStyle: "none",
            display: "flex",
            flexWrap: "wrap",
            gap: "6px",
          }}
        >
          {risk.flags.map((flag) => (
            <li
              key={flag}
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "11px",
                color: colors.flagColor,
              }}
            >
              · {flag}
            </li>
          ))}
        </ul>
      )}

      {expanded && (
        <div
          style={{
            marginTop: "8px",
            border: `1px solid ${risk.level === "high" ? "var(--accent)" : "var(--gold)"}`,
            borderRadius: "10px",
            padding: "14px 16px",
            backgroundColor: risk.level === "high" ? "var(--accent-soft)" : "var(--gold-soft)",
          }}
        >
          {/* Penalty display */}
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.06em",
              color: colors.flagColor,
              margin: "0 0 10px",
            }}
          >
            Readiness penalty: −{(risk.penaltyBps / 100).toFixed(0)} bps
          </p>

          {/* Flags with actions */}
          {risk.flags.map((flag) => {
            const info = FLAG_ACTIONS[flag];
            return (
              <div
                key={flag}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                  marginBottom: "8px",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: colors.flagColor,
                    flexShrink: 0,
                  }}
                >
                  {flag}
                </span>
                {info && projectSlug && (
                  <>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "var(--ink-muted)" }}>→</span>
                    <Link
                      href={`/projects/${projectSlug}/${info.segment}`}
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "12px",
                        color: "var(--ink)",
                        textDecoration: "underline",
                        textDecorationColor: "var(--border)",
                        textUnderlineOffset: "2px",
                      }}
                    >
                      {info.action}
                    </Link>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
