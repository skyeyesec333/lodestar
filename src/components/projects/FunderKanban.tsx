"use client";

import type { FunderRelationshipRow } from "@/lib/db/funders";

// ── Column definitions ────────────────────────────────────────────────────────

type KanbanColumn = {
  stage: string;
  label: string;
  muted: boolean;
};

const COLUMNS: KanbanColumn[] = [
  { stage: "identified",      label: "Identified",     muted: false },
  { stage: "initial_contact", label: "In Contact",      muted: false },
  { stage: "due_diligence",   label: "Due Diligence",   muted: false },
  { stage: "term_sheet",      label: "Term Sheet",      muted: false },
  { stage: "committed",       label: "Committed",       muted: false },
  { stage: "declined",        label: "Declined",        muted: true  },
];

// ── Type label map ────────────────────────────────────────────────────────────

const FUNDER_TYPE_LABELS: Record<string, string> = {
  exim:            "EXIM",
  dfi:             "DFI",
  commercial_bank: "Commercial Bank",
  equity:          "Equity",
  mezzanine:       "Mezzanine",
  other:           "Other",
};

const FUNDER_TYPE_COLOR: Record<string, string> = {
  exim:            "var(--teal)",
  dfi:             "var(--gold)",
  commercial_bank: "var(--ink-mid)",
  equity:          "var(--gold)",
  mezzanine:       "var(--ink-mid)",
  other:           "var(--ink-muted)",
};

const FUNDER_TYPE_BG: Record<string, string> = {
  exim:            "var(--teal-soft)",
  dfi:             "var(--gold-soft)",
  commercial_bank: "var(--bg)",
  equity:          "var(--gold-soft)",
  mezzanine:       "var(--bg)",
  other:           "var(--bg)",
};

// ── Utility ───────────────────────────────────────────────────────────────────

function formatAmount(cents: number | null): string | null {
  if (cents == null) return null;
  const millions = cents / 100_000_000;
  if (millions >= 1) return `$${millions.toFixed(0)}M`;
  const thousands = cents / 100_000;
  if (thousands >= 1) return `$${thousands.toFixed(0)}K`;
  return `$${(cents / 100).toFixed(0)}`;
}

