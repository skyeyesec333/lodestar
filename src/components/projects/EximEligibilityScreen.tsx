"use client";

import { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Q2Answer = "yes" | "no" | "unsure";
type Q3Answer = "yes" | "no" | "check";
type Q4Answer = "power" | "mining" | "water" | "transport" | "telecom" | "other";

interface Answers {
  q1: boolean | null;
  q2: Q2Answer | null;
  q3: Q3Answer | null;
  q4: Q4Answer | null;
}

export interface EligibilityResult {
  passed: boolean;
  sector: Q4Answer | null;
  advisories: string[];
}

interface Props {
  onPass: (result: EligibilityResult) => void;
  onExit: () => void;
}

// ─── Question data ────────────────────────────────────────────────────────────

const QUESTIONS = [1, 2, 3, 4] as const;

// ─── Styles ───────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 100,
  backgroundColor: "var(--bg)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "560px",
  backgroundColor: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  padding: "40px",
};

const eyebrowStyle: React.CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "10px",
  fontWeight: 500,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--ink-muted)",
  marginBottom: "8px",
};

const headingStyle: React.CSSProperties = {
  fontFamily: "'DM Serif Display', Georgia, serif",
  fontSize: "28px",
  fontWeight: 400,
  color: "var(--ink)",
  margin: "0 0 28px",
  lineHeight: 1.25,
};

const bodyStyle: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: "15px",
  color: "var(--ink-mid)",
  lineHeight: 1.7,
  margin: "0 0 12px",
};

const optionBaseStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  fontFamily: "'DM Mono', monospace",
  fontSize: "12px",
  fontWeight: 500,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  padding: "14px 18px",
  border: "1px solid var(--border)",
  borderRadius: "4px",
  backgroundColor: "transparent",
  color: "var(--ink)",
  cursor: "pointer",
  transition: "border-color 0.15s, background-color 0.15s",
  marginBottom: "10px",
};

const optionSelectedStyle: React.CSSProperties = {
  ...optionBaseStyle,
  borderColor: "var(--teal)",
  backgroundColor: "var(--teal-soft)",
  color: "var(--teal)",
};

const primaryButtonStyle: React.CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "11px",
  fontWeight: 500,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  color: "var(--text-inverse)",
  backgroundColor: "var(--teal)",
  border: "none",
  borderRadius: "3px",
  padding: "14px 24px",
  cursor: "pointer",
  transition: "opacity 0.15s",
};

const dangerButtonStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  backgroundColor: "var(--accent)",
};

const ghostButtonStyle: React.CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "11px",
  fontWeight: 500,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  color: "var(--ink-muted)",
  backgroundColor: "transparent",
  border: "1px solid var(--border)",
  borderRadius: "3px",
  padding: "14px 24px",
  cursor: "pointer",
};

const backLinkStyle: React.CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "11px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--ink-muted)",
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
  textDecoration: "underline",
};

const advisoryBoxStyle: React.CSSProperties = {
  backgroundColor: "var(--gold-soft)",
  border: "1px solid var(--gold)",
  borderRadius: "4px",
  padding: "12px 16px",
  marginBottom: "20px",
};

