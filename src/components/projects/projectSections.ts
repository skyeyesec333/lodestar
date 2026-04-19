export type ProjectSectionKey =
  | "summary"
  | "team"
  | "overview"
  | "concept"
  | "parties"
  | "capital"
  | "workplan"
  | "evidence"
  | "execution";

export type ProjectSectionBadgeKey = "workplanBlockers" | "evidenceExpiringSoon";

export type NavSection = {
  /** Stable key used for active-state matching and URL segments. */
  key: ProjectSectionKey;
  /** Label shown in the sidebar. */
  label: string;
  /** URL segment appended to `/projects/[slug]`. Empty for the summary root. */
  segment: string;
  /** Anchor id on the current monolithic page. Used for pre-migration hash links. */
  anchor: string;
  /** Lucide icon name. */
  icon:
    | "LayoutDashboard"
    | "Users"
    | "FileText"
    | "Lightbulb"
    | "Network"
    | "Landmark"
    | "ListChecks"
    | "FolderOpen"
    | "GanttChart";
  /** Optional badge signal key to surface on this item. */
  badgeSignal?: ProjectSectionBadgeKey;
  /** True once the section has been migrated to its own route. */
  routed?: boolean;
};

export const PROJECT_SECTIONS: NavSection[] = [
  { key: "summary",   label: "Summary",   segment: "",          anchor: "section-executive-summary", icon: "LayoutDashboard" },
  { key: "team",      label: "Team",      segment: "team",      anchor: "section-collaborators",     icon: "Users",      routed: true },
  { key: "overview",  label: "Overview",  segment: "overview",  anchor: "section-overview",          icon: "FileText",   routed: true },
  { key: "concept",   label: "Concept",   segment: "concept",   anchor: "section-concept",           icon: "Lightbulb",  routed: true },
  { key: "parties",   label: "Parties",   segment: "parties",   anchor: "section-stakeholders",      icon: "Network",    routed: true },
  { key: "capital",   label: "Capital",   segment: "capital",   anchor: "section-capital",           icon: "Landmark",   routed: true },
  { key: "workplan",  label: "Workplan",  segment: "workplan",  anchor: "section-workplan",          icon: "ListChecks",     badgeSignal: "workplanBlockers",      routed: true },
  { key: "evidence",  label: "Evidence",  segment: "evidence",  anchor: "section-documents",         icon: "FolderOpen",     badgeSignal: "evidenceExpiringSoon", routed: true },
  { key: "execution", label: "Execution", segment: "execution", anchor: "section-execution",         icon: "GanttChart",     routed: true },
];

/**
 * Build the href for a section. Sections marked `routed: true` go to their own
 * subroute; un-migrated sections still point back to the monolithic page with a
 * hash anchor. As sections migrate, flip their `routed` flag in the PROJECT_SECTIONS
 * array above.
 */
export function buildSectionHref(section: NavSection, slug: string): string {
  if (!section.segment) return `/projects/${slug}`;
  if (section.routed) return `/projects/${slug}/${section.segment}`;
  return `/projects/${slug}#${section.anchor}`;
}
