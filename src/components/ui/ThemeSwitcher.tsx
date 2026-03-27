"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

const THEMES = [
  { id: "parchment", label: "Parchment" },
  { id: "minimal",   label: "Minimal"   },
  { id: "navy",      label: "Navy"      },
  { id: "forest",    label: "Forest"    },
  { id: "slate",     label: "Slate"     },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];

export function ThemeSwitcher({ current }: { current: ThemeId }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function setTheme(id: ThemeId) {
    document.cookie = `theme=${id};path=/;max-age=31536000`;
    document.documentElement.setAttribute("data-theme", id);
    startTransition(() => router.refresh());
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      {THEMES.map((t) => (
        <button
          key={t.id}
          onClick={() => setTheme(t.id)}
          title={t.label}
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            fontWeight: 500,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            padding: "4px 10px",
            borderRadius: "2px",
            border: current === t.id ? "1px solid var(--nav-link)" : "1px solid transparent",
            backgroundColor: "transparent",
            color: current === t.id ? "var(--nav-text)" : "var(--nav-link)",
            cursor: "pointer",
            opacity: isPending ? 0.5 : 1,
            transition: "color 0.15s, border-color 0.15s",
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
