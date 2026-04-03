import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { TemplatesMarketplaceClient } from "@/components/templates/TemplatesMarketplaceClient";
import { WORKSPACE_TEMPLATES } from "@/lib/templates/directory";
import { PROJECT_TEMPLATES } from "@/lib/templates/index";
import { CloneTemplateDialog } from "@/components/templates/CloneTemplateDialog";

const DEAL_TYPE_LABELS: Record<string, string> = {
  EXIM: "EXIM Project Finance",
  DFI: "Development Finance",
  PE: "Private Equity",
};

const SECTOR_LABELS: Record<string, string> = {
  power: "Power",
  transport: "Transport",
  water: "Water",
  telecom: "Telecom",
  mining: "Mining",
  other: "Other",
};

export default async function TemplatesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div>
      <div style={{ marginBottom: "28px", maxWidth: "780px" }}>
        <p className="eyebrow" style={{ marginBottom: "10px" }}>
          Marketplace
        </p>
        <h1
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: "36px",
            fontWeight: 400,
            color: "var(--ink)",
            margin: "0 0 10px",
          }}
        >
          Template Marketplace
        </h1>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "15px",
            color: "var(--ink-muted)",
            lineHeight: 1.65,
            margin: 0,
          }}
        >
          Browse starter workspace templates for repeatable deal structures. This placeholder
          surface is the first step toward official bank templates, private firm standards, and
          open-source community contributions.
        </p>
      </div>

      <section style={{ marginBottom: "48px" }}>
        <div style={{ marginBottom: "20px" }}>
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "11px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--accent)",
              margin: "0 0 6px",
            }}
          >
            Project templates
          </p>
          <h2
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: "26px",
              fontWeight: 400,
              color: "var(--ink)",
              margin: "0 0 6px",
            }}
          >
            Start from a curated deal structure
          </h2>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "14px",
              color: "var(--ink-muted)",
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            Clone any template to create a new project pre-loaded with milestones, sector defaults,
            and CAPEX benchmarks. You can edit everything after creation.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "16px",
          }}
        >
          {PROJECT_TEMPLATES.map((template) => (
            <article
              key={template.id}
              style={{
                borderRadius: "16px",
                border: "1px solid var(--border)",
                backgroundColor: "var(--bg-card)",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "9px",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    padding: "4px 8px",
                    borderRadius: "999px",
                    border: "1px solid var(--teal)",
                    color: "var(--teal)",
                    backgroundColor:
                      "color-mix(in srgb, var(--teal) 10%, var(--bg-card))",
                    lineHeight: 1,
                  }}
                >
                  {DEAL_TYPE_LABELS[template.dealType] ?? template.dealType}
                </span>
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "9px",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    padding: "4px 8px",
                    borderRadius: "999px",
                    border: "1px solid var(--border)",
                    color: "var(--ink-muted)",
                    lineHeight: 1,
                  }}
                >
                  {SECTOR_LABELS[template.sector] ?? template.sector}
                </span>
              </div>

              <div>
                <h3
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "17px",
                    fontWeight: 600,
                    color: "var(--ink)",
                    margin: "0 0 6px",
                  }}
                >
                  {template.name}
                </h3>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "14px",
                    lineHeight: 1.6,
                    color: "var(--ink-mid)",
                    margin: 0,
                  }}
                >
                  {template.description}
                </p>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", flex: 1, alignContent: "flex-start" }}>
                {template.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "9px",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--ink-muted)",
                      backgroundColor: "var(--bg)",
                      border: "1px solid var(--border)",
                      borderRadius: "999px",
                      padding: "4px 8px",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  paddingTop: "4px",
                  borderTop: "1px solid var(--border)",
                  marginTop: "auto",
                }}
              >
                <div>
                  <p
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "9px",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--ink-muted)",
                      margin: "0 0 2px",
                    }}
                  >
                    Est. CAPEX
                  </p>
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "15px",
                      fontWeight: 600,
                      color: "var(--ink)",
                      margin: 0,
                    }}
                  >
                    ${(template.estimatedCapexUsd / 1_000_000).toFixed(0)}M
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "9px",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--ink-muted)",
                    }}
                  >
                    {template.milestones.length} milestones
                  </span>
                  <CloneTemplateDialog template={template} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div style={{ marginBottom: "20px" }}>
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "11px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--accent)",
              margin: "0 0 6px",
            }}
          >
            Workspace templates
          </p>
          <h2
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: "26px",
              fontWeight: 400,
              color: "var(--ink)",
              margin: "0 0 6px",
            }}
          >
            Browse the marketplace
          </h2>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "14px",
              color: "var(--ink-muted)",
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            Workspace structure templates from banks, DFIs, and the community.
          </p>
        </div>
        <TemplatesMarketplaceClient templates={WORKSPACE_TEMPLATES} />
      </section>
    </div>
  );
}
