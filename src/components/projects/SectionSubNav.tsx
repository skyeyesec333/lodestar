"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

export type SubNavItem = {
  id: string;
  label: string;
};

function pillStyle(active: boolean): CSSProperties {
  return {
    fontFamily: "'DM Mono', monospace",
    fontSize: "9px",
    letterSpacing: "0.10em",
    textTransform: "uppercase",
    textDecoration: "none",
    whiteSpace: "nowrap",
    padding: "4px 0",
    color: active ? "var(--ink)" : "var(--ink-muted)",
    backgroundColor: "transparent",
    border: "none",
    borderBottom: active ? "1px solid var(--ink)" : "1px solid transparent",
    cursor: "pointer",
    background: "none",
    transition: "color 0.15s ease, border-color 0.15s ease",
  };
}

export function SectionSubNav({ items }: { items: SubNavItem[] }) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? "");

  useEffect(() => {
    function updateActive() {
      let current = items[0]?.id ?? "";
      for (const item of items) {
        const el = document.getElementById(item.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= 130) current = item.id;
      }
      setActiveId(current);
    }

    updateActive();
    window.addEventListener("scroll", updateActive, { passive: true });
    return () => {
      window.removeEventListener("scroll", updateActive);
    };
  }, [items]);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <nav
      aria-label="Section navigation"
      style={{
        display: "flex",
        flexDirection: "row",
        gap: "18px",
        overflowX: "auto",
        alignItems: "center",
        marginBottom: "20px",
      }}
    >
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => scrollTo(item.id)}
          style={pillStyle(activeId === item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
