import type { ReactNode } from "react";
import Link from "next/link";

type EmptyStateProps = {
  headline: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
  icon?: ReactNode;
};

export function EmptyState({ headline, body, ctaLabel, ctaHref, icon }: EmptyStateProps) {
  return (
    <div
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px dashed var(--border)",
        borderRadius: "12px",
        padding: "32px 28px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px",
      }}
    >
      {icon && (
        <div style={{ color: "var(--ink-muted)", marginBottom: "4px" }}>{icon}</div>
      )}
      <p
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "10px",
          fontWeight: 500,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--ink-muted)",
          margin: 0,
        }}
      >
        {headline}
      </p>
      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "13px",
          color: "var(--ink-mid)",
          lineHeight: 1.6,
          margin: 0,
          maxWidth: "420px",
        }}
      >
        {body}
      </p>
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          style={{
            display: "inline-block",
            marginTop: "6px",
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            fontWeight: 500,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "var(--teal)",
            textDecoration: "none",
          }}
        >
          {ctaLabel} →
        </Link>
      )}
    </div>
  );
}
