"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { PROJECT_SECTIONS } from "@/components/projects/projectSections";

function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
    setIsMobile(mql.matches);
    function handler(e: MediaQueryListEvent) { setIsMobile(e.matches); }
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [breakpoint]);
  return isMobile;
}

function pillStyle(active: boolean): CSSProperties {
  return {
    fontFamily: "'DM Mono', monospace",
    fontSize: "10px",
    fontWeight: 500,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    textDecoration: "none",
    whiteSpace: "nowrap",
    padding: "10px 2px 12px",
    color: active ? "var(--ink)" : "var(--ink-mid)",
    backgroundColor: "transparent",
    border: "none",
    borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
    transition: "color 0.2s ease, border-color 0.2s ease",
  };
}

export function ProjectWorkspaceTabs({ badges }: { badges?: Record<string, number> }) {
  const [activeId, setActiveId] = useState(PROJECT_SECTIONS[0]?.id ?? "section-overview");
  const isMobile = useIsMobile();

  useEffect(() => {
    function updateActiveSection() {
      let currentId = PROJECT_SECTIONS[0]?.id ?? "section-overview";

      for (const section of PROJECT_SECTIONS) {
        const element = document.getElementById(section.id);
        if (!element) continue;
        if (element.getBoundingClientRect().top <= 120) currentId = section.id;
      }

      setActiveId(currentId);
    }

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("hashchange", updateActiveSection);
    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("hashchange", updateActiveSection);
    };
  }, []);

  const activeLabel = PROJECT_SECTIONS.find((s) => s.id === activeId)?.label ?? "Navigate";

  if (isMobile) {
    return (
      <nav aria-label="Project workspaces" style={{ flex: 1, minWidth: 0 }}>
        <select
          value={activeId}
          onChange={(e) => {
            const id = e.target.value;
            setActiveId(id);
            window.location.hash = `#${id}`;
          }}
          aria-label="Jump to section"
          style={{
            width: "100%",
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            fontWeight: 500,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "var(--ink)",
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "10px 12px",
            cursor: "pointer",
            appearance: "none",
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23999' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 12px center",
            paddingRight: "32px",
          }}
        >
          {PROJECT_SECTIONS.map((section) => {
            const badge = badges?.[section.id];
            return (
              <option key={section.id} value={section.id}>
                {section.label}{badge ? ` (${badge})` : ""}
              </option>
            );
          })}
        </select>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Project workspaces"
      style={{
        display: "flex",
        gap: "22px",
        overflowX: "auto",
        alignItems: "center",
        flex: 1,
        minWidth: 0,
      }}
    >
      {PROJECT_SECTIONS.map((section) => {
        const badge = badges?.[section.id];
        return (
          <a key={section.id} href={`#${section.id}`} style={pillStyle(activeId === section.id)}>
            {section.label}
            {badge ? (
              <span
                style={{
                  marginLeft: "5px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: "16px",
                  height: "16px",
                  borderRadius: "8px",
                  backgroundColor: "var(--accent)",
                  color: "var(--text-inverse)",
                  fontSize: "9px",
                  fontWeight: 700,
                  padding: "0 4px",
                  lineHeight: 1,
                  verticalAlign: "middle",
                }}
              >
                {badge}
              </span>
            ) : null}
          </a>
        );
      })}
    </nav>
  );
}
