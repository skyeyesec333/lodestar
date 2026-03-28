"use client";

import { useState, useTransition } from "react";
import type { MeetingRow, ActionItemRow } from "@/lib/db/meetings";
import type { StakeholderRow } from "@/lib/db/stakeholders";
import { createMeeting, createActionItem, updateMeetingActionItemStatus } from "@/actions/meetings";

// ── Provider Connector Banner ─────────────────────────────────────────────────

type Provider = { id: string; name: string; color: string; icon: React.ReactNode };

const PROVIDERS: Provider[] = [
  {
    id: "zoom",
    name: "Zoom",
    color: "#2D8CFF",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
        <rect width="40" height="40" rx="8" fill="#2D8CFF"/>
        <path d="M8 14.5C8 13.12 9.12 12 10.5 12H23.5C24.88 12 26 13.12 26 14.5V22L32 17V27L26 22v2.5C26 25.88 24.88 27 23.5 27H10.5C9.12 27 8 25.88 8 24.5V14.5Z" fill="white"/>
      </svg>
    ),
  },
  {
    id: "teams",
    name: "Teams",
    color: "#5558AF",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
        <rect width="40" height="40" rx="8" fill="#5558AF"/>
        <circle cx="26" cy="14" r="4" fill="#fff" fillOpacity="0.9"/>
        <rect x="21" y="19" width="10" height="7" rx="2" fill="#fff" fillOpacity="0.9"/>
        <circle cx="16" cy="13" r="5" fill="white"/>
        <rect x="10" y="20" width="12" height="8" rx="2.5" fill="white"/>
      </svg>
    ),
  },
  {
    id: "meet",
    name: "Meet",
    color: "#00897B",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
        <rect width="40" height="40" rx="8" fill="#fff"/>
        <path d="M8 15h14v10H8z" fill="#00897B"/>
        <path d="M22 15l10-5v20l-10-5V15z" fill="#00BFA5"/>
        <path d="M8 25h14v2H8z" fill="#005B4F"/>
      </svg>
    ),
  },
  {
    id: "notion",
    name: "Notion",
    color: "#000",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
        <rect width="40" height="40" rx="8" fill="#fff" stroke="#e5e5e5"/>
        <path d="M13 11h10l7 7v14H13V11z" fill="#fff"/>
        <path d="M23 11v7h7" stroke="#000" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M13 11l10 0 7 7v14H13V11z" stroke="#000" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M17 20h8M17 24h6" stroke="#000" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: "otter",
    name: "Otter.ai",
    color: "#1A73E8",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
        <rect width="40" height="40" rx="8" fill="#1A73E8"/>
        <ellipse cx="20" cy="22" rx="9" ry="8" fill="white"/>
        <ellipse cx="20" cy="21" rx="6" ry="5.5" fill="#1A73E8"/>
        <circle cx="17.5" cy="19.5" r="1.5" fill="white"/>
        <circle cx="22.5" cy="19.5" r="1.5" fill="white"/>
        <ellipse cx="12" cy="17" rx="3" ry="2.5" fill="white"/>
        <ellipse cx="28" cy="17" rx="3" ry="2.5" fill="white"/>
        <path d="M17 24.5C18 25.5 22 25.5 23 24.5" stroke="white" strokeWidth="1" strokeLinecap="round"/>
      </svg>
    ),
  },
];

