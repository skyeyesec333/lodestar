"use client";

import { useState, useTransition } from "react";
import { addStakeholder, removeStakeholder } from "@/actions/stakeholders";
import type { StakeholderRow } from "@/lib/db/stakeholders";

const ROLE_OPTIONS = [
  { value: "epc_contact",        label: "EPC Contact" },
  { value: "offtaker_contact",   label: "Off-taker Contact" },
  { value: "legal_counsel",      label: "Legal Counsel" },
  { value: "exim_officer",       label: "EXIM Officer" },
  { value: "government_liaison", label: "Government Liaison" },
  { value: "financial_advisor",  label: "Financial Advisor" },
  { value: "community_rep",      label: "Community Rep" },
  { value: "sponsor_team",       label: "Sponsor Team" },
  { value: "other",              label: "Other" },
] as const;

const ROLE_COLORS: Record<string, string> = {
  epc_contact:        "var(--teal)",
  offtaker_contact:   "var(--gold)",
  legal_counsel:      "var(--ink-mid)",
  exim_officer:       "var(--accent)",
  government_liaison: "var(--ink-mid)",
  financial_advisor:  "var(--gold)",
  community_rep:      "var(--ink-muted)",
  sponsor_team:       "var(--teal)",
  other:              "var(--ink-muted)",
};

const ROLE_BG: Record<string, string> = {
  epc_contact:        "var(--teal-soft)",
  offtaker_contact:   "var(--gold-soft)",
  legal_counsel:      "var(--bg)",
  exim_officer:       "var(--accent-soft)",
  government_liaison: "var(--bg)",
  financial_advisor:  "var(--gold-soft)",
  community_rep:      "var(--bg)",
  sponsor_team:       "var(--teal-soft)",
  other:              "var(--bg)",
};

const inputStyle = {
  fontFamily: "'Inter', sans-serif",
  fontSize: "13px",
  color: "var(--ink)",
  backgroundColor: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "3px",
  padding: "7px 10px",
  width: "100%",
  outline: "none",
  boxSizing: "border-box" as const,
};

const labelStyle = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "9px",
  fontWeight: 500 as const,
  letterSpacing: "0.10em",
  textTransform: "uppercase" as const,
  color: "var(--ink-muted)",
  display: "block" as const,
  marginBottom: "5px",
};

type Props = {
  projectId: string;
  slug: string;
  initialStakeholders: StakeholderRow[];
};

