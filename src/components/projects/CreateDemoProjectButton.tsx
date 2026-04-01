"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDemoProject } from "@/actions/projects";

export function CreateDemoProjectButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCreateDemo() {
    setError(null);

    startTransition(async () => {
      const result = await createDemoProject();
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
        <button
          type="button"
          onClick={handleCreateDemo}
          disabled={isPending}
          style={{
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
            cursor: isPending ? "not-allowed" : "pointer",
            opacity: isPending ? 0.7 : 1,
          }}
        >
          {isPending ? "Creating Demo Project…" : "Create Demo Project"}
        </button>
      </div>

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