function ProviderConnector() {
  const [dismissed, setDismissed] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  if (dismissed) return null;

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "6px",
        padding: "20px 24px",
        marginBottom: "20px",
        backgroundColor: "var(--bg-card)",
        position: "relative",
      }}
    >
      {/* Dismiss */}
      <button
        onClick={() => setDismissed(true)}
        style={{
          position: "absolute",
          top: "12px",
          right: "12px",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--ink-muted)",
          fontSize: "16px",
          lineHeight: 1,
          padding: "2px 6px",
        }}
        title="Dismiss"
      >
        ×
      </button>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
        <div style={{ flex: 1 }}>
          <p style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--teal)",
            margin: "0 0 4px",
          }}>
            Connect a Provider
          </p>
          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "13px",
            color: "var(--ink-mid)",
            margin: 0,
            lineHeight: 1.5,
          }}>
            Automatically import meeting notes, transcripts, and action items from your favorite tools.
          </p>
        </div>
        <span style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "9px",
          fontWeight: 500,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: "var(--ink-muted)",
          backgroundColor: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: "3px",
          padding: "3px 8px",
          flexShrink: 0,
        }}>
          Coming Soon
        </span>
      </div>

      {/* Provider icons */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            title={p.name}
            disabled
            onMouseEnter={() => setHovered(p.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "6px",
              background: "none",
              border: `1px solid ${hovered === p.id ? "var(--border-strong)" : "var(--border)"}`,
              borderRadius: "8px",
              padding: "12px 16px",
              cursor: "not-allowed",
              opacity: hovered === p.id ? 1 : 0.75,
              transition: "opacity 0.15s, border-color 0.15s, box-shadow 0.15s",
              boxShadow: hovered === p.id ? "0 2px 10px rgba(0,0,0,0.08)" : "none",
              minWidth: "68px",
            }}
          >
            {p.icon}
            <span style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "8px",
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ink-muted)",
              whiteSpace: "nowrap",
            }}>
              {p.name}
            </span>
          </button>
        ))}

        {/* + More placeholder */}
        <button
          disabled
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            background: "none",
            border: "1px dashed var(--border)",
            borderRadius: "8px",
            padding: "12px 16px",
            cursor: "not-allowed",
            opacity: 0.5,
            minWidth: "68px",
          }}
        >
          <span style={{ fontSize: "20px", color: "var(--ink-muted)", lineHeight: 1 }}>+</span>
          <span style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "8px",
            fontWeight: 500,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ink-muted)",
          }}>
            More
          </span>
        </button>
      </div>
    </div>
  );
}

type Props = {
  projectId: string;
  slug: string;
  initialMeetings: MeetingRow[];
  stakeholders: StakeholderRow[];
};

const MEETING_TYPE_LABELS: Record<string, string> = {
  in_person: "In Person",
  virtual: "Virtual",
  phone_call: "Phone Call",
  site_visit: "Site Visit",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "var(--ink-muted)",
  medium: "var(--gold)",
  high: "var(--accent)",
  critical: "var(--accent)",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  completed: "Done",
  cancelled: "Cancelled",
};

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Add Meeting Form ──────────────────────────────────────────────────────────

