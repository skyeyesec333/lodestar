"use client";

import { useState, useTransition } from "react";
import type { ShareLinkRow } from "@/lib/db/share-links";
import { createShareLinkAction, revokeShareLinkAction } from "@/actions/share-links";

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  projectId: string;
  slug: string;
  initialLinks: ShareLinkRow[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function linkUrl(token: string): string {
  if (typeof window === "undefined") return `/share/${token}`;
  return `${window.location.origin}/share/${token}`;
}

function isExpired(link: ShareLinkRow): boolean {
  if (!link.expiresAt) return false;
  return new Date(link.expiresAt) < new Date();
}

function linkStatus(link: ShareLinkRow): "active" | "revoked" | "expired" {
  if (link.revokedAt) return "revoked";
  if (isExpired(link)) return "expired";
  return "active";
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ShareLinksPanel({ projectId, slug, initialLinks }: Props) {
  const [links, setLinks] = useState<ShareLinkRow[]>(initialLinks);
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [revokingId, setRevokingId] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    startTransition(async () => {
      const result = await createShareLinkAction({
        projectId,
        slug,
        label: label.trim() || null,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      if (!result.ok) {
        setFormError(result.error.message);
        return;
      }
      setLinks((prev) => [result.value, ...prev]);
      setLabel("");
      setExpiresAt("");
      setShowForm(false);
    });
  }

  function handleCopy(token: string, id: string) {
    void navigator.clipboard.writeText(linkUrl(token)).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  async function handleRevoke(linkId: string) {
    setRevokingId(linkId);
    const result = await revokeShareLinkAction({ linkId, slug, projectId });
    setRevokingId(null);
    if (!result.ok) return;
    setLinks((prev) =>
      prev.map((l) =>
        l.id === linkId ? { ...l, revokedAt: new Date() } : l
      )
    );
  }

  const statusColors: Record<string, string> = {
    active: "var(--teal, #0d9488)",
    revoked: "var(--ink-muted, #9ca3af)",
    expired: "var(--gold, #d97706)",
  };

  return (
    <div
      style={{
        border: "1px solid var(--border, #e5e7eb)",
        borderRadius: "12px",
        padding: "20px",
        backgroundColor: "var(--bg-card, #ffffff)",
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div>
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "var(--ink-muted, #9ca3af)",
              margin: "0 0 4px",
            }}
          >
            Shared data room links
          </p>
          <p
            style={{
              fontSize: "13px",
              color: "var(--ink-mid, #6b7280)",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Generate read-only links for external reviewers — no Clerk account
            required.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "8px 16px",
              borderRadius: "999px",
              border: "1px solid var(--border, #e5e7eb)",
              backgroundColor: "var(--bg-card, #ffffff)",
              color: "var(--ink, #111827)",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            + Create link
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={(e) => void handleCreate(e)}
          style={{
            border: "1px solid var(--border, #e5e7eb)",
            borderRadius: "10px",
            padding: "16px",
            marginBottom: "16px",
            backgroundColor: "var(--bg, #f9f8f6)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label
              htmlFor="share-label"
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink-muted, #9ca3af)",
              }}
            >
              Label (optional)
            </label>
            <input
              id="share-label"
              type="text"
              placeholder="e.g. EXIM Review – March 2026"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={120}
              style={{
                fontSize: "13px",
                padding: "8px 12px",
                border: "1px solid var(--border, #e5e7eb)",
                borderRadius: "8px",
                outline: "none",
                fontFamily: "'Inter', sans-serif",
                backgroundColor: "#ffffff",
                color: "var(--ink, #111827)",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label
              htmlFor="share-expires"
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink-muted, #9ca3af)",
              }}
            >
              Expiry date (optional)
            </label>
            <input
              id="share-expires"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              style={{
                fontSize: "13px",
                padding: "8px 12px",
                border: "1px solid var(--border, #e5e7eb)",
                borderRadius: "8px",
                outline: "none",
                fontFamily: "'Inter', sans-serif",
                backgroundColor: "#ffffff",
                color: "var(--ink, #111827)",
              }}
            />
          </div>

          {formError && (
            <p
              style={{
                fontSize: "12px",
                color: "var(--accent, #ef4444)",
                margin: 0,
              }}
            >
              {formError}
            </p>
          )}

          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setFormError(null);
                setLabel("");
                setExpiresAt("");
              }}
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "8px 16px",
                borderRadius: "999px",
                border: "1px solid var(--border, #e5e7eb)",
                backgroundColor: "transparent",
                color: "var(--ink-mid, #6b7280)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "8px 16px",
                borderRadius: "999px",
                border: "none",
                backgroundColor: "var(--ink, #111827)",
                color: "#ffffff",
                cursor: isPending ? "wait" : "pointer",
                opacity: isPending ? 0.6 : 1,
              }}
            >
              {isPending ? "Creating…" : "Create link"}
            </button>
          </div>
        </form>
      )}

      {/* Links list */}
      {links.length === 0 ? (
        <p
          style={{
            fontSize: "13px",
            color: "var(--ink-muted, #9ca3af)",
            textAlign: "center",
            padding: "24px 0",
            margin: 0,
          }}
        >
          No share links yet. Create one to share this data room with external
          reviewers.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {links.map((link) => {
            const status = linkStatus(link);
            const isActive = status === "active";
            return (
              <div
                key={link.id}
                style={{
                  border: "1px solid var(--border, #e5e7eb)",
                  borderRadius: "10px",
                  padding: "14px 16px",
                  backgroundColor: isActive ? "#ffffff" : "var(--bg, #f9f8f6)",
                  opacity: isActive ? 1 : 0.65,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  {/* Left: info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "6px",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "9px",
                          letterSpacing: "0.10em",
                          textTransform: "uppercase",
                          padding: "2px 8px",
                          borderRadius: "999px",
                          border: `1px solid ${statusColors[status]}`,
                          color: statusColors[status],
                        }}
                      >
                        {status}
                      </span>
                      {link.label && (
                        <span
                          style={{
                            fontSize: "13px",
                            fontWeight: 500,
                            color: "var(--ink, #111827)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {link.label}
                        </span>
                      )}
                    </div>

                    <p
                      style={{
                        fontSize: "11px",
                        color: "var(--ink-muted, #9ca3af)",
                        margin: "0 0 4px",
                        fontFamily: "'DM Mono', monospace",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      /share/{link.token}
                    </p>

                    <p
                      style={{
                        fontSize: "11px",
                        color: "var(--ink-muted, #9ca3af)",
                        margin: 0,
                      }}
                    >
                      Created {formatDate(link.createdAt)}
                      {link.expiresAt
                        ? ` · Expires ${formatDate(link.expiresAt)}`
                        : ""}
                      {link.revokedAt
                        ? ` · Revoked ${formatDate(link.revokedAt)}`
                        : ""}
                      {link.viewCount > 0
                        ? ` · ${link.viewCount} view${link.viewCount !== 1 ? "s" : ""}`
                        : ""}
                    </p>
                  </div>

                  {/* Right: actions */}
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      flexShrink: 0,
                      alignItems: "center",
                    }}
                  >
                    {isActive && (
                      <button
                        onClick={() => handleCopy(link.token, link.id)}
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "10px",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          padding: "6px 14px",
                          borderRadius: "999px",
                          border: "1px solid var(--border, #e5e7eb)",
                          backgroundColor:
                            copiedId === link.id
                              ? "var(--teal, #0d9488)"
                              : "transparent",
                          color:
                            copiedId === link.id
                              ? "#ffffff"
                              : "var(--ink, #111827)",
                          cursor: "pointer",
                          transition: "background-color 0.15s, color 0.15s",
                        }}
                      >
                        {copiedId === link.id ? "Copied!" : "Copy link"}
                      </button>
                    )}
                    {isActive && (
                      <button
                        onClick={() => void handleRevoke(link.id)}
                        disabled={revokingId === link.id}
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "10px",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          padding: "6px 14px",
                          borderRadius: "999px",
                          border: "1px solid var(--border, #e5e7eb)",
                          backgroundColor: "transparent",
                          color: "var(--accent, #ef4444)",
                          cursor:
                            revokingId === link.id ? "wait" : "pointer",
                          opacity: revokingId === link.id ? 0.5 : 1,
                        }}
                      >
                        {revokingId === link.id ? "Revoking…" : "Revoke"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
