"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { getCentroid } from "@/lib/geo/country-centroids";
import { CLS_SOURCE_DATE, CLS_TIER_COLOR, CLS_TIER_LABEL, getClsTier } from "@/lib/exim/cls";

const Globe = dynamic(() => import("react-globe.gl"), { ssr: false }) as unknown as React.ComponentType<Record<string, unknown>>;

export type GlobeProject = {
  id: string;
  name: string;
  slug: string;
  stage: string;
  countryCode: string;
  readinessScore: number;
};

type Props = { projects: GlobeProject[] };

type PointData = {
  id: string;
  name: string;
  slug: string;
  stage: string;
  countryCode: string;
  readinessScore: number;
  lat: number;
  lng: number;
  clsTier: ReturnType<typeof getClsTier>;
  color: string;
  size: number;
};

function readinessColor(pct: number): string {
  if (pct >= 75) return "#1a6b6b";
  if (pct >= 50) return "#b07d2a";
  return "#c24a1e";
}

function formatStage(stage: string): string {
  return stage.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const DARK_THEMES = new Set(["navy", "forest", "slate", "obsidian", "midnight", "ember"]);

// three-globe ships textures at unpkg. Pinned version to avoid surprise updates.
const GLOBE_TEXTURE_LIGHT = "//unpkg.com/three-globe@2.45.2/example/img/earth-blue-marble.jpg";
const GLOBE_TEXTURE_DARK  = "//unpkg.com/three-globe@2.45.2/example/img/earth-night.jpg";
const GLOBE_BUMP          = "//unpkg.com/three-globe@2.45.2/example/img/earth-topology.png";

type ThemeStyling = {
  isDark: boolean;
  globeImageUrl: string;
  atmosphereColor: string;
  atmosphereAltitude: number;
};

function readTheme(): ThemeStyling {
  const themeName =
    typeof document !== "undefined"
      ? document.documentElement.dataset.theme ?? "parchment"
      : "parchment";
  const isDark = DARK_THEMES.has(themeName);
  return {
    isDark,
    globeImageUrl: isDark ? GLOBE_TEXTURE_DARK : GLOBE_TEXTURE_LIGHT,
    // Atmosphere reads from --teal at runtime below; picking hex here matches the
    // CSS var per-theme but keeps the globe canvas stable (canvas can't resolve CSS vars).
    atmosphereColor: isDark ? "#3a9e9e" : "#1a6b6b",
    atmosphereAltitude: isDark ? 0.2 : 0.18,
  };
}

export function PortfolioGlobe({ projects }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState<number>(800);
  const [ready, setReady] = useState(false);
  const [theme, setTheme] = useState<ThemeStyling>(() => readTheme());

  useEffect(() => {
    setReady(true);
    setTheme(readTheme());
    const el = containerRef.current;
    const ro = el
      ? new ResizeObserver((entries) => {
          const w = entries[0]?.contentRect.width ?? 800;
          setWidth(w);
        })
      : null;
    if (el && ro) ro.observe(el);

    const themeObs = new MutationObserver(() => setTheme(readTheme()));
    themeObs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      ro?.disconnect();
      themeObs.disconnect();
    };
  }, []);

  const points = useMemo<PointData[]>(() => {
    // Jitter multiple projects in the same country so pins don't stack
    const byCountry = new Map<string, number>();
    return projects
      .map((p) => {
        const centroid = getCentroid(p.countryCode);
        if (!centroid) return null;
        const n = byCountry.get(p.countryCode) ?? 0;
        byCountry.set(p.countryCode, n + 1);
        const jitterLat = (n % 3 - 1) * 0.6;
        const jitterLng = (Math.floor(n / 3) % 3 - 1) * 0.6;
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          stage: p.stage,
          countryCode: p.countryCode,
          readinessScore: p.readinessScore,
          lat: centroid[0] + jitterLat,
          lng: centroid[1] + jitterLng,
          clsTier: getClsTier(p.countryCode),
          color: readinessColor(p.readinessScore),
          size: 0.5 + Math.min(p.readinessScore, 100) / 150,
        } satisfies PointData;
      })
      .filter((x): x is PointData => x !== null);
  }, [projects]);

  const unmapped = projects.length - points.length;

  if (!ready) {
    return (
      <div
        ref={containerRef}
        style={{
          border: "1px solid var(--border)",
          borderRadius: "14px",
          backgroundColor: "var(--bg-card)",
          padding: "20px",
          height: "500px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--ink-muted)",
          fontFamily: "'DM Mono', monospace",
          fontSize: "10px",
          letterSpacing: "0.10em",
          textTransform: "uppercase",
        }}
      >
        Loading globe…
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        border: "1px solid var(--border)",
        borderRadius: "14px",
        backgroundColor: "var(--bg-card)",
        padding: "16px 20px 12px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: "12px",
          marginBottom: "8px",
          flexWrap: "wrap",
        }}
      >
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            fontWeight: 500,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--ink-muted)",
            margin: 0,
          }}
        >
          Portfolio map
        </p>
        <div style={{ display: "flex", gap: "14px", fontFamily: "'DM Mono', monospace", fontSize: "9px", color: "var(--ink-muted)", letterSpacing: "0.06em" }}>
          {(["eligible", "restricted", "off_cover"] as const).map((t) => (
            <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: CLS_TIER_COLOR[t] }} />
              {CLS_TIER_LABEL[t]}
            </span>
          ))}
        </div>
      </div>

      <div style={{ width: "100%", height: "460px" }}>
        <Globe
          width={width}
          height={460}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl={theme.globeImageUrl}
          bumpImageUrl={GLOBE_BUMP}
          showAtmosphere
          atmosphereColor={theme.atmosphereColor}
          atmosphereAltitude={theme.atmosphereAltitude}
          pointsData={points}
          pointLat="lat"
          pointLng="lng"
          pointColor="color"
          pointAltitude="size"
          pointRadius={0.3}
          pointLabel={(d: unknown) => {
            const p = d as PointData;
            return `
              <div style="font-family: 'Inter', sans-serif; font-size: 12px; background: #111; color: #f0ece3; padding: 8px 10px; border-radius: 4px; border: 1px solid #3a3a36; max-width: 220px;">
                <div style="font-weight: 600; margin-bottom: 4px;">${p.name}</div>
                <div style="font-family: 'DM Mono', monospace; font-size: 10px; color: #9a9990; letter-spacing: 0.06em;">
                  ${formatStage(p.stage)} · ${p.readinessScore.toFixed(0)}%
                </div>
                <div style="font-family: 'DM Mono', monospace; font-size: 10px; color: ${CLS_TIER_COLOR[p.clsTier]}; margin-top: 4px; letter-spacing: 0.06em;">
                  ${p.countryCode} · CLS ${CLS_TIER_LABEL[p.clsTier]}
                </div>
              </div>
            `;
          }}
          onPointClick={(d: unknown) => {
            const p = d as PointData;
            window.location.href = `/projects/${p.slug}`;
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          marginTop: "8px",
          fontFamily: "'DM Mono', monospace",
          fontSize: "9px",
          color: "var(--ink-muted)",
          letterSpacing: "0.06em",
        }}
      >
        <span>
          {points.length} project{points.length === 1 ? "" : "s"} mapped
          {unmapped > 0 ? ` · ${unmapped} unmapped (no centroid)` : ""}
        </span>
        <span>CLS {CLS_SOURCE_DATE} · starter list</span>
      </div>
    </div>
  );
}