export function StakeholderPanel({ projectId, slug, initialStakeholders }: Props) {
  const [stakeholders, setStakeholders] = useState(initialStakeholders);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const form = e.currentTarget;

    startTransition(async () => {
      const result = await addStakeholder({
        projectId,
        slug,
        name: fd.get("name") as string,
        email: (fd.get("email") as string) || null,
        phone: (fd.get("phone") as string) || null,
        title: (fd.get("title") as string) || null,
        organizationName: (fd.get("organizationName") as string) || null,
        roleType: fd.get("roleType") as string,
        isPrimary: fd.get("isPrimary") === "on",
      });

      if (!result.ok) {
        setError(result.error.message);
      } else {
        form.reset();
        setShowForm(false);
        // Optimistic: re-fetch via revalidate will update on next navigation;
        // for immediate feedback add a placeholder row
        setStakeholders((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            name: fd.get("name") as string,
            email: (fd.get("email") as string) || null,
            phone: (fd.get("phone") as string) || null,
            title: (fd.get("title") as string) || null,
            organizationName: (fd.get("organizationName") as string) || null,
            roleType: fd.get("roleType") as StakeholderRow["roleType"],
            roleId: "__pending__",
            isPrimary: fd.get("isPrimary") === "on",
          },
        ]);
      }
    });
  }

  function handleRemove(roleId: string, name: string) {
    setRemovingId(roleId);
    startTransition(async () => {
      const result = await removeStakeholder({ projectId, slug, roleId, stakeholderName: name });
      if (!result.ok) {
        setError(result.error.message);
      } else {
        setStakeholders((prev) => prev.filter((s) => s.roleId !== roleId));
      }
      setRemovingId(null);
    });
  }

  return (
    <div style={{ marginBottom: "40px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <p className="eyebrow">Stakeholders</p>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            fontWeight: 500,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: showForm ? "var(--ink-muted)" : "var(--accent)",
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: "3px",
            padding: "5px 12px",
            cursor: "pointer",
          }}
        >
          {showForm ? "Cancel" : "+ Add"}
        </button>
      </div>

      {error && (
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "var(--accent)", marginBottom: "12px" }}>
          {error}
        </p>
      )}

      {/* Add form */}
      {showForm && (
        <form
          onSubmit={handleAdd}
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "4px",
            padding: "20px 24px",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 20px" }}>
            <div>
              <label style={labelStyle}>Name *</label>
              <input name="name" required placeholder="Jane Smith" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Role *</label>
              <select name="roleType" required style={inputStyle}>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Organization</label>
              <input name="organizationName" placeholder="Acme EPC Ltd" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Title</label>
              <input name="title" placeholder="Project Director" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input name="email" type="email" placeholder="jane@example.com" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input name="phone" placeholder="+1 202 555 0100" style={inputStyle} />
            </div>
            <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: "8px" }}>
              <input name="isPrimary" type="checkbox" id="isPrimary" style={{ cursor: "pointer" }} />
              <label
                htmlFor="isPrimary"
                style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "var(--ink-mid)", cursor: "pointer" }}
              >
                Primary contact for this role
              </label>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
            <button
              type="submit"
              disabled={isPending}
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                fontWeight: 500,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "#ffffff",
                backgroundColor: "var(--accent)",
                border: "none",
                borderRadius: "3px",
                padding: "8px 18px",
                cursor: isPending ? "not-allowed" : "pointer",
                opacity: isPending ? 0.6 : 1,
              }}
            >
              {isPending ? "Adding…" : "Add Stakeholder"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                fontWeight: 500,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--ink-muted)",
                backgroundColor: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "3px",
                padding: "8px 18px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Stakeholder grid */}
      {stakeholders.length === 0 && !showForm ? (
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "11px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ink-muted)",
          }}
        >
          No stakeholders added yet
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "10px" }}>
          {stakeholders.map((s) => {
            const roleLabel = ROLE_OPTIONS.find((r) => r.value === s.roleType)?.label ?? s.roleType;
            const color = ROLE_COLORS[s.roleType] ?? "var(--ink-muted)";
            const bg = ROLE_BG[s.roleType] ?? "var(--bg)";
            const isRemoving = removingId === s.roleId;

            return (
              <div
                key={s.roleId}
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "4px",
                  padding: "16px 18px",
                  opacity: isRemoving ? 0.4 : 1,
                  transition: "opacity 0.2s",
                  position: "relative",
                }}
              >
                {/* Remove button */}
                <button
                  onClick={() => handleRemove(s.roleId, s.name)}
                  disabled={isRemoving || s.roleId === "__pending__"}
                  title="Remove"
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    background: "none",
                    border: "none",
                    color: "var(--ink-muted)",
                    cursor: "pointer",
                    fontSize: "14px",
                    lineHeight: 1,
                    padding: "2px 4px",
                    opacity: 0.5,
                  }}
                >
                  ×
                </button>

                {/* Role badge */}
                <span
                  style={{
                    display: "inline-block",
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "9px",
                    fontWeight: 500,
                    letterSpacing: "0.10em",
                    textTransform: "uppercase",
                    color,
                    backgroundColor: bg,
                    padding: "2px 7px",
                    borderRadius: "2px",
                    marginBottom: "10px",
                  }}
                >
                  {roleLabel}{s.isPrimary ? " · Primary" : ""}
                </span>

                {/* Name */}
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "var(--ink)",
                    margin: "0 0 2px",
                  }}
                >
                  {s.name}
                </p>

                {/* Title / org */}
                {(s.title || s.organizationName) && (
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "12px",
                      color: "var(--ink-muted)",
                      margin: "0 0 8px",
                    }}
                  >
                    {[s.title, s.organizationName].filter(Boolean).join(" · ")}
                  </p>
                )}

                {/* Contact */}
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  {s.email && (
                    <a
                      href={`mailto:${s.email}`}
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "10px",
                        letterSpacing: "0.04em",
                        color: "var(--accent)",
                        textDecoration: "none",
                      }}
                    >
                      {s.email}
                    </a>
                  )}
                  {s.phone && (
                    <span
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "10px",
                        letterSpacing: "0.04em",
                        color: "var(--ink-muted)",
                      }}
                    >
                      {s.phone}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
