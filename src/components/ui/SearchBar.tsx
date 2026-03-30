"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type SearchProject = {
  id: string;
  name: string;
  slug: string;
  stage: string;
};

type SearchStakeholder = {
  id: string;
  name: string;
  title: string | null;
  organizationName: string | null;
  projectSlug: string | null;
};

type SearchResponse = {
  projects: SearchProject[];
  stakeholders: SearchStakeholder[];
};

type SearchEntry =
  | { kind: "header"; key: string; label: string }
  | {
      kind: "project";
      key: string;
      label: string;
      href: string;
      stage: string;
    }
  | {
      kind: "stakeholder";
      key: string;
      label: string;
      href: string;
      subtitle: string;
    };

function formatStage(stage: string): string {
  return stage.replace(/_/g, " ");
}

function SearchGlyph({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      style={{
        width: "13px",
        height: "13px",
        color: active ? "var(--teal)" : "var(--ink-muted)",
      }}
    >
      <circle cx="7" cy="7" r="4.25" stroke="currentColor" strokeWidth="1.2" />
      <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function SearchBar() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse>({
    projects: [],
    stakeholders: [],
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);

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

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults({ projects: [], stakeholders: [] });
      setIsLoading(false);
      setErrorMessage(null);
      setActiveIndex(0);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          setErrorMessage("Search temporarily unavailable.");
          setResults({ projects: [], stakeholders: [] });
          setIsOpen(true);
          return;
        }

        const data = (await response.json()) as SearchResponse;
        setResults(data);
        setIsOpen(true);
        setActiveIndex(0);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setErrorMessage("Search temporarily unavailable.");
        setResults({ projects: [], stakeholders: [] });
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [query]);

  const entries = useMemo<SearchEntry[]>(() => {
    const nextEntries: SearchEntry[] = [];

    if (results.projects.length > 0) {
      nextEntries.push({ kind: "header", key: "projects-header", label: "Projects" });
      for (const project of results.projects) {
        nextEntries.push({
          kind: "project",
          key: `project-${project.id}`,
          label: project.name,
          href: `/projects/${project.slug}`,
          stage: project.stage,
        });
      }
    }

    if (results.stakeholders.length > 0) {
      nextEntries.push({ kind: "header", key: "stakeholders-header", label: "Stakeholders" });
      for (const stakeholder of results.stakeholders) {
        nextEntries.push({
          kind: "stakeholder",
          key: `stakeholder-${stakeholder.id}`,
          label: stakeholder.name,
          href: stakeholder.projectSlug
            ? `/projects/${stakeholder.projectSlug}#section-stakeholders`
            : "#",
          subtitle: stakeholder.title ?? stakeholder.organizationName ?? "Stakeholder",
        });
      }
    }

    return nextEntries;
  }, [results.projects, results.stakeholders]);

  const selectableEntries = entries.filter((entry) => entry.kind !== "header");
  const hasResults = selectableEntries.length > 0;
  const showDropdown = isOpen && query.trim().length >= 2 && (isLoading || hasResults || errorMessage);

  useEffect(() => {
    if (activeIndex >= selectableEntries.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, selectableEntries.length]);

  function openEntry(entry: SearchEntry | undefined) {
    if (!entry || entry.kind === "header") return;
    setIsOpen(false);
    setActiveIndex(0);
    router.push(entry.href);
  }

  function moveActive(delta: number) {
    if (selectableEntries.length === 0) return;
    setIsOpen(true);
    setActiveIndex((current) => {
      const next = (current + delta + selectableEntries.length) % selectableEntries.length;
      return next;
    });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActive(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(-1);
      return;
    }

    if (event.key === "Enter") {
      const activeEntry = selectableEntries[activeIndex];
      if (activeEntry) {
        event.preventDefault();
        openEntry(activeEntry);
      }
    }
  }

  return (
    <div ref={containerRef} style={{ position: "relative", width: "208px" }}>
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
        }}
      >
        <span
          style={{
            position: "absolute",
            left: "10px",
            display: "inline-flex",
            pointerEvents: "none",
          }}
        >
          <SearchGlyph active={isFocused || query.trim().length >= 2} />
        </span>

        <input
          type="search"
          value={query}
          onChange={(event) => {
            const nextValue = event.target.value;
            setQuery(nextValue);
            if (nextValue.trim().length >= 2) {
              setIsOpen(true);
            } else {
              setIsOpen(false);
            }
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setIsFocused(true);
            if (query.trim().length >= 2) {
              setIsOpen(true);
            }
          }}
          onBlur={() => setIsFocused(false)}
          placeholder="Search deals"
          style={{
            width: "100%",
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            letterSpacing: "0.06em",
            color: "var(--nav-text)",
            backgroundColor: "color-mix(in srgb, var(--bg) 86%, var(--bg-card))",
            border: `1px solid ${
              isFocused ? "color-mix(in srgb, var(--teal) 45%, var(--border))" : "var(--border)"
            }`,
            borderRadius: "999px",
            padding: "7px 28px 7px 30px",
            outline: "none",
            boxSizing: "border-box",
            transition: "border-color 140ms ease, background-color 140ms ease, box-shadow 140ms ease",
            boxShadow: isFocused ? "0 0 0 3px color-mix(in srgb, var(--teal) 10%, transparent)" : "none",
          }}
        />

        {(isLoading || query.trim().length >= 2) && (
          <span
            style={{
              position: "absolute",
              right: "10px",
              fontFamily: "'DM Mono', monospace",
              fontSize: "8px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: isLoading ? "var(--teal)" : "var(--ink-muted)",
              pointerEvents: "none",
            }}
          >
            {isLoading ? "..." : query.trim().length}
          </span>
        )}
      </div>

      {showDropdown ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            width: "min(320px, calc(100vw - 24px))",
            zIndex: 30,
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            boxShadow: "0 16px 40px rgba(0,0,0,0.12)",
            overflow: "hidden",
          }}
        >
          {isLoading ? (
            <div
              style={{
                padding: "10px 12px",
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink-muted)",
                backgroundColor: "color-mix(in srgb, var(--teal) 3%, var(--bg-card))",
              }}
            >
              Searching…
            </div>
          ) : errorMessage ? (
            <div
              style={{
                padding: "10px 12px",
                fontFamily: "'Inter', sans-serif",
                fontSize: "12px",
                color: "var(--accent)",
                lineHeight: 1.5,
              }}
            >
              {errorMessage}
            </div>
          ) : hasResults ? (
            <div style={{ display: "grid" }}>
              {entries.map((entry, index) =>
                entry.kind === "header" ? (
                  <div
                    key={entry.key}
                    style={{
                      padding: "7px 12px 5px",
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "9px",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "var(--ink-muted)",
                      borderTop: index > 0 ? "1px solid var(--border)" : "none",
                      backgroundColor: "color-mix(in srgb, var(--accent) 2%, var(--bg-card))",
                    }}
                  >
                    {entry.label}
                  </div>
                ) : (
                  <button
                    key={entry.key}
                    type="button"
                    onMouseEnter={() => {
                      const selectableIndex = selectableEntries.findIndex((item) => item.key === entry.key);
                      if (selectableIndex >= 0) {
                        setActiveIndex(selectableIndex);
                      }
                    }}
                    onClick={() => openEntry(entry)}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: "12px",
                      width: "100%",
                      padding: "8px 12px",
                      border: "none",
                      borderTop: "1px solid var(--border)",
                      backgroundColor:
                        selectableEntries[activeIndex]?.key === entry.key
                          ? "color-mix(in srgb, var(--teal) 8%, var(--bg-card))"
                          : "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ minWidth: 0, display: "grid", gap: "2px", flex: 1 }}>
                      <span
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "12px",
                          color: "var(--ink)",
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {entry.label}
                      </span>
                      {entry.kind === "stakeholder" ? (
                        <span
                          style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: "8px",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: "var(--ink-muted)",
                            minWidth: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {entry.subtitle}
                        </span>
                      ) : null}
                    </span>
                    {entry.kind === "project" ? (
                      <span
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "9px",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "var(--ink-muted)",
                          border: "1px solid var(--border)",
                          borderRadius: "999px",
                          padding: "2px 6px",
                          flexShrink: 0,
                        }}
                      >
                        {formatStage(entry.stage)}
                      </span>
                    ) : (
                      <span
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "8px",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color:
                            selectableEntries[activeIndex]?.key === entry.key
                              ? "var(--teal)"
                              : "var(--ink-muted)",
                          flexShrink: 0,
                          marginTop: "2px",
                        }}
                      >
                        Open
                      </span>
                    )}
                  </button>
                )
              )}
            </div>
          ) : (
            <div
              style={{
                padding: "10px 12px",
                fontFamily: "'Inter', sans-serif",
                fontSize: "12px",
                color: "var(--ink-muted)",
                lineHeight: 1.5,
              }}
            >
              No matches found.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
