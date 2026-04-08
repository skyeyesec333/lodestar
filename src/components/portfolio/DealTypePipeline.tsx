import { getStageLabel } from "@/lib/requirements/index";
import { EmptyState } from "@/components/ui/EmptyState";

const STAGE_ORDER = [
  "concept",
  "pre_loi",
  "loi_submitted",
  "loi_approved",
  "pre_commitment",
  "final_commitment",
  "financial_close",
] as const;

const DEAL_TYPE_LABELS: Record<string, string> = {
  exim_project_finance: "EXIM",
  commercial_finance: "Commercial",
  development_finance: "DFI/IFC",
  private_equity: "PE",
  other: "Other",
};

export function DealTypePipeline({
  pipeline,
}: {
  pipeline: Record<string, Record<string, number>>;
}) {
  const dealTypes = Object.keys(pipeline).sort();
  if (dealTypes.length === 0) return <EmptyState headline="No pipeline data" body="Create projects across different deal types to see the pipeline view." />;

  // Collect all stages that have at least one deal
  const activeStages = STAGE_ORDER.filter((stage) =>
    dealTypes.some((dt) => (pipeline[dt]?.[stage] ?? 0) > 0)
  );

  if (activeStages.length === 0) return null;

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "14px",
        padding: "20px 22px",
        backgroundColor: "var(--bg-card)",
      }}
    >
      <p
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "9px",
          fontWeight: 500,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: "var(--ink-muted)",
          marginBottom: "14px",
        }}
      >
        Deal type pipeline
      </p>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontFamily: "'Inter', sans-serif",
            fontSize: "12px",
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  textAlign: "left",
                  padding: "6px 10px 6px 0",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "9px",
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--ink-muted)",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                Program
              </th>
              {activeStages.map((stage) => (
                <th
                  key={stage}
                  style={{
                    textAlign: "center",
                    padding: "6px 6px",
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "8px",
                    fontWeight: 500,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--ink-muted)",
                    borderBottom: "1px solid var(--border)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {getStageLabel(stage, "exim_project_finance")}
                </th>
              ))}
              <th
                style={{
                  textAlign: "center",
                  padding: "6px 0 6px 6px",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "9px",
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--ink-muted)",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {dealTypes.map((dt) => {
              const row = pipeline[dt] ?? {};
              const total = activeStages.reduce((sum, s) => sum + (row[s] ?? 0), 0);
              return (
                <tr key={dt}>
                  <td
                    style={{
                      padding: "8px 10px 8px 0",
                      fontWeight: 500,
                      color: "var(--ink)",
                      borderBottom: "1px solid var(--border)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {DEAL_TYPE_LABELS[dt] ?? dt}
                  </td>
                  {activeStages.map((stage) => {
                    const count = row[stage] ?? 0;
                    return (
                      <td
                        key={stage}
                        style={{
                          textAlign: "center",
                          padding: "8px 6px",
                          color: count > 0 ? "var(--ink)" : "var(--ink-muted)",
                          fontWeight: count > 0 ? 600 : 400,
                          borderBottom: "1px solid var(--border)",
                          backgroundColor: count > 0 ? "color-mix(in srgb, var(--teal) 6%, transparent)" : "transparent",
                        }}
                      >
                        {count || "—"}
                      </td>
                    );
                  })}
                  <td
                    style={{
                      textAlign: "center",
                      padding: "8px 0 8px 6px",
                      fontWeight: 600,
                      color: "var(--ink)",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    {total}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
