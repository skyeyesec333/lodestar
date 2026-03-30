"use client";

import { useState, useTransition } from "react";
import {
  addEpcBid,
  setEpcBidStatus,
  editEpcBidDetails,
  removeEpcBid,
} from "@/actions/epc-bids";
import type { EpcBidRow } from "@/lib/db/epc-bids";

const STATUS_LABELS: Record<string, string> = {
  under_review:   "Under Review",
  qualified:      "Qualified",
  disqualified:   "Disqualified",
  selected:       "Selected",
  rejected:       "Rejected",
};

const STATUS_COLOR: Record<string, string> = {
  under_review:   "var(--ink-muted)",
  qualified:      "var(--teal)",
  disqualified:   "var(--accent)",
  selected:       "var(--gold)",
  rejected:       "var(--ink-muted)",
};

const STATUS_BG: Record<string, string> = {
  under_review:   "var(--bg)",
  qualified:      "var(--teal-soft)",
  disqualified:   "var(--accent-soft)",
  selected:       "var(--gold-soft)",
  rejected:       "var(--bg)",
};

const COUNTRY_CODES = [
  "US","GB","DE","FR","IT","ES","JP","KR","CN","IN","BR","MX","ZA","NG","KE","TZ",
  "GH","ET","UG","MZ","AO","CI","SN","CM","ZM","MA","EG","PK","BD","VN","ID","PH",
  "TH","MY","SG","AU","CA","AE","SA","QA","KW","OM","BH","JO","IL","TR","PL","CZ",
  "RO","HU","SE","NO","FI","DK","NL","BE","CH","AT","PT","GR","AR","CO","PE","CL",
];

const inputStyle: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: "13px",
  color: "var(--ink)",
  backgroundColor: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "3px",
  padding: "7px 10px",
  width: "100%",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "9px",
  fontWeight: 500,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  color: "var(--ink-muted)",
  display: "block",
  marginBottom: "5px",
};

function formatUsd(cents: number | null): string {
  if (cents == null) return "—";
  const millions = cents / 100_000_000;
  if (millions >= 1) return `$${millions.toFixed(0)}M`;
  const thousands = cents / 100_000;
  if (thousands >= 1) return `$${thousands.toFixed(0)}K`;
  return `$${(cents / 100).toFixed(0)}`;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: "9px",
        fontWeight: 500,
        letterSpacing: "0.10em",
        textTransform: "uppercase",
        color: STATUS_COLOR[status] ?? "var(--ink-muted)",
        backgroundColor: STATUS_BG[status] ?? "var(--bg)",
        border: `1px solid ${STATUS_COLOR[status] ?? "var(--border)"}`,
        borderRadius: "3px",
        padding: "2px 6px",
        whiteSpace: "nowrap",
      }}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

type AddFormState = {
  organizationName: string;
  isUsEntity: boolean;
  organizationCountryCode: string;
  bidAmountUsdCents: string;
  usContentPct: string;
  notes: string;
};

const BLANK_FORM: AddFormState = {
  organizationName: "",
  isUsEntity: false,
  organizationCountryCode: "",
  bidAmountUsdCents: "",
  usContentPct: "",
  notes: "",
};

type EditState = {
  bidId: string;
  bidAmountUsdCents: string;
  usContentPct: string;
  notes: string;
  submittedAt: string;
};

type StatusEditState = {
  bidId: string;
  status: string;
  disqualificationReason: string;
};

