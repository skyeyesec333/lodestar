"use client";

import { useState } from "react";

type Props = { token: string };

export function FeedbackForm({ token }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/share/${token}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed to submit feedback." }));
        setError(data.error ?? "Failed to submit feedback.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div
        style={{
          padding: "24px",
          border: "1px solid color-mix(in srgb, var(--teal, #2ba37a) 30%, var(--border, #e5e7eb))",
          borderRadius: "12px",
          backgroundColor: "color-mix(in srgb, var(--teal, #2ba37a) 5%, var(--bg-card, #ffffff))",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "var(--teal, #2ba37a)",
            margin: "0 0 8px",
          }}
        >
          Feedback received
        </p>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "14px",
            color: "var(--ink-mid, #6b7280)",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          Thank you for your feedback. The project team will be notified.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        border: "1px solid var(--border, #e5e7eb)",
        borderRadius: "12px",
        backgroundColor: "var(--bg-card, #ffffff)",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--border, #e5e7eb)" }}>
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "var(--ink-muted, #9ca3af)",
            margin: "0 0 4px",
          }}
        >
          Have feedback?
        </p>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "13px",
            color: "var(--ink-mid, #6b7280)",
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          Send a message to the project team directly from this data room.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: "16px 20px 20px", display: "grid", gap: "12px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "13px",
              padding: "10px 14px",
              border: "1px solid var(--border, #e5e7eb)",
              borderRadius: "8px",
              backgroundColor: "var(--bg, #f9f8f6)",
              color: "var(--ink, #111827)",
              outline: "none",
            }}
          />
          <input
            type="email"
            placeholder="Email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "13px",
              padding: "10px 14px",
              border: "1px solid var(--border, #e5e7eb)",
              borderRadius: "8px",
              backgroundColor: "var(--bg, #f9f8f6)",
              color: "var(--ink, #111827)",
              outline: "none",
            }}
          />
        </div>
        <textarea
          placeholder="Your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={4}
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "13px",
            padding: "10px 14px",
            border: "1px solid var(--border, #e5e7eb)",
            borderRadius: "8px",
            backgroundColor: "var(--bg, #f9f8f6)",
            color: "var(--ink, #111827)",
            outline: "none",
            resize: "vertical",
            minHeight: "80px",
          }}
        />

        {error && (
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "12px",
              color: "var(--accent, #e05252)",
              margin: 0,
            }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !message.trim()}
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            fontWeight: 500,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            padding: "10px 20px",
            borderRadius: "999px",
            border: "1px solid var(--teal, #2ba37a)",
            backgroundColor: "var(--teal, #2ba37a)",
            color: "#ffffff",
            cursor: isSubmitting ? "wait" : "pointer",
            opacity: isSubmitting || !message.trim() ? 0.6 : 1,
            justifySelf: "start",
            transition: "opacity 0.12s ease",
          }}
        >
          {isSubmitting ? "Sending..." : "Send Feedback"}
        </button>
      </form>
    </div>
  );
}
