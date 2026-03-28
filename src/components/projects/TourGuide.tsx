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

const PROJECT_TOUR: TourStep[] = [
  {
    target: "#section-overview",
    title: "Project header",
    body: "Your LOI countdown and urgency alerts live here. The closer to your target date, the more it changes color — red means act now.",
    placement: "bottom",
    scrollTo: true,
  },
  {
    target: "#section-readiness",
    title: "Readiness score",
    body: "This score reflects how much of EXIM's required data room is in substantially final or executed form. It updates in real-time as you mark requirements.",
    placement: "bottom",
    scrollTo: true,
  },
  {
    target: "#section-timeline",
    title: "Timeline chart",
    body: "Solid bars show confirmed progress. Dashed bands are AI-predicted completion windows based on current status and your LOI target. Expand it to full screen for all controls.",
    placement: "bottom",
    scrollTo: true,
  },
  {
    target: "#section-documents",
    title: "Documents",
    body: "Upload project-wide files here, or attach documents directly to individual requirements in the checklist below. Requirement-linked docs show a teal badge.",
    placement: "bottom",
    scrollTo: true,
  },
  {
    target: "#section-requirements",
    title: "Requirements checklist",
    body: "36 EXIM-required items across 6 categories. Red-left-border items are LOI-critical — they must reach Substantially Final before you can submit. Click the paperclip on any row to attach supporting documents.",
    placement: "bottom",
    scrollTo: true,
  },
  {
    target: "#section-meetings",
    title: "Meetings log",
    body: "Log every stakeholder meeting, extract action items, and link them to specific requirements. Nothing falls through the cracks.",
    placement: "top",
    scrollTo: true,
  },
];

// ─── Spotlight helpers ────────────────────────────────────────────────────────

type Rect = { top: number; left: number; width: number; height: number };

function getRect(selector: string): Rect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top + window.scrollY, left: r.left, width: r.width, height: r.height };
}

function calloutPosition(rect: Rect, placement: TourStep["placement"], vpW: number): React.CSSProperties {
  const PAD = 16;
  const W   = Math.min(320, vpW - 48);

  switch (placement) {
    case "right":
      return { top: rect.top + rect.height / 2 - 80, left: rect.left + rect.width + PAD, width: W };
    case "left":
      return { top: rect.top + rect.height / 2 - 80, left: rect.left - W - PAD, width: W };
    case "bottom":
      return { top: rect.top + rect.height + PAD, left: Math.min(rect.left, vpW - W - 24), width: W };
    case "top":
      return { top: rect.top - 180, left: Math.min(rect.left, vpW - W - 24), width: W };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "lodestar_tour_done_v1";
const PAD = 10;

export function TourGuide() {
  const [step, setStep]   = useState<number>(-1);
  const [rect, setRect]   = useState<Rect | null>(null);
  const [vpW, setVpW]     = useState(0);
  const tour              = PROJECT_TOUR;

  useEffect(() => {
    if (typeof window === "undefined") return;
    setVpW(window.innerWidth);
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      const t = setTimeout(() => setStep(0), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const currentStep = step >= 0 && step < tour.length ? tour[step] : null;

  const measureAndScroll = useCallback((s: TourStep) => {
    if (s.scrollTo) {
      const el = document.querySelector(s.target);
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.25;
        window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
        setTimeout(() => setRect(getRect(s.target)), 400);
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
      setRect(getRect(currentStep.target));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [step, currentStep, measureAndScroll]);

  function advance() {
    if (step >= tour.length - 1) finish();
    else { setRect(null); setStep((s) => s + 1); }
  }

  function finish() {
    localStorage.setItem(STORAGE_KEY, "1");
    setStep(-1);
    setRect(null);
  }

  function restart() {
    localStorage.removeItem(STORAGE_KEY);
    setRect(null);
    setStep(0);
  }

  useEffect(() => {
    (window as Window & { restartTour?: () => void }).restartTour = restart;
  }, []);

  const isActive = step >= 0 && !!currentStep;
  const calloutStyle = rect && currentStep
    ? calloutPosition(rect, currentStep.placement, vpW)
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
              backgroundColor: "rgba(0,0,0,0.5)",
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
              position: "absolute",
              zIndex: 901,
              top: rect.top - PAD,
              left: rect.left - PAD,
              width: rect.width + PAD * 2,
              height: rect.height + PAD * 2,
              borderRadius: "8px",
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.5), 0 0 0 2px var(--accent)",
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
              position: "absolute",
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
        {!isActive && (
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
              top: "84px",
              right: "24px",
              zIndex: 200,
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
