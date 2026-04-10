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
import type { ChatCitation, ChatRuntimeContext, BeaconSignal, BeaconDocumentCoverage, WalkthroughData } from "@/types";
import type { ChatPresetQuestion } from "@/components/chat/ChatWidget";
import { getWorkspaceChatPresets } from "@/lib/ai/chat-presets";
import { WalkthroughController } from "./WalkthroughController";

// ─── Types ──────────────────────────────────────────────────────────────────

type ChatRole = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  citations?: readonly ChatCitation[];
  walkthroughLabel?: string;
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
  signals?: BeaconSignal[];
  documentCoverage?: BeaconDocumentCoverage[];
  walkthroughData?: WalkthroughData;
}


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
  function handleTabKeyDown(e: React.KeyboardEvent, currentIdx: number) {
    let nextIdx: number | null = null;
    if (e.key === "ArrowRight") nextIdx = (currentIdx + 1) % TABS.length;
    if (e.key === "ArrowLeft") nextIdx = (currentIdx - 1 + TABS.length) % TABS.length;
    if (nextIdx !== null) {
      e.preventDefault();
      onChange(TABS[nextIdx].id);
    }
  }

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
      {TABS.map((tab, idx) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            type="button"
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleTabKeyDown(e, idx)}
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
  walkthroughData,
}: Pick<BeaconPanelProps, "presetQuestions" | "placeholder" | "endpoint" | "pageContext" | "context" | "walkthroughData">) {
  const { walkthroughActive, startWalkthrough: triggerWalkthrough } = useBeacon();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPinnedToBottom, setIsPinnedToBottom] = useState(true);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  const messagesRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  function handleWalkthroughInject(msg: { role: "assistant"; content: string; walkthroughLabel?: string }) {
    const id = makeId("wt");
    setMessages((prev) => [...prev, { id, role: msg.role, content: msg.content, walkthroughLabel: msg.walkthroughLabel }]);
    setIsPinnedToBottom(true);
  }

  function handleStartWalkthrough() {
    setMessages([]);
    triggerWalkthrough();
  }

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
              {walkthroughData && (
                <button
                  type="button"
                  onClick={handleStartWalkthrough}
                  style={{
                    textAlign: "left",
                    padding: "11px 12px",
                    borderRadius: "10px",
                    border: "1px solid color-mix(in srgb, var(--accent) 40%, var(--border))",
                    background: "color-mix(in srgb, var(--accent) 6%, var(--bg-card))",
                    color: "var(--accent)",
                    fontSize: "12px",
                    fontWeight: 500,
                    lineHeight: 1.4,
                    cursor: "pointer",
                    transition: "border-color 0.15s, background 0.15s",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <BeaconGlyph size={14} />
                  Walk me through this deal
                </button>
              )}
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
            {msg.walkthroughLabel && (
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "9px",
                  fontWeight: 600,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: "var(--accent)",
                  paddingLeft: "2px",
                }}
              >
                {msg.walkthroughLabel}
              </span>
            )}
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
                borderLeft: msg.walkthroughLabel ? "2px solid var(--accent)" : "1px solid var(--border)",
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

      {/* Walkthrough controller */}
      {walkthroughActive && walkthroughData && (
        <WalkthroughController
          walkthroughData={walkthroughData}
          onInjectMessage={handleWalkthroughInject}
        />
      )}

      {/* Input */}
      <div
        style={{
          padding: "12px 16px",
          borderTop: walkthroughActive ? "none" : "1px solid var(--border)",
          background: "var(--bg-card)",
        }}
      >
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={walkthroughActive ? "Ask a follow-up, or continue…" : (placeholder ?? "Ask Beacon about this deal…")}
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

function deriveAction(detail: string, level: string): string {
  if (detail.includes("No assigned owner")) return "Assign an owner to unblock this item";
  if (detail.includes("No linked evidence") || detail.includes("no linked")) return "Upload or link supporting evidence";
  if (detail.includes("overdue")) return "Escalate — past target date";
  if (detail.includes("Due in")) return "Prepare evidence before deadline";
  if (detail.includes("no linked file")) return "Attach a draft document";
  if (detail.includes("Draft stage")) return "Assign an owner and begin tracking";
  if (level === "critical") return "Resolve before gate review";
  if (level === "warning") return "Address soon to stay on track";
  return "Review and update status";
}

