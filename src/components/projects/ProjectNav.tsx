"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type NavSection = {
  id: string;
  label: string;
};

export const PROJECT_SECTIONS: NavSection[] = [
  { id: "section-overview",     label: "Overview"  },
  { id: "section-concept",      label: "Concept"   },
  { id: "section-stakeholders", label: "Parties"   },
  { id: "section-capital",      label: "Capital"   },
  { id: "section-workplan",     label: "Workplan"  },
  { id: "section-documents",    label: "Evidence"  },
  { id: "section-execution",    label: "Execution" },
];

const PROJECT_NAV_WIDTH = 166;
const PROJECT_CONTENT_MAX_WIDTH = 1200;
const PROJECT_NAV_GUTTER = 16;
const PROJECT_NAV_MAX_HEIGHT = 620;
const PROJECT_NAV_TOP_OFFSET = 112;
const PROJECT_NAV_BOTTOM_OFFSET = 112;
const PROJECT_COMPACT_NAV_WIDTH = 224;
const PROJECT_COMPACT_NAV_TOP = 160;
const PROJECT_COMPACT_NAV_MAX_HEIGHT = 560;
const PROJECT_NAV_ITEM_HEIGHT = 28;
const PROJECT_NAV_ITEM_GAP = 10;
const PROJECT_COMPACT_ITEM_HEIGHT = 28;
const PROJECT_COMPACT_ITEM_GAP = 10;

type SectionViewportState = {
  id: string;
  top: number;
  bottom: number;
  exists: boolean;
  visible: boolean;
};

