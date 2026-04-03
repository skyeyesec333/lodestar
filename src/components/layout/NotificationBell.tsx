"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { getNotificationsAction } from "@/actions/notifications";
import type { NotificationItem } from "@/lib/db/notifications";

const LS_KEY = "lodestar:notifications:readIds";

function loadReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set(parsed as string[]);
  } catch {
    // ignore parse errors
  }
  return new Set();
}

function saveReadIds(ids: Set<string>): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // ignore quota errors
  }
}

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  // Hydrate readIds from localStorage on mount (client-only)
  useEffect(() => {
    setReadIds(loadReadIds());
  }, []);

  const fetchNotifications = useCallback(async () => {
    const result = await getNotificationsAction();
    if (result.ok) {
      setItems(result.value);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // When dropdown opens, mark all currently unread items as read in localStorage
  useEffect(() => {
    if (!open || items.length === 0) return;
    const newReadIds = new Set(readIds);
    let changed = false;
    for (const item of items) {
      if (!item.read && !newReadIds.has(item.id)) {
        newReadIds.add(item.id);
        changed = true;
      }
    }
    if (changed) {
      saveReadIds(newReadIds);
      setReadIds(newReadIds);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close on outside click or Escape key
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // An item is unread if the server says unread AND it hasn't been seen locally
  const isUnread = useCallback(
    (item: NotificationItem) => !item.read && !readIds.has(item.id),
    [readIds],
  );

  const unreadCount = items.filter(isUnread).length;

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "32px",
          height: "32px",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--nav-link)",
          borderRadius: "6px",
          padding: 0,
        }}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: "2px",
              right: "2px",
              minWidth: "14px",
              height: "14px",
              borderRadius: "7px",
              backgroundColor: "#ef4444",
              color: "#fff",
              fontSize: "9px",
              fontWeight: 700,
              lineHeight: "14px",
              textAlign: "center",
              padding: "0 3px",
              fontFamily: "'DM Mono', monospace",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: "360px",
            maxHeight: "480px",
            overflowY: "auto",
            backgroundColor: "var(--nav-bg, #fff)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            zIndex: 9999,
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--nav-text)",
                opacity: 0.7,
              }}
            >
              Notifications
            </span>
            {unreadCount > 0 && (
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  color: "#ef4444",
                  fontWeight: 600,
                }}
              >
                {unreadCount} new
              </span>
            )}
          </div>

          {/* Body */}
          {!loaded ? (
            <div
              style={{
                padding: "32px 16px",
                textAlign: "center",
                fontFamily: "'DM Mono', monospace",
                fontSize: "11px",
                color: "var(--nav-text)",
                opacity: 0.5,
              }}
            >
              Loading...
            </div>
          ) : items.length === 0 ? (
            <div
              style={{
                padding: "32px 16px",
                textAlign: "center",
                fontFamily: "'DM Mono', monospace",
                fontSize: "11px",
                color: "var(--nav-text)",
                opacity: 0.5,
              }}
            >
              No recent activity
            </div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/projects/${item.projectSlug}`}
                    onClick={() => setOpen(false)}
                    style={{
                      display: "block",
                      padding: "10px 16px",
                      textDecoration: "none",
                      borderBottom: "1px solid var(--border)",
                      backgroundColor: isUnread(item) ? "rgba(255,255,255,0.03)" : "transparent",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                      {isUnread(item) && (
                        <span
                          aria-hidden="true"
                          style={{
                            marginTop: "5px",
                            flexShrink: 0,
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            backgroundColor: "#ef4444",
                          }}
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            margin: 0,
                            fontFamily: "system-ui, sans-serif",
                            fontSize: "12px",
                            color: "var(--nav-text)",
                            lineHeight: "1.4",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.message}
                        </p>
                        <p
                          style={{
                            margin: "2px 0 0",
                            fontFamily: "'DM Mono', monospace",
                            fontSize: "10px",
                            color: "var(--nav-text)",
                            opacity: 0.5,
                          }}
                        >
                          {item.projectName} · {formatRelativeTime(new Date(item.createdAt))}
                        </p>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
