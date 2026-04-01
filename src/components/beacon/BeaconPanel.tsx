"use client";

import {
  CSSProperties,
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  UIEvent as ReactUIEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useBeacon, type BeaconTab } from "./BeaconProvider";
import type { ChatCitation, ChatRuntimeContext } from "@/types";
import type { ChatPresetQuestion } from "@/components/chat/ChatWidget";
import { getWorkspaceChatPresets } from "@/lib/ai/chat-presets";

// ─── Types ──────────────────────────────────────────────────────────────────

type ChatRole = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  citations?: readonly ChatCitation[];
}

type ChatStreamEvent =
  | { type: "text-delta"; text: string }
  | { type: "sources"; citations: ChatCitation[] }
  | { type: "done" };

export interface BeaconPanelProps {
  presetQuestions: readonly ChatPresetQuestion[];
  placeholder?: string;
  endpoint?: string;
  pageContext?: string;
  context?: ChatRuntimeContext;
  projectName?: string;
  dealType?: string;
  readinessPct?: number;
  loiBlockerCount?: number;
}

// ─── Mock data for non-assistant tabs ───────────────────────────────────────

const MOCK_SIGNALS = [
  {
    level: "critical" as const,
    label: "EPC Contract",
    detail: "3d overdue — no linked evidence",
    category: "Contracts",
  },
  {
    level: "critical" as const,
    label: "Financial Model",
    detail: "No assigned owner",
    category: "Financial",
  },
  {
    level: "warning" as const,
    label: "Off-take Agreement",
    detail: "Due in 12d",
    category: "Contracts",
  },
  {
    level: "warning" as const,
    label: "Environmental Impact Study",
    detail: "In progress — no linked file",
    category: "Studies",
  },
  {
    level: "info" as const,
    label: "Corporate Authorization",
    detail: "Draft stage",
    category: "Corporate",
  },
];

