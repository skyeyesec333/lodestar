"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { addRequirementNoteAction } from "@/actions/requirements";
import type { RequirementNoteRow } from "@/lib/db/requirements";

export interface RequirementNotesQuickInputProps {
  projectId: string;
  requirementId: string;
  currentStatus: string;
  notes: RequirementNoteRow[];
  canEdit: boolean;
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

export function RequirementNotesQuickInput({
  projectId,
  requirementId,
  currentStatus,
  notes: initialNotes,
  canEdit,
}: RequirementNotesQuickInputProps) {
  const [notes, setNotes] = useState<RequirementNoteRow[]>(initialNotes);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const latestNote = notes[0] ?? null;

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  function submit() {
    const text = draft.trim();
    if (!text || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await addRequirementNoteAction({
        projectId,
        requirementId,
        note: text,
        statusSnapshot: currentStatus,
      });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setNotes((prev) => [result.value, ...prev]);
      setDraft("");
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  }

  function handleBlur() {
    if (draft.trim()) submit();
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        fontSize: "11px",
        lineHeight: "1.4",
      }}
    >
      {/* Note count badge */}
      {notes.length > 0 && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "3px",
            padding: "1px 6px",
            borderRadius: "99px",
            border: "1px solid var(--border)",
            background: "var(--bg-card)",
            color: "var(--ink-muted)",
            fontSize: "10px",
            fontWeight: 500,
            width: "fit-content",
          }}
        >
          {notes.length} note{notes.length !== 1 ? "s" : ""}
        </span>
      )}

      {/* Latest note preview */}
      {latestNote && (
        <p
          style={{
            margin: 0,
            color: "var(--ink-muted)",
            fontStyle: "italic",
            fontSize: "11px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "100%",
          }}
          title={latestNote.note}
        >
          {truncate(latestNote.note, 80)}
        </p>
      )}

      {/* Quick input (edit mode only) */}
      {canEdit && (
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder="Add a note…"
            disabled={pending}
            style={{
              width: "100%",
              padding: "3px 7px",
              fontSize: "11px",
              lineHeight: "1.5",
              border: "1px solid var(--border)",
              borderRadius: "3px",
              background: pending ? "var(--bg)" : "var(--bg-card)",
              color: pending ? "var(--ink-muted)" : "var(--ink)",
              outline: "none",
              cursor: pending ? "wait" : "text",
              boxSizing: "border-box",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--border-strong)";
            }}
            onBlurCapture={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
            }}
            aria-label="Add a quick note to this requirement"
          />
          {error && (
            <p
              style={{
                margin: 0,
                fontSize: "10px",
                color: "var(--red, #c0392b)",
              }}
            >
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
