"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ProjectRequirementRow } from "@/lib/db/requirements";
import type { RequirementStatusValue } from "@/types/requirements";
import { getProgramConfig, getCategoryLabel } from "@/lib/requirements";

// ─── Gantt tour (fullscreen only) ─────────────────────────────────────────────

type TourStep = { target: string; title: string; body: string; placement: "bottom" | "top" | "left" | "right" };
type TourRect = { top: number; left: number; width: number; height: number };

const GANTT_TOUR: TourStep[] = [
  { target: "[data-tour='gantt-density']",     title: "Density",          body: "Tight fits all 36 lanes in a compact view. Spacious gives you room to read every label.",                                                                                  placement: "bottom" },
  { target: "[data-tour='gantt-phase']",       title: "Phase filter",     body: "Filter requirements by phase to focus on what matters most at your current stage.",                                              placement: "bottom" },
  { target: "[data-tour='gantt-predictions']", title: "Predictions",      body: "Toggle the dashed future bands. They're calculated from your current status and LOI target — a best-case estimate of when each item will close.",                          placement: "bottom" },
  { target: "[data-tour='gantt-collapse']",    title: "Collapse",         body: "Press ESC or click Collapse to return to the project page. All your filter settings are preserved.",                                                                       placement: "bottom" },
];

function GanttTourGuide({ onClose, containerRef }: { onClose: () => void; containerRef: React.RefObject<HTMLDivElement | null> }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<TourRect | null>(null);

  const currentStep = GANTT_TOUR[step] ?? null;

  const measure = useCallback((target: string) => {
    // Scope to the fullscreen container so we don't accidentally find the hidden inline ControlBar
    const scope = containerRef.current ?? document;
    const el = scope.querySelector(target);
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [containerRef]);

  useEffect(() => {
    if (!currentStep) return;
    const t = setTimeout(() => measure(currentStep.target), 80);
    return () => clearTimeout(t);
  }, [step, currentStep, measure]);

  if (!currentStep) return null;

  const PAD = 10;
  const W   = 300;
  const vpW = typeof window !== "undefined" ? window.innerWidth : 1200;
  let calloutStyle: React.CSSProperties = {};
  if (rect) {
    switch (currentStep.placement) {
      case "bottom": calloutStyle = { top: rect.top + rect.height + PAD, left: Math.min(rect.left, vpW - W - 24), width: W }; break;
      case "top":    calloutStyle = { top: rect.top - 180, left: Math.min(rect.left, vpW - W - 24), width: W }; break;
      case "right":  calloutStyle = { top: rect.top + rect.height / 2 - 80, left: rect.left + rect.width + PAD, width: W }; break;
      case "left":   calloutStyle = { top: rect.top + rect.height / 2 - 80, left: rect.left - W - PAD, width: W }; break;
    }
  } else {
    calloutStyle = { top: "50%", left: "50%", width: W, transform: "translate(-50%,-50%)" };
  }

  function advance() {
    if (step >= GANTT_TOUR.length - 1) { onClose(); } else { setRect(null); setStep((s) => s + 1); }
  }

  return (
    <>
      {/* Dim overlay */}
      <motion.div
        key="gantt-tour-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 1100, backgroundColor: "rgba(0,0,0,0.52)", pointerEvents: "auto" }}
      />

      {/* Spotlight — springs to each target */}
      <AnimatePresence>
        {rect && (
          <motion.div
            key="gantt-spotlight"
            layoutId="gantt-spotlight"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            style={{
              position: "fixed",
              zIndex: 1101,
              top: rect.top - PAD,
              left: rect.left - PAD,
              width: rect.width + PAD * 2,
              height: rect.height + PAD * 2,
              borderRadius: "8px",
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.52), 0 0 0 2px var(--accent)",
              pointerEvents: "none",
            }}
          />
        )}
      </AnimatePresence>

      {/* Callout — fades and slides per step */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`gantt-callout-${step}`}
          initial={{ opacity: 0, y: 10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          style={{
            position: "fixed",
            zIndex: 1102,
            ...calloutStyle,
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "22px",
            boxShadow: "0 12px 40px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.12)",
          }}
        >
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--accent)", margin: "0 0 10px" }}>
            {step + 1} / {GANTT_TOUR.length}
          </p>
          <p style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "17px", color: "var(--ink)", margin: "0 0 8px", lineHeight: 1.25 }}>
            {currentStep.title}
          </p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "var(--ink-mid)", lineHeight: 1.65, margin: "0 0 18px" }}>
            {currentStep.body}
          </p>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              onClick={advance}
              style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--text-inverse)", backgroundColor: "var(--accent)", border: "none", borderRadius: "4px", padding: "8px 18px", cursor: "pointer", flex: 1, transition: "opacity 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              {step >= GANTT_TOUR.length - 1 ? "Done" : "Next →"}
            </button>
            <button
              onClick={onClose}
              style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--ink-muted)", backgroundColor: "transparent", border: "none", cursor: "pointer", padding: "8px 8px", transition: "color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ink)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-muted)")}
            >
              Skip
            </button>
          </div>
          <div style={{ display: "flex", gap: "5px", marginTop: "14px", justifyContent: "center" }}>
            {GANTT_TOUR.map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  width: i === step ? 18 : 5,
                  backgroundColor: i === step ? "var(--accent)" : "var(--border-strong)",
                }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                style={{ height: "5px", borderRadius: "3px" }}
              />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}

