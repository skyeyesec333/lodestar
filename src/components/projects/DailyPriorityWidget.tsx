import type { CSSProperties } from "react";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DailyPriorityWidgetProject {
  id: string;
  name: string;
  slug: string;
  cachedReadinessScore: number | null;
  targetLoiDate: Date | null;
  stage: string;
}

type UrgencyLevel = "critical" | "warning" | "info";

type PriorityAction = {
  projectName: string;
  projectSlug: string;
  urgencyLevel: UrgencyLevel;
  headline: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
};

interface DailyPriorityWidgetProps {
  projects: Array<DailyPriorityWidgetProject>;
}

// ── Priority logic ────────────────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000;

function getDaysFromNow(date: Date): number {
  const nowMidnight = new Date();
  nowMidnight.setHours(0, 0, 0, 0);
  const dateMidnight = new Date(date);
  dateMidnight.setHours(0, 0, 0, 0);
  return Math.ceil((dateMidnight.getTime() - nowMidnight.getTime()) / MS_PER_DAY);
}

function formatReadinessPct(bps: number | null): string {
  if (bps == null) return "0";
  return (bps / 100).toFixed(0);
}

function computeActions(projects: Array<DailyPriorityWidgetProject>): PriorityAction[] {
  type ScoredEntry = { urgency: number; action: PriorityAction };

  const entries: ScoredEntry[] = [];

  for (const p of projects) {
    const score = p.cachedReadinessScore;
    const readinessPct = formatReadinessPct(score);

    // Good standing — skip entirely
    if (score !== null && score >= 7500) {
      continue;
    }

    if (p.targetLoiDate) {
      const days = getDaysFromNow(p.targetLoiDate);

      // 1. LOI overdue
      if (days < 0 && score !== null && score < 10000) {
        const daysOverdue = Math.abs(days);
        entries.push({
          urgency: 100 + daysOverdue,
          action: {
            projectName: p.name,
            projectSlug: p.slug,
            urgencyLevel: "critical",
            headline: `LOI target passed — ${p.name}`,
            body: `Your LOI target date has passed with ${readinessPct}% readiness. Review blockers immediately.`,
            ctaLabel: "View Blockers",
            ctaHref: `/projects/${p.slug}#section-readiness`,
          },
        });
        continue;
      }

      // 2. LOI < 30 days
      if (days >= 0 && days < 30 && score !== null && score < 7500) {
        entries.push({
          urgency: 90 + (30 - days),
          action: {
            projectName: p.name,
            projectSlug: p.slug,
            urgencyLevel: "critical",
            headline: `${p.name} LOI in ${days} day${days === 1 ? "" : "s"}`,
            body: `EXIM LOI-critical items are still pending. Focus on requirements now.`,
            ctaLabel: "View Requirements",
            ctaHref: `/projects/${p.slug}#section-requirements`,
          },
        });
        continue;
      }

      // 3. LOI < 90 days
      if (days >= 30 && days < 90 && score !== null && score < 5000) {
        entries.push({
          urgency: 70,
          action: {
            projectName: p.name,
            projectSlug: p.slug,
            urgencyLevel: "warning",
            headline: `${p.name} LOI in ${days} days`,
            body: `LOI is approaching with ${readinessPct}% readiness. Advance open requirements before the window closes.`,
            ctaLabel: "View Requirements",
            ctaHref: `/projects/${p.slug}#section-requirements`,
          },
        });
        continue;
      }
    }

    // 4. Stalled project
    if (score !== null && score < 2000 && p.stage !== "concept") {
      entries.push({
        urgency: 50,
        action: {
          projectName: p.name,
          projectSlug: p.slug,
          urgencyLevel: "warning",
          headline: `${p.name} readiness stalled at ${readinessPct}%`,
          body: `This deal hasn't advanced recently. Review open workplan items.`,
          ctaLabel: "View Workplan",
          ctaHref: `/projects/${p.slug}#section-requirements`,
        },
      });
      continue;
    }

    // 5. No LOI date set
    if (!p.targetLoiDate && score !== null && score > 3000) {
      entries.push({
        urgency: 30,
        action: {
          projectName: p.name,
          projectSlug: p.slug,
          urgencyLevel: "info",
          headline: `Set an LOI target for ${p.name}`,
          body: `You're at ${readinessPct}% readiness but have no LOI target date. Setting one activates countdown alerts.`,
          ctaLabel: "Set LOI Date",
          ctaHref: `/projects/${p.slug}#section-overview`,
        },
      });
    }
  }

  // Sort descending by urgency, take top 3
  entries.sort((a, b) => b.urgency - a.urgency);
  return entries.slice(0, 3).map((e) => e.action);
}

// ── Color helpers ─────────────────────────────────────────────────────────────

function getAccentBarColor(level: UrgencyLevel): string {
  switch (level) {
    case "critical":
      return "var(--accent)";
    case "warning":
      return "var(--gold)";
    case "info":
      return "var(--teal)";
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ActionCard({ action }: { action: PriorityAction }) {
  const accentColor = getAccentBarColor(action.urgencyLevel);

  const cardStyle: CSSProperties = {
    display: "flex",
    flexDirection: "row",
    backgroundColor: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderLeft: `3px solid ${accentColor}`,
    borderRadius: "3px",
    padding: "14px 16px",
    gap: "16px",
    alignItems: "flex-start",
  };

  const contentStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    flex: 1,
    minWidth: 0,
  };

  return (
    <div style={cardStyle}>
      <div style={contentStyle}>
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "9px",
            fontWeight: 500,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--ink-muted)",
          }}
        >
          {action.projectName}
        </span>
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "14px",
            fontWeight: 600,
            color: "var(--ink)",
            lineHeight: 1.3,
          }}
        >
          {action.headline}
        </span>
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "13px",
            color: "var(--ink-muted)",
            lineHeight: 1.4,
          }}
        >
          {action.body}
        </span>
        <Link
          href={action.ctaHref}
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            fontWeight: 500,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--teal)",
            textDecoration: "none",
            marginTop: "4px",
            display: "inline-block",
          }}
        >
          {action.ctaLabel} →
        </Link>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DailyPriorityWidget({ projects }: DailyPriorityWidgetProps) {
  if (projects.length === 0) return null;

  const actions = computeActions(projects);

  if (actions.length === 0) return null;

  const itemCount = actions.length;
  const headline = `${itemCount} item${itemCount === 1 ? "" : "s"} need your attention`;

  return (
    <section
      style={{
        marginBottom: "28px",
      }}
    >
      <p
        className="eyebrow"
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "9px",
          fontWeight: 500,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--ink-muted)",
          margin: "0 0 8px 0",
        }}
      >
        Today&#39;s Priorities
      </p>
      <h2
        style={{
          fontFamily: "'DM Serif Display', Georgia, serif",
          fontSize: "20px",
          fontWeight: 400,
          color: "var(--ink)",
          margin: "0 0 14px 0",
        }}
      >
        {headline}
      </h2>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {actions.map((action) => (
          <ActionCard key={`${action.projectSlug}-${action.urgencyLevel}`} action={action} />
        ))}
      </div>
    </section>
  );
}
