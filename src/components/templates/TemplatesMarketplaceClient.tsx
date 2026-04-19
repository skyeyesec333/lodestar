"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import type {
  TemplateCapitalPath,
  TemplatePublisherType,
  TemplateSector,
  WorkspaceTemplate,
} from "@/lib/templates/directory";

const SECTOR_OPTIONS: Array<{ value: TemplateSector | "all"; label: string }> = [
  { value: "all", label: "All sectors" },
  { value: "energy", label: "Energy" },
  { value: "water", label: "Water" },
  { value: "transport", label: "Transport" },
  { value: "industrial", label: "Industrial" },
  { value: "cross_sector", label: "Cross-sector" },
];

const CAPITAL_PATH_OPTIONS: Array<{ value: TemplateCapitalPath | "all"; label: string }> = [
  { value: "all", label: "All paths" },
  { value: "exim_project_finance", label: "EXIM" },
  { value: "development_finance", label: "DFI" },
  { value: "commercial_finance", label: "Commercial" },
  { value: "private_equity", label: "Private equity" },
  { value: "hybrid", label: "Hybrid" },
];

const PUBLISHER_OPTIONS: Array<{ value: TemplatePublisherType | "all"; label: string }> = [
  { value: "all", label: "All publishers" },
  { value: "official", label: "Official" },
  { value: "community", label: "Community" },
  { value: "private", label: "Private" },
];

type Props = {
  templates: WorkspaceTemplate[];
};

function publisherTone(type: TemplatePublisherType) {
  switch (type) {
    case "official":
      return {
        color: "var(--teal)",
        background: "color-mix(in srgb, var(--teal) 10%, var(--bg-card))",
        panel: "linear-gradient(160deg, color-mix(in srgb, var(--teal) 10%, var(--bg-card)) 0%, var(--bg-card) 62%)",
      };
    case "private":
      return {
        color: "var(--gold)",
        background: "color-mix(in srgb, var(--gold) 10%, var(--bg-card))",
        panel: "linear-gradient(160deg, color-mix(in srgb, var(--gold) 8%, var(--bg-card)) 0%, var(--bg-card) 62%)",
      };
    case "community":
    default:
      return {
        color: "var(--accent)",
        background: "color-mix(in srgb, var(--accent) 10%, var(--bg-card))",
        panel: "var(--bg-card)",
      };
  }
}