export function ProjectNav() {
  const [activeId, setActiveId] = useState<string>(PROJECT_SECTIONS[0].id);
  const [visible, setVisible]   = useState(false);
  const [navLeft, setNavLeft] = useState<number | null>(null);
  const [compactLeft, setCompactLeft] = useState<number>(16);
  const [compactWidth, setCompactWidth] = useState<number>(PROJECT_COMPACT_NAV_WIDTH);
  const [compactHeight, setCompactHeight] = useState<number>(PROJECT_COMPACT_NAV_MAX_HEIGHT);
  const [navHeight, setNavHeight] = useState<number>(PROJECT_NAV_MAX_HEIGHT);
  const [viewportHeight, setViewportHeight] = useState<number>(900);
  const [isCompactOpen, setIsCompactOpen] = useState(false);
  const [sectionViewportStates, setSectionViewportStates] = useState<SectionViewportState[]>([]);
  const ticking = useRef(false);
  const compactNavRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function updateLayout() {
      const contentLeft = window.innerWidth / 2 - PROJECT_CONTENT_MAX_WIDTH / 2;
      const proposedLeft = Math.floor(contentLeft - PROJECT_NAV_WIDTH - PROJECT_NAV_GUTTER);
      const compactAvailableWidth = Math.max(164, Math.floor(contentLeft - 28));
      const nextCompactWidth = Math.min(PROJECT_COMPACT_NAV_WIDTH, compactAvailableWidth);
      const compactProposedLeft = Math.floor(contentLeft - nextCompactWidth - 12);
      const nextNavHeight = Math.min(
        Math.max(320, window.innerHeight - PROJECT_NAV_TOP_OFFSET - PROJECT_NAV_BOTTOM_OFFSET),
        PROJECT_NAV_MAX_HEIGHT
      );
      const nextCompactHeight = Math.min(Math.max(220, window.innerHeight - 192), PROJECT_COMPACT_NAV_MAX_HEIGHT);
      setNavLeft(proposedLeft >= 12 ? proposedLeft : null);
      setCompactWidth(nextCompactWidth);
      setCompactLeft(compactProposedLeft >= 12 ? compactProposedLeft : 16);
      setCompactHeight(nextCompactHeight);
      setNavHeight(nextNavHeight);
      setViewportHeight(window.innerHeight);
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
        const nextViewportStates: SectionViewportState[] = [];

        for (const sec of PROJECT_SECTIONS) {
          const el = document.getElementById(sec.id);
          if (!el) {
            nextViewportStates.push({
              id: sec.id,
              top: Number.POSITIVE_INFINITY,
              bottom: Number.NEGATIVE_INFINITY,
              exists: false,
              visible: false,
            });
            continue;
          }
          const rect = el.getBoundingClientRect();
          const visibleInViewport = rect.bottom > 96 && rect.top < window.innerHeight - 96;
          nextViewportStates.push({
            id: sec.id,
            top: rect.top,
            bottom: rect.bottom,
            exists: true,
            visible: visibleInViewport,
          });
          if (rect.top <= threshold) {
            currentId = sec.id;
          } else {
            break;
          }
        }

        setActiveId(currentId);
        setSectionViewportStates(nextViewportStates);
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

  useEffect(() => {
    if (!isCompactOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!compactNavRef.current) return;
      if (!compactNavRef.current.contains(event.target as Node)) {
        setIsCompactOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isCompactOpen]);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 72;
    setIsCompactOpen(false);
    window.scrollTo({ top: y, behavior: "smooth" });
  }

  const compactVisibleItems = useMemo(() => {
    const viewportMap = new Map(sectionViewportStates.map((state) => [state.id, state]));
    const items = PROJECT_SECTIONS.map((section) => ({
      section,
      viewport: viewportMap.get(section.id),
    })).filter((entry) => entry.viewport?.exists && (entry.viewport.visible || entry.section.id === activeId));

    if (items.length === 0) {
      const fallback = PROJECT_SECTIONS.find((section) => section.id === activeId) ?? PROJECT_SECTIONS[0];
      return [{ section: fallback, top: 0 }];
    }

    const rawPositions = items.map((entry) => {
      const viewportTop = entry.viewport?.top ?? 0;
      const normalized = ((viewportTop - 96) / Math.max(1, viewportHeight - 192)) * Math.max(1, compactHeight - PROJECT_COMPACT_ITEM_HEIGHT);
      return {
        section: entry.section,
        top: Math.max(0, Math.min(compactHeight - PROJECT_COMPACT_ITEM_HEIGHT, normalized)),
      };
    }).sort((a, b) => a.top - b.top);

    for (let index = 1; index < rawPositions.length; index += 1) {
      const minTop = rawPositions[index - 1].top + PROJECT_COMPACT_ITEM_HEIGHT + PROJECT_COMPACT_ITEM_GAP;
      if (rawPositions[index].top < minTop) {
        rawPositions[index].top = minTop;
      }
    }

    const overflow = rawPositions[rawPositions.length - 1].top + PROJECT_COMPACT_ITEM_HEIGHT - compactHeight;
    if (overflow > 0) {
      rawPositions[rawPositions.length - 1].top -= overflow;
      for (let index = rawPositions.length - 2; index >= 0; index -= 1) {
        const maxTop = rawPositions[index + 1].top - PROJECT_COMPACT_ITEM_HEIGHT - PROJECT_COMPACT_ITEM_GAP;
        rawPositions[index].top = Math.min(rawPositions[index].top, maxTop);
      }
    }

    return rawPositions;
  }, [activeId, compactHeight, sectionViewportStates, viewportHeight]);

  const positionedNavItems = useMemo(() => {
    const viewportMap = new Map(sectionViewportStates.map((state) => [state.id, state]));
    const items = PROJECT_SECTIONS.map((section) => ({
      section,
      viewport: viewportMap.get(section.id),
    })).filter((entry) => entry.viewport?.exists);

    if (items.length === 0) {
      return PROJECT_SECTIONS.map((section, index) => ({
        section,
        top: index * (PROJECT_NAV_ITEM_HEIGHT + PROJECT_NAV_ITEM_GAP),
      }));
    }

    const rawPositions = items
      .map((entry) => {
        const viewport = entry.viewport!;
        const midpoint = (viewport.top + viewport.bottom) / 2;
        const normalized =
          ((midpoint - 96) / Math.max(1, viewportHeight - 192)) *
          Math.max(1, navHeight - PROJECT_NAV_ITEM_HEIGHT);

        return {
          section: entry.section,
          top: Math.max(0, Math.min(navHeight - PROJECT_NAV_ITEM_HEIGHT, normalized)),
        };
      })
      .sort((a, b) => a.top - b.top);

    for (let index = 1; index < rawPositions.length; index += 1) {
      const minTop = rawPositions[index - 1].top + PROJECT_NAV_ITEM_HEIGHT + PROJECT_NAV_ITEM_GAP;
      if (rawPositions[index].top < minTop) {
        rawPositions[index].top = minTop;
      }
    }

    const overflow =
      rawPositions[rawPositions.length - 1].top + PROJECT_NAV_ITEM_HEIGHT - navHeight;
    if (overflow > 0) {
      rawPositions[rawPositions.length - 1].top -= overflow;
      for (let index = rawPositions.length - 2; index >= 0; index -= 1) {
        const maxTop =
          rawPositions[index + 1].top - PROJECT_NAV_ITEM_HEIGHT - PROJECT_NAV_ITEM_GAP;
        rawPositions[index].top = Math.min(rawPositions[index].top, maxTop);
      }
    }

    return rawPositions;
  }, [navHeight, sectionViewportStates, viewportHeight]);

  if (navLeft !== null) {
    return (
      <nav
        aria-label="Page sections"
        style={{
          position: "fixed",
          left: navLeft,
          top: `${PROJECT_NAV_TOP_OFFSET}px`,
          zIndex: 50,
          width: `${PROJECT_NAV_WIDTH}px`,
          height: `${navHeight}px`,
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? "auto" : "none",
          transition: "opacity 0.25s ease",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "12px",
            top: "0",
            bottom: "0",
            width: "1px",
            background: "color-mix(in srgb, var(--border) 72%, transparent)",
            opacity: 0.5,
          }}
        />
        {positionedNavItems.map(({ section, top }) => {
          const isActive = activeId === section.id;
          return (
            <button
              key={section.id}
              type="button"
              aria-current={isActive ? "location" : undefined}
              onClick={() => scrollTo(section.id)}
              style={{
                position: "absolute",
                left: "0",
                top: `${top}px`,
                display: "flex",
                alignItems: "center",
                gap: "10px",
                width: "100%",
                padding: "4px 0 4px 22px",
                border: "none",
                background: "none",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: "9px",
                  width: isActive ? "8px" : "5px",
                  height: isActive ? "8px" : "5px",
                  borderRadius: "50%",
                  backgroundColor: isActive ? "var(--accent)" : "var(--border-strong)",
                  transition:
                    "width 0.2s ease, height 0.2s ease, background-color 0.2s ease",
                }}
              />
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "9px",
                  fontWeight: isActive ? 600 : 400,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: isActive ? "var(--ink)" : "var(--ink-muted)",
                  whiteSpace: "nowrap",
                  lineHeight: 1.25,
                }}
              >
                {section.label}
              </span>
            </button>
          );
        })}
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
          left: `${compactLeft}px`,
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
          <nav
            ref={compactNavRef}
            aria-label="Page sections"
            style={{
              position: "fixed",
              left: `${compactLeft}px`,
              top: "160px",
              zIndex: 70,
              display: "block",
              width: `${compactWidth}px`,
              maxWidth: `min(${compactWidth}px, calc(100vw - 32px))`,
              height: `${compactHeight}px`,
              maxHeight: `${compactHeight}px`,
              overflow: "hidden",
              padding: "0",
              border: "none",
              borderRadius: "0",
              background: "none",
              boxShadow: "none",
              backdropFilter: "none",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "12px",
                top: "0",
                bottom: "0",
                width: "1px",
                background: "color-mix(in srgb, var(--border) 72%, transparent)",
                opacity: 0.5,
              }}
            />
            {compactVisibleItems.map(({ section, top }) => {
              const isActive = activeId === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  aria-current={isActive ? "location" : undefined}
                  onClick={() => scrollTo(section.id)}
                  style={{
                    position: "absolute",
                    left: "0",
                    top: `${top}px`,
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    width: "100%",
                    padding: "4px 0 4px 22px",
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      left: "9px",
                      width: isActive ? "8px" : "5px",
                      height: isActive ? "8px" : "5px",
                      borderRadius: "50%",
                      backgroundColor: isActive ? "var(--accent)" : "var(--border-strong)",
                      transition: "width 0.2s ease, height 0.2s ease, background-color 0.2s ease",
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "9px",
                      fontWeight: isActive ? 600 : 400,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: isActive ? "var(--ink)" : "var(--ink-muted)",
                      whiteSpace: "nowrap",
                      lineHeight: 1.25,
                    }}
                  >
                    {section.label}
                  </span>
                </button>
              );
            })}
          </nav>
      ) : null}
    </>
  );
}
