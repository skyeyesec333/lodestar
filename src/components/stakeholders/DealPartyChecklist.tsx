"use client";

import { useState, useTransition } from "react";
import type { CSSProperties } from "react";
import {
  DEAL_PARTY_TYPES,
  DEAL_PARTY_LABELS,
  DEAL_PARTY_DESCRIPTIONS,
  DEAL_PARTY_REQUIREMENT_MAP,
  REQUIRED_DEAL_PARTIES,
  type DealPartyType,
} from "@/lib/exim/deal-parties";
import { addDealPartyAction, removeDealPartyAction } from "@/actions/deal-parties";
import type { DealPartyRow } from "@/lib/db/deal-parties";

type Props = {
  projectId: string;
  slug: string;
  initialDealParties: DealPartyRow[];
};

export function DealPartyChecklist({ projectId, slug, initialDealParties }: Props) {
  const [dealParties, setDealParties] = useState<DealPartyRow[]>(initialDealParties);
  const [addingType, setAddingType] = useState<DealPartyType | null>(null);
  const [orgName, setOrgName] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const assignedByType = new Map<string, DealPartyRow[]>();
  for (const dp of dealParties) {
    const existing = assignedByType.get(dp.partyType) ?? [];
    assignedByType.set(dp.partyType, [...existing, dp]);
  }

  function handleOpenAdd(type: DealPartyType) {
    setAddingType(type);
    setOrgName("");
    setNotes("");
    setError(null);
  }

  function handleCancelAdd() {
    setAddingType(null);
    setError(null);
  }

  function handleAdd() {
    if (!addingType) return;
    if (!orgName.trim()) {
      setError("Organization name is required.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await addDealPartyAction({
        projectId,
        slug,
        organizationName: orgName.trim(),
        partyType: addingType,
        notes: notes.trim() || null,
      });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setDealParties((prev) => [...prev, result.value]);
      setAddingType(null);
    });
  }

  function handleRemove(id: string) {
    setRemovingId(id);
    startTransition(async () => {
      const result = await removeDealPartyAction({ dealPartyId: id, slug });
      if (!result.ok) {
        setRemovingId(null);
        return;
      }
      setDealParties((prev) => prev.filter((dp) => dp.id !== id));
      setRemovingId(null);
    });
  }

  const requiredSet = new Set<string>(REQUIRED_DEAL_PARTIES);
  const missingRequired = DEAL_PARTY_TYPES.filter(
    (t) => requiredSet.has(t) && !assignedByType.has(t)
  ).length;

  return (
    <div style={{ marginBottom: "28px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "14px" }}>
        <p style={eyebrowStyle}>Deal Party Checklist</p>
        {missingRequired > 0 && (
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--accent)",
              backgroundColor: "var(--accent-soft)",
              border: "1px solid var(--accent)",
              borderRadius: "100px",
              padding: "2px 8px",
            }}
          >
            {missingRequired} missing
          </span>
        )}
      </div>

      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "var(--ink-muted)", margin: "0 0 16px", lineHeight: 1.5 }}>
        Assign organizations to structural deal roles. Required parties are marked with a red dot. Adding a party auto-assigns responsibility for related deal workplan items.
      </p>

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "8px",
        }}
      >
        {DEAL_PARTY_TYPES.map((type) => {
          const assigned = assignedByType.get(type) ?? [];
          const isRequired = requiredSet.has(type);
          const reqCount = DEAL_PARTY_REQUIREMENT_MAP[type].length;
          const isAdding = addingType === type;

          return (
            <div
              key={type}
              style={{
                backgroundColor: "var(--bg)",
                border: `1px solid ${assigned.length > 0 ? "var(--teal)" : isRequired ? "var(--accent)" : "var(--border)"}`,
                borderRadius: "3px",
                padding: "12px 14px",
              }}
            >
              {/* Row header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                    {/* Status dot */}
                    <div
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        flexShrink: 0,
                        backgroundColor: assigned.length > 0
                          ? "var(--teal)"
                          : isRequired
                          ? "var(--accent)"
                          : "var(--border)",
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "10px",
                        fontWeight: 500,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--ink)",
                      }}
                    >
                      {DEAL_PARTY_LABELS[type]}
                    </span>
                    {isRequired && assigned.length === 0 && (
                      <span style={{ ...badgeStyle, color: "var(--accent)", backgroundColor: "var(--accent-soft)", borderColor: "var(--accent)" }}>
                        Required
                      </span>
                    )}
                  </div>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", color: "var(--ink-muted)", margin: 0, lineHeight: 1.4 }}>
                    {DEAL_PARTY_DESCRIPTIONS[type]}
                  </p>
                  {reqCount > 0 && (
                    <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: "var(--ink-muted)", margin: "4px 0 0", letterSpacing: "0.06em" }}>
                      Auto-assigns {reqCount} workplan item{reqCount !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </div>

              {/* Assigned orgs */}
              {assigned.length > 0 && (
                <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  {assigned.map((dp) => (
                    <div
                      key={dp.id}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}
                    >
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "var(--teal)", fontWeight: 500 }}>
                        {dp.organizationName}
                      </span>
                      <button
                        onClick={() => handleRemove(dp.id)}
                        disabled={isPending && removingId === dp.id}
                        style={removeBtnStyle}
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add inline form */}
              {isAdding ? (
                <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <input
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Organization name"
                    style={inputStyle}
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") handleCancelAdd(); }}
                  />
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes (optional)"
                    style={inputStyle}
                  />
                  {error && addingType === type && (
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", color: "var(--accent)", margin: 0 }}>{error}</p>
                  )}
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button onClick={handleAdd} disabled={isPending} style={addBtnStyle}>
                      {isPending ? "Adding…" : "Add"}
                    </button>
                    <button onClick={handleCancelAdd} style={cancelBtnStyle}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => handleOpenAdd(type)}
                  style={{ ...linkBtnStyle, marginTop: assigned.length > 0 ? "8px" : "10px" }}
                >
                  + Assign organization
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const eyebrowStyle: CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "9px",
  fontWeight: 500,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--ink-muted)",
  margin: 0,
};

const badgeStyle: CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "8px",
  fontWeight: 500,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  border: "1px solid",
  borderRadius: "100px",
  padding: "1px 5px",
};

const inputStyle: CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: "12px",
  color: "var(--ink)",
  backgroundColor: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "3px",
  padding: "6px 8px",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const addBtnStyle: CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "10px",
  fontWeight: 500,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#fff",
  backgroundColor: "var(--teal)",
  border: "none",
  borderRadius: "3px",
  padding: "6px 12px",
  cursor: "pointer",
};

const cancelBtnStyle: CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "10px",
  fontWeight: 500,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--ink-muted)",
  backgroundColor: "transparent",
  border: "1px solid var(--border)",
  borderRadius: "3px",
  padding: "5px 10px",
  cursor: "pointer",
};

const linkBtnStyle: CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "9px",
  fontWeight: 500,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--teal)",
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
  display: "block",
};

const removeBtnStyle: CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "12px",
  color: "var(--ink-muted)",
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "0 2px",
  lineHeight: 1,
  flexShrink: 0,
};
