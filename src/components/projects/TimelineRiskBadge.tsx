"use client";

import { Badge } from "@/components/ui/badge";
import type { TimelineRisk } from "@/lib/db/timeline-risks";

type Props = {
  risks: TimelineRisk[];
};

export function TimelineRiskBadge({ risks }: Props) {
  if (risks.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "8px",
        marginBottom: "20px",
      }}
    >
      {risks.map((risk, index) => (
        <Badge
          key={`${risk.type}-${risk.entityId ?? index}`}
          variant={risk.severity === "critical" ? "destructive" : "outline"}
          style={
            risk.severity === "warning"
              ? { backgroundColor: "var(--gold-soft)", color: "var(--gold)", borderColor: "var(--gold)" }
              : undefined
          }
        >
          {risk.label}
        </Badge>
      ))}
    </div>
  );
}
