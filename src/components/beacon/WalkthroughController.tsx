"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useBeacon } from "./BeaconProvider";
import {
  WALKTHROUGH_STEPS,
  synthesizeWalkthroughStep,
  synthesizeWalkthroughIntro,
  synthesizeWalkthroughSummary,
} from "@/lib/ai/walkthrough-synthesis";
import type { WalkthroughData } from "@/types";

type WalkthroughMessage = {
  id: string;
  workspace: string | null;
  label: string;
  content: string;
  displayedContent: string;
  complete: boolean;
};

type Props = {
  walkthroughData: WalkthroughData;
  onInjectMessage: (msg: { role: "assistant"; content: string; walkthroughLabel?: string }) => void;
};

function makeId(): string {
  return `wt-${Math.random().toString(36).slice(2, 10)}`;
}

function scrollToSection(sectionId: string) {
  const el = document.getElementById(sectionId);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function WalkthroughController({ walkthroughData, onInjectMessage }: Props) {
  const {
    walkthroughActive,
    walkthroughStep,
    advanceWalkthrough,
    retreatWalkthrough,
    jumpToStep,
    stopWalkthrough,
  } = useBeacon();

  const [messages, setMessages] = useState<WalkthroughMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const typingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastInjectedStep = useRef<number>(-1);
  const hasStarted = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingRef.current) clearInterval(typingRef.current);
    };
  }, []);

  // Inject intro on first activation
  useEffect(() => {
    if (!walkthroughActive) {
      hasStarted.current = false;
      lastInjectedStep.current = -1;
      setMessages([]);
      return;
    }
    if (hasStarted.current) return;
    hasStarted.current = true;

    const introContent = synthesizeWalkthroughIntro(walkthroughData);
    onInjectMessage({ role: "assistant", content: introContent, walkthroughLabel: "Beacon" });

    // After a short pause, trigger step 0
    setTimeout(() => {
      injectStep(0);
    }, 800);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walkthroughActive]);

  // React to step changes (from Continue/Previous/Jump)
  useEffect(() => {
    if (!walkthroughActive) return;
    if (walkthroughStep === lastInjectedStep.current) return;
    if (!hasStarted.current) return;
    injectStep(walkthroughStep);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walkthroughStep, walkthroughActive]);

  function injectStep(step: number) {
    if (step < 0 || step >= WALKTHROUGH_STEPS.length) return;
    lastInjectedStep.current = step;

    const stepDef = WALKTHROUGH_STEPS[step];
    const { content, label } = synthesizeWalkthroughStep(stepDef.workspace, walkthroughData);

    // Scroll to section
    scrollToSection(stepDef.sectionId);

    // Start typing simulation
    const msgId = makeId();
    const msg: WalkthroughMessage = {
      id: msgId,
      workspace: stepDef.workspace,
      label,
      content,
      displayedContent: "",
      complete: false,
    };

    setMessages((prev) => [...prev, msg]);
    setIsTyping(true);

    let charIndex = 0;
    if (typingRef.current) clearInterval(typingRef.current);

    typingRef.current = setInterval(() => {
      charIndex++;
      if (charIndex >= content.length) {
        if (typingRef.current) clearInterval(typingRef.current);
        typingRef.current = null;
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, displayedContent: content, complete: true } : m))
        );
        setIsTyping(false);

        // Inject into parent chat
        onInjectMessage({ role: "assistant", content, walkthroughLabel: label });

        // If this was the last step, inject summary after a pause
        if (step === WALKTHROUGH_STEPS.length - 1) {
          setTimeout(() => {
            const summary = synthesizeWalkthroughSummary(walkthroughData);
            onInjectMessage({ role: "assistant", content: summary, walkthroughLabel: "Summary" });
            stopWalkthrough();
          }, 600);
        }
        return;
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId ? { ...m, displayedContent: content.slice(0, charIndex) } : m
        )
      );
    }, 8);
  }

  function handleContinue() {
    if (isTyping) return;
    if (walkthroughStep >= WALKTHROUGH_STEPS.length - 1) {
      // Already on last step — summary will auto-fire
      return;
    }
    advanceWalkthrough();
  }

  function handlePrevious() {
    if (isTyping) return;
    retreatWalkthrough();
  }

  function handleStop() {
    if (typingRef.current) {
      clearInterval(typingRef.current);
      typingRef.current = null;
    }
    setIsTyping(false);
    stopWalkthrough();
  }

  if (!walkthroughActive) return null;

  const currentStep = WALKTHROUGH_STEPS[walkthroughStep];
  const isFirstStep = walkthroughStep === 0;
  const isLastStep = walkthroughStep === WALKTHROUGH_STEPS.length - 1;

  return (
    <div
      style={{
        padding: "8px 16px 10px",
        borderTop: "1px solid var(--border)",
        backgroundColor: "color-mix(in srgb, var(--accent) 4%, var(--bg-card))",
      }}
    >
      {/* Progress dots */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
        {WALKTHROUGH_STEPS.map((step, idx) => (
          <button
            key={step.workspace}
            type="button"
            onClick={() => !isTyping && jumpToStep(idx)}
            title={step.label}
            style={{
              width: idx === walkthroughStep ? "16px" : "6px",
              height: "6px",
              borderRadius: "3px",
              backgroundColor:
                idx < walkthroughStep
                  ? "var(--teal)"
                  : idx === walkthroughStep
                    ? "var(--accent)"
                    : "var(--border)",
              border: "none",
              padding: 0,
              cursor: isTyping ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
            }}
          />
        ))}
        <span
          style={{
            marginLeft: "auto",
            fontFamily: "'DM Mono', monospace",
            fontSize: "9px",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "var(--ink-muted)",
          }}
        >
          {walkthroughStep + 1}/{WALKTHROUGH_STEPS.length} · {currentStep?.label}
        </span>
      </div>

      {/* Navigation buttons */}
      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
        <button
          type="button"
          onClick={handlePrevious}
          disabled={isFirstStep || isTyping}
          style={navButtonStyle(isFirstStep || isTyping)}
        >
          ← Prev
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={isTyping || isLastStep}
          style={{
            ...navButtonStyle(isTyping || isLastStep),
            backgroundColor: isTyping || isLastStep ? "var(--bg)" : "var(--accent)",
            color: isTyping || isLastStep ? "var(--ink-muted)" : "var(--text-inverse)",
            borderColor: isTyping || isLastStep ? "var(--border)" : "var(--accent)",
          }}
        >
          {isTyping ? "Analyzing…" : isLastStep ? "Finishing…" : "Continue →"}
        </button>
        <button
          type="button"
          onClick={handleStop}
          style={{
            ...navButtonStyle(false),
            marginLeft: "auto",
          }}
        >
          Stop
        </button>
      </div>
    </div>
  );
}

function navButtonStyle(disabled: boolean): CSSProperties {
  return {
    fontFamily: "'DM Mono', monospace",
    fontSize: "10px",
    fontWeight: 500,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    padding: "5px 10px",
    borderRadius: "4px",
    border: "1px solid var(--border)",
    backgroundColor: "var(--bg)",
    color: disabled ? "var(--ink-muted)" : "var(--ink)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: "opacity 0.15s, background-color 0.15s",
  };
}