// ─── Domain constants ─────────────────────────────────────────────────────────

const CATEGORY_ORDER = [
  "contracts",
  "financial",
  "studies",
  "permits",
  "corporate",
  "environmental_social",
] as const;


// Theme-safe: accent colors that work across all themes.
// We deliberately avoid "var(--accent-soft)" for bar fills because on slate
// that resolves to a near-black. Use explicit rgba fallbacks instead.
const STATUS_BAR_COLORS: Record<RequirementStatusValue, string> = {
  not_started:         "var(--border-strong)",
  in_progress:         "var(--gold)",
  draft:               "var(--gold)",
  substantially_final: "var(--teal)",
  executed:            "var(--teal)",
  waived:              "var(--ink-muted)",
  not_applicable:      "var(--border)",
};

const STATUS_LABELS: Record<RequirementStatusValue, string> = {
  not_started:         "Not Started",
  in_progress:         "In Progress",
  draft:               "Draft",
  substantially_final: "Substantially Final",
  executed:            "Executed",
  waived:              "Waived",
  not_applicable:      "N/A",
};

const STATUS_PROGRESS: Record<RequirementStatusValue, number> = {
  not_started:         0,
  in_progress:         0.2,
  draft:               0.5,
  substantially_final: 0.9,
  executed:            1.0,
  waived:              1.0,
  not_applicable:      0,
};

// Density presets: [rowH, rowGap, catHeaderH, barPad, fontSize]
const DENSITY = {
  tight:    { rowH: 16, rowGap: 1, catH: 24, barPad: 3, labelSize: 9,  catSize: 8  },
  normal:   { rowH: 26, rowGap: 3, catH: 34, barPad: 5, labelSize: 11, catSize: 9  },
  spacious: { rowH: 38, rowGap: 5, catH: 44, barPad: 8, labelSize: 12, catSize: 10 },
} as const;

type DensityKey = keyof typeof DENSITY;

const LABEL_W    = 156;
const AXIS_H     = 34;   // space above rows for month labels + milestone ticks
const BOTTOM_PAD = 12;
const RIGHT_PAD  = 16;
const CHART_REF_W = 920; // viewBox reference width

// ─── Types ───────────────────────────────────────────────────────────────────

export type MilestoneMarker = {
  id: string;
  name: string;
  targetDate: Date | null;
  completedAt: Date | null;
};

export type GanttProps = {
  rows: ProjectRequirementRow[];
  projectCreatedAt: Date;
  targetLoiDate: Date | null;
  targetCloseDate?: Date | null;
  milestones?: MilestoneMarker[];
  dealType?: string;
};

type GanttRow =
  | { kind: "cat";  cat: string }
  | { kind: "req";  row: ProjectRequirementRow };

type Tooltip = { svgX: number; rowY: number; lines: string[] };

type Controls = {
  density:      DensityKey;
  showPredicted: boolean;
  filterPhase:  "all" | string;
  hideDone:     boolean;
  collapsedCats: Set<string>;
};

// ─── Prediction ───────────────────────────────────────────────────────────────

function predictCompletion(
  row: ProjectRequirementRow,
  today: Date,
  loiDate: Date | null,
  closeDate: Date | null,
): { start: Date; end: Date } | null {
  const progress = STATUS_PROGRESS[row.status as RequirementStatusValue];
  if (progress >= 1.0) return null;
  const remaining = 1 - progress;

  if (row.phaseRequired === "loi") {
    const deadline  = loiDate ?? new Date(today.getTime() + 120 * 864e5);
    const runwayMs  = Math.max(deadline.getTime() - today.getTime(), 7 * 864e5);
    const durMs     = Math.min(remaining * runwayMs * 0.75, runwayMs);
    const offsetMs  = row.isPrimaryGate ? 0 : runwayMs * 0.12 * (1 - progress);
    const start     = new Date(today.getTime() + offsetMs);
    const end       = new Date(start.getTime() + durMs);
    return { start, end: end > deadline ? deadline : end };
  } else {
    const afterLoi   = loiDate ? new Date(Math.max(loiDate.getTime(), today.getTime())) : today;
    const closeDeadline = closeDate ?? new Date(afterLoi.getTime() + 365 * 864e5);
    const runwayMs   = Math.max(closeDeadline.getTime() - afterLoi.getTime(), 14 * 864e5);
    const durMs      = remaining * runwayMs * 0.5;
    const offsetMs   = runwayMs * 0.05 * (1 - progress);
    const start      = new Date(afterLoi.getTime() + offsetMs);
    const end        = new Date(start.getTime() + durMs);
    return { start, end: end > closeDeadline ? closeDeadline : end };
  }
}

// ─── Controls bar ─────────────────────────────────────────────────────────────

