"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { OverdueLoiProject } from "@/lib/db/projects";

const SESSION_KEY = "loi-overdue-banner-dismissed";

interface Props {
  projects: OverdueLoiProject[];
}

export function LoiOverdueBanner({ projects }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem(SESSION_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  if (!visible) return null;

  const count = projects.length;

  function handleDismiss() {
    sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(false);
  }

  return (
    <div
      role="alert"
      style={{
        backgroundColor: "var(--gold-soft)",
        borderBottom: "1px solid var(--border-strong)",
        padding: "10px 32px",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: "'DM Mono', monospace",
            fontSize: "12px",
            fontWeight: 500,
            letterSpacing: "0.04em",
            color: "var(--ink)",
          }}
        >
          {count === 1
            ? "1 deal has passed its LOI target date — "
            : `${count} deals have passed their LOI target date — `}
          {projects.map((p, i) => (
            <span key={p.id}>
              {i > 0 && ", "}
              <Link
                href={`/projects/${p.slug}`}
                style={{ color: "var(--accent)", textDecoration: "underline" }}
              >
                {p.name}
              </Link>
            </span>
          ))}
        </p>

        <button
          onClick={handleDismiss}
          aria-label="Dismiss LOI overdue alert"
          style={{
            flexShrink: 0,
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "'DM Mono', monospace",
            fontSize: "18px",
            lineHeight: 1,
            color: "var(--ink)",
            padding: "0 4px",
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
