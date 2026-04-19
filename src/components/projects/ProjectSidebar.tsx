"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  FolderOpen,
  GanttChart,
  Landmark,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  Network,
  Search,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  PROJECT_SECTIONS,
  buildSectionHref,
  type NavSection,
  type ProjectSectionKey,
} from "@/components/projects/projectSections";
import type { ProjectSidebarSignals } from "@/lib/db/projects";
import { getProgramConfig, getStageLabel } from "@/lib/requirements/index";
import type { DealType, ProjectPhase } from "@prisma/client";

const ICONS: Record<NavSection["icon"], LucideIcon> = {
  LayoutDashboard,
  Users,
  FileText,
  Lightbulb,
  Network,
  Landmark,
  ListChecks,
  FolderOpen,
  GanttChart,
};

type Props = {
  projectSlug: string;
  projectName: string;
  projectStage: ProjectPhase;
  projectDealType: DealType;
  readinessBps: number | null;
  signals: ProjectSidebarSignals;
};

function getShortcutHint(): string {
  if (typeof navigator === "undefined") return "⌘K";
  return /Mac|iPhone|iPod|iPad/i.test(navigator.platform) ? "⌘K" : "Ctrl K";
}

function openCommandPalette() {
  document.dispatchEvent(new CustomEvent("lodestar:open-command-palette"));
}

export function ProjectSidebar({
  projectSlug,
  projectName,
  projectStage,
  projectDealType,
  readinessBps,
  signals,
}: Props) {
  const pathname = usePathname() ?? "";
  const [scrollActiveKey, setScrollActiveKey] = useState<ProjectSectionKey | null>(null);
  const [shortcut, setShortcut] = useState("⌘K");

  useEffect(() => {
    setShortcut(getShortcutHint());
  }, []);

  const onMonolithRoute = pathname === `/projects/${projectSlug}`;

  const activeKey = useMemo<ProjectSectionKey>(() => {
    for (const s of PROJECT_SECTIONS) {
      if (s.routed && s.segment && pathname.startsWith(`/projects/${projectSlug}/${s.segment}`)) {
        return s.key;
      }
    }
    if (onMonolithRoute) return scrollActiveKey ?? "summary";
    return "summary";
  }, [pathname, projectSlug, scrollActiveKey, onMonolithRoute]);

  useEffect(() => {
    if (!onMonolithRoute) return;
    const elements = PROJECT_SECTIONS.map((s) => ({
      key: s.key,
      el: document.getElementById(s.anchor),
    })).filter((x): x is { key: ProjectSectionKey; el: HTMLElement } => x.el !== null);
    if (elements.length === 0) return;

    const onScroll = () => {
      let current: ProjectSectionKey = "summary";
      const threshold = 140;
      for (const { key, el } of elements) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= threshold) current = key;
      }
      setScrollActiveKey(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [onMonolithRoute, pathname]);

  const programConfig = getProgramConfig(projectDealType);
  const stageLabel = getStageLabel(projectStage, projectDealType);
  const readinessPct = readinessBps != null ? Math.round(readinessBps / 100) : null;

  return (
    <aside className="ls-project-sidebar" aria-label="Project navigation">
      {/* Header: back-link + project name + stage + readiness */}
      <div className="ls-project-sidebar-header">
        <Link
          href="/portfolio"
          className="ls-project-sidebar-back"
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "9px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--ink-muted)",
            textDecoration: "none",
          }}
        >
          ← Portfolio
        </Link>
        <h2
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: "16px",
            fontWeight: 400,
            color: "var(--ink)",
            margin: "6px 0 6px",
            letterSpacing: "-0.01em",
            lineHeight: 1.2,
          }}
        >
          {projectName}
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "8px",
              fontWeight: 500,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--ink-muted)",
              border: "1px solid var(--border)",
              borderRadius: "3px",
              padding: "2px 6px",
            }}
            title={programConfig.label}
          >
            {stageLabel}
          </span>
          {readinessPct !== null && (
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "8px",
                fontWeight: 500,
                letterSpacing: "0.10em",
                color: "var(--teal)",
                backgroundColor: "color-mix(in srgb, var(--teal) 12%, transparent)",
                border: "1px solid color-mix(in srgb, var(--teal) 30%, transparent)",
                borderRadius: "3px",
                padding: "2px 6px",
              }}
            >
              {readinessPct}% ready
            </span>
          )}
        </div>
      </div>

      {/* Search trigger — opens global CommandPalette */}
      <button
        type="button"
        onClick={openCommandPalette}
        className="ls-project-sidebar-search"
        aria-label="Open search"
      >
        <Search size={13} strokeWidth={1.6} style={{ color: "var(--ink-muted)" }} />
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "12px",
            color: "var(--ink-muted)",
            flex: 1,
            textAlign: "left",
          }}
        >
          Search
        </span>
        <span
          aria-hidden="true"
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "8px",
            letterSpacing: "0.06em",
            color: "var(--ink-muted)",
            border: "1px solid var(--border)",
            borderRadius: "3px",
            padding: "2px 5px",
          }}
        >
          {shortcut}
        </span>
      </button>

      {/* Flat 9-item nav */}
      <nav className="ls-project-sidebar-nav" aria-label="Project sections">
        {PROJECT_SECTIONS.map((section) => {
          const Icon = ICONS[section.icon];
          const isActive = section.key === activeKey;
          const badge = section.badgeSignal ? signals[section.badgeSignal] : 0;
          const showBadge = Boolean(section.badgeSignal && badge > 0);
          const href = buildSectionHref(section, projectSlug);
          return (
            <Link
              key={section.key}
              href={href}
              className="ls-project-sidebar-item"
              data-active={isActive ? "true" : undefined}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon size={14} strokeWidth={1.6} className="ls-project-sidebar-icon" />
              <span className="ls-project-sidebar-label">{section.label}</span>
              {showBadge && (
                <span
                  className="ls-project-sidebar-badge"
                  data-tone={section.badgeSignal === "workplanBlockers" ? "accent" : "gold"}
                >
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
