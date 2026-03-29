"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Tour step definitions ────────────────────────────────────────────────────

type TourStep = {
  target: string;
  title: string;
  body: string;
  placement: "right" | "left" | "bottom" | "top";
  scrollTo?: boolean;
};

function buildTour(isExim: boolean): TourStep[] {
  return [
    {
      target: "#section-overview",
      title: "Deal header",
      body: isExim
        ? "Your LOI countdown and urgency alerts live here. The closer to your target date, the more it changes color — red means act now."
        : "Your deal timeline and key milestones live here. Set a target financial close date to activate the countdown.",
      placement: "bottom",
      scrollTo: true,
    },
    {
      target: "#section-readiness",
      title: "Readiness score",
      body: isExim
        ? "This score reflects how much of EXIM's required data room is in substantially final or executed form. It updates in real-time as you mark requirements."
        : "This score reflects how much of your deal workplan is complete. It updates as you mark items through their stages.",
      placement: "bottom",
      scrollTo: true,
    },
    {
      target: "#section-timeline",
      title: "Timeline chart",
      body: "Solid bars show confirmed progress. Dashed bands are AI-predicted completion windows based on current status and your target date. Expand it to full screen for all controls.",
      placement: "bottom",
      scrollTo: true,
    },
    {
      target: "#section-documents",
      title: "Documents",
      body: "Upload deal-wide files here, or attach documents directly to individual workplan items below. Requirement-linked docs show a teal badge.",
      placement: "bottom",
      scrollTo: true,
    },
    {
      target: "#section-requirements",
      title: isExim ? "Requirements checklist" : "Deal workplan",
      body: isExim
        ? "36 EXIM-required items across 6 categories. Red-left-border items are LOI-critical — they must reach Substantially Final before you can submit. Click the paperclip on any row to attach supporting documents."
        : "Your deal workplan tracks all items needed for financing. Click any row to update status, attach documents, or add notes.",
      placement: "bottom",
      scrollTo: true,
    },
    {
      target: "#section-meetings",
      title: "Meetings log",
      body: "Log every stakeholder meeting, extract action items, and link them to specific workplan items. Nothing falls through the cracks.",
      placement: "top",
      scrollTo: true,
    },
  ];
}

// ─── Spotlight helpers ────────────────────────────────────────────────────────

type Rect = { top: number; left: number; width: number; height: number };

