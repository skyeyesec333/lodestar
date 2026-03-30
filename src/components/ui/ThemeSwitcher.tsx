"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const THEMES = [
  { id: "parchment", label: "Parchment", swatches: ["#f4f1eb", "#c24a1e", "#1a6b6b"] },
  { id: "minimal", label: "Minimal", swatches: ["#faf9f7", "#2c2c2a", "#c24a1e"] },
  { id: "navy", label: "Navy", swatches: ["#0f1f3d", "#f8f7f4", "#1a5276"] },
  { id: "forest", label: "Forest", swatches: ["#1a2e1a", "#f5f3ee", "#2d6a4f"] },
  { id: "slate", label: "Slate", swatches: ["#1c1c1a", "#3a9e9e", "#b07d2a"] },
  { id: "obsidian", label: "Obsidian", swatches: ["#0f1113", "#4ea6a1", "#d26a3d"] },
  { id: "midnight", label: "Midnight", swatches: ["#101626", "#59a8b8", "#d28743"] },
  { id: "ember", label: "Ember", swatches: ["#181311", "#db6f2d", "#5f9b92"] },
  { id: "sky_blue", label: "Sky Blue", swatches: ["#dff4ff", "#5aa9e6", "#1e5f8f"] },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];

function PaletteDots({ swatches }: { swatches: readonly string[] }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
      {swatches.map((color) => (
        <span
          key={color}
          style={{
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            backgroundColor: color,
            border: "1px solid rgba(255,255,255,0.18)",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.08)",
          }}
        />
      ))}
    </span>
  );
}

export function ThemeSwitcher({ current }: { current: ThemeId }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentTheme = THEMES.find((theme) => theme.id === current) ?? THEMES[0];

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function setTheme(id: ThemeId) {
    document.cookie = `theme=${id};path=/;max-age=31536000`;
    document.documentElement.setAttribute("data-theme", id);
    setIsOpen(false);
    startTransition(() => router.refresh());
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "10px",
          fontFamily: "'DM Mono', monospace",
          fontSize: "10px",
          fontWeight: 500,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          padding: "6px 10px",
          borderRadius: "999px",
          border: "1px solid rgba(255,255,255,0.12)",
          backgroundColor: "rgba(255,255,255,0.03)",
          color: "var(--nav-text)",
          cursor: "pointer",
          opacity: isPending ? 0.6 : 1,
        }}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <PaletteDots swatches={currentTheme.swatches} />
        <span>{currentTheme.label}</span>
        <span
          style={{
            color: "var(--nav-link)",
            transform: isOpen ? "rotate(180deg)" : "none",
            transition: "transform 0.15s ease",
          }}
        >
          ▾
        </span>
      </button>

      {isOpen && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            right: 0,
            minWidth: "220px",
            padding: "8px",
            borderRadius: "10px",
            border: "1px solid rgba(255,255,255,0.08)",
            backgroundColor: "color-mix(in srgb, var(--nav-bg) 92%, black)",
            boxShadow: "0 18px 40px rgba(0,0,0,0.32)",
            zIndex: 50,
          }}
        >
          {THEMES.map((theme) => {
            const isActive = theme.id === current;
            return (
              <button
                key={theme.id}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                onClick={() => setTheme(theme.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                  color: isActive ? "var(--nav-text)" : "var(--nav-link)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "10px",
                    letterSpacing: "0.10em",
                    textTransform: "uppercase",
                  }}
                >
                  {theme.label}
                </span>
                <PaletteDots swatches={theme.swatches} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