function AddMeetingForm({
  projectId,
  slug,
  stakeholders,
  onCreated,
  onCancel,
}: {
  projectId: string;
  slug: string;
  stakeholders: StakeholderRow[];
  onCreated: (m: MeetingRow) => void;
  onCancel: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [meetingType, setMeetingType] = useState("virtual");
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().slice(0, 10));
  const [duration, setDuration] = useState("");
  const [location, setLocation] = useState("");
  const [summary, setSummary] = useState("");
  const [selectedAttendees, setSelectedAttendees] = useState<Set<string>>(new Set());

  function toggleAttendee(id: string) {
    setSelectedAttendees((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function submit() {
    if (!title.trim()) { setError("Title is required."); return; }
    setError(null);
    startTransition(async () => {
      const result = await createMeeting({
        projectId,
        slug,
        title: title.trim(),
        meetingType,
        meetingDate,
        durationMinutes: duration ? parseInt(duration, 10) : null,
        location: location || null,
        summary: summary || null,
        attendeeStakeholderIds: Array.from(selectedAttendees),
      });
      if (!result.ok) { setError(result.error.message); return; }
      onCreated(result.value);
    });
  }

  const inputStyle: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    fontSize: "13px",
    color: "var(--ink)",
    backgroundColor: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: "3px",
    padding: "8px 10px",
    width: "100%",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "'DM Mono', monospace",
    fontSize: "10px",
    fontWeight: 500,
    letterSpacing: "0.10em",
    textTransform: "uppercase" as const,
    color: "var(--ink-muted)",
    display: "block",
    marginBottom: "6px",
  };

  return (
    <div style={{ padding: "24px", borderTop: "1px solid var(--border)" }}>
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--ink)", margin: "0 0 20px" }}>
        Log Meeting
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Title *</label>
          <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. EXIM Pre-Application Call" />
        </div>
        <div>
          <label style={labelStyle}>Type</label>
          <select style={inputStyle} value={meetingType} onChange={(e) => setMeetingType(e.target.value)}>
            {Object.entries(MEETING_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Date *</label>
          <input style={inputStyle} type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Duration (min)</label>
          <input style={inputStyle} type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="60" min="1" />
        </div>
        <div>
          <label style={labelStyle}>Location</label>
          <input style={inputStyle} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Zoom / Washington D.C." />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Summary</label>
          <textarea style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Key discussion points and decisions…" />
        </div>
      </div>

      {stakeholders.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <label style={labelStyle}>Attendees</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {stakeholders.map((s) => {
              const selected = selectedAttendees.has(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleAttendee(s.id)}
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "12px",
                    padding: "5px 12px",
                    borderRadius: "3px",
                    border: `1px solid ${selected ? "var(--teal)" : "var(--border)"}`,
                    backgroundColor: selected ? "var(--teal-soft, rgba(0,150,136,0.08))" : "transparent",
                    color: selected ? "var(--teal)" : "var(--ink-mid)",
                    cursor: "pointer",
                  }}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "var(--accent)", margin: "0 0 12px" }}>{error}</p>}

      <div style={{ display: "flex", gap: "10px" }}>
        <button
          onClick={submit}
          disabled={pending}
          style={{
            fontFamily: "'DM Mono', monospace", fontSize: "10px", fontWeight: 500, letterSpacing: "0.10em",
            textTransform: "uppercase", color: "#fff", backgroundColor: pending ? "var(--ink-muted)" : "var(--accent)",
            border: "none", borderRadius: "3px", padding: "8px 18px", cursor: pending ? "not-allowed" : "pointer",
          }}
        >
          {pending ? "Saving…" : "Save Meeting"}
        </button>
        <button
          onClick={onCancel}
          style={{
            fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.10em",
            textTransform: "uppercase", color: "var(--ink-muted)", backgroundColor: "transparent",
            border: "1px solid var(--border)", borderRadius: "3px", padding: "8px 18px", cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Add Action Item Form ──────────────────────────────────────────────────────

function AddActionItemForm({
  projectId,
  slug,
  meetingId,
  stakeholders,
  onCreated,
  onCancel,
}: {
  projectId: string;
  slug: string;
  meetingId: string;
  stakeholders: StakeholderRow[];
  onCreated: (a: ActionItemRow) => void;
  onCancel: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [assignedToId, setAssignedToId] = useState("");

  const inputStyle: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "var(--ink)",
    backgroundColor: "var(--bg)", border: "1px solid var(--border)", borderRadius: "3px",
    padding: "7px 10px", width: "100%", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: "'DM Mono', monospace", fontSize: "10px", fontWeight: 500,
    letterSpacing: "0.10em", textTransform: "uppercase" as const, color: "var(--ink-muted)",
    display: "block", marginBottom: "5px",
  };

  function submit() {
    if (!title.trim()) { setError("Title is required."); return; }
    setError(null);
    startTransition(async () => {
      const result = await createActionItem({
        projectId, slug, meetingId,
        title: title.trim(),
        priority,
        dueDate: dueDate || null,
        assignedToId: assignedToId || null,
        description: null,
        requirementId: null,
      });
      if (!result.ok) { setError(result.error.message); return; }
      onCreated(result.value);
    });
  }

  return (
    <div style={{ backgroundColor: "var(--bg)", border: "1px solid var(--border)", borderRadius: "3px", padding: "16px", marginTop: "12px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "12px" }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Action Item *</label>
          <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to happen?" autoFocus />
        </div>
        <div>
          <label style={labelStyle}>Priority</label>
          <select style={inputStyle} value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Due Date</label>
          <input style={inputStyle} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Assign To</label>
          <select style={inputStyle} value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)}>
            <option value="">— Unassigned —</option>
            {stakeholders.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>
      {error && <p style={{ fontSize: "12px", color: "var(--accent)", margin: "0 0 10px" }}>{error}</p>}
      <div style={{ display: "flex", gap: "8px" }}>
        <button onClick={submit} disabled={pending} style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#fff", backgroundColor: pending ? "var(--ink-muted)" : "var(--accent)", border: "none", borderRadius: "3px", padding: "6px 14px", cursor: pending ? "not-allowed" : "pointer" }}>
          {pending ? "Adding…" : "Add"}
        </button>
        <button onClick={onCancel} style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-muted)", backgroundColor: "transparent", border: "1px solid var(--border)", borderRadius: "3px", padding: "6px 14px", cursor: "pointer" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Action Item Row ───────────────────────────────────────────────────────────

function ActionItemCard({
  item,
  projectId,
  slug,
}: {
  item: ActionItemRow;
  projectId: string;
  slug: string;
}) {
  const [status, setStatus] = useState(item.status);
  const [, startTransition] = useTransition();

  function toggle() {
    const next = status === "completed" ? "open" : "completed";
    setStatus(next);
    startTransition(async () => {
      await updateMeetingActionItemStatus({ projectId, slug, actionItemId: item.id, status: next });
    });
  }

  const done = status === "completed" || status === "cancelled";

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
      {/* Checkbox */}
      <button
        onClick={toggle}
        style={{
          width: "16px", height: "16px", borderRadius: "3px", flexShrink: 0, marginTop: "2px",
          border: `1px solid ${done ? "var(--teal)" : "var(--border)"}`,
          backgroundColor: done ? "var(--teal)" : "transparent",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {done && <span style={{ color: "#fff", fontSize: "9px", lineHeight: 1 }}>✓</span>}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 500,
          color: done ? "var(--ink-muted)" : "var(--ink)", margin: 0,
          textDecoration: done ? "line-through" : "none",
        }}>
          {item.title}
        </p>
        <div style={{ display: "flex", gap: "12px", marginTop: "3px", flexWrap: "wrap" }}>
          {item.assignedTo && (
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "var(--ink-muted)", letterSpacing: "0.04em" }}>
              → {item.assignedTo.name}
            </span>
          )}
          {item.dueDate && (
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "var(--ink-muted)", letterSpacing: "0.04em" }}>
              Due {formatDate(item.dueDate)}
            </span>
          )}
          {item.requirementName && (
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "var(--gold)", letterSpacing: "0.04em" }}>
              #{item.requirementName}
            </span>
          )}
        </div>
      </div>

      <span style={{
        fontFamily: "'DM Mono', monospace", fontSize: "9px", fontWeight: 600,
        letterSpacing: "0.08em", textTransform: "uppercase",
        color: PRIORITY_COLORS[item.priority] ?? "var(--ink-muted)", flexShrink: 0,
      }}>
        {item.priority}
      </span>
    </div>
  );
}

// ── Meeting Card ──────────────────────────────────────────────────────────────

function MeetingCard({
  meeting,
  projectId,
  slug,
  stakeholders,
}: {
  meeting: MeetingRow;
  projectId: string;
  slug: string;
  stakeholders: StakeholderRow[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [actionItems, setActionItems] = useState<ActionItemRow[]>(meeting.actionItems);
  const [showAddAction, setShowAddAction] = useState(false);

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "4px", marginBottom: "12px", overflow: "hidden" }}>
      {/* Header row */}
      <div
        onClick={() => setExpanded((v) => !v)}
        style={{ display: "flex", alignItems: "center", gap: "16px", padding: "14px 20px", cursor: "pointer", backgroundColor: "var(--bg-card)" }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "14px", fontWeight: 500, color: "var(--ink)", margin: 0 }}>
            {meeting.title}
          </p>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "var(--ink-muted)", margin: "3px 0 0", letterSpacing: "0.06em" }}>
            {formatDate(meeting.meetingDate)} · {MEETING_TYPE_LABELS[meeting.meetingType] ?? meeting.meetingType}
            {meeting.durationMinutes ? ` · ${meeting.durationMinutes} min` : ""}
            {meeting.attendees.length > 0 ? ` · ${meeting.attendees.length} attendee${meeting.attendees.length !== 1 ? "s" : ""}` : ""}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
          {actionItems.length > 0 && (
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.06em", color: "var(--gold)" }}>
              {actionItems.filter((a) => a.status === "open" || a.status === "in_progress").length} open
            </span>
          )}
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "12px", color: "var(--ink-muted)" }}>
            {expanded ? "▲" : "▼"}
          </span>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)" }}>
          {/* Attendees */}
          {meeting.attendees.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", fontWeight: 500, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--ink-muted)", margin: "0 0 8px" }}>Attendees</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {meeting.attendees.map((a) => (
                  <span key={a.id} style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "var(--ink-mid)", backgroundColor: "var(--bg)", border: "1px solid var(--border)", borderRadius: "3px", padding: "3px 10px" }}>
                    {a.stakeholder.name}
                    {a.stakeholder.title ? ` · ${a.stakeholder.title}` : ""}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {meeting.summary && (
            <div style={{ marginBottom: "16px" }}>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", fontWeight: 500, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--ink-muted)", margin: "0 0 6px" }}>Summary</p>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", lineHeight: 1.7, color: "var(--ink-mid)", margin: 0, whiteSpace: "pre-wrap" }}>
                {meeting.summary}
              </p>
            </div>
          )}

          {/* Action Items */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", fontWeight: 500, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--ink-muted)", margin: 0 }}>
                Action Items
              </p>
              <button
                onClick={() => setShowAddAction((v) => !v)}
                style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent)", backgroundColor: "transparent", border: "none", padding: 0, cursor: "pointer" }}
              >
                + Add
              </button>
            </div>

            {actionItems.length === 0 && !showAddAction && (
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "var(--ink-muted)", margin: 0 }}>No action items yet.</p>
            )}

            {actionItems.map((item) => (
              <ActionItemCard key={item.id} item={item} projectId={projectId} slug={slug} />
            ))}

            {showAddAction && (
              <AddActionItemForm
                projectId={projectId}
                slug={slug}
                meetingId={meeting.id}
                stakeholders={stakeholders}
                onCreated={(a) => { setActionItems((prev) => [...prev, a]); setShowAddAction(false); }}
                onCancel={() => setShowAddAction(false)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function MeetingsLog({ projectId, slug, initialMeetings, stakeholders }: Props) {
  const [meetings, setMeetings] = useState<MeetingRow[]>(initialMeetings);
  const [showForm, setShowForm] = useState(false);

  return (
    <div style={{ marginBottom: "32px" }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <div>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-muted)", margin: "0 0 2px" }}>
            Meetings
          </p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "var(--ink-muted)", margin: 0 }}>
            {meetings.length} logged
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{
            fontFamily: "'DM Mono', monospace", fontSize: "10px", fontWeight: 500, letterSpacing: "0.10em",
            textTransform: "uppercase", color: "var(--accent)", backgroundColor: "transparent",
            border: "1px solid var(--accent)", borderRadius: "3px", padding: "6px 14px", cursor: "pointer",
          }}
        >
          {showForm ? "Cancel" : "+ Log Meeting"}
        </button>
      </div>

      {/* Provider connector */}
      <ProviderConnector />

      {/* Log form */}
      {showForm && (
        <div style={{ border: "1px solid var(--border)", borderRadius: "4px", marginBottom: "16px", overflow: "hidden", backgroundColor: "var(--bg-card)" }}>
          <AddMeetingForm
            projectId={projectId}
            slug={slug}
            stakeholders={stakeholders}
            onCreated={(m) => { setMeetings((prev) => [m, ...prev]); setShowForm(false); }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Meeting list */}
      {meetings.length === 0 && !showForm && (
        <div style={{ border: "1px solid var(--border)", borderRadius: "4px", padding: "40px 24px", textAlign: "center" }}>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "var(--ink-muted)", margin: 0 }}>
            No meetings logged yet. Log a meeting to track attendees and action items.
          </p>
        </div>
      )}

      {meetings.map((m) => (
        <MeetingCard
          key={m.id}
          meeting={m}
          projectId={projectId}
          slug={slug}
          stakeholders={stakeholders}
        />
      ))}
    </div>
  );
}