function SignalsTab({ readinessPct, loiBlockerCount, signals }: Pick<BeaconPanelProps, "readinessPct" | "loiBlockerCount" | "signals">) {
  const sorted = [...(signals ?? [])].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return (order[a.level] ?? 3) - (order[b.level] ?? 3);
  });
  const critCount = sorted.filter((s) => s.level === "critical").length;
  const warnCount = sorted.filter((s) => s.level === "warning").length;

  // Quick wins: info-level items that just need an owner assignment
  const quickWins = sorted.filter(
    (s) => s.level === "info" || s.detail.includes("No assigned owner")
  ).slice(0, 3);

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
            Gate Blockers
          </p>
          <p style={{ margin: 0, fontSize: "22px", fontWeight: 600, color: "var(--color-critical, #ef4444)", lineHeight: 1 }}>
            {loiBlockerCount ?? 0}
          </p>
        </div>
      </div>

      {/* Severity breakdown pill */}
      {sorted.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          {critCount > 0 && (
            <span style={{
              fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
              padding: "3px 8px", borderRadius: "4px",
              color: "var(--color-critical, #ef4444)",
              background: "color-mix(in srgb, var(--color-critical, #ef4444) 10%, var(--bg-card))",
              border: "1px solid color-mix(in srgb, var(--color-critical, #ef4444) 25%, var(--border))",
            }}>
              {critCount} critical
            </span>
          )}
          {warnCount > 0 && (
            <span style={{
              fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
              padding: "3px 8px", borderRadius: "4px",
              color: "var(--color-warning, #f59e0b)",
              background: "color-mix(in srgb, var(--color-warning, #f59e0b) 10%, var(--bg-card))",
              border: "1px solid color-mix(in srgb, var(--color-warning, #f59e0b) 25%, var(--border))",
            }}>
              {warnCount} warning
            </span>
          )}
          {sorted.length - critCount - warnCount > 0 && (
            <span style={{
              fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
              padding: "3px 8px", borderRadius: "4px",
              color: "var(--ink-muted)",
              background: "var(--bg)",
              border: "1px solid var(--border)",
            }}>
              {sorted.length - critCount - warnCount} info
            </span>
          )}
        </div>
      )}

      {/* Signal list */}
      <div>
        <p style={{ margin: "0 0 10px", fontSize: "11px", fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Top pressure items
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {sorted.length === 0 && (
            <p style={{ margin: 0, fontSize: "13px", color: "var(--ink-muted)" }}>
              No active pressure items — all requirements are on track.
            </p>
          )}
          {sorted.map((s, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                padding: "10px 12px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "var(--bg-card)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
              <p style={{
                margin: 0,
                fontSize: "11px",
                color: s.level === "critical" ? "var(--color-critical, #ef4444)" : "var(--ink-muted)",
                fontStyle: "italic",
                paddingLeft: "18px",
              }}>
                → {deriveAction(s.detail, s.level)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick wins */}
      {quickWins.length > 0 && (
        <div>
          <p style={{ margin: "0 0 10px", fontSize: "11px", fontWeight: 600, color: "var(--teal, #2ba37a)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Quick wins
          </p>
          <div
            style={{
              padding: "10px 12px",
              borderRadius: "10px",
              border: "1px solid color-mix(in srgb, var(--teal, #2ba37a) 25%, var(--border))",
              background: "color-mix(in srgb, var(--teal, #2ba37a) 6%, var(--bg-card))",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            {quickWins.map((s, i) => (
              <p key={i} style={{ margin: 0, fontSize: "12px", color: "var(--ink-mid)", lineHeight: 1.5 }}>
                <span style={{ color: "var(--teal, #2ba37a)", fontWeight: 600 }}>•</span>{" "}
                Assign an owner to <span style={{ fontWeight: 500, color: "var(--ink)" }}>{s.label}</span> to move it from draft to tracked
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Documents tab ────────────────────────────────────────────────────────────

function DocumentsTab({ documentCoverage }: Pick<BeaconPanelProps, "documentCoverage">) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const coverage = documentCoverage ?? [];

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
      <p style={{ margin: "0 0 10px", fontSize: "11px", fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        Coverage by category
      </p>

      {coverage.length === 0 && (
        <p style={{ margin: 0, fontSize: "13px", color: "var(--ink-muted)" }}>
          No requirement categories found for this project.
        </p>
      )}

      {coverage.map((cat) => {
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

      {/* Coverage summary */}
      {coverage.length > 0 && (() => {
        const totalCovered = coverage.reduce((s, c) => s + c.covered, 0);
        const totalItems = coverage.reduce((s, c) => s + c.total, 0);
        const totalGaps = coverage.reduce((s, c) => s + c.gap.length, 0);
        const overallPct = totalItems > 0 ? Math.round((totalCovered / totalItems) * 100) : 0;
        return (
          <div
            style={{
              marginTop: "4px",
              padding: "12px",
              borderRadius: "10px",
              border: `1px solid color-mix(in srgb, ${overallPct >= 80 ? "var(--teal, #2ba37a)" : "var(--gold, #d4a843)"} 25%, var(--border))`,
              background: `color-mix(in srgb, ${overallPct >= 80 ? "var(--teal, #2ba37a)" : "var(--gold, #d4a843)"} 6%, var(--bg-card))`,
              fontSize: "12px",
              color: "var(--ink-mid)",
              lineHeight: 1.6,
            }}
          >
            <span style={{ fontWeight: 600, color: overallPct >= 80 ? "var(--teal, #2ba37a)" : "var(--gold, #d4a843)" }}>
              {overallPct}% covered
            </span>
            {" — "}
            {totalCovered} of {totalItems} requirements have linked evidence.
            {totalGaps > 0 && (
              <> Expand categories above to see the {totalGaps} gap{totalGaps !== 1 ? "s" : ""}.</>
            )}
          </div>
        );
      })()}
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
                walkthroughData={props.walkthroughData}
              />
            )}
            {activeTab === "signals" && (
              <SignalsTab
                readinessPct={props.readinessPct}
                loiBlockerCount={props.loiBlockerCount}
                signals={props.signals}
              />
            )}
            {activeTab === "documents" && <DocumentsTab documentCoverage={props.documentCoverage} />}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