const MOCK_DOCUMENTS = [
  {
    category: "Contracts",
    covered: 2,
    total: 6,
    gap: ["EPC Contract", "Off-take Agreement", "Implementation Agreement", "Concession Agreement"],
  },
  {
    category: "Financial",
    covered: 1,
    total: 4,
    gap: ["Financial Model", "Financial Projections", "Debt Term Sheet"],
  },
  {
    category: "Studies",
    covered: 0,
    total: 3,
    gap: ["Environmental Impact Study", "Feasibility Study", "Market Study"],
  },
  {
    category: "Permits",
    covered: 3,
    total: 4,
    gap: ["Grid Connection Permit"],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseEventLine(line: string): ChatStreamEvent | null {
  try {
    const parsed = JSON.parse(line) as ChatStreamEvent;
    if (parsed && typeof parsed === "object" && "type" in parsed && typeof parsed.type === "string") {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

// ─── Glyphs ───────────────────────────────────────────────────────────────────

const glyphStyle: CSSProperties = { width: "16px", height: "16px", display: "block", flexShrink: 0 };

function BeaconGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ width: size, height: size, display: "block" }}
    >
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M19.07 4.93l-1.41 1.41M6.34 17.66l-1.41 1.41"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronRightGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={glyphStyle}>
      <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronLeftGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={glyphStyle}>
      <path d="m15 6-6 6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SendGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={glyphStyle}>
      <path
        d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SignalDotGlyph({ level }: { level: "critical" | "warning" | "info" }) {
  const color =
    level === "critical"
      ? "var(--color-critical, #ef4444)"
      : level === "warning"
        ? "var(--color-warning, #f59e0b)"
        : "var(--color-info, #3b82f6)";
  return (
    <span
      style={{
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        background: color,
        display: "inline-block",
        flexShrink: 0,
      }}
      aria-hidden="true"
    />
  );
}

// ─── Tab bar ─────────────────────────────────────────────────────────────────

const TABS: Array<{ id: BeaconTab; label: string }> = [
  { id: "assistant", label: "Assistant" },
  { id: "signals", label: "Signals" },
  { id: "documents", label: "Evidence" },
];

function TabBar({
  activeTab,
  onChange,
}: {
  activeTab: BeaconTab;
  onChange: (tab: BeaconTab) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Beacon tabs"
      style={{
        display: "flex",
        borderBottom: "1px solid var(--border)",
        padding: "0 16px",
      }}
    >
      {TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange(tab.id)}
            style={{
              flex: 1,
              padding: "10px 0",
              fontSize: "12px",
              fontWeight: isActive ? 600 : 400,
              color: isActive ? "var(--ink)" : "var(--ink-muted)",
              background: "none",
              border: "none",
              borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
              marginBottom: "-1px",
              cursor: "pointer",
              transition: "color 0.15s, border-color 0.15s",
              letterSpacing: "0.01em",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Assistant tab ────────────────────────────────────────────────────────────

function AssistantTab({
  presetQuestions,
  placeholder,
  endpoint,
  pageContext,
  context,
}: Pick<BeaconPanelProps, "presetQuestions" | "placeholder" | "endpoint" | "pageContext" | "context">) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPinnedToBottom, setIsPinnedToBottom] = useState(true);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  const messagesRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isPinnedToBottom) return;
    const node = messagesRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [isPinnedToBottom, messages, isStreaming]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  function handleScroll(e: ReactUIEvent<HTMLDivElement>) {
    const node = e.currentTarget;
    const atBottom = node.scrollHeight - node.scrollTop - node.clientHeight < 40;
    setIsPinnedToBottom(atBottom);
  }

  async function sendMessage(question: string) {
    const trimmed = question.trim();
    if (!trimmed || isStreaming) return;

    const userMsg: ChatMessage = { id: makeId("user"), role: "user", content: trimmed };
    const assistantId = makeId("assistant");
    const assistantMsg: ChatMessage = { id: assistantId, role: "assistant", content: "" };

    setError(null);
    setInput("");
    setExpandedSources({});
    setIsPinnedToBottom(true);
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    try {
      const res = await fetch(endpoint ?? "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          question: trimmed,
          pageContext,
          context,
        }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let aggregated = "";
      let buffered = "";
      const isNdjson = (res.headers.get("Content-Type") ?? "").includes("application/x-ndjson");

      while (true) {
        const { done, value } = await reader.read();
        const chunk = decoder.decode(value ?? new Uint8Array(), { stream: !done });

        if (!isNdjson) {
          aggregated += chunk;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: aggregated } : m))
          );
          if (done) break;
          continue;
        }

        buffered += chunk;
        const lines = buffered.split("\n");
        buffered = lines.pop() ?? "";

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line) continue;
          const event = parseEventLine(line);
          if (!event) continue;
          if (event.type === "text-delta") {
            aggregated += event.text;
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: aggregated } : m))
            );
          }
          if (event.type === "sources") {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, citations: event.citations } : m))
            );
          }
        }
        if (done) break;
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setIsStreaming(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void sendMessage(input);
  }

  function handleKeyDown(e: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  }

  const hasMessages = messages.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* Messages */}
      <div
        ref={messagesRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        {!hasMessages && (
          <div style={{ padding: "24px 0", textAlign: "center" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "color-mix(in srgb, var(--accent) 12%, var(--bg-card))",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 12px",
                color: "var(--accent)",
              }}
            >
              <BeaconGlyph size={20} />
            </div>
            <p style={{ fontSize: "13px", color: "var(--ink-muted)", margin: "0 0 16px", lineHeight: 1.5 }}>
              Ask about this deal, requirements, or EXIM terms.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {presetQuestions.slice(0, 4).map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => void sendMessage(q.question)}
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "1px solid var(--border)",
                    background: "var(--bg-card)",
                    color: "var(--ink)",
                    fontSize: "12px",
                    lineHeight: 1.4,
                    cursor: "pointer",
                    transition: "border-color 0.15s",
                  }}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: msg.role === "user" ? "flex-end" : "flex-start",
              gap: "4px",
            }}
          >
            <div
              style={{
                maxWidth: "88%",
                padding: "10px 13px",
                borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "4px 14px 14px 14px",
                background:
                  msg.role === "user"
                    ? "color-mix(in srgb, var(--accent) 18%, var(--bg-card))"
                    : "var(--bg-card)",
                border: "1px solid var(--border)",
                fontSize: "13px",
                lineHeight: 1.6,
                color: "var(--ink)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {msg.content || (
                <motion.span
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                  style={{ display: "inline-block" }}
                  aria-label="Beacon is thinking"
                >
                  ···
                </motion.span>
              )}
            </div>
            {msg.citations && msg.citations.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", maxWidth: "88%" }}>
                {msg.citations.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() =>
                      setExpandedSources((prev) => ({ ...prev, [msg.id]: !prev[msg.id] }))
                    }
                    style={{
                      padding: "3px 8px",
                      borderRadius: "6px",
                      border: "1px solid var(--border)",
                      background: "var(--bg-card)",
                      fontSize: "11px",
                      color: "var(--ink-muted)",
                      cursor: "pointer",
                    }}
                  >
                    {c.title ?? `Source ${i + 1}`}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {error && (
          <p style={{ fontSize: "12px", color: "var(--color-critical, #ef4444)", margin: 0 }}>
            {error}
          </p>
        )}
      </div>

      {/* Input */}
      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid var(--border)",
          background: "var(--bg-card)",
        }}
      >
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder ?? "Ask Beacon about this deal…"}
            rows={2}
            disabled={isStreaming}
            style={{
              flex: 1,
              resize: "none",
              borderRadius: "10px",
              border: "1px solid var(--border)",
              background: "var(--bg)",
              color: "var(--ink)",
              padding: "9px 12px",
              fontFamily: "inherit",
              fontSize: "13px",
              lineHeight: 1.5,
              outline: "none",
              minHeight: "40px",
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            aria-label="Send"
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              border: "none",
              background: input.trim() && !isStreaming ? "var(--accent)" : "var(--border)",
              color: input.trim() && !isStreaming ? "#fff" : "var(--ink-muted)",
              cursor: input.trim() && !isStreaming ? "pointer" : "default",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
              transition: "background 0.15s",
            }}
          >
            <SendGlyph />
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Signals tab ──────────────────────────────────────────────────────────────

