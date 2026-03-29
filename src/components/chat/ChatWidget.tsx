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
import type { ChatCitation, ChatRuntimeContext } from "@/types";

export interface ChatPresetQuestion {
  id: string;
  label: string;
  question: string;
}

type ChatRole = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  citations?: readonly ChatCitation[];
}

interface ChatWidgetProps {
  presetQuestions: readonly ChatPresetQuestion[];
  title?: string;
  subtitle?: string;
  placeholder?: string;
  emptyState?: string;
  endpoint?: string;
  pageContext?: string;
  context?: ChatRuntimeContext;
}

const bubbleButtonStyle: CSSProperties = {
  width: "62px",
  height: "62px",
  borderRadius: "999px",
  border: "1px solid color-mix(in srgb, var(--accent) 18%, var(--border))",
  background:
    "linear-gradient(135deg, color-mix(in srgb, var(--accent) 14%, var(--bg-card)) 0%, var(--bg-card) 100%)",
  color: "var(--ink)",
  boxShadow: "0 14px 38px rgba(0,0,0,0.16), 0 2px 10px rgba(0,0,0,0.10)",
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  padding: 0,
  position: "relative",
  overflow: "hidden",
  flexShrink: 0,
};

const iconStyle: CSSProperties = {
  width: "22px",
  height: "22px",
  display: "block",
  position: "relative",
  zIndex: 1,
};

const inputBaseStyle: CSSProperties = {
  width: "100%",
  borderRadius: "14px",
  border: "1px solid var(--border)",
  backgroundColor: "var(--bg-card)",
  color: "var(--ink)",
  padding: "12px 14px",
  fontFamily: "'Inter', system-ui, sans-serif",
  fontSize: "13px",
  lineHeight: 1.5,
  outline: "none",
};

function makeId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

type ChatStreamEvent =
  | { type: "text-delta"; text: string }
  | { type: "sources"; citations: ChatCitation[] }
  | { type: "done" };

