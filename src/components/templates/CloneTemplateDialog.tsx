"use client";

import { useState, useTransition, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import type { ProjectTemplate } from "@/lib/templates/index";
import { cloneTemplate } from "@/actions/templates";

type Props = {
  template: ProjectTemplate;
};

export function CloneTemplateDialog({ template }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [projectName, setProjectName] = useState(template.name);
  const [countryCode, setCountryCode] = useState("US");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpen() {
    setProjectName(template.name);
    setCountryCode("US");
    setError(null);
    setOpen(true);
  }

  function handleClose() {
    if (!isPending) setOpen(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await cloneTemplate(template.id, projectName, countryCode);
      if (result.ok) {
        setOpen(false);
        router.push(`/projects/${result.value.slug}`);
      } else {
        setError(result.error.message);
      }
    });
  }

  return (
    <>
      <button type="button" onClick={handleOpen} style={actionBtnStyle}>
        Use template
      </button>

      {open && (
        <div style={overlayStyle} onClick={handleClose}>
          <div
            style={dialogStyle}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Clone template: ${template.name}`}
          >
            <div style={dialogHeaderStyle}>
              <p style={dialogKickerStyle}>Use template</p>
              <h2 style={dialogTitleStyle}>{template.name}</h2>
              <p style={dialogSubStyle}>{template.description}</p>
            </div>

            <form onSubmit={handleSubmit} style={formStyle}>
              <div style={fieldStyle}>
                <label htmlFor="clone-project-name" style={labelStyle}>
                  Project name
                </label>
                <input
                  id="clone-project-name"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  required
                  minLength={2}
                  maxLength={120}
                  disabled={isPending}
                  style={inputStyle}
                  placeholder="e.g. Nairobi Solar Power Plant"
                  autoFocus
                />
              </div>

              <div style={fieldStyle}>
                <label htmlFor="clone-country-code" style={labelStyle}>
                  Host country (2-letter ISO code)
                </label>
                <input
                  id="clone-country-code"
                  type="text"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value.toUpperCase().slice(0, 2))}
                  required
                  minLength={2}
                  maxLength={2}
                  disabled={isPending}
                  style={{ ...inputStyle, maxWidth: "80px", textTransform: "uppercase" }}
                  placeholder="KE"
                />
              </div>

              {error && <p style={errorStyle}>{error}</p>}

              <div style={dialogActionsStyle}>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  style={cancelBtnStyle}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || projectName.trim().length < 2 || countryCode.length !== 2}
                  style={submitBtnStyle}
                >
                  {isPending ? "Creating project..." : "Create project"}
                </button>
              </div>
            </form>

            <div style={milestonesPreviewStyle}>
              <p style={milestonesLabelStyle}>
                {template.milestones.length} milestones will be created
              </p>
              <ul style={milestonesListStyle}>
                {template.milestones.map((milestone, index) => (
                  <li key={index} style={milestoneItemStyle}>
                    <span style={milestoneDayStyle}>Day {milestone.daysFromStart}</span>
                    <span style={milestoneNameStyle}>{milestone.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: "16px",
};

const dialogStyle: CSSProperties = {
  backgroundColor: "var(--bg-card)",
  borderRadius: "20px",
  border: "1px solid var(--border)",
  padding: "28px",
  width: "100%",
  maxWidth: "540px",
  maxHeight: "90vh",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: "20px",
  boxShadow: "0 24px 48px rgba(0,0,0,0.25)",
};

const dialogHeaderStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const dialogKickerStyle: CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "10px",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--accent)",
  margin: 0,
};

const dialogTitleStyle: CSSProperties = {
  fontFamily: "'DM Serif Display', Georgia, serif",
  fontSize: "24px",
  fontWeight: 400,
  color: "var(--ink)",
  margin: 0,
};

const dialogSubStyle: CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: "14px",
  lineHeight: 1.6,
  color: "var(--ink-muted)",
  margin: 0,
};

const formStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "14px",
};

const fieldStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const labelStyle: CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "10px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--ink-muted)",
};

const inputStyle: CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: "15px",
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid var(--border)",
  backgroundColor: "var(--bg)",
  color: "var(--ink)",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const errorStyle: CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: "13px",
  color: "var(--destructive, #e53e3e)",
  padding: "8px 12px",
  backgroundColor: "color-mix(in srgb, var(--destructive, #e53e3e) 10%, var(--bg-card))",
  borderRadius: "8px",
  margin: 0,
};

const dialogActionsStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  justifyContent: "flex-end",
};

const cancelBtnStyle: CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "10px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  padding: "10px 16px",
  borderRadius: "999px",
  border: "1px solid var(--border)",
  backgroundColor: "transparent",
  color: "var(--ink-muted)",
  cursor: "pointer",
};

const submitBtnStyle: CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "10px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  padding: "10px 16px",
  borderRadius: "999px",
  border: "none",
  backgroundColor: "var(--teal)",
  color: "#ffffff",
  cursor: "pointer",
};

const milestonesPreviewStyle: CSSProperties = {
  borderTop: "1px solid var(--border)",
  paddingTop: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const milestonesLabelStyle: CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "10px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--ink-muted)",
  margin: 0,
};

const milestonesListStyle: CSSProperties = {
  margin: 0,
  padding: 0,
  listStyle: "none",
  display: "grid",
  gap: "6px",
};

const milestoneItemStyle: CSSProperties = {
  display: "flex",
  gap: "12px",
  alignItems: "baseline",
};

const milestoneDayStyle: CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "10px",
  color: "var(--ink-muted)",
  minWidth: "48px",
  flexShrink: 0,
};

const milestoneNameStyle: CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: "13px",
  color: "var(--ink-mid)",
  lineHeight: 1.4,
};

const actionBtnStyle: CSSProperties = {
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
  cursor: "pointer",
  whiteSpace: "nowrap",
  flexShrink: 0,
};
