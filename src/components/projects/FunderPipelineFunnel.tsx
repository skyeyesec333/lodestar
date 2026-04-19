"use client";

import { useMemo } from "react";
import { ResponsiveFunnel } from "@nivo/funnel";
import type { FunderRelationshipRow } from "@/lib/db/funders";
import { getNivoTheme, useChartTheme } from "@/components/charts/theme";

type EngagementStage =
  | "identified"
  | "initial_contact"
  | "due_diligence"
  | "term_sheet"
  | "committed";

const FUNNEL_STAGES: { id: EngagementStage; label: string }[] = [
  { id: "identified",      label: "Identified" },
  { id: "initial_contact", label: "In Contact" },
  { id: "due_diligence",   label: "Due Diligence" },
  { id: "term_sheet",      label: "Term Sheet" },
  { id: "committed",       label: "Committed" },
];

type Props = {
  funders: FunderRelationshipRow[];
};

export function FunderPipelineFunnel({ funders }: Props) {
  const theme = useChartTheme();

  const data = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of funders) {
      if (f.engagementStage === "declined") continue;
      counts.set(f.engagementStage, (counts.get(f.engagementStage) ?? 0) + 1);
    }
    return FUNNEL_STAGES.map((s) => ({
      id: s.id,
      value: counts.get(s.id) ?? 0,
      label: s.label,
    }));
  }, [funders]);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return (
      <div
        style={{
          border: "1px dashed var(--border)",
          borderRadius: "3px",
          padding: "40px 16px",
          textAlign: "center",
          color: "var(--ink-muted)",
          fontFamily: "'Inter', sans-serif",
          fontSize: "13px",
        }}
      >
        No funders in pipeline yet.
      </div>
    );
  }

  const colors = [theme.textMuted, theme.accent, theme.gold, theme.teal, theme.teal];

  return (
    <div style={{ height: 400, width: "100%" }}>
      <ResponsiveFunnel
        data={data}
        direction="horizontal"
        valueFormat={(v) => `${v}`}
        colors={colors}
        borderWidth={20}
        borderColor={{ from: "color", modifiers: [["darker", 0.3]] }}
        labelColor={theme.text}
        beforeSeparatorLength={40}
        beforeSeparatorOffset={12}
        afterSeparatorLength={40}
        afterSeparatorOffset={12}
        currentPartSizeExtension={6}
        currentBorderWidth={30}
        motionConfig="gentle"
        theme={getNivoTheme(theme)}
        margin={{ top: 20, right: 20, bottom: 40, left: 20 }}
      />
    </div>
  );
}
