"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDemoPortfolio, resetDemoPortfolio } from "@/actions/projects";

type Props = {
  /** If the user already has demo projects in their portfolio, offer a reset instead of create. */
  hasExistingDemo: boolean;
};

const baseButtonStyle: React.CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "11px",
  fontWeight: 500,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  color: "var(--ink)",
  backgroundColor: "var(--bg-card)",
  padding: "10px 20px",
  borderRadius: "3px",
  border: "1px solid var(--border)",
  cursor: "pointer",
};

export function CreateDemoProjectButton({ hasExistingDemo }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  function runCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createDemoPortfolio();
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      router.push(`/projects/${result.value.slug}`);
      router.refresh();
    });
  }

  function runReset() {
    setError(null);
    setConfirming(false);
    startTransition(async () => {
      const result = await resetDemoPortfolio();
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      router.push(`/projects/${result.value.slug}`);
      router.refresh();
    });
  }

  return (
    <div style={{ display: "grid", gap: "8px" }}>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {!hasExistingDemo ? (
          <button
            type="button"
            onClick={runCreate}
            disabled={isPending}
            style={{
              ...baseButtonStyle,
              cursor: isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.7 : 1,
            }}
          >
            {isPending ? "Creating Demo Portfolio…" : "Create Demo Portfolio"}
          </button>
        ) : confirming ? (
          <>
            <button
              type="button"
              onClick={runReset}
              disabled={isPending}
              style={{
                ...baseButtonStyle,
                color: "var(--text-inverse)",
                backgroundColor: "var(--accent)",
                border: "1px solid var(--accent)",
                cursor: isPending ? "not-allowed" : "pointer",
                opacity: isPending ? 0.7 : 1,
              }}
            >
              {isPending ? "Resetting…" : "Confirm reset"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={isPending}
              style={{
                ...baseButtonStyle,
                color: "var(--ink-muted)",
                backgroundColor: "transparent",
                cursor: isPending ? "not-allowed" : "pointer",
                opacity: isPending ? 0.7 : 1,
              }}
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={isPending}
            style={{
              ...baseButtonStyle,
              cursor: isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.7 : 1,
            }}
            title="Deletes existing demo projects and recreates them with fresh stakeholder data."
          >
            Reset Demo Portfolio
          </button>
        )}
      </div>

      {confirming && (
        <p
          style={{
            margin: 0,
            fontFamily: "'Inter', sans-serif",
            fontSize: "12px",
            color: "var(--ink-muted)",
            lineHeight: 1.5,
            maxWidth: "360px",
          }}
        >
          This will delete your demo projects (and their orgs, stakeholders, meetings, etc.) and
          recreate a fresh portfolio. Non-demo projects are untouched.
        </p>
      )}

      {error && (
        <p
          style={{
            margin: 0,
            fontFamily: "'Inter', sans-serif",
            fontSize: "12px",
            color: "var(--accent)",
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