export function EpcBidsPanel({
  projectId,
  slug,
  initialBids,
}: {
  projectId: string;
  slug: string;
  initialBids: EpcBidRow[];
}) {
  const [bids, setBids] = useState<EpcBidRow[]>(initialBids);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<AddFormState>(BLANK_FORM);
  const [addError, setAddError] = useState<string | null>(null);

  const [editState, setEditState] = useState<EditState | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const [statusEditState, setStatusEditState] = useState<StatusEditState | null>(null);
  const [statusEditError, setStatusEditError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  // ── Add bid ───────────────────────────────────────────────────────────────

  function handleAddField(field: keyof AddFormState, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleAdd() {
    setAddError(null);
    const bidAmountUsdCents =
      form.bidAmountUsdCents.trim()
        ? Math.round(parseFloat(form.bidAmountUsdCents) * 1_000_000) // input in $M
        : null;
    const usContentPct =
      form.usContentPct.trim() ? parseInt(form.usContentPct, 10) : null;

    startTransition(async () => {
      const result = await addEpcBid({
        projectId,
        slug,
        organizationName: form.organizationName.trim(),
        isUsEntity: form.isUsEntity,
        organizationCountryCode: form.organizationCountryCode || undefined,
        bidAmountUsdCents,
        usContentPct,
        notes: form.notes.trim() || null,
      });

      if (!result.ok) {
        setAddError(result.error.message);
        return;
      }

      // Optimistic: reload via server — refetch not possible here so we reload
      // by fetching a fresh snapshot. Simpler: reload the page data by
      // resetting form and letting Next.js revalidate the path.
      setForm(BLANK_FORM);
      setShowAddForm(false);
      // The server action calls revalidatePath so Next.js will update on next
      // navigation. For immediate UI update we do a soft window refresh.
      window.location.reload();
    });
  }

  // ── Status change ─────────────────────────────────────────────────────────

  function handleStatusSave() {
    if (!statusEditState) return;
    setStatusEditError(null);
    startTransition(async () => {
      const result = await setEpcBidStatus({
        bidId: statusEditState.bidId,
        slug,
        status: statusEditState.status,
        disqualificationReason:
          statusEditState.status === "disqualified"
            ? statusEditState.disqualificationReason || null
            : null,
      });
      if (!result.ok) {
        setStatusEditError(result.error.message);
        return;
      }
      setBids((prev) =>
        prev.map((b) =>
          b.id === statusEditState.bidId
            ? {
                ...b,
                qualificationStatus: statusEditState.status,
                disqualificationReason:
                  statusEditState.status === "disqualified"
                    ? statusEditState.disqualificationReason || null
                    : null,
              }
            : b
        )
      );
      setStatusEditState(null);
    });
  }

  // ── Edit details ──────────────────────────────────────────────────────────

  function handleEditSave() {
    if (!editState) return;
    setEditError(null);
    const bidAmountUsdCents =
      editState.bidAmountUsdCents.trim()
        ? Math.round(parseFloat(editState.bidAmountUsdCents) * 1_000_000)
        : null;
    const usContentPct =
      editState.usContentPct.trim() ? parseInt(editState.usContentPct, 10) : null;

    startTransition(async () => {
      const result = await editEpcBidDetails({
        bidId: editState.bidId,
        slug,
        bidAmountUsdCents,
        usContentPct,
        notes: editState.notes.trim() || null,
        submittedAt: editState.submittedAt || null,
      });
      if (!result.ok) {
        setEditError(result.error.message);
        return;
      }
      setBids((prev) =>
        prev.map((b) =>
          b.id === editState.bidId
            ? {
                ...b,
                bidAmountUsdCents,
                usContentPct,
                notes: editState.notes.trim() || null,
                submittedAt: editState.submittedAt ? new Date(editState.submittedAt) : null,
              }
            : b
        )
      );
      setEditState(null);
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  function handleDelete(bidId: string, orgName: string) {
    if (!confirm(`Remove bid from "${orgName}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await removeEpcBid({ bidId, slug });
      if (!result.ok) return;
      setBids((prev) => prev.filter((b) => b.id !== bidId));
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const selectedBid = bids.find((b) => b.qualificationStatus === "selected");

  return (
    <section
      id="section-epc"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "4px",
        padding: "28px 32px",
        marginBottom: "24px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <div>
          <p className="eyebrow" style={{ marginBottom: "4px" }}>
            EPC Qualification
          </p>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "13px",
              color: "var(--ink-muted)",
              margin: 0,
            }}
          >
            {bids.length === 0
              ? "No EPC bids recorded."
              : `${bids.length} bid${bids.length !== 1 ? "s" : ""} — EPC must be a US entity with >51% US content for EXIM eligibility.`}
          </p>
        </div>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          disabled={isPending}
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "11px",
            fontWeight: 500,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: showAddForm ? "var(--ink-muted)" : "var(--teal)",
            backgroundColor: "transparent",
            border: `1px solid ${showAddForm ? "var(--border)" : "var(--teal)"}`,
            borderRadius: "3px",
            padding: "6px 14px",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {showAddForm ? "Cancel" : "+ Add EPC Firm"}
        </button>
      </div>

      {/* Selected EPC callout */}
      {selectedBid && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            backgroundColor: "var(--gold-soft)",
            border: "1px solid var(--gold)",
            borderRadius: "3px",
            padding: "10px 16px",
            marginBottom: "20px",
          }}
        >
          <span style={{ fontSize: "14px" }}>★</span>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "13px",
              color: "var(--ink)",
              margin: 0,
            }}
          >
            <strong>{selectedBid.organizationName}</strong> is the selected EPC contractor.
            {selectedBid.usContentPct != null && (
              <span style={{ color: "var(--ink-muted)", marginLeft: "8px" }}>
                US content: {selectedBid.usContentPct}%
                {selectedBid.usContentPct <= 51 && (
                  <span style={{ color: "var(--accent)", marginLeft: "4px" }}>
                    ⚠ Below 51% threshold
                  </span>
                )}
              </span>
            )}
          </p>
        </div>
      )}

      {/* Add form */}
      {showAddForm && (
        <div
          style={{
            backgroundColor: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: "3px",
            padding: "20px",
            marginBottom: "24px",
          }}
        >
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "var(--ink-muted)",
              margin: "0 0 16px",
            }}
          >
            New EPC Bid
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Organization Name *</label>
              <input
                style={inputStyle}
                value={form.organizationName}
                onChange={(e) => handleAddField("organizationName", e.target.value)}
                placeholder="e.g. Bechtel Corporation"
              />
            </div>

            <div>
              <label style={labelStyle}>Bid Amount ($M)</label>
              <input
                style={inputStyle}
                type="number"
                min="0"
                step="0.1"
                value={form.bidAmountUsdCents}
                onChange={(e) => handleAddField("bidAmountUsdCents", e.target.value)}
                placeholder="e.g. 320"
              />
            </div>

            <div>
              <label style={labelStyle}>US Content %</label>
              <input
                style={inputStyle}
                type="number"
                min="0"
                max="100"
                value={form.usContentPct}
                onChange={(e) => handleAddField("usContentPct", e.target.value)}
                placeholder="e.g. 65"
              />
            </div>

            <div>
              <label style={labelStyle}>US Entity?</label>
              <div style={{ display: "flex", gap: "16px", paddingTop: "8px" }}>
                {[true, false].map((val) => (
                  <label
                    key={String(val)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "13px",
                      color: "var(--ink)",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      checked={form.isUsEntity === val}
                      onChange={() => handleAddField("isUsEntity", val)}
                    />
                    {val ? "Yes" : "No"}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Country Code</label>
              <select
                style={inputStyle}
                value={form.organizationCountryCode}
                onChange={(e) => handleAddField("organizationCountryCode", e.target.value)}
              >
                <option value="">— Select —</option>
                {COUNTRY_CODES.map((cc) => (
                  <option key={cc} value={cc}>
                    {cc}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Notes</label>
              <textarea
                style={{ ...inputStyle, minHeight: "72px", resize: "vertical" }}
                value={form.notes}
                onChange={(e) => handleAddField("notes", e.target.value)}
                placeholder="Initial observations, open questions, etc."
              />
            </div>
          </div>

          {addError && (
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "12px",
                color: "var(--accent)",
                margin: "10px 0 0",
              }}
            >
              {addError}
            </p>
          )}

          <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
            <button
              onClick={handleAdd}
              disabled={isPending || !form.organizationName.trim()}
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--bg)",
                backgroundColor: isPending ? "var(--ink-muted)" : "var(--teal)",
                border: "none",
                borderRadius: "3px",
                padding: "8px 18px",
                cursor: isPending ? "not-allowed" : "pointer",
              }}
            >
              {isPending ? "Saving…" : "Add Bid"}
            </button>
            <button
              onClick={() => { setShowAddForm(false); setForm(BLANK_FORM); setAddError(null); }}
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "11px",
                letterSpacing: "0.08em",
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
        </div>
      )}

      {/* Bids table */}
      {bids.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {bids.map((bid) => {
            const isEditingStatus = statusEditState?.bidId === bid.id;
            const isEditingDetails = editState?.bidId === bid.id;
            const eligibilityWarning =
              !bid.isUsEntity || (bid.usContentPct != null && bid.usContentPct <= 51);

            return (
              <div
                key={bid.id}
                style={{
                  backgroundColor: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "3px",
                  padding: "16px 20px",
                }}
              >
                {/* Bid header row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "16px",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "6px" }}>
                      <span
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "15px",
                          fontWeight: 600,
                          color: "var(--ink)",
                        }}
                      >
                        {bid.organizationName}
                      </span>
                      {bid.organizationCountryCode && (
                        <span
                          style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: "10px",
                            color: "var(--ink-muted)",
                            border: "1px solid var(--border)",
                            borderRadius: "2px",
                            padding: "1px 5px",
                          }}
                        >
                          {bid.organizationCountryCode}
                        </span>
                      )}
                      <StatusBadge status={bid.qualificationStatus} />
                      {eligibilityWarning && (
                        <span
                          style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: "9px",
                            fontWeight: 500,
                            letterSpacing: "0.08em",
                            color: "var(--accent)",
                            backgroundColor: "var(--accent-soft)",
                            border: "1px solid var(--accent)",
                            borderRadius: "3px",
                            padding: "2px 6px",
                          }}
                        >
                          EXIM ineligible
                        </span>
                      )}
                    </div>

                    {/* Metadata row */}
                    <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
                      {[
                        { label: "US Entity", value: bid.isUsEntity ? "Yes" : "No", warn: !bid.isUsEntity },
                        {
                          label: "US Content",
                          value: bid.usContentPct != null ? `${bid.usContentPct}%` : "—",
                          warn: bid.usContentPct != null && bid.usContentPct <= 51,
                        },
                        { label: "Bid Amount", value: formatUsd(bid.bidAmountUsdCents) },
                        {
                          label: "Submitted",
                          value: bid.submittedAt
                            ? new Date(bid.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                            : "—",
                        },
                      ].map(({ label, value, warn }) => (
                        <div key={label}>
                          <p style={{ ...labelStyle, marginBottom: "2px" }}>{label}</p>
                          <p
                            style={{
                              fontFamily: "'Inter', sans-serif",
                              fontSize: "13px",
                              fontWeight: 500,
                              color: warn ? "var(--accent)" : "var(--ink)",
                              margin: 0,
                            }}
                          >
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>

                    {bid.notes && (
                      <p
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "13px",
                          color: "var(--ink-muted)",
                          margin: "10px 0 0",
                          lineHeight: 1.6,
                        }}
                      >
                        {bid.notes}
                      </p>
                    )}

                    {bid.disqualificationReason && bid.qualificationStatus === "disqualified" && (
                      <p
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "12px",
                          color: "var(--accent)",
                          margin: "8px 0 0",
                        }}
                      >
                        Reason: {bid.disqualificationReason}
                      </p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: "8px", flexShrink: 0, flexWrap: "wrap" }}>
                    <button
                      onClick={() =>
                        setStatusEditState(
                          isEditingStatus
                            ? null
                            : {
                                bidId: bid.id,
                                status: bid.qualificationStatus,
                                disqualificationReason: bid.disqualificationReason ?? "",
                              }
                        )
                      }
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "10px",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--ink-muted)",
                        backgroundColor: "transparent",
                        border: "1px solid var(--border)",
                        borderRadius: "3px",
                        padding: "5px 10px",
                        cursor: "pointer",
                      }}
                    >
                      Status
                    </button>
                    <button
                      onClick={() =>
                        setEditState(
                          isEditingDetails
                            ? null
                            : {
                                bidId: bid.id,
                                bidAmountUsdCents:
                                  bid.bidAmountUsdCents != null
                                    ? String(bid.bidAmountUsdCents / 1_000_000)
                                    : "",
                                usContentPct:
                                  bid.usContentPct != null ? String(bid.usContentPct) : "",
                                notes: bid.notes ?? "",
                                submittedAt: bid.submittedAt
                                  ? new Date(bid.submittedAt).toISOString().slice(0, 10)
                                  : "",
                              }
                        )
                      }
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "10px",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--ink-muted)",
                        backgroundColor: "transparent",
                        border: "1px solid var(--border)",
                        borderRadius: "3px",
                        padding: "5px 10px",
                        cursor: "pointer",
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(bid.id, bid.organizationName)}
                      disabled={isPending}
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "10px",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--accent)",
                        backgroundColor: "transparent",
                        border: "1px solid var(--border)",
                        borderRadius: "3px",
                        padding: "5px 10px",
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {/* Status edit inline panel */}
                {isEditingStatus && statusEditState && (
                  <div
                    style={{
                      marginTop: "14px",
                      paddingTop: "14px",
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <label style={labelStyle}>Qualification Status</label>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
                      {Object.entries(STATUS_LABELS).map(([val, lbl]) => (
                        <button
                          key={val}
                          onClick={() =>
                            setStatusEditState((prev) => prev ? { ...prev, status: val } : prev)
                          }
                          style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: "10px",
                            fontWeight: 500,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color:
                              statusEditState.status === val
                                ? STATUS_COLOR[val]
                                : "var(--ink-muted)",
                            backgroundColor:
                              statusEditState.status === val
                                ? STATUS_BG[val]
                                : "transparent",
                            border: `1px solid ${statusEditState.status === val ? STATUS_COLOR[val] : "var(--border)"}`,
                            borderRadius: "3px",
                            padding: "5px 12px",
                            cursor: "pointer",
                          }}
                        >
                          {lbl}
                        </button>
                      ))}
                    </div>

                    {statusEditState.status === "disqualified" && (
                      <div style={{ marginBottom: "12px" }}>
                        <label style={labelStyle}>Disqualification Reason</label>
                        <input
                          style={inputStyle}
                          value={statusEditState.disqualificationReason}
                          onChange={(e) =>
                            setStatusEditState((prev) =>
                              prev ? { ...prev, disqualificationReason: e.target.value } : prev
                            )
                          }
                          placeholder="e.g. US content below 51% threshold"
                        />
                      </div>
                    )}

                    {statusEditError && (
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "var(--accent)", margin: "0 0 10px" }}>
                        {statusEditError}
                      </p>
                    )}

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={handleStatusSave}
                        disabled={isPending}
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "10px",
                          fontWeight: 500,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "var(--bg)",
                          backgroundColor: isPending ? "var(--ink-muted)" : "var(--teal)",
                          border: "none",
                          borderRadius: "3px",
                          padding: "6px 14px",
                          cursor: isPending ? "not-allowed" : "pointer",
                        }}
                      >
                        {isPending ? "Saving…" : "Save Status"}
                      </button>
                      <button
                        onClick={() => { setStatusEditState(null); setStatusEditError(null); }}
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "10px",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "var(--ink-muted)",
                          backgroundColor: "transparent",
                          border: "1px solid var(--border)",
                          borderRadius: "3px",
                          padding: "6px 14px",
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Details edit inline panel */}
                {isEditingDetails && editState && (
                  <div
                    style={{
                      marginTop: "14px",
                      paddingTop: "14px",
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                      <div>
                        <label style={labelStyle}>Bid Amount ($M)</label>
                        <input
                          style={inputStyle}
                          type="number"
                          min="0"
                          step="0.1"
                          value={editState.bidAmountUsdCents}
                          onChange={(e) =>
                            setEditState((prev) => prev ? { ...prev, bidAmountUsdCents: e.target.value } : prev)
                          }
                          placeholder="e.g. 320"
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>US Content %</label>
                        <input
                          style={inputStyle}
                          type="number"
                          min="0"
                          max="100"
                          value={editState.usContentPct}
                          onChange={(e) =>
                            setEditState((prev) => prev ? { ...prev, usContentPct: e.target.value } : prev)
                          }
                          placeholder="e.g. 65"
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Submitted Date</label>
                        <input
                          style={inputStyle}
                          type="date"
                          value={editState.submittedAt}
                          onChange={(e) =>
                            setEditState((prev) => prev ? { ...prev, submittedAt: e.target.value } : prev)
                          }
                        />
                      </div>
                    </div>
                    <div style={{ marginBottom: "12px" }}>
                      <label style={labelStyle}>Notes</label>
                      <textarea
                        style={{ ...inputStyle, minHeight: "64px", resize: "vertical" }}
                        value={editState.notes}
                        onChange={(e) =>
                          setEditState((prev) => prev ? { ...prev, notes: e.target.value } : prev)
                        }
                        placeholder="Notes about this bid"
                      />
                    </div>

                    {editError && (
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "var(--accent)", margin: "0 0 10px" }}>
                        {editError}
                      </p>
                    )}

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={handleEditSave}
                        disabled={isPending}
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "10px",
                          fontWeight: 500,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "var(--bg)",
                          backgroundColor: isPending ? "var(--ink-muted)" : "var(--teal)",
                          border: "none",
                          borderRadius: "3px",
                          padding: "6px 14px",
                          cursor: isPending ? "not-allowed" : "pointer",
                        }}
                      >
                        {isPending ? "Saving…" : "Save Details"}
                      </button>
                      <button
                        onClick={() => { setEditState(null); setEditError(null); }}
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "10px",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "var(--ink-muted)",
                          backgroundColor: "transparent",
                          border: "1px solid var(--border)",
                          borderRadius: "3px",
                          padding: "6px 14px",
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {bids.length === 0 && !showAddForm && (
        <div
          style={{
            backgroundColor: "var(--gold-soft)",
            border: "1px solid var(--gold)",
            borderRadius: "4px",
            padding: "20px 24px",
          }}
        >
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              fontWeight: 500,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--gold)",
              margin: "0 0 8px",
            }}
          >
            EXIM Eligibility Requirement
          </p>
          <p
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: "18px",
              fontWeight: 400,
              color: "var(--ink)",
              margin: "0 0 10px",
            }}
          >
            Your EPC contractor must be US-content eligible
          </p>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "13px",
              color: "var(--ink-mid)",
              margin: "0 0 10px",
              lineHeight: 1.6,
              maxWidth: "560px",
            }}
          >
            The EXIM Bank guarantee requires that the Engineering, Procurement & Construction
            contractor meet the US content threshold — at least 51% of the deal cost must be
            sourced from US goods and services. This panel tracks each firm&apos;s qualification
            status; selecting a contractor automatically advances the EPC Contract checklist item.
          </p>
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "11px",
              color: "var(--ink-mid)",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Add each bidding EPC firm above to compare US content percentages and track qualification status.
          </p>
        </div>
      )}
    </section>
  );
}