function SignalsTab({ readinessPct, loiBlockerCount }: Pick<BeaconPanelProps, "readinessPct" | "loiBlockerCount">) {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Summary row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
        }}
      >
        <div
          style={{
            padding: "12px",
            borderRadius: "10px",
            border: "1px solid var(--border)",
            background: "var(--bg-card)",
          }}
        >
          <p style={{ margin: "0 0 4px", fontSize: "11px", color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Readiness
          </p>
          <p style={{ margin: 0, fontSize: "22px", fontWeight: 600, color: "var(--ink)", lineHeight: 1 }}>
            {readinessPct ?? 0}
            <span style={{ fontSize: "13px", fontWeight: 400, color: "var(--ink-muted)" }}>%</span>
          </p>
        </div>
        <div
          style={{
            padding: "12px",
            borderRadius: "10px",
            border: "1px solid color-mix(in srgb, var(--color-critical, #ef4444) 30%, var(--border))",
            background: "color-mix(in srgb, var(--color-critical, #ef4444) 6%, var(--bg-card))",
          }}
        >
          <p style={{ margin: "0 0 4px", fontSize: "11px", color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            LOI Blockers
          </p>
          <p style={{ margin: 0, fontSize: "22px", fontWeight: 600, color: "var(--color-critical, #ef4444)", lineHeight: 1 }}>
            {loiBlockerCount ?? 0}
          </p>
        </div>
      </div>

      {/* Signal list */}
      <div>
        <p style={{ margin: "0 0 10px", fontSize: "11px", fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Top pressure items
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {MOCK_SIGNALS.map((s, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 12px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "var(--bg-card)",
              }}
            >
              <SignalDotGlyph level={s.level} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: "0 0 2px", fontSize: "13px", fontWeight: 500, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {s.label}
                </p>
                <p style={{ margin: 0, fontSize: "11px", color: "var(--ink-muted)" }}>
                  {s.detail}
                </p>
              </div>
              <span
                style={{
                  fontSize: "10px",
                  color: "var(--ink-muted)",
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "4px",
                  padding: "2px 6px",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {s.category}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Mock nudge */}
      <div
        style={{
          padding: "12px",
          borderRadius: "10px",
          border: "1px solid color-mix(in srgb, var(--accent) 25%, var(--border))",
          background: "color-mix(in srgb, var(--accent) 6%, var(--bg-card))",
          fontSize: "12px",
          color: "var(--ink-muted)",
          lineHeight: 1.6,
        }}
      >
        <span style={{ color: "var(--accent)", fontWeight: 600 }}>Beacon</span> will surface why each item is blocking and suggest the fastest path to close it.
      </div>
    </div>
  );
}

// ─── Documents tab ────────────────────────────────────────────────────────────

function DocumentsTab() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
      <p style={{ margin: "0 0 10px", fontSize: "11px", fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        Coverage by category
      </p>

      {MOCK_DOCUMENTS.map((cat) => {
        const pct = Math.round((cat.covered / cat.total) * 100);
        const isOpen = expanded === cat.category;
        return (
          <div
            key={cat.category}
            style={{
              borderRadius: "10px",
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
              overflow: "hidden",
            }}
          >
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : cat.category)}
              style={{
                width: "100%",
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                background: "none",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: "0 0 6px", fontSize: "13px", fontWeight: 500, color: "var(--ink)" }}>
                  {cat.category}
                </p>
                <div
                  style={{
                    height: "4px",
                    borderRadius: "4px",
                    background: "var(--border)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${pct}%`,
                      borderRadius: "4px",
                      background:
                        pct === 100
                          ? "var(--color-success, #22c55e)"
                          : pct >= 50
                            ? "var(--accent)"
                            : "var(--color-warning, #f59e0b)",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>
              <span style={{ fontSize: "12px", color: "var(--ink-muted)", flexShrink: 0 }}>
                {cat.covered}/{cat.total}
              </span>
              <span
                style={{
                  color: "var(--ink-muted)",
                  transition: "transform 0.2s",
                  transform: isOpen ? "rotate(90deg)" : "none",
                  display: "flex",
                }}
              >
                <ChevronRightGlyph />
              </span>
            </button>

            {isOpen && cat.gap.length > 0 && (
              <div
                style={{
                  borderTop: "1px solid var(--border)",
                  padding: "8px 14px 12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <p style={{ margin: "0 0 4px", fontSize: "11px", color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Missing
                </p>
                {cat.gap.map((name) => (
                  <div
                    key={name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "12px",
                      color: "var(--ink-muted)",
                    }}
                  >
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: "var(--color-warning, #f59e0b)",
                        flexShrink: 0,
                      }}
                    />
                    {name}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div
        style={{
          marginTop: "4px",
          padding: "12px",
          borderRadius: "10px",
          border: "1px solid color-mix(in srgb, var(--accent) 25%, var(--border))",
          background: "color-mix(in srgb, var(--accent) 6%, var(--bg-card))",
          fontSize: "12px",
          color: "var(--ink-muted)",
          lineHeight: 1.6,
        }}
      >
        <span style={{ color: "var(--accent)", fontWeight: 600 }}>Beacon</span> will analyze each uploaded document and flag whether it meets EXIM substantially-final standards.
      </div>
    </div>
  );
}

// ─── Collapse button ──────────────────────────────────────────────────────────

function CollapseToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-label={open ? "Collapse Beacon panel" : "Open Beacon panel"}
      onClick={onToggle}
      style={{
        width: open ? "30px" : "62px",
        height: open ? "30px" : "62px",
        borderRadius: "999px",
        border: "1px solid color-mix(in srgb, var(--accent) 24%, var(--border))",
        background: open
          ? "color-mix(in srgb, var(--bg-card) 92%, var(--bg))"
          : "linear-gradient(145deg, color-mix(in srgb, var(--accent) 12%, var(--bg-card)), color-mix(in srgb, var(--bg-card) 90%, var(--bg)))",
        color: open ? "var(--ink-muted)" : "var(--accent)",
        cursor: "pointer",
        display: "grid",
        placeItems: "center",
        boxShadow: open
          ? "0 8px 18px rgba(0,0,0,0.16)"
          : "0 16px 36px rgba(0,0,0,0.28), 0 2px 10px rgba(0,0,0,0.16)",
        zIndex: 120,
        transition: "transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease",
      }}
    >
      {open ? <ChevronRightGlyph /> : <BeaconGlyph size={20} />}
    </button>
  );
}

// ─── BeaconPanel ──────────────────────────────────────────────────────────────

const WORKSPACE_LABELS: Record<string, string> = {
  overview: "Overview",
  concept: "Concept",
  parties: "Parties",
  capital: "Capital",
  workplan: "Workplan",
  documents: "Evidence",
  execution: "Execution",
};

export function BeaconPanel(props: BeaconPanelProps) {
  const { open, setOpen, activeTab, setActiveTab, activeWorkspace } = useBeacon();

  const workspacePresets =
    activeWorkspace && props.projectName && activeWorkspace !== "utilities"
      ? getWorkspaceChatPresets(activeWorkspace, props.projectName, props.dealType ?? "other")
      : [];

  const effectivePresets =
    workspacePresets.length > 0 ? workspacePresets : props.presetQuestions;

  const workspaceLabel = activeWorkspace ? WORKSPACE_LABELS[activeWorkspace] : null;

  const effectivePageContext =
    workspaceLabel && props.pageContext
      ? `Active workspace: ${workspaceLabel}. ${props.pageContext}`
      : props.pageContext;

  return (
    <>
      {!open && (
        <div
          style={{
            position: "fixed",
            right: "24px",
            bottom: "24px",
            zIndex: 120,
          }}
        >
          <CollapseToggle open={false} onToggle={() => setOpen(true)} />
        </div>
      )}

      <AnimatePresence initial={false}>
        {open && (
          <motion.aside
            key="beacon-panel"
            aria-label="Beacon AI assistant"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{
              position: "fixed",
              right: "24px",
              bottom: "24px",
              zIndex: 120,
              width: "min(360px, calc(100vw - 28px))",
              height: "min(640px, calc(100vh - 104px))",
              borderRadius: "18px",
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
              boxShadow: "0 24px 60px rgba(0,0,0,0.28), 0 4px 18px rgba(0,0,0,0.12)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                zIndex: 2,
              }}
            >
              <CollapseToggle open onToggle={() => setOpen(false)} />
            </div>
            {/* Header */}
            <div
              style={{
                padding: "14px 52px 0 16px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "8px",
                  background: "color-mix(in srgb, var(--accent) 15%, var(--bg-card))",
                  color: "var(--accent)",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <BeaconGlyph size={15} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "var(--ink)", lineHeight: 1.2 }}>
                  Beacon
                </p>
                <p style={{ margin: 0, fontSize: "11px", color: "var(--ink-muted)" }}>
                  {workspaceLabel ? (
                    <>
                      {props.projectName ?? "Deal assistant"}
                      <span style={{ margin: "0 4px", opacity: 0.4 }}>·</span>
                      <span style={{ color: "var(--accent)" }}>{workspaceLabel}</span>
                    </>
                  ) : (
                    props.projectName ?? "Deal assistant"
                  )}
                </p>
              </div>
              <span
                style={{
                  fontSize: "10px",
                  padding: "2px 7px",
                  borderRadius: "20px",
                  border: "1px solid color-mix(in srgb, var(--accent) 40%, var(--border))",
                  color: "var(--accent)",
                  background: "color-mix(in srgb, var(--accent) 8%, var(--bg-card))",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                }}
              >
                BETA
              </span>
            </div>

            {/* Tabs */}
            <TabBar activeTab={activeTab} onChange={setActiveTab} />

            {/* Tab content */}
            {activeTab === "assistant" && (
              <AssistantTab
                presetQuestions={effectivePresets}
                placeholder={props.placeholder}
                endpoint={props.endpoint}
                pageContext={effectivePageContext}
                context={props.context}
              />
            )}
            {activeTab === "signals" && (
              <SignalsTab
                readinessPct={props.readinessPct}
                loiBlockerCount={props.loiBlockerCount}
              />
            )}
            {activeTab === "documents" && <DocumentsTab />}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
