"use client";

import { useState, useEffect, useRef } from "react";

export type NavSection = {
  id: string;
  label: string;
};

export const PROJECT_SECTIONS: NavSection[] = [
  { id: "section-overview",        label: "Overview"      },
  { id: "section-collaborators",   label: "Access"        },
  { id: "section-stakeholders",    label: "Deal Parties"  },
  { id: "section-epc",             label: "EPC"           },
  { id: "section-funders",         label: "Funders"       },
  { id: "section-readiness",       label: "Deal Readiness"},
  { id: "section-timeline",        label: "Deal Timeline" },
  { id: "section-documents",       label: "Data Room"     },
  { id: "section-gap-analysis",    label: "Deal Gap"      },
  { id: "section-requirements",    label: "Deal Workplan" },
  { id: "section-meetings",        label: "Deal Meetings" },
  { id: "section-activity",        label: "Deal Activity" },
];

const PROJECT_NAV_WIDTH = 166;
const PROJECT_CONTENT_MAX_WIDTH = 1200;
const PROJECT_NAV_GUTTER = 16;

const PROJECT_NAV_GROUPS: Array<{ label: string; items: NavSection[] }> = [
  {
    label: "Deal",
    items: [PROJECT_SECTIONS[0], PROJECT_SECTIONS[1]],
  },
  {
    label: "Parties",
    items: [PROJECT_SECTIONS[2], PROJECT_SECTIONS[3], PROJECT_SECTIONS[4]],
  },
  {
    label: "Readiness",
    items: [PROJECT_SECTIONS[5], PROJECT_SECTIONS[6], PROJECT_SECTIONS[7], PROJECT_SECTIONS[8], PROJECT_SECTIONS[9]],
  },
  {
    label: "Tracking",
    items: [PROJECT_SECTIONS[10], PROJECT_SECTIONS[11]],
  },
];

