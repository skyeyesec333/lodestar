"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type SearchProject = { id: string; name: string; slug: string; stage: string };
type SearchStakeholder = {
  id: string;
  name: string;
  title: string | null;
  organizationName: string | null;
  projectSlug: string | null;
};
type SearchRequirement = {
  id: string;
  name: string;
  projectName: string;
  projectSlug: string;
  status: string;
};
type SearchDocument = {
  id: string;
  filename: string;
  projectName: string;
  projectSlug: string;
};
type SearchFunder = {
  id: string;
  organizationName: string;
  projectName: string;
  projectSlug: string;
  engagementStage: string;
};
type SearchResponse = {
  projects: SearchProject[];
  stakeholders: SearchStakeholder[];
  requirements?: SearchRequirement[];
  documents?: SearchDocument[];
  funders?: SearchFunder[];
};

type QuickAction = {
  id: string;
  label: string;
  href: string;
  keywords: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  { id: "go-projects", label: "Go to Projects", href: "/projects", keywords: "deals pipeline list" },
  { id: "go-portfolio", label: "Go to Portfolio", href: "/portfolio", keywords: "dashboard overview" },
  { id: "go-experts", label: "Go to Experts", href: "/experts", keywords: "advisors people" },
  { id: "go-templates", label: "Go to Templates", href: "/templates", keywords: "checklist boilerplate" },
];

function formatStage(stage: string): string {
  return stage.replace(/_/g, " ");
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse>({ projects: [], stakeholders: [] });
  const [loading, setLoading] = useState(false);
  const fetchSeqRef = useRef(0);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isCmdK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (isCmdK) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    function onCustomOpen() {
      setOpen(true);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("lodestar:open-command-palette", onCustomOpen);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("lodestar:open-command-palette", onCustomOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults({ projects: [], stakeholders: [] });
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults({ projects: [], stakeholders: [] });
      setLoading(false);
      return;
    }
    const seq = ++fetchSeqRef.current;
    const controller = new AbortController();
    setLoading(true);
    const timeout = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          if (seq === fetchSeqRef.current) setResults({ projects: [], stakeholders: [] });
          return;
        }
        const data = (await res.json()) as SearchResponse;
        if (seq === fetchSeqRef.current) setResults(data);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (seq === fetchSeqRef.current) setResults({ projects: [], stakeholders: [] });
      } finally {
        if (seq === fetchSeqRef.current) setLoading(false);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query]);

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  if (!open) return null;

  return (
    <div
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        backgroundColor: "color-mix(in srgb, var(--bg-dark) 40%, transparent)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh",
      }}
    >
      <Command
        label="Command Palette"
        shouldFilter={false}
        style={{
          width: "min(560px, calc(100vw - 32px))",
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
          overflow: "hidden",
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
          }
        }}
      >
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="Search projects, requirements, documents…"
          style={{
            width: "100%",
            fontFamily: "'Inter', sans-serif",
            fontSize: "14px",
            color: "var(--ink)",
            backgroundColor: "transparent",
            border: "none",
            borderBottom: "1px solid var(--border)",
            outline: "none",
            padding: "14px 18px",
            boxSizing: "border-box",
          }}
        />
        <Command.List
          style={{
            maxHeight: "min(420px, 60vh)",
            overflowY: "auto",
            padding: "6px 0",
          }}
        >
          <Command.Empty
            style={{
              padding: "14px 18px",
              fontFamily: "'Inter', sans-serif",
              fontSize: "12px",
              color: "var(--ink-muted)",
            }}
          >
            {loading ? "Searching…" : query.trim().length < 2 ? "Type to search." : "No matches."}
          </Command.Empty>

          {query.trim().length < 2 && (
            <Command.Group heading="Navigation" className="ls-cmdk-group">
              {QUICK_ACTIONS.map((action) => (
                <Command.Item
                  key={action.id}
                  value={`${action.label} ${action.keywords}`}
                  onSelect={() => navigate(action.href)}
                  className="ls-cmdk-item"
                >
                  <span className="ls-cmdk-label">{action.label}</span>
                  <span className="ls-cmdk-kind">Go</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {results.projects.length > 0 && (
            <Command.Group heading="Projects" className="ls-cmdk-group">
              {results.projects.map((project) => (
                <Command.Item
                  key={`project-${project.id}`}
                  value={`project ${project.name} ${project.slug}`}
                  onSelect={() => navigate(`/projects/${project.slug}`)}
                  className="ls-cmdk-item"
                >
                  <span className="ls-cmdk-label">{project.name}</span>
                  <span className="ls-cmdk-kind">{formatStage(project.stage)}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {results.requirements && results.requirements.length > 0 && (
            <Command.Group heading="Requirements" className="ls-cmdk-group">
              {results.requirements.map((req) => (
                <Command.Item
                  key={`req-${req.id}`}
                  value={`requirement ${req.name} ${req.projectName}`}
                  onSelect={() => navigate(`/projects/${req.projectSlug}/workplan`)}
                  className="ls-cmdk-item"
                >
                  <span className="ls-cmdk-label">{req.name}</span>
                  <span className="ls-cmdk-sub">{req.projectName}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {results.stakeholders.length > 0 && (
            <Command.Group heading="Stakeholders" className="ls-cmdk-group">
              {results.stakeholders.map((s) => (
                <Command.Item
                  key={`sh-${s.id}`}
                  value={`stakeholder ${s.name} ${s.organizationName ?? ""}`}
                  onSelect={() =>
                    navigate(
                      s.projectSlug
                        ? `/projects/${s.projectSlug}/parties`
                        : "/projects",
                    )
                  }
                  className="ls-cmdk-item"
                >
                  <span className="ls-cmdk-label">{s.name}</span>
                  <span className="ls-cmdk-sub">
                    {s.title ?? s.organizationName ?? "Stakeholder"}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {results.documents && results.documents.length > 0 && (
            <Command.Group heading="Documents" className="ls-cmdk-group">
              {results.documents.map((doc) => (
                <Command.Item
                  key={`doc-${doc.id}`}
                  value={`document ${doc.filename} ${doc.projectName}`}
                  onSelect={() => navigate(`/projects/${doc.projectSlug}/evidence`)}
                  className="ls-cmdk-item"
                >
                  <span className="ls-cmdk-label">{doc.filename}</span>
                  <span className="ls-cmdk-sub">{doc.projectName}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {results.funders && results.funders.length > 0 && (
            <Command.Group heading="Funders" className="ls-cmdk-group">
              {results.funders.map((f) => (
                <Command.Item
                  key={`funder-${f.id}`}
                  value={`funder ${f.organizationName} ${f.projectName}`}
                  onSelect={() => navigate(`/projects/${f.projectSlug}/capital`)}
                  className="ls-cmdk-item"
                >
                  <span className="ls-cmdk-label">{f.organizationName}</span>
                  <span className="ls-cmdk-sub">
                    {f.projectName} · {formatStage(f.engagementStage)}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>

        <div
          style={{
            borderTop: "1px solid var(--border)",
            padding: "8px 14px",
            display: "flex",
            gap: "16px",
            fontFamily: "'DM Mono', monospace",
            fontSize: "9px",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "var(--ink-muted)",
            backgroundColor: "color-mix(in srgb, var(--teal) 3%, var(--bg-card))",
          }}
        >
          <span>↑↓ Navigate</span>
          <span>↵ Open</span>
          <span>Esc Close</span>
        </div>
      </Command>
    </div>
  );
}