export function TemplatesMarketplaceClient({ templates }: Props) {
  const [sector, setSector] = useState<TemplateSector | "all">("all");
  const [capitalPath, setCapitalPath] = useState<TemplateCapitalPath | "all">("all");
  const [publisherType, setPublisherType] = useState<TemplatePublisherType | "all">("all");

  const visible = useMemo(() => {
    return templates.filter((template) => {
      const sectorMatch = sector === "all" || template.sector === sector;
      const capitalMatch = capitalPath === "all" || template.capitalPath === capitalPath;
      const publisherMatch = publisherType === "all" || template.publisherType === publisherType;
      return sectorMatch && capitalMatch && publisherMatch;
    });
  }, [templates, sector, capitalPath, publisherType]);

  const featured = visible.filter((template) => template.featured);

  return (
    <>
      <div style={toolbarStyle}>
        <div style={filterGroupStyle}>
          <span style={filterLabelStyle}>Sector</span>
          {SECTOR_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSector(option.value)}
              style={sector === option.value ? filterBtnActive : filterBtnInactive}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div style={filterGroupStyle}>
          <span style={filterLabelStyle}>Capital path</span>
          {CAPITAL_PATH_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setCapitalPath(option.value)}
              style={capitalPath === option.value ? filterBtnActive : filterBtnInactive}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div style={filterGroupStyle}>
          <span style={filterLabelStyle}>Publisher</span>
          {PUBLISHER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPublisherType(option.value)}
              style={publisherType === option.value ? filterBtnActive : filterBtnInactive}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.15fr 0.85fr",
          gap: "16px",
          alignItems: "start",
          marginBottom: "24px",
        }}
      >
        <section style={heroCardStyle}>
          <p style={kickerStyle}>Template marketplace</p>
          <h2 style={heroTitleStyle}>Start from a structure that already matches the deal</h2>
          <p style={heroBodyStyle}>
            Browse structures built for EXIM project finance, development finance, and private
            equity deals. More templates from banks, advisors, and the Lodestar community are on the
            way.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "18px" }}>
            <span style={statPillStyle}>Featured templates: {featured.length}</span>
            <span style={statPillStyle}>Visible templates: {visible.length}</span>
            <span style={statPillStyle}>Official bank templates coming next</span>
          </div>
        </section>

        <section style={sideCardStyle}>
          <p style={kickerStyle}>Planned capabilities</p>
          <ul style={listStyle}>
            <li>Seed workspaces from a chosen template during project creation</li>
            <li>Publish verified institutional standards from banks and DFIs</li>
            <li>Support community open-source templates and private firm templates</li>
            <li>Fork, version, and refine templates as teams learn</li>
          </ul>
        </section>
      </div>

      <p style={resultsStyle}>
        {visible.length} template{visible.length === 1 ? "" : "s"}
        {sector !== "all" || capitalPath !== "all" || publisherType !== "all" ? " · filtered" : ""}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "16px",
        }}
      >
        {visible.map((template) => {
          const tone = publisherTone(template.publisherType);
          return (
            <article
              key={template.id}
              style={{
                borderRadius: "16px",
                border: `1px solid ${template.publisherType === "official" ? "color-mix(in srgb, var(--teal) 35%, var(--border))" : "var(--border)"}`,
                background: tone.panel,
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                boxShadow:
                  template.publisherType === "official"
                    ? "0 10px 26px color-mix(in srgb, var(--teal) 10%, transparent)"
                    : "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                  flexWrap: "wrap",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "8px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                <span
                  style={{
                    color: tone.color,
                    border: `1px solid ${tone.color}`,
                    backgroundColor: tone.background,
                    borderRadius: "999px",
                    padding: "4px 8px",
                    lineHeight: 1,
                  }}
                >
                  {template.structureLabel}
                </span>
                <span
                  style={{
                    ...badgeStyle,
                    color: tone.color,
                    backgroundColor: tone.background,
                    borderColor: tone.color,
                  }}
                >
                  {template.officialLabel ?? template.publisherType}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                <div
                  style={{
                    minWidth: "84px",
                    height: "40px",
                    padding: "0 12px",
                    borderRadius: "12px",
                    backgroundColor: "var(--bg-card)",
                    border: `1px solid ${tone.color}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    boxSizing: "border-box",
                    overflow: "hidden",
                  }}
                >
                  {template.publisherLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={template.publisherLogoUrl}
                      alt={template.publisher}
                      loading="lazy"
                      style={{
                        maxHeight: "24px",
                        maxWidth: "100%",
                        objectFit: "contain",
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        fontFamily:
                          template.publisherType === "official"
                            ? "'Inter', sans-serif"
                            : "'DM Mono', monospace",
                        fontSize: template.publisherMark.length > 10 ? "9px" : "10px",
                        fontWeight: template.publisherType === "official" ? 700 : 500,
                        color: tone.color,
                        letterSpacing: template.publisherType === "official" ? "0.04em" : "0.03em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {template.publisherMark}
                    </span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={cardTitleStyle}>{template.name}</h3>
                    <p style={publisherNameStyle}>{template.publisher}</p>
                    <p style={publisherStyle}>{template.publisherTitle}</p>
                  </div>
                </div>
              </div>

              <p style={summaryStyle}>{template.summary}</p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {template.workspaces.map((workspace) => (
                  <span key={workspace} style={workspacePillStyle}>
                    {workspace}
                  </span>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <span style={metaPillStyle}>{template.sector.replace(/_/g, " ")}</span>
                  <span style={metaPillStyle}>{template.capitalPath.replace(/_/g, " ")}</span>
                </div>
                <Link href={`/projects/new?template=${template.id}`} style={actionLinkStyle}>
                  Use template
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

const toolbarStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
  padding: "16px",
  border: "1px solid var(--border)",
  borderRadius: "16px",
  backgroundColor: "var(--bg-card)",
  marginBottom: "24px",
};

const filterGroupStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  alignItems: "center",
};

const filterLabelStyle: CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "10px",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--ink-muted)",
  minWidth: "88px",
};

const filterBtnBase: CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "10px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  padding: "7px 11px",
  borderRadius: "999px",
  border: "1px solid var(--border)",
  cursor: "pointer",
};

const filterBtnActive: CSSProperties = {
  ...filterBtnBase,
  backgroundColor: "var(--teal)",
  color: "var(--text-inverse)",
  borderColor: "var(--teal)",
};

const filterBtnInactive: CSSProperties = {
  ...filterBtnBase,
  backgroundColor: "transparent",
  color: "var(--ink-muted)",
};

const heroCardStyle: CSSProperties = {
  borderRadius: "20px",
  border: "1px solid var(--border)",
  background: "linear-gradient(145deg, color-mix(in srgb, var(--teal) 8%, var(--bg-card)) 0%, var(--bg-card) 60%)",
  padding: "22px",
};

const sideCardStyle: CSSProperties = {
  borderRadius: "20px",
  border: "1px solid var(--border)",
  backgroundColor: "var(--bg-card)",
  padding: "22px",
};

const kickerStyle: CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "11px",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--accent)",
  margin: "0 0 10px",
};

const heroTitleStyle: CSSProperties = {
  fontFamily: "'DM Serif Display', Georgia, serif",
  fontSize: "32px",
  fontWeight: 400,
  color: "var(--ink)",
  margin: "0 0 10px",
  lineHeight: 1.05,
};

const heroBodyStyle: CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: "15px",
  lineHeight: 1.65,
  color: "var(--ink-mid)",
  margin: 0,
  maxWidth: "680px",
};

const statPillStyle: CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "10px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  padding: "6px 10px",
  borderRadius: "999px",
  border: "1px solid var(--border)",
  backgroundColor: "var(--bg)",
  color: "var(--ink-muted)",
};

const listStyle: CSSProperties = {
  margin: 0,
  paddingLeft: "18px",
  display: "grid",
  gap: "8px",
  fontFamily: "'Inter', sans-serif",
  fontSize: "14px",
  lineHeight: 1.6,
  color: "var(--ink-mid)",
};

const resultsStyle: CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "11px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--ink-muted)",
  margin: "0 0 18px",
};

const cardTitleStyle: CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: "18px",
  fontWeight: 600,
  color: "var(--ink)",
  margin: "0 0 4px",
};

const publisherNameStyle: CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: "13px",
  fontWeight: 500,
  color: "var(--ink)",
  margin: "0 0 2px",
};

const publisherStyle: CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "10px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--ink-muted)",
  margin: 0,
};

const badgeStyle: CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "8px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  borderRadius: "999px",
  padding: "4px 8px",
  border: "1px solid currentColor",
  whiteSpace: "nowrap",
  lineHeight: 1,
};

const summaryStyle: CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: "14px",
  lineHeight: 1.65,
  color: "var(--ink-mid)",
  margin: 0,
};

const workspacePillStyle: CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "10px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--ink)",
  backgroundColor: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "999px",
  padding: "6px 9px",
};

const metaPillStyle: CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "10px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--ink-muted)",
};

const actionLinkStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "'DM Mono', monospace",
  fontSize: "10px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  padding: "8px 12px",
  borderRadius: "999px",
  border: "1px solid var(--accent)",
  backgroundColor: "transparent",
  color: "var(--accent)",
  textDecoration: "none",
  whiteSpace: "nowrap",
  flexShrink: 0,
};