export function ProjectNav() {
  const [activeId, setActiveId] = useState<string>(PROJECT_SECTIONS[0].id);
  const [visible, setVisible]   = useState(false);
  const [navLeft, setNavLeft] = useState<number | null>(null);
  const [isCompactOpen, setIsCompactOpen] = useState(false);
  const ticking = useRef(false);

  useEffect(() => {
    function updateLayout() {
      const contentLeft = window.innerWidth / 2 - PROJECT_CONTENT_MAX_WIDTH / 2;
      const proposedLeft = Math.floor(contentLeft - PROJECT_NAV_WIDTH - PROJECT_NAV_GUTTER);
      setNavLeft(proposedLeft >= 12 ? proposedLeft : null);
    }

    function onScroll() {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        setVisible(window.scrollY > 120);
        const threshold = window.innerHeight * 0.3;
        const nearBottom =
          window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 24;

        if (nearBottom) {
          setActiveId(PROJECT_SECTIONS[PROJECT_SECTIONS.length - 1].id);
          ticking.current = false;
          return;
        }

        let currentId = PROJECT_SECTIONS[0].id;

        for (const sec of PROJECT_SECTIONS) {
          const el = document.getElementById(sec.id);
          if (!el) continue;
          const rect = el.getBoundingClientRect();
          if (rect.top <= threshold) {
            currentId = sec.id;
          } else {
            break;
          }
        }

        setActiveId(currentId);
        ticking.current = false;
      });
    }

    function onResize() {
      updateLayout();
      onScroll();
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    updateLayout();
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    if (navLeft !== null) {
      setIsCompactOpen(false);
    }
  }, [navLeft]);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 72;
    setIsCompactOpen(false);
    window.scrollTo({ top: y, behavior: "smooth" });
  }

  const navContent = PROJECT_NAV_GROUPS.map((group, groupIndex) => (
    <div key={group.label} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <div
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "8.5px",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--ink-muted)",
          paddingLeft: "4px",
        }}
      >
        {group.label}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {group.items.map((sec) => {
          const isActive = activeId === sec.id;
          return (
            <button
              key={sec.id}
              type="button"
              aria-current={isActive ? "location" : undefined}
              onClick={() => scrollTo(sec.id)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                width: "100%",
                border: "1px solid transparent",
                borderRadius: "10px",
                background: isActive ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "transparent",
                padding: "7px 8px",
                cursor: "pointer",
                color: "inherit",
                textAlign: "left",
                transition: "background 0.2s ease, border-color 0.2s ease, transform 0.2s ease",
              }}
            >
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "8.5px",
                  fontWeight: isActive ? 600 : 400,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: isActive ? "var(--ink)" : "var(--ink-muted)",
                  whiteSpace: "nowrap",
                  userSelect: "none",
                  lineHeight: 1.2,
                }}
              >
                {sec.label}
              </span>

              <span
                aria-hidden="true"
                style={{
                  width: isActive ? "14px" : "7px",
                  height: "2px",
                  borderRadius: "999px",
                  backgroundColor: isActive ? "var(--accent)" : "var(--border-strong)",
                  opacity: isActive ? 1 : 0.5,
                  flexShrink: 0,
                  transition: "width 0.2s ease, opacity 0.2s ease, background-color 0.2s ease",
                }}
              />
            </button>
          );
        })}
      </div>

      {groupIndex < PROJECT_NAV_GROUPS.length - 1 ? (
        <div
          aria-hidden="true"
          style={{
            height: "1px",
            background: "var(--border)",
            marginTop: "2px",
            marginLeft: "4px",
            marginRight: "4px",
          }}
        />
      ) : null}
    </div>
  ));

  if (navLeft !== null) {
    return (
      <nav
        aria-label="Page sections"
        style={{
          position: "fixed",
          left: navLeft,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          width: `${PROJECT_NAV_WIDTH}px`,
          padding: "12px 10px",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          background: "color-mix(in srgb, var(--bg-card) 94%, transparent)",
          boxShadow: "0 10px 24px rgba(17, 24, 39, 0.06)",
          backdropFilter: "blur(10px)",
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? "auto" : "none",
          transition: "opacity 0.25s ease, transform 0.25s ease",
        }}
      >
        {navContent}
      </nav>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label="Open section navigation"
        aria-expanded={isCompactOpen}
        onClick={() => setIsCompactOpen((open) => !open)}
        style={{
          position: "fixed",
          left: "16px",
          top: "112px",
          zIndex: 60,
          display: "inline-flex",
          alignItems: "center",
          gap: "10px",
          padding: "10px 14px",
          borderRadius: "999px",
          border: "1px solid var(--border)",
          background: "color-mix(in srgb, var(--bg-card) 94%, transparent)",
          boxShadow: "0 10px 24px rgba(17, 24, 39, 0.12)",
          backdropFilter: "blur(10px)",
          color: "var(--ink)",
          cursor: "pointer",
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? "auto" : "none",
          transition: "opacity 0.25s ease, transform 0.25s ease",
        }}
      >
        <span
          style={{
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            backgroundColor: "var(--accent)",
            boxShadow: activeId ? "0 0 0 4px color-mix(in srgb, var(--accent) 16%, transparent)" : "none",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Sections
        </span>
      </button>

      {isCompactOpen ? (
        <>
          <button
            type="button"
            aria-label="Close section navigation"
            onClick={() => setIsCompactOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 69,
              border: "none",
              background: "rgba(15, 23, 42, 0.28)",
              cursor: "pointer",
            }}
          />
          <nav
            aria-label="Page sections"
            style={{
              position: "fixed",
              left: "16px",
              top: "160px",
              zIndex: 70,
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              width: "min(320px, calc(100vw - 32px))",
              maxHeight: "min(calc(100vh - 192px), 560px)",
              overflowY: "auto",
              padding: "14px 12px",
              border: "1px solid var(--border)",
              borderRadius: "18px",
              background: "color-mix(in srgb, var(--bg-card) 97%, transparent)",
              boxShadow: "0 18px 36px rgba(17, 24, 39, 0.18)",
              backdropFilter: "blur(12px)",
            }}
          >
            {navContent}
          </nav>
        </>
      ) : null}
    </>
  );
}