const advisoryTextStyle: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: "13px",
  color: "var(--ink-mid)",
  margin: 0,
  lineHeight: 1.6,
};

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ marginBottom: "32px" }}>
      <div
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "10px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--ink-muted)",
          marginBottom: "10px",
        }}
      >
        {current} of {total}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${total}, 1fr)`,
          gap: "4px",
        }}
      >
        {QUESTIONS.map((n) => (
          <div
            key={n}
            style={{
              height: "3px",
              borderRadius: "2px",
              backgroundColor: n <= current ? "var(--teal)" : "var(--border)",
              transition: "background-color 0.25s",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Option button ────────────────────────────────────────────────────────────

function OptionButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const style: React.CSSProperties = selected
    ? optionSelectedStyle
    : hovered
      ? { ...optionBaseStyle, borderColor: "var(--teal)" }
      : optionBaseStyle;

  return (
    <button
      type="button"
      style={style}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {label}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EximEligibilityScreen({ onPass, onExit }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | "pass" | "fail">(1);
  const [answers, setAnswers] = useState<Answers>({
    q1: null,
    q2: null,
    q3: null,
    q4: null,
  });
  const [advisories, setAdvisories] = useState<string[]>([]);
  const [failReason, setFailReason] = useState<string>("");
  const [visible, setVisible] = useState(true);
  const [contentVisible, setContentVisible] = useState(false);

  useEffect(() => {
    setContentVisible(false);
    const frame = window.requestAnimationFrame(() => {
      setContentVisible(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [step]);

  function addAdvisory(note: string) {
    setAdvisories((prev) =>
      prev.includes(note) ? prev : [...prev, note]
    );
  }

  function triggerFail(reason: string) {
    setFailReason(reason);
    setStep("fail");
  }

  function reset() {
    setStep(1);
    setAnswers({ q1: null, q2: null, q3: null, q4: null });
    setAdvisories([]);
    setFailReason("");
  }

  // Q1 handlers
  function handleQ1(answer: boolean) {
    setAnswers((prev) => ({ ...prev, q1: answer }));
    if (!answer) {
      addAdvisory(
        "EXIM project finance is designed for greenfield deals. Expansions or refinancings of existing businesses typically don't qualify. Confirm eligibility with an EXIM officer before investing significant time in this workspace."
      );
    }
    setStep(2);
  }

  // Q2 handlers
  function handleQ2(answer: Q2Answer) {
    setAnswers((prev) => ({ ...prev, q2: answer }));
    if (answer === "no") {
      triggerFail(
        "EXIM's guarantee requires that the Engineering, Procurement & Construction contractor sources more than 51% of the deal value from US goods and services. Without a qualifying EPC, EXIM support is not available."
      );
    } else {
      if (answer === "unsure") {
        addAdvisory(
          "EPC eligibility is unconfirmed. Verify that your EPC contractor can meet the >51% US content requirement before advancing to LOI."
        );
      }
      setStep(3);
    }
  }

  // Q3 handlers
  function handleQ3(answer: Q3Answer) {
    setAnswers((prev) => ({ ...prev, q3: answer }));
    if (answer === "no") {
      triggerFail(
        "EXIM cannot provide financing for deals in countries that are closed or restricted on its Country Limitation Schedule. Check the CLS before proceeding."
      );
    } else {
      if (answer === "check") {
        addAdvisory(
          "CLS status has not been confirmed. Verify the deal country is open on EXIM's Country Limitation Schedule before investing significant time in the workspace."
        );
      }
      setStep(4);
    }
  }

  // Q4 handlers
  function handleQ4(answer: Q4Answer) {
    setAnswers((prev) => ({ ...prev, q4: answer }));
    if (answer === "other") {
      addAdvisory(
        "EXIM's project finance experience is strongest in power, mining, and infrastructure. For other sectors, confirm eligibility with an EXIM officer before investing significant time."
      );
    }
    setStep("pass");
  }

  if (!visible) return null;

  return (
    <div style={overlayStyle}>
      <div style={{ ...cardStyle, opacity: 1, transition: "opacity 0.2s" }}>
        {/* ── Questions ── */}
        {(step === 1 || step === 2 || step === 3 || step === 4) && (
          <div
            style={{
              opacity: contentVisible ? 1 : 0,
              transform: contentVisible ? "translateY(0)" : "translateY(8px)",
              transition: "opacity 0.22s ease, transform 0.22s ease",
            }}
          >
            <ProgressBar current={step as number} total={4} />

            {step === 1 && (
              <div>
                <p style={eyebrowStyle}>Eligibility Pre-Screen</p>
                <h2 style={headingStyle}>
                  Is this a new (greenfield) deal, not an expansion of an
                  existing business?
                </h2>
                <OptionButton
                  label="Yes, it's a new deal"
                  selected={answers.q1 === true}
                  onClick={() => handleQ1(true)}
                />
                <OptionButton
                  label="No, it's an expansion or refinancing"
                  selected={answers.q1 === false}
                  onClick={() => handleQ1(false)}
                />
                <div
                  style={{
                    marginTop: "24px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div />
                  <button
                    type="button"
                    style={backLinkStyle}
                    onClick={onExit}
                  >
                    ← Cancel
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <p style={eyebrowStyle}>Eligibility Pre-Screen</p>
                <h2 style={headingStyle}>
                  Can the deal be structured with a US-content-eligible EPC
                  contractor (&gt;51% US goods and services)?
                </h2>
                <OptionButton
                  label="Yes"
                  selected={answers.q2 === "yes"}
                  onClick={() => handleQ2("yes")}
                />
                <OptionButton
                  label="No"
                  selected={answers.q2 === "no"}
                  onClick={() => handleQ2("no")}
                />
                <OptionButton
                  label="Unsure"
                  selected={answers.q2 === "unsure"}
                  onClick={() => handleQ2("unsure")}
                />
                <div
                  style={{
                    marginTop: "24px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <button
                    type="button"
                    style={backLinkStyle}
                    onClick={() => setStep(1)}
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    style={backLinkStyle}
                    onClick={onExit}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <p style={eyebrowStyle}>Eligibility Pre-Screen</p>
                <h2 style={headingStyle}>
                  Is the deal located in a country currently open under
                  EXIM's Country Limitation Schedule (CLS)?
                </h2>
                <OptionButton
                  label="Yes"
                  selected={answers.q3 === "yes"}
                  onClick={() => handleQ3("yes")}
                />
                <OptionButton
                  label="No"
                  selected={answers.q3 === "no"}
                  onClick={() => handleQ3("no")}
                />
                <OptionButton
                  label="I need to check"
                  selected={answers.q3 === "check"}
                  onClick={() => handleQ3("check")}
                />
                <div
                  style={{
                    marginTop: "24px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <button
                    type="button"
                    style={backLinkStyle}
                    onClick={() => setStep(2)}
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    style={backLinkStyle}
                    onClick={onExit}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <p style={eyebrowStyle}>Eligibility Pre-Screen</p>
                <h2 style={headingStyle}>What is the deal sector?</h2>
                <OptionButton
                  label="Power / Energy"
                  selected={answers.q4 === "power"}
                  onClick={() => handleQ4("power")}
                />
                <OptionButton
                  label="Mining / Extractives"
                  selected={answers.q4 === "mining"}
                  onClick={() => handleQ4("mining")}
                />
                <OptionButton
                  label="Water / Infrastructure"
                  selected={answers.q4 === "water"}
                  onClick={() => handleQ4("water")}
                />
                <OptionButton
                  label="Transportation"
                  selected={answers.q4 === "transport"}
                  onClick={() => handleQ4("transport")}
                />
                <OptionButton
                  label="Telecommunications"
                  selected={answers.q4 === "telecom"}
                  onClick={() => handleQ4("telecom")}
                />
                <OptionButton
                  label="Other"
                  selected={answers.q4 === "other"}
                  onClick={() => handleQ4("other")}
                />
                <div
                  style={{
                    marginTop: "24px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <button
                    type="button"
                    style={backLinkStyle}
                    onClick={() => setStep(3)}
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    style={backLinkStyle}
                    onClick={onExit}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Pass state ── */}
        {step === "pass" && (
          <div
            style={{
              opacity: contentVisible ? 1 : 0,
              transform: contentVisible ? "translateY(0)" : "translateY(8px)",
              transition: "opacity 0.22s ease, transform 0.22s ease",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: "var(--teal-soft)",
                border: "1px solid var(--teal)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "20px",
                fontSize: "18px",
              }}
            >
              ✓
            </div>
            <p
              style={{
                ...eyebrowStyle,
                color: "var(--teal)",
              }}
            >
              Eligibility Check Complete
            </p>
            <h2
              style={{
                ...headingStyle,
                color: "var(--ink)",
              }}
            >
              This deal appears EXIM-eligible
            </h2>

            {advisories.length > 0 && (
              <div style={advisoryBoxStyle}>
                <p
                  style={{
                    ...advisoryTextStyle,
                    fontWeight: 600,
                    marginBottom: "8px",
                  }}
                >
                  Advisory notes:
                </p>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: "18px",
                    listStyle: "disc",
                  }}
                >
                  {advisories.map((note, i) => (
                    <li key={i} style={advisoryTextStyle}>
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {advisories.length === 0 && (
              <p style={bodyStyle}>
                All pre-screen questions passed. You can proceed to set up your
                deal in Lodestar.
              </p>
            )}

            <div style={{ marginTop: "28px" }}>
              <button
                type="button"
                style={primaryButtonStyle}
                onClick={() =>
                  onPass({ passed: true, sector: answers.q4, advisories })
                }
              >
                Return to Workspace Setup →
              </button>
            </div>
          </div>
        )}

        {/* ── Fail state ── */}
        {step === "fail" && (
          <div
            style={{
              opacity: contentVisible ? 1 : 0,
              transform: contentVisible ? "translateY(0)" : "translateY(8px)",
              transition: "opacity 0.22s ease, transform 0.22s ease",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: "var(--accent-soft)",
                border: "1px solid var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "20px",
                fontSize: "18px",
                color: "var(--accent)",
              }}
            >
              ✕
            </div>
            <p
              style={{
                ...eyebrowStyle,
                color: "var(--accent)",
              }}
            >
              EXIM Eligibility Issue
            </p>
            <h2
              style={{
                ...headingStyle,
                color: "var(--ink)",
              }}
            >
              This deal may not qualify for EXIM financing
            </h2>
            <p style={bodyStyle}>{failReason}</p>

            <div
              style={{
                marginTop: "28px",
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <button type="button" style={ghostButtonStyle} onClick={reset}>
                Start Over
              </button>
              <button
                type="button"
                style={dangerButtonStyle}
                onClick={() =>
                  onPass({
                    passed: false,
                    sector: answers.q4,
                    advisories: [
                      `Warning: ${failReason}`,
                      ...advisories,
                    ],
                  })
                }
              >
                Continue Anyway
              </button>
            </div>
            <div style={{ marginTop: "16px" }}>
              <button type="button" style={backLinkStyle} onClick={onExit}>
                ← Close Pre-Screen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
