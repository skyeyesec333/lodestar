"use client";

import { useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";

type ComparableDeal = {
  id: string;
  name: string;
  slug: string;
  dealType: string;
  stage: string;
  countryCode: string;
  sector: string;
  readinessScore: number;
  capexUsdCents: number | null;
  completedRequirements: number;
  totalRequirements: number;
  targetLoiDate: string | null;
  targetCloseDate: string | null;
};

type Props = {
  deals: ComparableDeal[];
};

function formatCapex(cents: number | null): string {
  if (cents === null) return "—";
  const millions = cents / 100_000_000;
  if (millions >= 1000) return `$${(millions / 1000).toFixed(1)}B`;
  return `$${millions.toFixed(1)}M`;
}

function formatStage(stage: string): string {
  return stage.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDealType(dt: string): string {
  const map: Record<string, string> = {
    exim_project_finance: "EXIM",
    commercial_finance: "Commercial",
    development_finance: "DFI/IFC",
    private_equity: "PE",
    blended_finance: "Blended",
  };
  return map[dt] ?? dt.replace(/_/g, " ");
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

function readinessColor(pct: number): string {
  if (pct >= 75) return "var(--teal, #2ba37a)";
  if (pct >= 50) return "var(--gold, #d4a843)";
  return "var(--accent, #e05252)";
}

const METRIC_ROWS = [
  { key: "program", label: "Program" },
  { key: "stage", label: "Stage" },
  { key: "readiness", label: "Readiness" },
  { key: "capex", label: "CAPEX" },
  { key: "requirements", label: "Requirements" },
  { key: "targetLoi", label: "Target LOI" },
  { key: "targetClose", label: "Target Close" },
] as const;

export function DealComparisonTable({ deals }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  if (deals.length < 2) return <EmptyState headline="Not enough deals" body="Add 2 or more projects to compare deals side by side." />;

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 5) next.add(id);
      return next;
    });
  };

  const selected = deals.filter((d) => selectedIds.has(d.id));

  function getCellValue(deal: ComparableDeal, key: string): string {
    switch (key) {
      case "program": return formatDealType(deal.dealType);
      case "stage": return formatStage(deal.stage);
      case "readiness": return `${deal.readinessScore.toFixed(1)}%`;
      case "capex": return formatCapex(deal.capexUsdCents);
      case "requirements": return `${deal.completedRequirements}/${deal.totalRequirements}`;
      case "targetLoi": return formatDate(deal.targetLoiDate);
      case "targetClose": return formatDate(deal.targetCloseDate);
      default: return "—";
    }
  }

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "12px",
        backgroundColor: "var(--bg-card)",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          border: "none",
          background: "none",
          cursor: "pointer",
          fontFamily: "'DM Mono', monospace",
          fontSize: "11px",
          fontWeight: 500,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: "var(--ink-muted)",
          outline: "none",
        }}
        onFocus={(e) => { e.currentTarget.style.boxShadow = "0 0 0 2px var(--accent)"; }}
        onBlur={(e) => { e.currentTarget.style.boxShadow = "none"; }}
      >
        <span>Deal Comparison</span>
        <span style={{ fontSize: "14px" }}>{isOpen ? "\u25B2" : "\u25BC"}</span>
      </button>

      {isOpen && (
        <div style={{ padding: "0 20px 20px" }}>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "13px",
              color: "var(--ink-mid)",
              lineHeight: 1.6,
              marginBottom: "16px",
            }}
          >
            Select up to 5 deals to compare side-by-side.
          </p>

          {/* Deal selector */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              marginBottom: "20px",
            }}
          >
            {deals.map((d) => {
              const isSelected = selectedIds.has(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggle(d.id)}
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "10px",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    padding: "6px 12px",
                    borderRadius: "999px",
                    border: `1px solid ${isSelected ? "var(--teal, #2ba37a)" : "var(--border)"}`,
                    backgroundColor: isSelected
                      ? "color-mix(in srgb, var(--teal, #2ba37a) 10%, var(--bg-card))"
                      : "transparent",
                    color: isSelected ? "var(--teal, #2ba37a)" : "var(--ink-muted)",
                    cursor: selectedIds.size >= 5 && !isSelected ? "not-allowed" : "pointer",
                    opacity: selectedIds.size >= 5 && !isSelected ? 0.5 : 1,
                    transition: "all 0.12s ease",
                  }}
                >
                  {d.name}
                </button>
              );
            })}
          </div>

          {/* Comparison table */}
          {selected.length >= 2 && (
            <div className="ls-table-scroll" style={{ borderRadius: "8px", border: "1px solid var(--border)", overflow: "hidden" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "12px",
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg)" }}>
                    <th
                      scope="col"
                      style={{
                        padding: "10px 14px",
                        textAlign: "left",
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "9px",
                        fontWeight: 500,
                        letterSpacing: "0.10em",
                        textTransform: "uppercase",
                        color: "var(--ink-muted)",
                        position: "sticky",
                        left: 0,
                        backgroundColor: "var(--bg)",
                        zIndex: 1,
                        minWidth: "120px",
                      }}
                    >
                      Metric
                    </th>
                    {selected.map((d) => (
                      <th
                        key={d.id}
                        scope="col"
                        style={{
                          padding: "10px 14px",
                          textAlign: "center",
                          minWidth: "130px",
                        }}
                      >
                        <Link
                          href={`/projects/${d.slug}`}
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "var(--ink)",
                            textDecoration: "none",
                          }}
                        >
                          {d.name}
                        </Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {METRIC_ROWS.map((row) => (
                    <tr key={row.key} style={{ borderBottom: "1px solid var(--border)" }} className="ls-table-row">
                      <td
                        style={{
                          padding: "10px 14px",
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "10px",
                          fontWeight: 500,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "var(--ink-muted)",
                          position: "sticky",
                          left: 0,
                          backgroundColor: "var(--bg-card)",
                          zIndex: 1,
                        }}
                      >
                        {row.label}
                      </td>
                      {selected.map((d) => {
                        const value = getCellValue(d, row.key);
                        const isReadiness = row.key === "readiness";
                        return (
                          <td
                            key={d.id}
                            style={{
                              padding: "10px 14px",
                              textAlign: "center",
                              color: isReadiness ? readinessColor(d.readinessScore) : "var(--ink)",
                              fontWeight: isReadiness ? 600 : 400,
                              fontFamily: isReadiness ? "'DM Mono', monospace" : "'Inter', sans-serif",
                            }}
                          >
                            {value}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {/* Visual readiness bar row */}
                  <tr>
                    <td
                      style={{
                        padding: "10px 14px",
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "10px",
                        fontWeight: 500,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--ink-muted)",
                        position: "sticky",
                        left: 0,
                        backgroundColor: "var(--bg-card)",
                        zIndex: 1,
                      }}
                    >
                      Progress
                    </td>
                    {selected.map((d) => (
                      <td key={d.id} style={{ padding: "10px 14px" }}>
                        <div
                          style={{
                            height: "6px",
                            borderRadius: "3px",
                            backgroundColor: "var(--border)",
                            overflow: "hidden",
                            margin: "0 auto",
                            maxWidth: "100px",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${Math.min(d.readinessScore, 100)}%`,
                              borderRadius: "3px",
                              backgroundColor: readinessColor(d.readinessScore),
                              transition: "width 0.3s ease",
                            }}
                          />
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {selected.length < 2 && selectedIds.size > 0 && (
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "13px",
                color: "var(--ink-muted)",
                fontStyle: "italic",
              }}
            >
              Select at least 2 deals to see a comparison.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
