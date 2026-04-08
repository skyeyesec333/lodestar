"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

const ROUTE_LABELS: Record<string, string> = {
  projects: "Projects",
  portfolio: "Portfolio",
  experts: "Expert Network",
  templates: "Templates",
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const [projectName, setProjectName] = useState<string | null>(null);

  useEffect(() => {
    const el = document.querySelector<HTMLElement>("[data-project-name]");
    if (el) setProjectName(el.dataset.projectName ?? null);
    else setProjectName(null);
  }, [pathname]);

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const crumbs: Array<{ label: string; href: string | null }> = [];

  // First segment: top-level route
  const topRoute = segments[0];
  const topLabel = ROUTE_LABELS[topRoute] ?? topRoute;
  crumbs.push({
    label: topLabel,
    href: segments.length > 1 ? `/${topRoute}` : null,
  });

  // Project detail page: /projects/[slug]
  if (topRoute === "projects" && segments.length >= 2) {
    const displayName = projectName ?? segments[1];
    crumbs.push({
      label: displayName,
      href: null,
    });
  }

  if (crumbs.length <= 1 && !crumbs[0]?.href) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        marginBottom: "16px",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        flexWrap: "wrap",
      }}
    >
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            {i > 0 && (
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  color: "var(--ink-muted)",
                }}
              >
                /
              </span>
            )}
            {crumb.href && !isLast ? (
              <Link
                href={crumb.href}
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  fontWeight: 500,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: "var(--ink-muted)",
                  textDecoration: "none",
                }}
              >
                {crumb.label}
              </Link>
            ) : (
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  fontWeight: 500,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: isLast ? "var(--ink-mid)" : "var(--ink-muted)",
                }}
              >
                {crumb.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
