"use client";

import { Fragment, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Lightbulb,
  Send,
  Sparkles,
  Square,
  X,
  Check,
} from "lucide-react";
import {
  CONCEPT_FIELDS,
  generateConceptDraft,
  type ConceptFieldKey,
} from "@/lib/ai/concept-coach";
import type { ProjectConceptRow } from "@/lib/db/project-concepts";
import type { Project } from "@/types";
import { updateProjectConceptAction } from "@/actions/project-concepts";
import { toast } from "@/lib/ui/toast";

type Props = {
  project: Project;
  concept: ProjectConceptRow | null;
};

type CoachMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Which field the assistant drafted, if any. Enables the Apply button. */
  fieldKey?: ConceptFieldKey;
  /** True while tokens are still streaming in. */
  streaming?: boolean;
};

const HOUSE_EASE = [0.16, 1, 0.3, 1] as const;

function uid(): string {
  return `m-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

/** Yields the full response in small chunks (by word). Mirrors the AI-SDK
 *  streaming contract so swapping to a real Claude call later stays a
 *  one-function change. */
async function streamDraft(
  full: string,
  onToken: (token: string) => void,
  signal: AbortSignal
): Promise<void> {
  const words = full.split(/(\s+)/);
  for (let i = 0; i < words.length; i++) {
    if (signal.aborted) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 14 + Math.random() * 22));
    onToken(words[i]);
  }
}

/** Minimal inline markdown renderer — bold (**…**) + bullet lists + numbered
 *  lists + paragraphs. Good enough for the coach's structured drafts and avoids
 *  a markdown-parser dependency. */
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^- /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^- /.test(lines[i])) {
        items.push(lines[i].slice(2));
        i++;
      }
      nodes.push(
        <ul key={`ul-${i}`} style={{ margin: "6px 0 10px", paddingLeft: "18px" }}>
          {items.map((item, idx) => (
            <li key={idx} style={{ margin: "2px 0", lineHeight: 1.6 }}>
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      nodes.push(
        <ol key={`ol-${i}`} style={{ margin: "6px 0 10px", paddingLeft: "22px" }}>
          {items.map((item, idx) => (
            <li key={idx} style={{ margin: "2px 0", lineHeight: 1.6 }}>
              {renderInline(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }
    if (line.trim() === "") {
      nodes.push(<div key={`sp-${i}`} style={{ height: "6px" }} />);
      i++;
      continue;
    }
    nodes.push(
      <p key={`p-${i}`} style={{ margin: "0 0 8px", lineHeight: 1.65 }}>
        {renderInline(line)}
      </p>
    );
    i++;
  }
  return nodes;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} style={{ color: "var(--ink)", fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("_") && part.endsWith("_")) {
      return <em key={i} style={{ color: "var(--ink-mid)" }}>{part.slice(1, -1)}</em>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export function ConceptCoach({ project, concept }: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<CoachMessage[]>([
    {
      id: "intro",
      role: "assistant",
      content: `I'm the **Concept Coach**. I'll draft framing for **${project.name}** in the seven concept fields — thesis, sponsor rationale, target outcome, known unknowns, fatal flaws, next actions, and a go / no-go stance.\n\nPick a field below to generate a first pass grounded in this project's real data. Every draft is editable before you apply it.`,
    },
  ]);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [applyingField, setApplyingField] = useState<ConceptFieldKey | null>(null);
  const [isApplying, startApply] = useTransition();
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll the message list as content streams in.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const runField = useCallback(
    async (fieldKey: ConceptFieldKey, label: string) => {
      if (streamingId) return;
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const userMsg: CoachMessage = {
        id: uid(),
        role: "user",
        content: `Draft the ${label}.`,
      };
      const assistantId = uid();
      const placeholder: CoachMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        fieldKey,
        streaming: true,
      };
      setMessages((prev) => [...prev, userMsg, placeholder]);
      setStreamingId(assistantId);

      const fullText = generateConceptDraft(fieldKey, { project, concept });
      try {
        await streamDraft(
          fullText,
          (token) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + token } : m))
            );
          },
          ctrl.signal
        );
      } finally {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m))
        );
        setStreamingId((id) => (id === assistantId ? null : id));
        abortRef.current = null;
      }
    },
    [streamingId, project, concept]
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages((prev) =>
      prev.map((m) => (m.id === streamingId ? { ...m, streaming: false } : m))
    );
    setStreamingId(null);
  }, [streamingId]);

  const applyDraft = useCallback(
    (fieldKey: ConceptFieldKey, content: string) => {
      setApplyingField(fieldKey);
      startApply(async () => {
        const result = await updateProjectConceptAction({
          projectId: project.id,
          slug: project.slug,
          [fieldKey]: content,
        });
        if (!result.ok) {
          toast.error(result.error.message);
          setApplyingField(null);
          return;
        }
        const label = CONCEPT_FIELDS.find((f) => f.key === fieldKey)?.label ?? "field";
        toast.success(`${label} updated`);
        setApplyingField(null);
        router.refresh();
      });
    },
    [project.id, project.slug, router]
  );

  const existingValue = (key: ConceptFieldKey): string | null => {
    const value = concept?.[key];
    return typeof value === "string" && value.trim().length > 0 ? value : null;
  };

  return (
    <section
      aria-label="Concept coach"
      style={{
        border: "1px solid var(--border)",
        borderRadius: "14px",
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--teal) 4%, var(--bg-card)) 0%, var(--bg-card) 100%)",
        padding: "20px 22px",
        marginBottom: "22px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            aria-hidden="true"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              backgroundColor: "color-mix(in srgb, var(--teal) 14%, transparent)",
              border: "1px solid color-mix(in srgb, var(--teal) 40%, transparent)",
              color: "var(--teal)",
            }}
          >
            <Sparkles size={16} strokeWidth={1.8} />
          </span>
          <div>
            <p className="eyebrow" style={{ margin: 0, color: "var(--teal)" }}>
              Beacon · Concept coach
            </p>
            <h3
              style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: "20px",
                fontWeight: 400,
                color: "var(--ink)",
                margin: "2px 0 0",
                lineHeight: 1.2,
              }}
            >
              AI-guided deal framing
            </h3>
          </div>
        </div>
      </div>

      {/* Field action row */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {CONCEPT_FIELDS.map((field) => {
          const filled = existingValue(field.key) !== null;
          const active = streamingId !== null;
          return (
            <button
              key={field.key}
              type="button"
              onClick={() => runField(field.key, field.label.toLowerCase())}
              disabled={active}
              title={field.hint}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 11px",
                border: "1px solid var(--border)",
                borderRadius: "999px",
                backgroundColor: filled
                  ? "color-mix(in srgb, var(--teal) 8%, var(--bg-card))"
                  : "var(--bg-card)",
                color: "var(--ink)",
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: active ? "not-allowed" : "pointer",
                opacity: active ? 0.5 : 1,
                transition: "background-color 150ms cubic-bezier(0.16, 1, 0.3, 1), border-color 150ms cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              {filled ? <Check size={11} strokeWidth={2} /> : <Lightbulb size={11} strokeWidth={1.8} />}
              {filled ? `Rewrite ${field.label}` : `Draft ${field.label}`}
            </button>
          );
        })}
      </div>

      {/* Message list */}
      <div
        ref={listRef}
        style={{
          maxHeight: "380px",
          overflowY: "auto",
          padding: "2px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {messages.map((message) => (
          <CoachMessageBubble
            key={message.id}
            message={message}
            canApply={
              message.role === "assistant" &&
              message.fieldKey !== undefined &&
              !message.streaming &&
              message.content.trim().length > 0
            }
            isApplyingThis={
              isApplying && applyingField === message.fieldKey
            }
            onApply={() => {
              if (!message.fieldKey) return;
              applyDraft(message.fieldKey, message.content);
            }}
            onDismiss={() => {
              setMessages((prev) => prev.filter((m) => m.id !== message.id));
            }}
          />
        ))}
      </div>

      {/* Stream control */}
      {streamingId !== null && (
        <div>
          <button
            type="button"
            onClick={stopStreaming}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 10px",
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ink-muted)",
              backgroundColor: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            <Square size={10} strokeWidth={2} />
            Stop
          </button>
        </div>
      )}

      {/* Footnote */}
      <p
        style={{
          margin: 0,
          fontFamily: "'DM Mono', monospace",
          fontSize: "9px",
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: "var(--ink-muted)",
        }}
      >
        Drafts are editable · apply drops the full draft into the matching concept field
      </p>
    </section>
  );
}

