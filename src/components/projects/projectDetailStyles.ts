import type { CSSProperties } from "react";

export const detailSectionKickerStyle: CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "10px",
  fontWeight: 500,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--ink-muted)",
};

export const detailMonoLabelStyle: CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "9px",
  fontWeight: 500,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--ink-muted)",
};

export const detailMicroMonoStyle: CSSProperties = {
  ...detailMonoLabelStyle,
  fontSize: "8px",
  letterSpacing: "0.1em",
};

export const detailMutedBodyStyle: CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: "13px",
  lineHeight: 1.55,
  color: "var(--ink-muted)",
};

export function detailSerifTitleStyle(fontSize: string): CSSProperties {
  return {
    fontFamily: "'DM Serif Display', Georgia, serif",
    fontSize,
    fontWeight: 400,
    color: "var(--ink)",
    lineHeight: 1.15,
  };
}

export function detailSurfaceCardStyle(radius = "12px"): CSSProperties {
  return {
    backgroundColor: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: radius,
  };
}
