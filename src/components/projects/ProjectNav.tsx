"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

export type NavSection = {
  id: string;
  label: string;
};

export const PROJECT_SECTIONS: NavSection[] = [
  { id: "section-overview",      label: "Overview"      },
  { id: "section-stakeholders",  label: "Stakeholders"  },
  { id: "section-readiness",     label: "Readiness"     },
  { id: "section-timeline",      label: "Timeline"      },
  { id: "section-documents",     label: "Documents"     },
  { id: "section-gap-analysis",  label: "Gap Analysis"  },
  { id: "section-requirements",  label: "Requirements"  },
  { id: "section-meetings",      label: "Meetings"      },
  { id: "section-activity",      label: "Activity"      },
];

export function ProjectNav() {
  const [activeId, setActiveId] = useState<string>(PROJECT_SECTIONS[0].id);
  const [visible, setVisible]   = useState(false);
  const [navLeft, setNavLeft] = useState<number | null>(null);
  const ticking = useRef(false);

  useEffect(() => {
    const NAV_WIDTH = 116;
    const CONTENT_MAX_WIDTH = 1200;
    const GUTTER = 16;

    function updateLayout() {
      const contentLeft = window.innerWidth / 2 - CONTENT_MAX_WIDTH / 2;
      const proposedLeft = Math.floor(contentLeft - NAV_WIDTH - GUTTER);
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

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 72;
    window.scrollTo({ top: y, behavior: "smooth" });
  }

  return (
    <nav
      aria-label="Page sections"
      style={{
        position: "fixed",
        left: navLeft ?? -9999,
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        opacity: visible && navLeft !== null ? 1 : 0,
        pointerEvents: visible && navLeft !== null ? "auto" : "none",
        transition: "opacity 0.3s",
      }}
    >
      {PROJECT_SECTIONS.map((sec) => {
        const isActive = activeId === sec.id;
        return (
          <button
            key={sec.id}
            onClick={() => scrollTo(sec.id)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "10px",
              background: "none",
              border: "none",
              padding: "3px 0",
              cursor: "pointer",
              width: "116px",
            }}
          >
            {/* Label — always present, fades/shifts with active state */}
            <motion.span
              animate={{
                opacity: isActive ? 0.9 : 0.3,
                x: isActive ? 0 : 4,
              }}
              transition={{ type: "spring", stiffness: 340, damping: 30 }}
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "8px",
                fontWeight: isActive ? 600 : 400,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: isActive ? "var(--accent)" : "var(--ink-muted)",
                whiteSpace: "nowrap",
                userSelect: "none",
                width: "86px",
                textAlign: "right",
                flexShrink: 0,
              }}
            >
              {sec.label}
            </motion.span>

            {/* Dot */}
            <div
              style={{
                width: "20px",
                display: "flex",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <motion.div
                animate={{
                  width: isActive ? 18 : 5,
                  height: isActive ? 6 : 5,
                  backgroundColor: isActive ? "var(--accent)" : "var(--border-strong)",
                  opacity: isActive ? 1 : 0.6,
                }}
                transition={{ type: "spring", stiffness: 340, damping: 30 }}
                style={{ borderRadius: "999px", flexShrink: 0 }}
              />
            </div>
          </button>
        );
      })}
    </nav>
  );
}
