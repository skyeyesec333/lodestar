"use client";

import {
  CSSProperties,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import type { TeamMember } from "@/types/collaboration";

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onMentionsChange: (mentionedIds: string[]) => void;
  teamMembers: TeamMember[];
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  style?: CSSProperties;
}

const MENTION_TRIGGER = "@";

/**
 * Textarea with @-mention autocomplete.
 * Parses @name tokens from the text and resolves them to clerkUserIds.
 * Stores mentions structurally so they survive edits.
 */
export function MentionInput({
  value,
  onChange,
  onMentionsChange,
  teamMembers,
  placeholder = "Add a comment…",
  disabled = false,
  rows = 3,
  style,
}: MentionInputProps) {
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownIndex, setDropdownIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filtered = query
    ? teamMembers.filter((m) =>
        m.name.toLowerCase().includes(query.toLowerCase())
      )
    : teamMembers;

  // Recompute structural mentions whenever the text changes
  useEffect(() => {
    const mentionPattern = /@(\w[\w\s]*?)(?=\s|$|@)/g;
    const ids: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = mentionPattern.exec(value)) !== null) {
      const token = match[1].trim();
      const member = teamMembers.find(
        (m) => m.name.toLowerCase() === token.toLowerCase()
      );
      if (member && !ids.includes(member.clerkUserId)) {
        ids.push(member.clerkUserId);
      }
    }
    onMentionsChange(ids);
  }, [value, teamMembers, onMentionsChange]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value;
    onChange(text);

    // Detect @-trigger in the current word
    const cursor = e.target.selectionStart ?? text.length;
    const before = text.slice(0, cursor);
    const lastAt = before.lastIndexOf(MENTION_TRIGGER);
    if (lastAt !== -1) {
      const fragment = before.slice(lastAt + 1);
      // Only show dropdown if no space yet in fragment (still typing the name)
      if (!fragment.includes(" ")) {
        setQuery(fragment);
        setShowDropdown(true);
        setDropdownIndex(0);
        return;
      }
    }
    setShowDropdown(false);
    setQuery("");
  }

  function insertMention(member: TeamMember) {
    const cursor = textareaRef.current?.selectionStart ?? value.length;
    const before = value.slice(0, cursor);
    const lastAt = before.lastIndexOf(MENTION_TRIGGER);
    const after = value.slice(cursor);
    const newText = before.slice(0, lastAt) + `@${member.name} ` + after;
    onChange(newText);
    setShowDropdown(false);
    setQuery("");
    // Restore focus
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (!showDropdown) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setDropdownIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setDropdownIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (filtered[dropdownIndex]) {
        e.preventDefault();
        insertMention(filtered[dropdownIndex]);
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  }

  return (
    <div style={{ position: "relative", ...style }}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        style={{
          width: "100%",
          resize: "none",
          borderRadius: "8px",
          border: "1px solid var(--border)",
          background: "var(--bg)",
          color: "var(--ink)",
          padding: "8px 10px",
          fontFamily: "inherit",
          fontSize: "13px",
          lineHeight: 1.5,
          outline: "none",
          boxSizing: "border-box",
        }}
      />
      {showDropdown && filtered.length > 0 && (
        <div
          role="listbox"
          aria-label="Mention suggestions"
          style={{
            position: "absolute",
            bottom: "100%",
            left: 0,
            right: 0,
            marginBottom: "4px",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            background: "var(--bg-card)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            zIndex: 100,
            overflow: "hidden",
            maxHeight: "160px",
            overflowY: "auto",
          }}
        >
          {filtered.map((member, i) => (
            <button
              key={member.clerkUserId}
              role="option"
              aria-selected={i === dropdownIndex}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(member);
              }}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "8px 12px",
                background: i === dropdownIndex ? "color-mix(in srgb, var(--accent) 10%, var(--bg-card))" : "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: "color-mix(in srgb, var(--accent) 20%, var(--bg-card))",
                  display: "grid",
                  placeItems: "center",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "var(--accent)",
                  flexShrink: 0,
                }}
              >
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "13px", color: "var(--ink)", fontWeight: 500 }}>
                  {member.name}
                </p>
                {member.email && (
                  <p style={{ margin: 0, fontSize: "11px", color: "var(--ink-muted)" }}>
                    {member.email}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