function openConditionCount(funder: FunderRelationshipRow): number {
  return funder.conditions.filter(
    (c) => c.status === "open" || c.status === "in_progress"
  ).length;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FunderCard({
  funder,
  muted,
  onSelect,
}: {
  funder: FunderRelationshipRow;
  muted: boolean;
  onSelect: () => void;
}) {
  const amount = formatAmount(funder.amountUsdCents);
  const openCps = openConditionCount(funder);
  const typeColor = FUNDER_TYPE_COLOR[funder.funderType] ?? "var(--ink-muted)";
  const typeBg    = FUNDER_TYPE_BG[funder.funderType]    ?? "var(--bg)";
  const typeLabel = FUNDER_TYPE_LABELS[funder.funderType] ?? funder.funderType;

  return (
    <button
      onClick={onSelect}
      style={{
        display:         "block",
        width:           "100%",
        textAlign:       "left",
        backgroundColor: muted ? "var(--bg)" : "var(--bg-card)",
        border:          "1px solid var(--border)",
        borderRadius:    "3px",
        padding:         "12px 14px",
        cursor:          "pointer",
        opacity:         muted ? 0.6 : 1,
        transition:      "box-shadow 0.1s ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
      }}
    >
      {/* Org name */}
      <p
        style={{
          fontFamily:  "'Inter', sans-serif",
          fontSize:    "13px",
          fontWeight:  600,
          color:       muted ? "var(--ink-muted)" : "var(--ink)",
          margin:      "0 0 8px",
          lineHeight:  1.3,
        }}
      >
        {funder.organizationName}
      </p>

      {/* Type badge + amount */}
      <div
        style={{
          display:    "flex",
          alignItems: "center",
          gap:        "6px",
          flexWrap:   "wrap",
          marginBottom: openCps > 0 || amount ? "8px" : 0,
        }}
      >
        <span
          style={{
            fontFamily:    "'DM Mono', monospace",
            fontSize:      "9px",
            fontWeight:    500,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color:         typeColor,
            backgroundColor: typeBg,
            border:        `1px solid ${typeColor}`,
            borderRadius:  "3px",
            padding:       "2px 6px",
            whiteSpace:    "nowrap",
          }}
        >
          {typeLabel}
        </span>

        {amount && (
          <span
            style={{
              fontFamily:  "'DM Mono', monospace",
              fontSize:    "10px",
              color:       muted ? "var(--ink-muted)" : "var(--ink-mid)",
            }}
          >
            {amount}
          </span>
        )}
      </div>

      {/* Open conditions badge */}
      {openCps > 0 && (
        <span
          style={{
            fontFamily:    "'DM Mono', monospace",
            fontSize:      "9px",
            fontWeight:    500,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color:         "var(--gold)",
            backgroundColor: "var(--gold-soft)",
            border:        "1px solid var(--gold)",
            borderRadius:  "3px",
            padding:       "2px 6px",
            whiteSpace:    "nowrap",
          }}
        >
          {openCps} open CP{openCps !== 1 ? "s" : ""}
        </span>
      )}
    </button>
  );
}

function KanbanColumn({
  column,
  funders,
  onSelectFunder,
}: {
  column: KanbanColumn;
  funders: FunderRelationshipRow[];
  onSelectFunder: (funderId: string) => void;
}) {
  const { label, muted } = column;

  return (
    <div
      style={{
        width:           "220px",
        flexShrink:      0,
        display:         "flex",
        flexDirection:   "column",
        gap:             0,
      }}
    >
      {/* Column header */}
      <div
        style={{
          display:         "flex",
          alignItems:      "center",
          gap:             "8px",
          marginBottom:    "10px",
          paddingBottom:   "8px",
          borderBottom:    "1px solid var(--border)",
        }}
      >
        <span
          style={{
            fontFamily:    "'DM Mono', monospace",
            fontSize:      "10px",
            fontWeight:    500,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color:         muted ? "var(--ink-muted)" : "var(--ink-mid)",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily:    "'DM Mono', monospace",
            fontSize:      "9px",
            fontWeight:    500,
            color:         muted ? "var(--ink-muted)" : "var(--ink)",
            backgroundColor: muted ? "var(--bg)" : "var(--bg-card)",
            border:        "1px solid var(--border)",
            borderRadius:  "10px",
            padding:       "1px 7px",
            minWidth:      "20px",
            textAlign:     "center",
          }}
        >
          {funders.length}
        </span>
      </div>

      {/* Cards */}
      <div
        style={{
          display:         "flex",
          flexDirection:   "column",
          gap:             "8px",
          backgroundColor: muted ? "var(--bg)" : "transparent",
          borderRadius:    "3px",
          minHeight:       "120px",
          padding:         muted ? "8px" : "0",
        }}
      >
        {funders.map((funder) => (
          <FunderCard
            key={funder.id}
            funder={funder}
            muted={muted}
            onSelect={() => onSelectFunder(funder.id)}
          />
        ))}

        {funders.length === 0 && (
          <div
            style={{
              borderRadius:    "3px",
              border:          "1px dashed var(--border)",
              minHeight:       "60px",
              display:         "flex",
              alignItems:      "center",
              justifyContent:  "center",
            }}
          >
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize:   "11px",
                color:      "var(--ink-muted)",
              }}
            >
              —
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function FunderKanban({
  funders,
  onSelectFunder,
}: {
  funders: FunderRelationshipRow[];
  onSelectFunder: (funderId: string) => void;
}) {
  const byStage = (stage: string) =>
    funders.filter((f) => f.engagementStage === stage);

  return (
    <div
      style={{
        overflowX:  "auto",
        minHeight:  "400px",
        paddingBottom: "12px",
      }}
    >
      <div
        style={{
          display:  "flex",
          gap:      "16px",
          minWidth: `${COLUMNS.length * (220 + 16)}px`,
          alignItems: "flex-start",
        }}
      >
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.stage}
            column={col}
            funders={byStage(col.stage)}
            onSelectFunder={onSelectFunder}
          />
        ))}
      </div>
    </div>
  );
}
