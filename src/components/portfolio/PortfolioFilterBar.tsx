"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type SavedView = {
  name: string;
  params: Record<string, string>;
};

const LS_KEY = "lodestar:portfolio:savedViews";

function loadSavedViews(): SavedView[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as SavedView[];
  } catch {
    // ignore
  }
  return [];
}

function persistViews(views: SavedView[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(views));
  } catch {
    // ignore
  }
}

type FilterConfig = {
  dealTypes: string[];
  stages: string[];
  sectors: string[];
};

const DEAL_TYPE_LABELS: Record<string, string> = {
  exim_project_finance: "EXIM",
  commercial_finance: "Commercial",
  development_finance: "DFI/IFC",
  private_equity: "PE",
  blended_finance: "Blended",
  other: "Other",
};

function formatStage(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatSector(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PortfolioFilterBar({ config }: { config: FilterConfig }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [showSave, setShowSave] = useState(false);
  const [viewName, setViewName] = useState("");

  useEffect(() => {
    setSavedViews(loadSavedViews());
  }, []);

  const currentDealType = searchParams.get("dealType") ?? "";
  const currentStage = searchParams.get("stage") ?? "";
  const currentSector = searchParams.get("sector") ?? "";
  const hasFilters = !!(currentDealType || currentStage || currentSector);

  const applyFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      router.push(`/portfolio?${params.toString()}`);
    },
    [router, searchParams],
  );

  function saveCurrentView() {
    if (!viewName.trim()) return;
    const params: Record<string, string> = {};
    if (currentDealType) params.dealType = currentDealType;
    if (currentStage) params.stage = currentStage;
    if (currentSector) params.sector = currentSector;
    const next = [...savedViews, { name: viewName.trim(), params }];
    persistViews(next);
    setSavedViews(next);
    setViewName("");
    setShowSave(false);
  }

  function loadView(view: SavedView) {
    const params = new URLSearchParams(view.params);
    router.push(`/portfolio?${params.toString()}`);
  }

  function deleteView(index: number) {
    const next = savedViews.filter((_, i) => i !== index);
    persistViews(next);
    setSavedViews(next);
  }

  const selectStyle: React.CSSProperties = {
    fontFamily: "'DM Mono', monospace",
    fontSize: "9px",
    fontWeight: 500,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--ink)",
    backgroundColor: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    padding: "6px 10px",
    cursor: "pointer",
    appearance: "none" as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='5' viewBox='0 0 8 5' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L4 4L7 1' stroke='%23999' stroke-width='1' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 8px center",
    paddingRight: "24px",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        {/* Deal type */}
        <select
          value={currentDealType}
          onChange={(e) => applyFilter("dealType", e.target.value)}
          style={selectStyle}
        >
          <option value="">All types</option>
          {config.dealTypes.map((dt) => (
            <option key={dt} value={dt}>{DEAL_TYPE_LABELS[dt] ?? dt}</option>
          ))}
        </select>

        {/* Stage */}
        {config.stages.length > 1 && (
          <select
            value={currentStage}
            onChange={(e) => applyFilter("stage", e.target.value)}
            style={selectStyle}
          >
            <option value="">All stages</option>
            {config.stages.map((s) => (
              <option key={s} value={s}>{formatStage(s)}</option>
            ))}
          </select>
        )}

        {/* Sector */}
        {config.sectors.length > 1 && (
          <select
            value={currentSector}
            onChange={(e) => applyFilter("sector", e.target.value)}
            style={selectStyle}
          >
            <option value="">All sectors</option>
            {config.sectors.map((s) => (
              <option key={s} value={s}>{formatSector(s)}</option>
            ))}
          </select>
        )}

        {hasFilters && (
          <>
            <button
              type="button"
              onClick={() => router.push("/portfolio")}
              style={{
                ...selectStyle,
                backgroundImage: "none",
                paddingRight: "10px",
                color: "var(--accent)",
                border: "1px solid color-mix(in srgb, var(--accent) 30%, var(--border))",
              }}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setShowSave(!showSave)}
              style={{
                ...selectStyle,
                backgroundImage: "none",
                paddingRight: "10px",
                color: "var(--teal)",
                border: "1px solid color-mix(in srgb, var(--teal) 30%, var(--border))",
              }}
            >
              {showSave ? "Cancel" : "Save view"}
            </button>
          </>
        )}

        {/* Saved views dropdown */}
        {savedViews.length > 0 && (
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginLeft: "4px" }}>
            {savedViews.map((view, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <button
                  type="button"
                  onClick={() => loadView(view)}
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "9px",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    padding: "4px 8px",
                    borderRadius: "999px",
                    border: "1px solid var(--border)",
                    backgroundColor: "transparent",
                    color: "var(--ink-muted)",
                    cursor: "pointer",
                  }}
                >
                  {view.name}
                </button>
                <button
                  type="button"
                  onClick={() => deleteView(i)}
                  aria-label={`Delete ${view.name}`}
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "10px",
                    color: "var(--ink-muted)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "0 2px",
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Save input row */}
      {showSave && (
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <input
            type="text"
            placeholder="View name..."
            value={viewName}
            onChange={(e) => setViewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") saveCurrentView(); }}
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.06em",
              padding: "6px 10px",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              backgroundColor: "var(--bg)",
              color: "var(--ink)",
              outline: "none",
              width: "160px",
            }}
          />
          <button
            type="button"
            onClick={saveCurrentView}
            disabled={!viewName.trim()}
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "6px 12px",
              borderRadius: "999px",
              border: "1px solid var(--teal)",
              backgroundColor: "var(--teal)",
              color: "#ffffff",
              cursor: viewName.trim() ? "pointer" : "not-allowed",
              opacity: viewName.trim() ? 1 : 0.5,
            }}
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}
