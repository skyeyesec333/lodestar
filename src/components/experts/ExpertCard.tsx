"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import type { Expert } from "@/lib/experts/directory";

type TimingOption = "this_week" | "next_week" | "within_month" | "flexible";

const TIMING_OPTIONS: Array<{ value: TimingOption; label: string }> = [
  { value: "this_week", label: "This week" },
  { value: "next_week", label: "Next week" },
  { value: "within_month", label: "Within a month" },
  { value: "flexible", label: "Flexible" },
];

type RequestState =
  | { status: "idle" }
  | { status: "open" }
  | { status: "submitting" }
  | { status: "success" }
  | { status: "error"; message: string };

export function ExpertCard({ expert }: { expert: Expert }) {
  const [bioExpanded, setBioExpanded] = useState(false);
  const [requestState, setRequestState] = useState<RequestState>({ status: "idle" });
  const [context, setContext] = useState("");
  const [timing, setTiming] = useState<TimingOption>("flexible");

  const isOpen = requestState.status === "open" || requestState.status === "submitting" || requestState.status === "error";

  const handleOpenRequest = () => {
    setRequestState({ status: "open" });
    setContext("");
    setTiming("flexible");
  };

  const handleCancel = () => {
    setRequestState({ status: "idle" });
  };

  const handleSubmit = async () => {
    if (context.trim().length < 10) {
      setRequestState({ status: "error", message: "Please describe your situation in at least 10 characters." });
      return;
    }

    setRequestState({ status: "submitting" });

    try {
      const res = await fetch("/api/experts/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expertId: expert.id, context: context.trim(), timing }),
      });

      if (res.status === 401) {
        setRequestState({ status: "error", message: "You must be signed in to send a request." });
        return;
      }
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        setRequestState({ status: "error", message: body || "Something went wrong. Please try again." });
        return;
      }

      setRequestState({ status: "success" });
    } catch {
      setRequestState({ status: "error", message: "Network error. Please check your connection and try again." });
    }
  };

  const availabilityLabel =
    expert.availability === "available"
      ? "Available"
      : expert.availability === "limited"
      ? "Limited"
      : "Unavailable";

  const availabilityColor =
    expert.availability === "available"
      ? "var(--teal)"
      : expert.availability === "limited"
      ? "var(--gold)"
      : "var(--ink-muted)";

  const availabilityBg =
    expert.availability === "available"
      ? "var(--teal-soft)"
      : expert.availability === "limited"
      ? "var(--gold-soft)"
      : "var(--border)";

  const bioText = expert.bio;
  const bioShort = bioText.length > 160 ? bioText.slice(0, 160).trimEnd() + "…" : bioText;
  const showToggle = bioText.length > 160;

  return (
    <div
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "4px",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
        {expert.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={expert.avatarUrl}
            alt={expert.name}
            width={48}
            height={48}
            loading="lazy"
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              objectFit: "cover",
              border: `1px solid ${expert.avatarColor}`,
              flexShrink: 0,
              backgroundColor: expert.avatarBg,
            }}
          />
        ) : (
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: expert.avatarBg,
              border: `1px solid ${expert.avatarColor}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "13px",
                fontWeight: 500,
                color: expert.avatarColor,
                letterSpacing: "0.04em",
              }}
            >
              {expert.avatarInitials}
            </span>
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "15px",
              fontWeight: 600,
              color: "var(--ink)",
              margin: "0 0 3px",
            }}
          >
            {expert.name}
          </p>
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              color: "var(--ink-muted)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            {expert.title}
          </p>
        </div>
      </div>

      {/* Bio */}
      <div>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "13px",
            color: "var(--ink-muted)",
            lineHeight: 1.6,
            margin: "0 0 4px",
          }}
        >
          {bioExpanded ? bioText : bioShort}
        </p>
        {showToggle && (
          <button
            onClick={() => setBioExpanded(!bioExpanded)}
            style={textToggleButtonStyle}
          >
            {bioExpanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>

      {/* Specialization tags */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {expert.specializations.map((spec) => (
          <span
            key={spec}
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              fontWeight: 500,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "var(--ink-mid)",
              border: "1px solid var(--border)",
              borderRadius: "100px",
              padding: "3px 8px",
            }}
          >
            {spec}
          </span>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gap: "16px",
          marginTop: "auto",
        }}
      >
        {/* Stats row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink-muted)",
              }}
            >
              {expert.yearsExperience} yrs
            </span>
          </div>
          <div>
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink-muted)",
              }}
            >
              {expert.dealsClosed} deals closed
            </span>
          </div>
        </div>

        {/* Bottom row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "13px",
                fontWeight: 500,
                color: "var(--ink-mid)",
                letterSpacing: "0.04em",
              }}
            >
              ${expert.ratePerHour}/hr
            </span>

            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "9px",
                fontWeight: 500,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: availabilityColor,
                backgroundColor: availabilityBg,
                border: `1px solid ${availabilityColor}`,
                borderRadius: "2px",
                padding: "3px 7px",
              }}
            >
              {availabilityLabel}
            </span>
          </div>

          {!isOpen && requestState.status !== "success" && (
            <button
              onClick={handleOpenRequest}
              disabled={expert.availability === "unavailable"}
              style={
                expert.availability === "unavailable"
                  ? { ...requestBtnStyle, opacity: 0.45, cursor: "not-allowed" }
                  : requestBtnStyle
              }
            >
              Request Consultation
            </button>
          )}
        </div>
      </div>

      {/* Success state */}
      {requestState.status === "success" && (
        <div
          style={{
            backgroundColor: "var(--teal-soft)",
            border: "1px solid var(--teal)",
            borderRadius: "3px",
            padding: "14px 16px",
          }}
        >
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "13px",
              color: "var(--teal)",
              margin: 0,
            }}
          >
            Request sent. {expert.name} will be in touch within 48 hours.
          </p>
        </div>
      )}

      {/* Request form (inline expansion) */}
      {isOpen && (
        <div
          style={{
            borderTop: "1px solid var(--border)",
            paddingTop: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "var(--ink-muted)",
              margin: 0,
            }}
          >
            Request Consultation
          </p>

          <label style={{ display: "block" }}>
            <span style={formLabelStyle}>Describe your situation</span>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="What deal stage are you at? What specific issue do you need help with?"
              rows={4}
              style={textareaStyle}
            />
          </label>

          <label style={{ display: "block" }}>
            <span style={formLabelStyle}>Preferred timing</span>
            <select
              value={timing}
              onChange={(e) => setTiming(e.target.value as TimingOption)}
              style={selectStyle}
            >
              {TIMING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          {requestState.status === "error" && (
            <div
              style={{
                backgroundColor: "var(--accent-soft)",
                border: "1px solid var(--accent)",
                borderRadius: "3px",
                padding: "12px 14px",
              }}
            >
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "13px",
                  color: "var(--accent)",
                  margin: 0,
                }}
              >
                {requestState.message}
              </p>
            </div>
          )}

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={handleSubmit}
              disabled={requestState.status === "submitting"}
              style={
                requestState.status === "submitting"
                  ? { ...sendBtnStyle, opacity: 0.6, cursor: "not-allowed" }
                  : sendBtnStyle
              }
            >
              {requestState.status === "submitting" ? "Sending…" : "Send Request"}
            </button>
            <button
              onClick={handleCancel}
              disabled={requestState.status === "submitting"}
              style={cancelBtnStyle}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const textToggleButtonStyle: CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "10px",
  fontWeight: 500,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--teal)",
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
};

const requestBtnStyle: CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "10px",
  fontWeight: 500,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  color: "var(--text-inverse)",
  backgroundColor: "var(--teal)",
  border: "none",
  borderRadius: "3px",
  padding: "9px 16px",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const sendBtnStyle: CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "11px",
  fontWeight: 500,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  color: "var(--text-inverse)",
  backgroundColor: "var(--teal)",
  border: "none",
  borderRadius: "3px",
  padding: "10px 18px",
  cursor: "pointer",
};

const cancelBtnStyle: CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "11px",
  fontWeight: 500,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  color: "var(--ink-muted)",
  backgroundColor: "transparent",
  border: "1px solid var(--border)",
  borderRadius: "3px",
  padding: "9px 16px",
  cursor: "pointer",
};

const formLabelStyle: CSSProperties = {
  display: "block",
  fontFamily: "'DM Mono', monospace",
  fontSize: "10px",
  fontWeight: 500,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  color: "var(--ink-muted)",
  marginBottom: "6px",
};

const textareaStyle: CSSProperties = {
  width: "100%",
  fontFamily: "'Inter', sans-serif",
  fontSize: "13px",
  color: "var(--ink)",
  backgroundColor: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "3px",
  padding: "10px 12px",
  outline: "none",
  resize: "vertical",
  boxSizing: "border-box",
};

const selectStyle: CSSProperties = {
  width: "100%",
  fontFamily: "'Inter', sans-serif",
  fontSize: "13px",
  color: "var(--ink)",
  backgroundColor: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "3px",
  padding: "10px 12px",
  outline: "none",
};
