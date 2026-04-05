"use client";

import { useState, useCallback } from "react";
import type { RequirementStatusValue } from "@/types/requirements";
import {
  REQUIREMENT_STATUS_ORDER,
  REQUIREMENT_STATUS_LABELS,
} from "@/types/requirements";

type RequirementRow = {
  requirementId: string;
  name: string;
  category: string;
  status: RequirementStatusValue;
  isApplicable: boolean;
  isPrimaryGate: boolean;
};

type SimulationResultData = {
  currentScoreBps: number;
  simulatedScoreBps: number;
  deltaScoreBps: number;
  loiReady: boolean;
  changedRequirements: Array<{
    requirementId: string;
    label: string;
    fromStatus: string;
    toStatus: string;
    scoreDeltaBps: number;
  }>;
};

type Props = {
  projectSlug: string;
  requirements: RequirementRow[];
};

export function ScenarioSimulator({ projectSlug, requirements }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [changes, setChanges] = useState<
    Map<string, RequirementStatusValue>
  >(new Map());
  const [result, setResult] = useState<SimulationResultData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applicableRequirements = requirements.filter((r) => r.isApplicable);
  const hasChanges = changes.size > 0;

  const handleStatusChange = useCallback(
    (requirementId: string, newStatus: RequirementStatusValue, currentStatus: RequirementStatusValue) => {
      setChanges((prev) => {
        const next = new Map(prev);
        if (newStatus === currentStatus) {
          next.delete(requirementId);
        } else {
          next.set(requirementId, newStatus);
        }
        return next;
      });
      setResult(null);
    },
    []
  );

  const handleSimulate = useCallback(async () => {
    if (!hasChanges) return;
    setLoading(true);
    setError(null);

    const changeArray = Array.from(changes.entries()).map(
      ([requirementId, newStatus]) => ({ requirementId, newStatus })
    );

    try {
      const response = await fetch(
        `/api/projects/${projectSlug}/simulate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ changes: changeArray }),
        }
      );

      if (!response.ok) {
        const text = await response.text();
        setError(text || `Request failed (${response.status})`);
        return;
      }

      const data: SimulationResultData = await response.json();
      setResult(data);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [hasChanges, changes, projectSlug]);

  const handleReset = useCallback(() => {
    setChanges(new Map());
    setResult(null);
    setError(null);
  }, []);

  function formatBps(bps: number): string {
    return (bps / 100).toFixed(1) + "%";
  }

  function formatDelta(bps: number): string {
    const sign = bps > 0 ? "+" : "";
    return sign + formatBps(bps);
  }

  const categories = Array.from(
    new Set(applicableRequirements.map((r) => r.category))
  ).sort();

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "8px",
        backgroundColor: "var(--bg-card)",
        marginBottom: "32px",
      }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="scenario-simulator-panel"
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
          borderRadius: "8px",
          outline: "none",
        }}
        onFocus={(e) => { e.currentTarget.style.boxShadow = "0 0 0 2px var(--accent)"; }}
        onBlur={(e) => { e.currentTarget.style.boxShadow = "none"; }}
      >
        <span>What-if Simulator</span>
        <span style={{ fontSize: "14px" }}>{isOpen ? "\u25B2" : "\u25BC"}</span>
      </button>

      {isOpen && (
        <div id="scenario-simulator-panel" style={{ padding: "0 20px 20px" }}>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "13px",
              color: "var(--ink-mid)",
              lineHeight: 1.6,
              marginBottom: "16px",
            }}
          >
            Change requirement statuses below to see how your readiness score
            would be affected — nothing is saved.
          </p>

          {result && (
            <div
              style={{
                backgroundColor: result.deltaScoreBps > 0 ? "var(--teal-soft, #e6f7f2)" : "var(--bg)",
                border: `1px solid ${result.deltaScoreBps > 0 ? "var(--teal, #2ba37a)" : "var(--border)"}`,
                borderRadius: "8px",
                padding: "16px 20px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "32px",
                  flexWrap: "wrap",
                  marginBottom: "12px",
                }}
              >
                <div>
                  <p
                    className="eyebrow"
                    style={{ marginBottom: "4px" }}
                  >
                    Current Score
                  </p>
                  <p
                    style={{
                      fontFamily: "'DM Serif Display', Georgia, serif",
                      fontSize: "22px",
                      color: "var(--ink)",
                      margin: 0,
                    }}
                  >
                    {formatBps(result.currentScoreBps)}
                  </p>
                </div>
                <div>
                  <p
                    className="eyebrow"
                    style={{ marginBottom: "4px" }}
                  >
                    Simulated Score
                  </p>
                  <p
                    style={{
                      fontFamily: "'DM Serif Display', Georgia, serif",
                      fontSize: "22px",
                      color: result.deltaScoreBps > 0 ? "var(--teal, #2ba37a)" : "var(--ink)",
                      margin: 0,
                    }}
                  >
                    {formatBps(result.simulatedScoreBps)}
                  </p>
                </div>
                <div>
                  <p
                    className="eyebrow"
                    style={{ marginBottom: "4px" }}
                  >
                    Delta
                  </p>
                  <p
                    style={{
                      fontFamily: "'DM Serif Display', Georgia, serif",
                      fontSize: "22px",
                      color: result.deltaScoreBps > 0
                        ? "var(--teal, #2ba37a)"
                        : result.deltaScoreBps < 0
                          ? "var(--accent, #e05252)"
                          : "var(--ink)",
                      margin: 0,
                    }}
                  >
                    {formatDelta(result.deltaScoreBps)}
                  </p>
                </div>
                <div>
                  <p
                    className="eyebrow"
                    style={{ marginBottom: "4px" }}
                  >
                    LOI Ready
                  </p>
                  <p
                    style={{
                      fontFamily: "'DM Serif Display', Georgia, serif",
                      fontSize: "22px",
                      color: result.loiReady ? "var(--teal, #2ba37a)" : "var(--ink-muted)",
                      margin: 0,
                    }}
                  >
                    {result.loiReady ? "Yes" : "No"}
                  </p>
                </div>
              </div>

              {result.changedRequirements.length > 0 && (
                <div className="ls-table-scroll">
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "12px",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom: "1px solid var(--border)",
                        textAlign: "left",
                      }}
                    >
                      <th style={{ padding: "6px 8px", color: "var(--ink-muted)", fontWeight: 500 }}>Requirement</th>
                      <th style={{ padding: "6px 8px", color: "var(--ink-muted)", fontWeight: 500 }}>From</th>
                      <th style={{ padding: "6px 8px", color: "var(--ink-muted)", fontWeight: 500 }}>To</th>
                      <th style={{ padding: "6px 8px", color: "var(--ink-muted)", fontWeight: 500, textAlign: "right" }}>Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.changedRequirements.map((cr) => (
                      <tr
                        key={cr.requirementId}
                        style={{ borderBottom: "1px solid var(--border)" }}
                      >
                        <td style={{ padding: "6px 8px", color: "var(--ink)" }}>{cr.label}</td>
                        <td style={{ padding: "6px 8px", color: "var(--ink-mid)" }}>
                          {REQUIREMENT_STATUS_LABELS[cr.fromStatus as RequirementStatusValue] ?? cr.fromStatus}
                        </td>
                        <td style={{ padding: "6px 8px", color: "var(--ink-mid)" }}>
                          {REQUIREMENT_STATUS_LABELS[cr.toStatus as RequirementStatusValue] ?? cr.toStatus}
                        </td>
                        <td
                          style={{
                            padding: "6px 8px",
                            textAlign: "right",
                            fontFamily: "'DM Mono', monospace",
                            color: cr.scoreDeltaBps > 0
                              ? "var(--teal, #2ba37a)"
                              : cr.scoreDeltaBps < 0
                                ? "var(--accent, #e05252)"
                                : "var(--ink-muted)",
                          }}
                        >
                          {formatDelta(cr.scoreDeltaBps)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </div>
          )}

          {error && (
            <p
              style={{
                color: "var(--accent, #e05252)",
                fontFamily: "'Inter', sans-serif",
                fontSize: "13px",
                marginBottom: "12px",
              }}
            >
              {error}
            </p>
          )}

          <div
            style={{
              maxHeight: "400px",
              overflowY: "auto",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              marginBottom: "16px",
            }}
          >
            {categories.map((category) => {
              const categoryReqs = applicableRequirements.filter(
                (r) => r.category === category
              );
              return (
                <div key={category}>
                  <div
                    style={{
                      padding: "8px 12px",
                      backgroundColor: "var(--bg)",
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "10px",
                      fontWeight: 500,
                      letterSpacing: "0.10em",
                      textTransform: "uppercase",
                      color: "var(--ink-muted)",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    {category.replace(/_/g, " ")}
                  </div>
                  {categoryReqs.map((req) => {
                    const overrideStatus = changes.get(req.requirementId);
                    const isChanged = overrideStatus !== undefined;
                    return (
                      <div
                        key={req.requirementId}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "6px 12px",
                          borderBottom: "1px solid var(--border)",
                          backgroundColor: isChanged ? "var(--gold-soft, #fef9e7)" : "transparent",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span
                            style={{
                              fontFamily: "'Inter', sans-serif",
                              fontSize: "12px",
                              color: "var(--ink)",
                            }}
                          >
                            {req.name}
                          </span>
                          {req.isPrimaryGate && (
                            <span
                              style={{
                                marginLeft: "6px",
                                fontFamily: "'DM Mono', monospace",
                                fontSize: "9px",
                                fontWeight: 500,
                                letterSpacing: "0.08em",
                                textTransform: "uppercase",
                                color: "var(--accent, #e05252)",
                              }}
                            >
                              LOI
                            </span>
                          )}
                        </div>
                        <select
                          value={overrideStatus ?? req.status}
                          onChange={(e) =>
                            handleStatusChange(
                              req.requirementId,
                              e.target.value as RequirementStatusValue,
                              req.status
                            )
                          }
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: "11px",
                            padding: "3px 6px",
                            borderRadius: "4px",
                            border: `1px solid ${isChanged ? "var(--gold, #d4a843)" : "var(--border)"}`,
                            backgroundColor: isChanged ? "var(--gold-soft, #fef9e7)" : "var(--bg)",
                            color: "var(--ink)",
                            cursor: "pointer",
                          }}
                        >
                          {REQUIREMENT_STATUS_ORDER.map((status) => (
                            <option key={status} value={status}>
                              {REQUIREMENT_STATUS_LABELS[status]}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={handleSimulate}
              disabled={!hasChanges || loading}
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "12px 18px",
                minHeight: "44px",
                borderRadius: "6px",
                border: "none",
                backgroundColor: hasChanges ? "var(--ink)" : "var(--border)",
                color: hasChanges ? "var(--bg)" : "var(--ink-muted)",
                cursor: hasChanges && !loading ? "pointer" : "not-allowed",
                opacity: loading ? 0.6 : 1,
                outline: "none",
              }}
              onFocus={(e) => { e.currentTarget.style.boxShadow = "0 0 0 2px var(--accent)"; }}
              onBlur={(e) => { e.currentTarget.style.boxShadow = "none"; }}
            >
              {loading ? "Simulating..." : "Simulate"}
            </button>
            <button
              onClick={handleReset}
              disabled={!hasChanges && !result}
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "12px 18px",
                minHeight: "44px",
                borderRadius: "6px",
                border: "1px solid var(--border)",
                backgroundColor: "transparent",
                color: "var(--ink-muted)",
                cursor: hasChanges || result ? "pointer" : "not-allowed",
                outline: "none",
              }}
              onFocus={(e) => { e.currentTarget.style.boxShadow = "0 0 0 2px var(--border-strong)"; }}
              onBlur={(e) => { e.currentTarget.style.boxShadow = "none"; }}
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