// ── Message bubble ───────────────────────────────────────────────────────────

function CoachMessageBubble({
  message,
  canApply,
  isApplyingThis,
  onApply,
  onDismiss,
}: {
  message: CoachMessage;
  canApply: boolean;
  isApplyingThis: boolean;
  onApply: () => void;
  onDismiss: () => void;
}) {
  const isAssistant = message.role === "assistant";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isAssistant ? "flex-start" : "flex-end",
      }}
    >
      <div
        style={{
          maxWidth: "92%",
          padding: "12px 14px",
          borderRadius: "10px",
          background: isAssistant
            ? "var(--bg-card)"
            : "color-mix(in srgb, var(--ink) 6%, var(--bg-card))",
          border: `1px solid ${isAssistant ? "var(--border)" : "color-mix(in srgb, var(--ink) 14%, var(--border))"}`,
          fontFamily: "'Inter', sans-serif",
          fontSize: "13.5px",
          color: "var(--ink)",
          lineHeight: 1.55,
        }}
      >
        {renderMarkdown(message.content || "Thinking…")}
        {message.streaming && (
          <span
            aria-hidden="true"
            style={{
              display: "inline-block",
              width: "6px",
              height: "14px",
              marginLeft: "2px",
              verticalAlign: "-2px",
              backgroundColor: "var(--teal)",
              animation: "ls-skeleton-pulse 1.2s ease-in-out infinite",
            }}
          />
        )}
      </div>
      {canApply && (
        <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
          <button
            type="button"
            onClick={onApply}
            disabled={isApplyingThis}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 10px",
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-inverse)",
              backgroundColor: "var(--teal)",
              border: "1px solid var(--teal)",
              borderRadius: "6px",
              cursor: isApplyingThis ? "not-allowed" : "pointer",
              opacity: isApplyingThis ? 0.6 : 1,
              transition: "opacity 150ms cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <Send size={10} strokeWidth={2} />
            {isApplyingThis ? "Applying…" : "Apply to field"}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            disabled={isApplyingThis}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 10px",
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ink-muted)",
              backgroundColor: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              cursor: isApplyingThis ? "not-allowed" : "pointer",
            }}
          >
            <X size={10} strokeWidth={2} />
            Discard
          </button>
        </div>
      )}
    </div>
  );
}