function parseEventLine(line: string): ChatStreamEvent | null {
  try {
    const parsed = JSON.parse(line) as ChatStreamEvent;
    if (
      parsed &&
      typeof parsed === "object" &&
      "type" in parsed &&
      typeof parsed.type === "string"
    ) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

function ChatGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={iconStyle}>
      <path
        d="M7 17.4 3.8 20V6.8A2.8 2.8 0 0 1 6.6 4h10.8a2.8 2.8 0 0 1 2.8 2.8v7.4a2.8 2.8 0 0 1-2.8 2.8H7Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8 9.25h8M8 12.25h5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={iconStyle}>
      <path
        d="M6 6 18 18M18 6 6 18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ width: "16px", height: "16px" }}>
      <path
        d="m6 9 6 6 6-6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LoadingEllipsis() {
  return (
    <motion.span
      animate={{ opacity: [0.25, 1, 0.25] }}
      transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
      style={{ display: "inline-block" }}
      aria-hidden="true"
    >
      …
    </motion.span>
  );
}

export function ChatWidget({
  presetQuestions,
  title = "Lodestar Assistant",
  subtitle = "Ask about this page or use a preset question.",
  placeholder = "Ask a question about the application...",
  emptyState = "Use a preset question or type your own. Answers stream from /api/chat.",
  endpoint = "/api/chat",
  pageContext,
  context,
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPresetQuestionsExpanded, setIsPresetQuestionsExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isPinnedToBottom, setIsPinnedToBottom] = useState(true);
  const [viewportWidth, setViewportWidth] = useState(0);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function updateViewportWidth() {
      setViewportWidth(window.innerWidth);
    }

    updateViewportWidth();
    window.addEventListener("resize", updateViewportWidth);
    return () => window.removeEventListener("resize", updateViewportWidth);
  }, []);

  const isCompactViewport = viewportWidth > 0 && viewportWidth < 640;

  useEffect(() => {
    if (!isOpen) return;

    const node = messagesRef.current;
    if (!node) return;

    node.scrollTop = node.scrollHeight;
    setIsPinnedToBottom(true);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (!isPinnedToBottom) return;

    const node = messagesRef.current;
    if (!node) return;

    node.scrollTop = node.scrollHeight;
  }, [isOpen, isPinnedToBottom, isStreaming, messages]);

  useEffect(() => {
    if (!isOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (!panelRef.current) return;
      if (panelRef.current.contains(event.target as Node)) return;
      setIsOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  async function sendMessage(question: string, collapsePresets = false) {
    const trimmed = question.trim();
    if (!trimmed || isStreaming) return;

    const userMessage: ChatMessage = {
      id: makeId("user"),
      role: "user",
      content: trimmed,
    };

    const assistantMessageId = makeId("assistant");
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
    };

    setError(null);
    setInput("");
    setIsOpen(true);
    if (collapsePresets) setIsPresetQuestionsExpanded(false);
    setExpandedSources({});
    setCopiedMessageId(null);
    setIsPinnedToBottom(true);
    setMessages((current) => [...current, userMessage, assistantMessage]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((message) => ({
            role: message.role,
            content: message.content,
          })),
          question: trimmed,
          pageContext,
          context,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Chat request failed with status ${response.status}`);
      }

      if (!response.body) {
        throw new Error("Chat response did not include a readable stream.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aggregated = "";
      let buffered = "";
      const contentType = response.headers.get("Content-Type") ?? "";
      const isEventStream = contentType.includes("application/x-ndjson");

      while (true) {
        const { done, value } = await reader.read();
        const chunkText = decoder.decode(value ?? new Uint8Array(), {
          stream: !done,
        });

        if (!isEventStream) {
          aggregated += chunkText;
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantMessageId
                ? { ...message, content: aggregated }
                : message
            )
          );

          if (done) break;
          continue;
        }

        buffered += chunkText;
        const lines = buffered.split("\n");
        buffered = lines.pop() ?? "";

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line) continue;

          const event = parseEventLine(line);
          if (!event) continue;

          if (event.type === "text-delta") {
            aggregated += event.text;
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantMessageId
                  ? { ...message, content: aggregated }
                  : message
              )
            );
          }

          if (event.type === "sources") {
            setExpandedSources({});
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantMessageId
                  ? { ...message, citations: event.citations }
                  : message
              )
            );
          }
        }

        if (done) break;
      }

      if (!isEventStream) aggregated += decoder.decode();
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantMessageId
            ? {
                ...message,
                content: aggregated.trim() || "No response returned.",
              }
            : message
        )
      );
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Unable to complete chat request.";

      if (controller.signal.aborted) return;

      setError(message);
      setMessages((current) =>
        current.map((entry) =>
          entry.id === assistantMessageId
            ? {
                ...entry,
                content: "I could not complete that request.",
              }
            : entry
        )
      );
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setIsStreaming(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  function handleTextareaKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  }

  function toggleSources(messageId: string) {
    setExpandedSources((current) => ({
      ...current,
      [messageId]: !current[messageId],
    }));
  }

  async function copyMessage(messageId: string, content: string) {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = setTimeout(() => {
        setCopiedMessageId((current) => (current === messageId ? null : current));
      }, 1400);
    } catch {
      setCopiedMessageId(null);
    }
  }

  function handleMessagesScroll(event: ReactUIEvent<HTMLDivElement>) {
    const node = event.currentTarget;
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    setIsPinnedToBottom(distanceFromBottom <= 24);
  }

  return (
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        right: "72px",
        bottom: "28px",
        zIndex: 120,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "12px",
      }}
    >
      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.section
            key="chat-panel"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            aria-label="Chat assistant"
            style={{
              width: "min(420px, calc(100vw - 24px))",
              height: "min(620px, calc(100vh - 110px))",
              display: "grid",
              gridTemplateRows: "auto auto 1fr auto",
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "18px",
              overflow: "hidden",
              boxShadow: "0 24px 60px rgba(0,0,0,0.18), 0 8px 18px rgba(0,0,0,0.10)",
            }}
          >
            <div
              style={{
                padding: "16px 18px 14px",
                borderBottom: "1px solid var(--border)",
                background:
                  "linear-gradient(180deg, color-mix(in srgb, var(--accent) 7%, var(--bg-card)) 0%, var(--bg-card) 100%)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: "'DM Serif Display', Georgia, serif",
                      fontSize: "20px",
                      lineHeight: 1.15,
                      color: "var(--ink)",
                    }}
                  >
                    {title}
                  </div>
                  <div
                    style={{
                      marginTop: "4px",
                      fontSize: "12px",
                      lineHeight: 1.5,
                      color: "var(--ink-muted)",
                    }}
                  >
                    {subtitle}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close chat"
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "999px",
                    border: "1px solid var(--border)",
                    backgroundColor: "transparent",
                    color: "var(--ink)",
                    cursor: "pointer",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <CloseGlyph />
                </button>
              </div>
            </div>

            {presetQuestions.length > 0 ? (
              <div
                style={{
                  borderBottom: "1px solid var(--border)",
                  backgroundColor: "color-mix(in srgb, var(--accent) 3%, var(--bg-card))",
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsPresetQuestionsExpanded((current) => !current)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    padding: "10px 14px",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: "var(--ink)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "10px",
                      letterSpacing: "0.10em",
                      textTransform: "uppercase",
                      color: "var(--ink-muted)",
                    }}
                  >
                    Preset questions ({presetQuestions.length})
                  </span>
                  <motion.span
                    animate={{ rotate: isPresetQuestionsExpanded ? 180 : 0 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    style={{ display: "inline-flex", color: "var(--ink-muted)" }}
                  >
                    <ChevronGlyph />
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {isPresetQuestionsExpanded ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      style={{ overflow: "hidden" }}
                    >
                      <div
                        className="chat-widget-chip-row"
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "8px",
                          padding: "0 14px 12px",
                        }}
                      >
                        {presetQuestions.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => void sendMessage(preset.question, true)}
                            disabled={isStreaming}
                            style={{
                              borderRadius: "999px",
                              border: "1px solid var(--border)",
                              backgroundColor: "var(--bg-card)",
                              color: "var(--ink)",
                              padding: "7px 11px",
                              fontSize: "12px",
                              lineHeight: 1.35,
                              cursor: isStreaming ? "not-allowed" : "pointer",
                              opacity: isStreaming ? 0.6 : 1,
                              whiteSpace: "normal",
                              textAlign: "left",
                              maxWidth: "100%",
                            }}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            ) : null}

            <div
              ref={messagesRef}
              onScroll={handleMessagesScroll}
              style={{
                overflowY: "auto",
                padding: "16px 14px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                background:
                  "linear-gradient(180deg, color-mix(in srgb, var(--accent) 2%, var(--bg-card)) 0%, var(--bg-card) 100%)",
              }}
            >
              {messages.length === 0 ? (
                <div
                  style={{
                    margin: "auto 0",
                    padding: "16px",
                    border: "1px dashed var(--border)",
                    borderRadius: "14px",
                    color: "var(--ink-muted)",
                    fontSize: "13px",
                    lineHeight: 1.7,
                    backgroundColor: "color-mix(in srgb, var(--accent) 2%, var(--bg-card))",
                  }}
                >
                  {emptyState}
                </div>
              ) : (
                messages.map((message) => {
                  const isUser = message.role === "user";
                  const isSourcesExpanded = expandedSources[message.id] ?? false;
                  const canCopy = !isUser && message.content.length > 0;
                  return (
                    <div
                      key={message.id}
                      style={{
                        alignSelf: isUser ? "flex-end" : "flex-start",
                        maxWidth: isUser
                          ? isCompactViewport
                            ? "92%"
                            : "88%"
                          : isCompactViewport
                          ? "100%"
                          : "88%",
                        minWidth: isUser ? (isCompactViewport ? "0" : "180px") : isCompactViewport ? "0" : "220px",
                        borderRadius: isUser
                          ? "16px 16px 4px 16px"
                          : "16px 16px 16px 4px",
                        border: `1px solid ${
                          isUser
                            ? "color-mix(in srgb, var(--accent) 40%, var(--border))"
                            : "color-mix(in srgb, var(--accent) 18%, var(--border))"
                        }`,
                        backgroundColor: isUser
                          ? "color-mix(in srgb, var(--accent) 14%, var(--bg-card))"
                          : "color-mix(in srgb, var(--accent) 4%, var(--bg-card))",
                        padding: "10px 12px",
                        color: "var(--ink)",
                        fontSize: "13px",
                        lineHeight: 1.65,
                        whiteSpace: "pre-wrap",
                        overflowWrap: "anywhere",
                        boxShadow: isUser
                          ? "0 10px 24px rgba(0,0,0,0.08)"
                          : "0 8px 18px rgba(0,0,0,0.05)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: "10px",
                        }}
                      >
                        <div style={{ minWidth: 0, flex: "1 1 auto" }}>
                          {message.content ? (
                            message.content
                          ) : isStreaming && !isUser ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <span>Thinking</span>
                              <LoadingEllipsis />
                            </span>
                          ) : (
                            ""
                          )}
                        </div>

                        {canCopy ? (
                          <button
                            type="button"
                            onClick={() => void copyMessage(message.id, message.content)}
                            style={{
                              flexShrink: 0,
                              borderRadius: "999px",
                              border: "1px solid var(--border)",
                              backgroundColor: "transparent",
                              color: copiedMessageId === message.id ? "var(--accent)" : "var(--ink-muted)",
                              padding: "4px 8px",
                              fontFamily: "'DM Mono', monospace",
                              fontSize: "9px",
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              cursor: "pointer",
                            }}
                          >
                            {copiedMessageId === message.id ? "Copied" : "Copy"}
                          </button>
                        ) : null}
                      </div>

                      {!isUser && message.citations && message.citations.length > 0 && (
                        <div
                          style={{
                            marginTop: "10px",
                            paddingTop: "10px",
                            borderTop: "1px solid var(--border)",
                            display: "grid",
                            gap: "6px",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => toggleSources(message.id)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "8px",
                              padding: 0,
                              border: "none",
                              background: "transparent",
                              cursor: "pointer",
                              fontFamily: "'DM Mono', monospace",
                              fontSize: "10px",
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: "var(--ink-muted)",
                            }}
                          >
                            <span>Sources ({message.citations.length})</span>
                            <motion.span
                              animate={{ rotate: isSourcesExpanded ? 180 : 0 }}
                              transition={{ duration: 0.18, ease: "easeOut" }}
                              style={{ display: "inline-flex" }}
                            >
                              <ChevronGlyph />
                            </motion.span>
                          </button>

                          <AnimatePresence initial={false}>
                            {isSourcesExpanded ? (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.18, ease: "easeOut" }}
                                style={{ overflow: "hidden" }}
                              >
                                <div
                                  style={{
                                    display: "grid",
                                    gap: "6px",
                                  }}
                                >
                                  {message.citations.map((citation, citationIndex) => (
                                    <a
                                      key={`${message.id}-${citation.url}-${citationIndex}`}
                                      href={citation.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{
                                        display: "grid",
                                        gridTemplateColumns: isCompactViewport ? "1fr" : "minmax(0, 1fr) auto",
                                        alignItems: "center",
                                        gap: "8px",
                                        color: "var(--accent)",
                                        textDecoration: "none",
                                        fontSize: "11px",
                                        lineHeight: 1.35,
                                        padding: "6px 8px",
                                        borderRadius: "8px",
                                        border: "1px solid var(--border)",
                                        backgroundColor: "color-mix(in srgb, var(--accent) 3%, var(--bg-card))",
                                        overflowWrap: "anywhere",
                                      }}
                                    >
                                      <span
                                        style={{
                                          minWidth: 0,
                                          overflow: "hidden",
                                          textOverflow: isCompactViewport ? "clip" : "ellipsis",
                                          whiteSpace: isCompactViewport ? "normal" : "nowrap",
                                          wordBreak: "break-word",
                                        }}
                                      >
                                        {citation.title}
                                      </span>
                                      <span
                                        style={{
                                          fontFamily: "'DM Mono', monospace",
                                          fontSize: "8px",
                                          letterSpacing: "0.08em",
                                          textTransform: "uppercase",
                                          color: "var(--ink-muted)",
                                          flexShrink: 0,
                                          justifySelf: isCompactViewport ? "start" : "end",
                                        }}
                                      >
                                        {citation.sourceType === "official_exim" ? "EXIM" : "App"}
                                      </span>
                                    </a>
                                  ))}
                                </div>
                              </motion.div>
                            ) : null}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <form
              onSubmit={handleSubmit}
              style={{
                display: "grid",
                gap: "10px",
                padding: "14px",
                borderTop: "1px solid var(--border)",
                backgroundColor: "var(--bg-card)",
              }}
            >
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleTextareaKeyDown}
                placeholder={placeholder}
                rows={3}
                disabled={isStreaming}
                style={{
                  ...inputBaseStyle,
                  resize: "none",
                  minHeight: "84px",
                }}
              />

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    minHeight: "18px",
                    fontSize: "11px",
                    color: error ? "var(--accent)" : "var(--ink-muted)",
                    fontFamily: error ? "'Inter', sans-serif" : "'DM Mono', monospace",
                  }}
                >
                  {error ? (
                    error
                  ) : isStreaming ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <span>Streaming response</span>
                      <LoadingEllipsis />
                    </span>
                  ) : (
                    "Enter to send, Shift+Enter for a new line."
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isStreaming || !input.trim()}
                  style={{
                    border: "1px solid var(--accent)",
                    backgroundColor: "var(--accent)",
                    color: "#fff",
                    borderRadius: "999px",
                    padding: "10px 16px",
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "11px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    cursor: isStreaming || !input.trim() ? "not-allowed" : "pointer",
                    opacity: isStreaming || !input.trim() ? 0.55 : 1,
                  }}
                >
                  {isStreaming ? "Streaming" : "Send"}
                </button>
              </div>
            </form>
          </motion.section>
        ) : null}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        whileHover={{ y: -2, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        aria-label={isOpen ? "Close chat assistant" : "Open chat assistant"}
        style={bubbleButtonStyle}
      >
        {isOpen ? <CloseGlyph /> : <ChatGlyph />}
      </motion.button>
    </div>
  );
}
