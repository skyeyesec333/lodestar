"use client";

import { useEffect } from "react";
import type { OrgDetail, HealthStatus } from "@/hooks/useStakeholderGraph";

type Props = {
  org: OrgDetail;
  projectSlug: string;
  onClose: () => void;
};

const HEALTH_LABEL: Record<HealthStatus, string> = {
  active: "Active",
  stale: "Stale",
  blocked: "Blocked",
};

const HEALTH_COLOR: Record<HealthStatus, string> = {
  active: "var(--teal)",
  stale: "var(--gold)",
  blocked: "var(--accent)",
};

function formatRelative(date: Date | null): string {
  if (!date) return "No recent contact";
  const days = Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function CounterpartyDetailSheet({ org, projectSlug, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${org.name} counterparty detail`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          backgroundColor: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          width: "min(560px, 92vw)",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <p
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "9px",
                fontWeight: 500,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--ink-muted)",
                margin: 0,
              }}
            >
              {org.role}
            </p>
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "9px",
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: HEALTH_COLOR[org.status],
                backgroundColor: `color-mix(in srgb, ${HEALTH_COLOR[org.status]} 12%, transparent)`,
                border: `1px solid color-mix(in srgb, ${HEALTH_COLOR[org.status]} 40%, transparent)`,
                borderRadius: "3px",
                padding: "2px 6px",
              }}
            >
              {HEALTH_LABEL[org.status]}
            </span>
          </div>
          <h2
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "20px",
              fontWeight: 600,
              color: "var(--ink)",
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            {org.name}
          </h2>
          <div
            style={{
              display: "flex",
              gap: "16px",
              marginTop: "6px",
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              color: "var(--ink-muted)",
              letterSpacing: "0.06em",
            }}
          >
            {org.jurisdiction && <span>{org.jurisdiction}</span>}
            <span>{formatRelative(org.lastContactAt)}</span>
            <span>
              {org.linkedRequirementCount} requirement{org.linkedRequirementCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          {/* Stakeholders */}
          <section style={{ marginBottom: "20px" }}>
            <p
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "9px",
                fontWeight: 500,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--ink-muted)",
                margin: "0 0 10px",
              }}
            >
              Contacts ({org.stakeholders.length})
            </p>
            {org.stakeholders.length === 0 ? (
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "var(--ink-muted)", margin: 0 }}>
                No stakeholder contacts on file.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {org.stakeholders.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 0",
                      borderBottom: "1px solid var(--border)",
                      gap: "12px",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "13px",
                          fontWeight: 500,
                          color: "var(--ink)",
                          margin: "0 0 2px",
                        }}
                      >
                        {s.name}
                      </p>
                      {s.title && (
                        <p
                          style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: "10px",
                            color: "var(--ink-muted)",
                            margin: 0,
                            letterSpacing: "0.06em",
                          }}
                        >
                          {s.title}
                        </p>
                      )}
                    </div>
                    {s.email && (
                      <a
                        href={`mailto:${s.email}`}
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "10px",
                          color: "var(--teal)",
                          textDecoration: "none",
                          letterSpacing: "0.04em",
                          flexShrink: 0,
                        }}
                      >
                        {s.email}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Blocking requirements */}
          {org.blockingRequirements.length > 0 && (
            <section>
              <p
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "9px",
                  fontWeight: 500,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--accent)",
                  margin: "0 0 10px",
                }}
              >
                Overdue requirements ({org.blockingRequirements.length})
              </p>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {org.blockingRequirements.map((r) => (
                  <div
                    key={r.projectRequirementId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 0",
                      borderBottom: "1px solid var(--border)",
                      gap: "12px",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "13px",
                        color: "var(--ink)",
                        flex: 1,
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {r.name}
                    </span>
                    <span
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "9px",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--ink-muted)",
                        flexShrink: 0,
                      }}
                    >
                      {formatStatus(r.status)}
                    </span>
                    {r.targetDate && (
                      <span
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "10px",
                          color: "var(--accent)",
                          flexShrink: 0,
                        }}
                      >
                        Due {r.targetDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <a
            href={`/projects/${projectSlug}/parties`}
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--teal)",
              textDecoration: "none",
            }}
          >
            Open in stakeholders →
          </a>
          <button
            onClick={onClose}
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              borderRadius: "3px",
              padding: "9px 18px",
              cursor: "pointer",
              border: "1px solid var(--border)",
              backgroundColor: "transparent",
              color: "var(--ink-muted)",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
