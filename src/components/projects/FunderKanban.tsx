"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { FunderRelationshipRow } from "@/lib/db/funders";

// ── Column definitions ────────────────────────────────────────────────────────

type EngagementStage =
  | "identified"
  | "initial_contact"
  | "due_diligence"
  | "term_sheet"
  | "committed"
  | "declined";

type KanbanColumnDef = {
  stage: EngagementStage;
  label: string;
  muted: boolean;
};

const COLUMNS: KanbanColumnDef[] = [
  { stage: "identified",      label: "Identified",     muted: false },
  { stage: "initial_contact", label: "In Contact",      muted: false },
  { stage: "due_diligence",   label: "Due Diligence",   muted: false },
  { stage: "term_sheet",      label: "Term Sheet",      muted: false },
  { stage: "committed",       label: "Committed",       muted: false },
  { stage: "declined",        label: "Declined",        muted: true  },
];

const VALID_STAGES = new Set<string>(COLUMNS.map((c) => c.stage));

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

const STAGE_LABELS: Record<EngagementStage, string> = {
  identified:      "Identified",
  initial_contact: "In Contact",
  due_diligence:   "Due Diligence",
  term_sheet:      "Term Sheet",
  committed:       "Committed",
  declined:        "Declined",
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

// ── Presentational card ───────────────────────────────────────────────────────

function CardBody({ funder, muted }: { funder: FunderRelationshipRow; muted: boolean }) {
  const amount = formatAmount(funder.amountUsdCents);
  const openCps = openConditionCount(funder);
  const typeColor = FUNDER_TYPE_COLOR[funder.funderType] ?? "var(--ink-muted)";
  const typeBg    = FUNDER_TYPE_BG[funder.funderType]    ?? "var(--bg)";
  const typeLabel = FUNDER_TYPE_LABELS[funder.funderType] ?? funder.funderType;

  return (
    <>
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
    </>
  );
}

function cardBaseStyle(muted: boolean): React.CSSProperties {
  return {
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
  };
}

// ── Draggable card ────────────────────────────────────────────────────────────

function DraggableFunderCard({
  funder,
  muted,
  onSelect,
  dragDisabled,
}: {
  funder: FunderRelationshipRow;
  muted: boolean;
  onSelect: () => void;
  dragDisabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: funder.id,
    data: { currentStage: funder.engagementStage },
    disabled: dragDisabled,
  });

  const style: React.CSSProperties = {
    ...cardBaseStyle(muted),
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0 : muted ? 0.6 : 1,
    touchAction: "none",
  };

  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onSelect}
      aria-label={`${funder.organizationName}, stage ${STAGE_LABELS[funder.engagementStage as EngagementStage] ?? funder.engagementStage}. Press space to pick up and arrow keys to move.`}
      style={style}
    >
      <CardBody funder={funder} muted={muted} />
    </button>
  );
}

// ── Droppable column ──────────────────────────────────────────────────────────

function DroppableColumn({
  column,
  funders,
  onSelectFunder,
  dragDisabled,
  isActiveDrop,
}: {
  column: KanbanColumnDef;
  funders: FunderRelationshipRow[];
  onSelectFunder: (funderId: string) => void;
  dragDisabled: boolean;
  isActiveDrop: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${column.stage}` });
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

      <div
        ref={setNodeRef}
        style={{
          display:         "flex",
          flexDirection:   "column",
          gap:             "8px",
          backgroundColor: isOver
            ? "color-mix(in srgb, var(--teal) 6%, transparent)"
            : isActiveDrop
              ? "color-mix(in srgb, var(--teal) 2%, transparent)"
              : muted ? "var(--bg)" : "transparent",
          border: isOver
            ? "1px dashed var(--teal)"
            : isActiveDrop
              ? "1px dashed var(--border)"
              : "1px dashed transparent",
          borderRadius:    "3px",
          minHeight:       "120px",
          padding:         "8px",
          transition:      "background-color 120ms ease, border-color 120ms ease",
        }}
      >
        {funders.map((funder) => (
          <DraggableFunderCard
            key={funder.id}
            funder={funder}
            muted={muted}
            onSelect={() => onSelectFunder(funder.id)}
            dragDisabled={dragDisabled}
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
  onStageChange,
}: {
  funders: FunderRelationshipRow[];
  onSelectFunder: (funderId: string) => void;
  onStageChange?: (funderId: string, newStage: EngagementStage) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const canDrag = Boolean(onStageChange);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const overId = String(over.id);
    if (!overId.startsWith("col-")) return;
    const newStage = overId.slice(4);
    if (!VALID_STAGES.has(newStage)) return;
    const currentStage = (active.data.current as { currentStage?: string } | undefined)?.currentStage;
    if (currentStage === newStage) return;
    onStageChange?.(String(active.id), newStage as EngagementStage);
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  const activeFunder = activeId ? funders.find((f) => f.id === activeId) ?? null : null;

  const byStage = (stage: string) =>
    funders.filter((f) => f.engagementStage === stage);

  const board = (
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
          <DroppableColumn
            key={col.stage}
            column={col}
            funders={byStage(col.stage)}
            onSelectFunder={onSelectFunder}
            dragDisabled={!canDrag}
            isActiveDrop={activeId !== null}
          />
        ))}
      </div>
    </div>
  );

  if (!canDrag) return board;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) => {
            const f = funders.find((x) => x.id === String(active.id));
            return f ? `Picked up ${f.organizationName}.` : "Picked up card.";
          },
          onDragOver: ({ active, over }) => {
            if (!over) return "";
            const f = funders.find((x) => x.id === String(active.id));
            const target = String(over.id).replace(/^col-/, "") as EngagementStage;
            const label = STAGE_LABELS[target] ?? target;
            return f ? `${f.organizationName} is over ${label}.` : `Card is over ${label}.`;
          },
          onDragEnd: ({ active, over }) => {
            if (!over) return "Cancelled.";
            const f = funders.find((x) => x.id === String(active.id));
            const target = String(over.id).replace(/^col-/, "") as EngagementStage;
            const label = STAGE_LABELS[target] ?? target;
            return f ? `${f.organizationName} moved to ${label}.` : `Card moved to ${label}.`;
          },
          onDragCancel: () => "Cancelled.",
        },
      }}
    >
      {board}
      <DragOverlay>
        {activeFunder ? (
          <div style={{ ...cardBaseStyle(false), boxShadow: "0 8px 24px rgba(0,0,0,0.15)", cursor: "grabbing" }}>
            <CardBody funder={activeFunder} muted={false} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
