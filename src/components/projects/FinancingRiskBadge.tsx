import type { FinancingRisk } from "@/lib/scoring/financing";
import { Badge } from "@/components/ui/badge";
import React from "react";

type Props = {
  risk: FinancingRisk;
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

export function FinancingRiskBadge({ risk }: Props) {
  if (risk.level === "none") return null;

  const colors = BADGE_COLORS[risk.level];

  return (
    <div style={{ marginBottom: "16px" }}>
      <Badge
        variant="outline"
        style={{ fontFamily: "'DM Mono', monospace", letterSpacing: "0.05em", ...colors.badgeStyle }}
      >
        Financing Risk: {risk.level}
      </Badge>
      {risk.flags.length > 0 && (
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
    </div>
  );
}