function ControlBar({
  ctrl,
  setCtrl,
  fullscreen,
  onToggleFullscreen,
  projectName,
  phaseFilterOptions,
}: {
  ctrl: Controls;
  setCtrl: React.Dispatch<React.SetStateAction<Controls>>;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  projectName?: string;
  phaseFilterOptions: Array<[string, string]>;
}) {
  const btnBase: React.CSSProperties = {
    fontFamily: "'DM Mono', monospace",
    fontSize: "9px",
    fontWeight: 500,
    letterSpacing: "0.10em",
    textTransform: "uppercase",
    border: "1px solid var(--border)",
    borderRadius: "3px",
    padding: "4px 10px",
    cursor: "pointer",
    transition: "background 0.12s, color 0.12s, border-color 0.12s",
    whiteSpace: "nowrap" as const,
  };
  const active: React.CSSProperties = {
    backgroundColor: "var(--accent)",
    color: "var(--text-inverse)",
    borderColor: "var(--accent)",
  };
  const inactive: React.CSSProperties = {
    backgroundColor: "transparent",
    color: "var(--ink-muted)",
    borderColor: "var(--border)",
  };
  const hasCollapsedLanes = ctrl.collapsedCats.size > 0;
  const allLanesCollapsed = ctrl.collapsedCats.size === CATEGORY_ORDER.length;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        flexWrap: "wrap",
        paddingBottom: "14px",
        borderBottom: "1px solid var(--border)",
        marginBottom: "14px",
      }}
    >
      {fullscreen && projectName && (
        <span
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: "15px",
            color: "var(--ink)",
            marginRight: "8px",
            flexShrink: 0,
          }}
        >
          {projectName}
        </span>
      )}

      {/* Density */}
      <div data-tour="gantt-density" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ ...btnBase, border: "none", padding: "4px 2px", color: "var(--ink-muted)", cursor: "default" }}>
          Density
        </span>
        {(["tight", "normal", "spacious"] as DensityKey[]).map((d) => (
          <button
            key={d}
            style={{ ...btnBase, ...(ctrl.density === d ? active : inactive) }}
            onClick={() => setCtrl((c) => ({ ...c, density: d }))}
          >
            {d}
          </button>
        ))}
      </div>

      <div style={{ width: "1px", height: "16px", background: "var(--border)", margin: "0 4px" }} />

      {/* Phase filter */}
      <div data-tour="gantt-phase" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ ...btnBase, border: "none", padding: "4px 2px", color: "var(--ink-muted)", cursor: "default" }}>
          Phase
        </span>
        {phaseFilterOptions.map(([v, label]) => (
          <button
            key={v}
            style={{ ...btnBase, ...(ctrl.filterPhase === v ? active : inactive) }}
            onClick={() => setCtrl((c) => ({ ...c, filterPhase: v }))}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ width: "1px", height: "16px", background: "var(--border)", margin: "0 4px" }} />

      {/* Toggles */}
      <button
        style={{ ...btnBase, ...(ctrl.hideDone ? active : inactive) }}
        onClick={() => setCtrl((c) => ({ ...c, hideDone: !c.hideDone }))}
      >
        Hide done
      </button>
      <button
        data-tour="gantt-predictions"
        style={{ ...btnBase, ...(ctrl.showPredicted ? active : inactive) }}
        onClick={() => setCtrl((c) => ({ ...c, showPredicted: !c.showPredicted }))}
      >
        Predictions
      </button>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Expand/collapse */}
      <button
        onClick={() => setCtrl((c) => ({ ...c, collapsedCats: new Set() }))}
        title="Expand all swim lanes"
        disabled={!hasCollapsedLanes}
        style={{
          ...btnBase,
          ...(hasCollapsedLanes ? inactive : { ...inactive, opacity: 0.45, cursor: "default" }),
          display: "flex",
          alignItems: "center",
          gap: "5px",
          padding: "4px 12px",
        }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        Expand all
      </button>
      <button
        onClick={() => setCtrl((c) => ({ ...c, collapsedCats: new Set(CATEGORY_ORDER) }))}
        title="Collapse all swim lanes"
        disabled={allLanesCollapsed}
        style={{
          ...btnBase,
          ...(allLanesCollapsed ? { ...inactive, opacity: 0.45, cursor: "default" } : inactive),
          display: "flex",
          alignItems: "center",
          gap: "5px",
          padding: "4px 12px",
        }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M1 5h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        Collapse all
      </button>
      <button
        data-tour="gantt-collapse"
        onClick={onToggleFullscreen}
        title={fullscreen ? "Exit fullscreen" : "Expand to fullscreen"}
        style={{
          ...btnBase,
          ...inactive,
          display: "flex",
          alignItems: "center",
          gap: "5px",
          padding: "4px 12px",
        }}
      >
        {fullscreen ? (
          <>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1 4h3V1M6 1v3h3M9 6H6v3M4 9V6H1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            Collapse
          </>
        ) : (
          <>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1 3.5V1h2.5M6.5 1H9v2.5M9 6.5V9H6.5M3.5 9H1V6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            Expand
          </>
        )}
      </button>
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend({ showPredicted, primaryGateLabel }: { showPredicted: boolean; primaryGateLabel: string }) {
  const items: [RequirementStatusValue, string][] = [
    ["in_progress",        "In Progress"],
    ["draft",              "Draft"],
    ["substantially_final","Substantially Final"],
    ["executed",           "Done / Waived"],
  ];
  return (
    <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "12px", paddingLeft: `${LABEL_W}px` }}>
      {items.map(([s, label]) => (
        <div key={s} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div style={{ width: "16px", height: "7px", borderRadius: "2px", backgroundColor: `var(--gantt-${s.replace(/_/g,"-")}, ${STATUS_BAR_COLORS[s]})` }} />
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-muted)" }}>
            {label}
          </span>
        </div>
      ))}
      {showPredicted && (
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div style={{ width: "16px", height: "7px", borderRadius: "2px", border: "1.5px dashed var(--ink-muted)", opacity: 0.5 }} />
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-muted)" }}>
            Predicted
          </span>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
        <svg width="16" height="7" viewBox="0 0 16 7" style={{ overflow: "visible" }}>
          <line x1="8" y1="0" x2="8" y2="7" stroke="var(--accent)" strokeWidth="1.5" />
        </svg>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-muted)" }}>Today</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
        <svg width="16" height="7" viewBox="0 0 16 7" style={{ overflow: "visible" }}>
          <line x1="8" y1="0" x2="8" y2="7" stroke="var(--gold)" strokeWidth="1.5" strokeDasharray="3,2" />
        </svg>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-muted)" }}>{primaryGateLabel} Target</span>
      </div>
    </div>
  );
}

