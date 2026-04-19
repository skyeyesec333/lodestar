import { useEffect, useState } from "react";

export type ChartTheme = {
  text: string;
  textMuted: string;
  bgCard: string;
  border: string;
  gridStroke: string;
  teal: string;
  gold: string;
  accent: string;
  fontFamily: string;
  fontMono: string;
  fontSizeTick: number;
  fontSizeLabel: number;
};

const FALLBACK: ChartTheme = {
  text: "#1c1c1a",
  textMuted: "#6a6a62",
  bgCard: "#ffffff",
  border: "#d9d4c8",
  gridStroke: "rgba(0,0,0,0.08)",
  teal: "#1a6b6b",
  gold: "#b07d2a",
  accent: "#c24a1e",
  fontFamily: "Inter, system-ui, sans-serif",
  fontMono: "'DM Mono', ui-monospace, monospace",
  fontSizeTick: 9,
  fontSizeLabel: 11,
};

export function getChartTheme(): ChartTheme {
  if (typeof window === "undefined") return FALLBACK;
  const root = document.documentElement;
  const read = (name: string, fallback: string) => {
    const v = getComputedStyle(root).getPropertyValue(name).trim();
    return v || fallback;
  };
  return {
    text: read("--ink", FALLBACK.text),
    textMuted: read("--ink-muted", FALLBACK.textMuted),
    bgCard: read("--bg-card", FALLBACK.bgCard),
    border: read("--border", FALLBACK.border),
    gridStroke: read("--border", FALLBACK.gridStroke),
    teal: read("--teal", FALLBACK.teal),
    gold: read("--gold", FALLBACK.gold),
    accent: read("--accent", FALLBACK.accent),
    fontFamily: FALLBACK.fontFamily,
    fontMono: FALLBACK.fontMono,
    fontSizeTick: FALLBACK.fontSizeTick,
    fontSizeLabel: FALLBACK.fontSizeLabel,
  };
}

export function getNivoTheme(theme: ChartTheme) {
  return {
    background: "transparent",
    text: {
      fontSize: theme.fontSizeTick,
      fontFamily: theme.fontMono,
      fill: theme.textMuted,
    },
    axis: {
      ticks: {
        text: {
          fontSize: theme.fontSizeTick,
          fontFamily: theme.fontMono,
          fill: theme.textMuted,
        },
        line: { stroke: theme.border },
      },
      legend: {
        text: {
          fontSize: theme.fontSizeLabel,
          fontFamily: theme.fontMono,
          fill: theme.textMuted,
        },
      },
    },
    grid: { line: { stroke: theme.border, strokeDasharray: "3 4" } },
    tooltip: {
      container: {
        background: theme.bgCard,
        color: theme.text,
        border: `1px solid ${theme.border}`,
        borderRadius: 4,
        fontSize: theme.fontSizeLabel,
        fontFamily: theme.fontFamily,
        padding: "6px 10px",
      },
    },
    labels: {
      text: {
        fontFamily: theme.fontMono,
        fontSize: theme.fontSizeTick,
        fill: theme.textMuted,
      },
    },
    legends: {
      text: {
        fontFamily: theme.fontMono,
        fontSize: theme.fontSizeTick,
        fill: theme.textMuted,
      },
    },
  };
}

export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState<ChartTheme>(FALLBACK);
  useEffect(() => {
    setTheme(getChartTheme());
    const root = document.documentElement;
    const observer = new MutationObserver(() => setTheme(getChartTheme()));
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  return theme;
}
