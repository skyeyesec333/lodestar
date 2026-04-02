"use client";

import { CSSProperties, useState, useTransition } from "react";
import { watchItemAction, unwatchItemAction } from "@/actions/watchers";
import type { WatchTargetType } from "@prisma/client";

interface WatchButtonProps {
  projectId: string;
  slug: string;
  targetType: WatchTargetType;
  targetId?: string | null;
  initialWatching: boolean;
  actorName?: string;
  /** "icon" = just the bell icon, "full" = icon + label */
  variant?: "icon" | "full";
}

export function WatchButton({
  projectId,
  slug,
  targetType,
  targetId = null,
  initialWatching,
  actorName,
  variant = "full",
}: WatchButtonProps) {
  const [watching, setWatching] = useState(initialWatching);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !watching;
    setWatching(next);

    startTransition(async () => {
      const input = { projectId, slug, targetType, targetId, actorName };
      const result = next ? await watchItemAction(input) : await unwatchItemAction(input);
      if (!result.ok) {
        // Revert on failure
        setWatching(!next);
      }
    });
  }

  const buttonStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: variant === "full" ? "5px 10px" : "5px",
    borderRadius: "6px",
    border: `1px solid ${watching ? "color-mix(in srgb, var(--accent) 40%, var(--border))" : "var(--border)"}`,
    background: watching ? "color-mix(in srgb, var(--accent) 8%, var(--bg-card))" : "var(--bg-card)",
    color: watching ? "var(--accent)" : "var(--ink-muted)",
    fontSize: "12px",
    fontWeight: watching ? 500 : 400,
    cursor: isPending ? "default" : "pointer",
    opacity: isPending ? 0.6 : 1,
    transition: "border-color 0.15s, background 0.15s, color 0.15s",
    userSelect: "none",
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      aria-label={watching ? "Unwatch this item" : "Watch this item"}
      aria-pressed={watching}
      style={buttonStyle}
    >
      <BellGlyph active={watching} />
      {variant === "full" && (
        <span>{watching ? "Watching" : "Watch"}</span>
      )}
    </button>
  );
}

function BellGlyph({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      aria-hidden="true"
      style={{ width: "13px", height: "13px", flexShrink: 0 }}
    >
      <path
        d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