// ─── SVG canvas ───────────────────────────────────────────────────────────────

function GanttSVG({
  ganttRows,
  ctrl,
  today,
  loiDate,
  closeDate,
  chartStart,
  totalMs,
  projectCreatedAt,
  width,
  milestones = [],
  onTooltip,
  hoveredId,
  onHover,
  onCatClick,
  phaseLabels,
}: {
  ganttRows: GanttRow[];
  ctrl: Controls;
  today: Date;
  loiDate: Date | null;
  closeDate: Date | null;
  chartStart: Date;
  totalMs: number;
  projectCreatedAt: Date;
  width: number;    // actual pixel width of container
  milestones?: MilestoneMarker[];
  onTooltip: (t: Tooltip | null) => void;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onCatClick: (cat: string) => void;
  phaseLabels: Record<string, string>;
}) {
  const d = DENSITY[ctrl.density];
  const areaW = width - LABEL_W - RIGHT_PAD;

  // date → x in SVG coords (offset by LABEL_W)
  function dx(date: Date): number {
    const pct = (date.getTime() - chartStart.getTime()) / totalMs;
    return LABEL_W + Math.max(0, Math.min(areaW, pct * areaW));
  }

  // Compute row Y positions
  const rowYs: number[] = [];
  let curY = AXIS_H;
  for (const r of ganttRows) {
    rowYs.push(curY);
    curY += r.kind === "cat" ? d.catH : d.rowH + d.rowGap;
  }
  const svgH = curY + BOTTOM_PAD;

  // Month ticks
  const monthTicks: Date[] = [];
  {
    const cursor = new Date(chartStart);
    cursor.setDate(1);
    const chartEnd = new Date(chartStart.getTime() + totalMs);
    while (cursor <= chartEnd) {
      monthTicks.push(new Date(cursor));
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  const todayX  = dx(today);
  const loiX    = loiDate  ? dx(loiDate)  : null;
  const closeX  = closeDate ? dx(closeDate) : null;
  const visibleMilestones = milestones
    .filter((milestone) => milestone.targetDate)
    .map((milestone) => ({
      milestone,
      x: dx(new Date(milestone.targetDate!)),
    }))
    .filter((entry) => entry.x >= LABEL_W && entry.x <= width - RIGHT_PAD)
    .sort((a, b) => a.x - b.x);
  const milestoneLaneRightEdges = [-Infinity, -Infinity, -Infinity];
  const laidOutMilestones = visibleMilestones.map((entry) => {
    const shortLabel =
      entry.milestone.name.length > 18
        ? entry.milestone.name.slice(0, 16) + "…"
        : entry.milestone.name;
    const estimatedWidth = Math.max(46, shortLabel.length * 5.4);
    const minGap = Math.max(18, estimatedWidth * 0.45);
    let lane = milestoneLaneRightEdges.findIndex((rightEdge) => entry.x - rightEdge >= minGap);
    let showLabel = true;
    if (lane === -1) {
      lane = 2;
      showLabel = entry.x - milestoneLaneRightEdges[2] >= Math.max(26, estimatedWidth * 0.7);
    }
    if (showLabel) {
      milestoneLaneRightEdges[lane] = entry.x + estimatedWidth / 2;
    }
    return { ...entry, shortLabel, lane, showLabel };
  });

  // Skip rendering if width isn't measured yet
  if (width < 10) return <svg style={{ display: "block", width: "100%", height: `${svgH}px` }} />;

  return (
    <svg
      style={{ display: "block", width: "100%", overflow: "visible" }}
      width={width}
      height={svgH}
      viewBox={`0 0 ${width} ${svgH}`}
    >
      {/* ── Future zone ───────────────────────────────────────── */}
      <rect
        x={todayX}
        y={AXIS_H}
        width={Math.max(0, width - todayX - RIGHT_PAD)}
        height={svgH - AXIS_H - BOTTOM_PAD}
        fill="var(--ink)"
        fillOpacity={0.025}
      />

      {/* ── Month grid ────────────────────────────────────────── */}
      {monthTicks.map((tick, i) => {
        const x = dx(tick);
        if (x < LABEL_W || x > width - RIGHT_PAD) return null;
        const isJan = tick.getMonth() === 0;
        const label = tick.toLocaleDateString("en-US", { month: "short", ...(isJan ? { year: "numeric" } : {}) });
        return (
          <g key={i}>
            <line
              x1={x} y1={AXIS_H - 6}
              x2={x} y2={svgH - BOTTOM_PAD}
              stroke={isJan ? "var(--border-strong)" : "var(--border)"}
              strokeWidth={isJan ? 0.8 : 0.5}
              strokeDasharray={isJan ? undefined : "2,4"}
            />
            <text
              x={x + 3}
              y={AXIS_H - 10}
              fontFamily="'DM Mono', monospace"
              fontSize={isJan ? 9 : 8}
              fontWeight={isJan ? 600 : 400}
              fill={isJan ? "var(--ink-mid)" : "var(--ink-muted)"}
              letterSpacing="0.05em"
            >
              {label}
            </text>
          </g>
        );
      })}

      {/* ── Rows ──────────────────────────────────────────────── */}
      {ganttRows.map((ganttRow, i) => {
        const y = rowYs[i];

        if (ganttRow.kind === "cat") {
          const isCollapsed = ctrl.collapsedCats.has(ganttRow.cat);
          return (
            <g
              key={ganttRow.cat}
              onClick={() => onCatClick(ganttRow.cat)}
              style={{ cursor: "pointer" }}
            >
              {/* Category bg stripe */}
              <rect
                x={0}
                y={y}
                width={width}
                height={d.catH}
                fill="var(--bg)"
                fillOpacity={0.7}
              />
              {/* Collapse chevron */}
              <text
                x={8}
                y={y + d.catH / 2 + d.catSize * 0.38}
                fontFamily="'DM Mono', monospace"
                fontSize={d.catSize + 1}
                fill="var(--ink-muted)"
              >
                {isCollapsed ? "▶" : "▼"}
              </text>
              <text
                x={LABEL_W - 8}
                y={y + d.catH / 2 + d.catSize * 0.38}
                textAnchor="end"
                fontFamily="'DM Mono', monospace"
                fontSize={d.catSize}
                fontWeight={700}
                letterSpacing="0.12em"
                fill="var(--ink)"
                style={{ textTransform: "uppercase" }}
              >
                {getCategoryLabel(ganttRow.cat)}
              </text>
              <line
                x1={LABEL_W}
                y1={y + d.catH - 0.5}
                x2={width - RIGHT_PAD}
                y2={y + d.catH - 0.5}
                stroke="var(--border)"
                strokeWidth={0.8}
              />
            </g>
          );
        }

        // Requirement row
        const { row } = ganttRow;
        const rid    = row.requirementId;
        const status = row.status as RequirementStatusValue;
        const isHov  = hoveredId === rid;
        const isDone = status === "executed" || status === "waived";
        const barY   = y + d.barPad;
        const barH   = Math.max(d.rowH - d.barPad * 2, 4);
        const color  = STATUS_BAR_COLORS[status];

        const confirmedBar = status !== "not_started"
          ? { start: projectCreatedAt, end: today }
          : null;

        const predicted = ctrl.showPredicted
          ? predictCompletion(row, today, loiDate, closeDate)
          : null;

        const x1conf = confirmedBar ? dx(confirmedBar.start) : null;
        const x2conf = confirmedBar ? Math.min(dx(confirmedBar.end), todayX) : null;
        const confW  = (x1conf !== null && x2conf !== null) ? Math.max(x2conf - x1conf, 2) : 0;

        const x1pred = predicted ? Math.max(dx(predicted.start), todayX) : null;
        const x2pred = predicted && !isDone ? dx(predicted.end) : null;
        const predW  = (x1pred !== null && x2pred !== null) ? Math.max(x2pred - x1pred, 3) : 0;

        // For not_started, use gold as the prediction color (what they'd progress to)
        const predColor = STATUS_BAR_COLORS[
          status === "not_started" ? "in_progress" : status
        ];
        // Predicted bar opacity: more visible so users see the planning horizon
        const predFillOpacity = status === "not_started" ? 0.32 : 0.18;
        const predStrokeOpacity = status === "not_started" ? 0.65 : 0.5;

        return (
          <g
            key={rid}
            onMouseEnter={() => onHover(rid)}
            onMouseLeave={() => { onHover(null); onTooltip(null); }}
          >
            {/* Hover row highlight */}
            {isHov && (
              <rect
                x={LABEL_W}
                y={y}
                width={width - LABEL_W - RIGHT_PAD}
                height={d.rowH}
                fill="var(--accent)"
                fillOpacity={0.07}
              />
            )}

            {/* Row separator */}
            <line
              x1={LABEL_W}
              y1={y + d.rowH + d.rowGap - 0.5}
              x2={width - RIGHT_PAD}
              y2={y + d.rowH + d.rowGap - 0.5}
              stroke="var(--border)"
              strokeWidth={0.4}
              strokeOpacity={0.5}
            />

            {/* Requirement label */}
            <text
              x={LABEL_W - 10}
              y={y + d.rowH / 2 + d.labelSize * 0.38}
              textAnchor="end"
              fontFamily="'Inter', sans-serif"
              fontSize={d.labelSize}
              fill={isHov ? "var(--accent)" : "var(--ink-mid)"}
              style={{ userSelect: "none" }}
            >
              {row.name.length > (ctrl.density === "tight" ? 18 : 24)
                ? row.name.slice(0, ctrl.density === "tight" ? 16 : 22) + "…"
                : row.name}
            </text>

            {/* LOI-critical dot */}
            {row.isPrimaryGate && (
              <circle
                cx={LABEL_W - 4}
                cy={y + d.rowH / 2}
                r={ctrl.density === "tight" ? 2 : 2.5}
                fill="var(--accent)"
                fillOpacity={0.75}
              />
            )}

            {/* Baseline track for not-started — thin rail showing elapsed time */}
            {!confirmedBar && (
              <rect
                x={dx(projectCreatedAt)}
                y={barY + barH / 2 - 1.5}
                width={Math.max(todayX - dx(projectCreatedAt), 0)}
                height={3}
                rx={1.5}
                fill="var(--border-strong)"
                fillOpacity={0.55}
              />
            )}

            {/* Confirmed bar */}
            {confirmedBar && confW > 0 && (
              <rect
                x={x1conf!}
                y={barY}
                width={confW}
                height={barH}
                rx={Math.min(3, barH / 3)}
                fill={color}
                fillOpacity={isDone ? 0.88 : 0.82}
                style={{ cursor: "default" }}
                onMouseMove={(e) => {
                  const rect = (e.currentTarget as SVGElement).closest("svg")!.getBoundingClientRect();
                  const svgX  = ((e.clientX - rect.left) / rect.width) * width;
                  onTooltip({
                    svgX,
                    rowY: y,
                    lines: [
                      row.name,
                      STATUS_LABELS[status],
                      row.isPrimaryGate
                        ? `${phaseLabels["loi"] ?? row.phaseRequired} Critical`
                        : (phaseLabels[row.phaseRequired] ?? row.phaseRequired) + " Phase",
                    ],
                  });
                }}
              />
            )}

            {/* Predicted bar */}
            {predicted && !isDone && predW > 0 && (
              <g>
                <rect
                  x={x1pred!}
                  y={barY}
                  width={predW}
                  height={barH}
                  rx={Math.min(3, barH / 3)}
                  fill={predColor}
                  fillOpacity={predFillOpacity}
                  style={{ cursor: "default" }}
                  onMouseMove={(e) => {
                    const rect = (e.currentTarget as SVGElement).closest("svg")!.getBoundingClientRect();
                    const svgX  = ((e.clientX - rect.left) / rect.width) * width;
                    onTooltip({
                      svgX,
                      rowY: y,
                      lines: [
                        row.name,
                        "Predicted completion",
                        predicted.end.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
                      ],
                    });
                  }}
                />
                <rect
                  x={x1pred! + 0.5}
                  y={barY + 0.5}
                  width={Math.max(predW - 1, 1)}
                  height={Math.max(barH - 1, 2)}
                  rx={Math.min(3, barH / 3)}
                  fill="none"
                  stroke={predColor}
                  strokeWidth={1}
                  strokeDasharray="4,2"
                  strokeOpacity={predStrokeOpacity}
                />
              </g>
            )}
          </g>
        );
      })}

      {/* ── Milestone lines (rendered on top) ─────────────────── */}

      {/* Today */}
      {todayX >= LABEL_W && todayX <= width - RIGHT_PAD && (
        <g>
          <line
            x1={todayX} y1={AXIS_H - 2}
            x2={todayX} y2={svgH - BOTTOM_PAD}
            stroke="var(--accent)"
            strokeWidth={1.5}
          />
          <polygon
            points={`${todayX - 4},${AXIS_H - 2} ${todayX + 4},${AXIS_H - 2} ${todayX},${AXIS_H + 6}`}
            fill="var(--accent)"
          />
          <text
            x={todayX}
            y={AXIS_H - 14}
            textAnchor="middle"
            fontFamily="'DM Mono', monospace"
            fontSize={8}
            fontWeight={700}
            letterSpacing="0.10em"
            fill="var(--accent)"
          >
            TODAY
          </text>
        </g>
      )}

      {/* LOI target */}
      {loiX !== null && loiX >= LABEL_W && loiX <= width - RIGHT_PAD && (
        <g>
          <line
            x1={loiX} y1={AXIS_H - 2}
            x2={loiX} y2={svgH - BOTTOM_PAD}
            stroke="var(--gold)"
            strokeWidth={1.5}
            strokeDasharray="5,3"
          />
          <polygon
            points={`${loiX - 4},${AXIS_H - 2} ${loiX + 4},${AXIS_H - 2} ${loiX},${AXIS_H + 6}`}
            fill="var(--gold)"
          />
          <text
            x={loiX}
            y={AXIS_H - 14}
            textAnchor="middle"
            fontFamily="'DM Mono', monospace"
            fontSize={8}
            fontWeight={700}
            letterSpacing="0.10em"
            fill="var(--gold)"
          >
            LOI
          </text>
        </g>
      )}

      {/* Financial Close */}
      {closeX !== null && closeX >= LABEL_W && closeX <= width - RIGHT_PAD && (
        <g>
          <line
            x1={closeX} y1={AXIS_H - 2}
            x2={closeX} y2={svgH - BOTTOM_PAD}
            stroke="var(--teal)"
            strokeWidth={1.5}
            strokeDasharray="5,3"
          />
          <polygon
            points={`${closeX - 4},${AXIS_H - 2} ${closeX + 4},${AXIS_H - 2} ${closeX},${AXIS_H + 6}`}
            fill="var(--teal)"
          />
          <text
            x={closeX}
            y={AXIS_H - 14}
            textAnchor="middle"
            fontFamily="'DM Mono', monospace"
            fontSize={8}
            fontWeight={700}
            letterSpacing="0.10em"
            fill="var(--teal)"
          >
            CLOSE
          </text>
        </g>
      )}

      {/* Milestone diamonds */}
      {laidOutMilestones.map(({ milestone: m, x: mx, shortLabel, lane, showLabel }) => {
        const my = AXIS_H - 10; // sit above the axis line
        const S = 5; // half-size of diamond
        const completed = !!m.completedAt;
        const fill = completed ? "var(--teal)" : "var(--ink-mid)";
        const stroke = completed ? "var(--teal)" : "var(--border)";
        return (
          <g key={m.id}>
            {/* Vertical tick */}
            <line
              x1={mx} y1={my + S + 2}
              x2={mx} y2={svgH - BOTTOM_PAD}
              stroke={fill}
              strokeWidth={0.8}
              strokeDasharray="3,3"
              strokeOpacity={0.5}
            />
            {/* Diamond shape */}
            <polygon
              points={`${mx},${my - S} ${mx + S},${my} ${mx},${my + S} ${mx - S},${my}`}
              fill={completed ? fill : "var(--bg-card)"}
              stroke={stroke}
              strokeWidth={1.2}
            />
            {/* Label */}
            {showLabel ? (
              <text
                x={mx}
                y={my - S - 3 - lane * 11}
                textAnchor="middle"
                fontFamily="'DM Mono', monospace"
                fontSize={7}
                letterSpacing="0.06em"
                fill={fill}
                style={{ userSelect: "none" }}
              >
                {shortLabel}
              </text>
            ) : null}
          </g>
        );
      })}

      {/* Label column divider */}
      <line
        x1={LABEL_W} y1={AXIS_H - 6}
        x2={LABEL_W} y2={svgH - BOTTOM_PAD}
        stroke="var(--border)"
        strokeWidth={0.8}
      />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function GanttChart({ rows, projectCreatedAt, targetLoiDate, targetCloseDate, milestones = [], dealType }: GanttProps) {
  const programConfig = getProgramConfig(dealType ?? "exim_project_finance");
  const phaseFilterOptions: Array<[string, string]> = [
    ["all", "All"],
    ...Object.entries(programConfig.phaseLabels),
  ];
  const defaultCollapsedCats = new Set<string>(CATEGORY_ORDER);
  const [ctrl, setCtrl] = useState<Controls>({
    density:        "normal",
    showPredicted:  true,
    filterPhase:    "all",
    hideDone:       false,
    collapsedCats:  defaultCollapsedCats,
  });
  const [fullscreen, setFullscreen]   = useState(false);
  const [ganttTour, setGanttTour]     = useState(false);
  const [hoveredId, setHoveredId]     = useState<string | null>(null);
  const [tooltip, setTooltip]         = useState<Tooltip | null>(null);
  const [inlineW, setInlineW]       = useState(0);
  const [fsW, setFsW]               = useState(0);
  const inlineRef                   = useRef<HTMLDivElement>(null);
  const fsRef                       = useRef<HTMLDivElement>(null);
  const fsContainerRef              = useRef<HTMLDivElement>(null);

  // Measure inline container
  useEffect(() => {
    const el = inlineRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setInlineW(el.clientWidth));
    ro.observe(el);
    setInlineW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // Measure fullscreen container
  useEffect(() => {
    const el = fsRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setFsW(el.clientWidth));
    ro.observe(el);
    setFsW(el.clientWidth);
    return () => ro.disconnect();
  }, [fullscreen]);

  // Lock body scroll in fullscreen
  useEffect(() => {
    document.body.style.overflow = fullscreen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [fullscreen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("lodestar:gantt-fullscreen", {
        detail: { active: fullscreen },
      })
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent("lodestar:gantt-fullscreen", {
          detail: { active: false },
        })
      );
    };
  }, [fullscreen]);

  // ESC to exit fullscreen
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && fullscreen) setFullscreen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  const today     = new Date(); today.setHours(0, 0, 0, 0);
  const loiDate   = targetLoiDate   ? new Date(targetLoiDate)   : null;
  const closeDate = targetCloseDate ? new Date(targetCloseDate) : null;

  const chartStart = new Date(projectCreatedAt);
  chartStart.setDate(1);

  const naturalEnd = loiDate
    ? new Date(loiDate.getTime() + 180 * 864e5)
    : new Date(today.getTime() + 240 * 864e5);
  const closeEnd = closeDate ? new Date(closeDate.getTime() + 60 * 864e5) : null;
  const chartEnd = new Date(Math.max(naturalEnd.getTime(), today.getTime() + 90 * 864e5, closeEnd?.getTime() ?? 0));
  chartEnd.setMonth(chartEnd.getMonth() + 1, 0);
  const totalMs = chartEnd.getTime() - chartStart.getTime();

  // Build flat row list applying current filters
  const ganttRows: GanttRow[] = [];
  for (const cat of CATEGORY_ORDER) {
    let items = rows.filter((r) => r.category === cat);
    if (ctrl.filterPhase !== "all") items = items.filter((r) => r.phaseRequired === ctrl.filterPhase);
    if (ctrl.hideDone) items = items.filter((r) => {
      const s = r.status as RequirementStatusValue;
      return s !== "executed" && s !== "waived";
    });
    if (items.length === 0) continue;
    ganttRows.push({ kind: "cat", cat });
    if (!ctrl.collapsedCats.has(cat)) {
      for (const item of items) ganttRows.push({ kind: "req", row: item });
    }
  }

  function toggleCat(cat: string) {
    setCtrl((c) => {
      const next = new Set(c.collapsedCats);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return { ...c, collapsedCats: next };
    });
  }

  function tooltipStyle(t: Tooltip, containerW: number): React.CSSProperties {
    return {
      position: "absolute",
      left: Math.min(t.svgX + 12, containerW - 220),
      top: t.rowY - 4,
      backgroundColor: "var(--bg-dark)",
      color: "var(--nav-text)",
      border: "1px solid var(--border-strong)",
      borderRadius: "4px",
      padding: "8px 12px",
      pointerEvents: "none",
      zIndex: 20,
      maxWidth: "210px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
    };
  }

  function TooltipEl({ t, w }: { t: Tooltip; w: number }) {
    return (
      <div style={tooltipStyle(t, w)}>
        {t.lines.map((line, i) => (
          <p key={i} style={{
            fontFamily:    i === 0 ? "'Inter', sans-serif" : "'DM Mono', monospace",
            fontSize:      i === 0 ? "12px" : "10px",
            fontWeight:    i === 0 ? 500 : 400,
            color:         i === 0 ? "var(--nav-text)" : "var(--nav-link)",
            letterSpacing: i === 0 ? 0 : "0.06em",
            textTransform: i === 0 ? "none" : "uppercase",
            margin:        i === 0 ? "0 0 3px" : "2px 0 0",
            lineHeight:    1.4,
          }}>
            {line}
          </p>
        ))}
      </div>
    );
  }

  const svgProps = {
    ganttRows,
    ctrl,
    today,
    loiDate,
    closeDate,
    chartStart,
    totalMs,
    projectCreatedAt,
    milestones,
    onTooltip: setTooltip,
    hoveredId,
    onHover: setHoveredId,
    onCatClick: toggleCat,
    phaseLabels: programConfig.phaseLabels,
  };

  // Always render inline container so ResizeObserver keeps measuring width.
  // When fullscreen is active we render the overlay on top; inline stays mounted but hidden.
  return (
    <>
      {/* ── Inline (always mounted) ─────────────────────────────────────────── */}
      <div style={{ visibility: fullscreen ? "hidden" : "visible" }}>
        <ControlBar ctrl={ctrl} setCtrl={setCtrl} fullscreen={false} onToggleFullscreen={() => { setTooltip(null); setFullscreen(true); }} phaseFilterOptions={phaseFilterOptions} />
        <Legend showPredicted={ctrl.showPredicted} primaryGateLabel={programConfig.primaryGateLabel} />
        <div ref={inlineRef} style={{ position: "relative", width: "100%", overflowX: "auto" }}>
          <GanttSVG {...svgProps} width={inlineW} />
          {!fullscreen && tooltip && <TooltipEl t={tooltip} w={inlineW} />}
        </div>
      </div>

      {/* ── Fullscreen overlay ──────────────────────────────────────────────── */}
      <AnimatePresence>
      {fullscreen && (
        <motion.div
          ref={fsContainerRef}
          key="gantt-fullscreen"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 340, damping: 30 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            backgroundColor: "var(--bg)",
            display: "flex",
            flexDirection: "column",
            transformOrigin: "center center",
          }}
        >
          {/* Header */}
          <div style={{ padding: "14px 28px", borderBottom: "1px solid var(--border)", flexShrink: 0, backgroundColor: "var(--bg-card)", display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ flex: 1 }}>
              <ControlBar ctrl={ctrl} setCtrl={setCtrl} fullscreen={true} onToggleFullscreen={() => { setTooltip(null); setFullscreen(false); }} phaseFilterOptions={phaseFilterOptions} />
            </div>
            {/* Tour trigger */}
            <button
              onClick={() => setGanttTour(true)}
              title="Timeline tour"
              style={{
                flexShrink: 0,
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                backgroundColor: "var(--bg)",
                border: "1px solid var(--border-strong)",
                color: "var(--ink-muted)",
                fontFamily: "'DM Mono', monospace",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "border-color 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.color = "var(--ink-muted)"; }}
            >
              ?
            </button>
          </div>

          {/* Gantt tour overlay */}
          {ganttTour && <GanttTourGuide onClose={() => setGanttTour(false)} containerRef={fsContainerRef} />}

          {/* Scrollable body */}
          <div style={{ flex: 1, overflow: "auto", padding: "20px 28px" }}>
            <Legend showPredicted={ctrl.showPredicted} primaryGateLabel={programConfig.primaryGateLabel} />
            <div ref={fsRef} style={{ position: "relative", minWidth: "640px" }}>
              <GanttSVG {...svgProps} width={fsW || CHART_REF_W} />
              {tooltip && <TooltipEl t={tooltip} w={fsW || CHART_REF_W} />}
            </div>
          </div>

        {/* ESC hint */}
        <div
          style={{
            padding: "10px 28px",
            borderTop: "1px solid var(--border)",
            flexShrink: 0,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "var(--ink-muted)",
            }}
          >
            Press ESC to collapse
          </span>
        </div>
        </motion.div>
      )}
      </AnimatePresence>
    </>
  );
}
