"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { PROJECT_SECTIONS } from "@/components/projects/projectSections";

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

export function ProjectWorkspaceTabs() {
  const [activeId, setActiveId] = useState(PROJECT_SECTIONS[0]?.id ?? "section-overview");

  useEffect(() => {
    function updateActiveSection() {
      let currentId = PROJECT_SECTIONS[0]?.id ?? "section-overview";

      for (const section of PROJECT_SECTIONS) {
        const element = document.getElementById(section.id);
        if (!element) continue;
        if (element.getBoundingClientRect().top <= 180) currentId = section.id;
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
      {PROJECT_SECTIONS.map((section) => (
        <a key={section.id} href={`#${section.id}`} style={pillStyle(activeId === section.id)}>
          {section.label}
        </a>
      ))}
    </nav>
  );
}