function getRect(selector: string): Rect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function calloutPosition(
  rect: Rect,
  placement: TourStep["placement"],
  vpW: number,
  vpH: number
): React.CSSProperties {
  const PAD = 16;
  const EDGE = 24;
  const W = Math.min(320, vpW - EDGE * 2);
  const H = Math.min(220, vpH - EDGE * 2);
  const fitsBelow = rect.top + rect.height + PAD + H <= vpH - EDGE;
  const fitsAbove = rect.top - PAD - H >= EDGE;
  const fitsRight = rect.left + rect.width + PAD + W <= vpW - EDGE;
  const fitsLeft = rect.left - PAD - W >= EDGE;
  let top = rect.top;
  let left = rect.left;

  switch (placement) {
    case "right":
      left = fitsRight || !fitsLeft ? rect.left + rect.width + PAD : rect.left - W - PAD;
      top = rect.top + rect.height / 2 - H / 2;
      break;
    case "left":
      left = fitsLeft || !fitsRight ? rect.left - W - PAD : rect.left + rect.width + PAD;
      top = rect.top + rect.height / 2 - H / 2;
      break;
    case "bottom":
      top = fitsBelow || !fitsAbove ? rect.top + rect.height + PAD : rect.top - H - PAD;
      left = rect.left + rect.width / 2 - W / 2;
      break;
    case "top":
      top = fitsAbove || !fitsBelow ? rect.top - H - PAD : rect.top + rect.height + PAD;
      left = rect.left + rect.width / 2 - W / 2;
      break;
  }

  return {
    top: clamp(top, EDGE, Math.max(EDGE, vpH - H - EDGE)),
    left: clamp(left, EDGE, Math.max(EDGE, vpW - W - EDGE)),
    width: W,
    maxHeight: `calc(100vh - ${EDGE * 2}px)`,
    overflowY: "auto",
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

const PAD = 10;
const TOUR_TRIGGER_TOP = "12px";

export function TourGuide({ dealType }: { dealType?: string }) {
  const [step, setStep] = useState<number | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [vpW, setVpW] = useState(0);
  const [vpH, setVpH] = useState(0);
  const [ganttFullscreen, setGanttFullscreen] = useState(false);
  const isExim = !dealType || dealType === "exim_project_finance";
  const tour = buildTour(isExim);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setVpW(window.innerWidth);
    setVpH(window.innerHeight);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleGanttFullscreen = (event: Event) => {
      const customEvent = event as CustomEvent<{ active?: boolean }>;
      setGanttFullscreen(Boolean(customEvent.detail?.active));
    };
    window.addEventListener("lodestar:gantt-fullscreen", handleGanttFullscreen as EventListener);
    return () => {
      window.removeEventListener("lodestar:gantt-fullscreen", handleGanttFullscreen as EventListener);
    };
  }, []);

  const currentStep = step !== null && step >= 0 && step < tour.length ? tour[step] : null;

  const measureAndScroll = useCallback((s: TourStep) => {
    if (s.scrollTo) {
      const el = document.querySelector(s.target);
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.25;
        window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
        // Wait for smooth scroll to finish before measuring viewport position
        setTimeout(() => setRect(getRect(s.target)), 700);
        return;
      }
    }
    setRect(getRect(s.target));
  }, []);

  useEffect(() => {
    if (!currentStep) return;
    measureAndScroll(currentStep);
    const handleResize = () => {
      setVpW(window.innerWidth);
      setVpH(window.innerHeight);
      setRect(getRect(currentStep.target));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [currentStep, measureAndScroll]);

  function startTour() {
    setRect(null);
    setStep(0);
  }

  function advance() {
    if (step === null) return;
    if (step >= tour.length - 1) finish();
    else {
      setRect(null);
      setStep((s) => (s === null ? 0 : s + 1));
    }
  }

  function finish() {
    setStep(null);
    setRect(null);
  }

  function restart() {
    startTour();
  }

  useEffect(() => {
    (window as Window & { restartTour?: () => void }).restartTour = restart;
  }, []);

  const isActive = step !== null && !!currentStep;
  const calloutStyle = rect && currentStep
    ? calloutPosition(rect, currentStep.placement, vpW, vpH)
    : { top: "50%", left: "50%", width: 320, transform: "translate(-50%,-50%)" };

  return (
    <>
      {/* ── Dim overlay ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            key="tour-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={finish}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 900,
              backgroundColor: "transparent",
              pointerEvents: "auto",
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Spotlight ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isActive && rect && (
          <motion.div
            key="tour-spotlight"
            layoutId="tour-spotlight"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            style={{
              position: "fixed",
              zIndex: 901,
              top: rect.top - PAD,
              left: rect.left - PAD,
              width: rect.width + PAD * 2,
              height: rect.height + PAD * 2,
              borderRadius: "8px",
              boxShadow: "0 0 0 9999px rgba(12,18,28,0.34), 0 0 0 2px var(--accent), inset 0 0 0 1px rgba(255,255,255,0.2)",
              pointerEvents: "none",
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Callout bubble ─────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {isActive && currentStep && (
          <motion.div
            key={`callout-${step}`}
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            style={{
              position: "fixed",
              zIndex: 902,
              ...calloutStyle,
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "22px",
              boxShadow: "0 12px 40px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.10)",
            }}
          >
            {/* Step counter */}
            <p style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--accent)",
              margin: "0 0 10px",
            }}>
              {step + 1} / {tour.length}
            </p>

            <p style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: "17px",
              color: "var(--ink)",
              margin: "0 0 8px",
              lineHeight: 1.25,
            }}>
              {currentStep.title}
            </p>

            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "13px",
              color: "var(--ink-mid)",
              lineHeight: 1.65,
              margin: "0 0 18px",
            }}>
              {currentStep.body}
            </p>

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                onClick={advance}
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  fontWeight: 600,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: "#fff",
                  backgroundColor: "var(--accent)",
                  border: "none",
                  borderRadius: "4px",
                  padding: "8px 18px",
                  cursor: "pointer",
                  flex: 1,
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                {step >= tour.length - 1 ? "Done" : "Next →"}
              </button>
              <button
                onClick={finish}
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "9px",
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: "var(--ink-muted)",
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "8px 8px",
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ink)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-muted)")}
              >
                Skip
              </button>
            </div>

            {/* Step dots */}
            <div style={{ display: "flex", gap: "5px", marginTop: "14px", justifyContent: "center" }}>
              {tour.map((_, i) => (
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
        )}
      </AnimatePresence>

      {/* ── Restart button (shown when tour is inactive) ────────────────────── */}
      <AnimatePresence>
        {!isActive && !ganttFullscreen && (
          <motion.button
            key="tour-restart-btn"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 400, damping: 28 }}
            onClick={restart}
            title="Start page tour"
            style={{
              position: "fixed",
              top: TOUR_TRIGGER_TOP,
              right: "16px",
              zIndex: 1100,
              minHeight: "34px",
              borderRadius: "999px",
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-strong)",
              color: "var(--ink-muted)",
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "0 14px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.14)",
              transition: "border-color 0.15s, color 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.color = "var(--accent)";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-strong)";
              e.currentTarget.style.color = "var(--ink-muted)";
              e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.14)";
            }}
          >
            <span
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "999px",
                border: "1px solid currentColor",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "11px",
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              ?
            </span>
            Tour
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
