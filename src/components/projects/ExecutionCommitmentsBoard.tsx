import Link from "next/link";
import type { ActivityEventRow } from "@/lib/db/activity";
import type { ActionItemRow, MeetingRow } from "@/lib/db/meetings";

type ExecutionCommitmentsBoardProps = {
  projectSlug: string;
  meetings: MeetingRow[];
  activityEvents: ActivityEventRow[];
};

type CommitmentItem = {
  actionItem: ActionItemRow;
  meeting: MeetingRow;
  dueInDays: number | null;
};

function startOfDay(value: Date): Date {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function getDaysUntil(date: Date | null, referenceDate: Date): number | null {
  if (!date) return null;
  const due = startOfDay(new Date(date));
  const current = startOfDay(referenceDate);
  return Math.ceil((due.getTime() - current.getTime()) / 86_400_000);
}

function formatDate(date: Date | null): string {
  if (!date) return "No due date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function formatRelativeDays(days: number | null): string {
  if (days === null) return "Unscheduled";
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  return `Due in ${days}d`;
}

function formatMeetingWindow(date: Date | null): string {
  if (!date) return "No meetings yet";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function priorityWeight(priority: string): number {
  switch (priority) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "medium":
      return 2;
    default:
      return 1;
  }
}

function toneForItem(item: CommitmentItem): string {
  if (item.dueInDays !== null && item.dueInDays < 0) return "var(--accent)";
  if (item.actionItem.priority === "critical" || item.actionItem.priority === "high") return "var(--gold)";
  return "var(--teal)";
}

function buildCommitments(meetings: MeetingRow[], referenceDate: Date): CommitmentItem[] {
  return meetings
    .flatMap((meeting) =>
      meeting.actionItems
        .filter((actionItem) => actionItem.status === "open" || actionItem.status === "in_progress")
        .map((actionItem) => ({
          actionItem,
          meeting,
          dueInDays: getDaysUntil(actionItem.dueDate, referenceDate),
        }))
    )
    .sort((a, b) => {
      const aOverdue = a.dueInDays !== null && a.dueInDays < 0 ? 1 : 0;
      const bOverdue = b.dueInDays !== null && b.dueInDays < 0 ? 1 : 0;
      if (aOverdue !== bOverdue) return bOverdue - aOverdue;

      const aDue = a.dueInDays ?? Number.POSITIVE_INFINITY;
      const bDue = b.dueInDays ?? Number.POSITIVE_INFINITY;
      if (aDue !== bDue) return aDue - bDue;

      const priorityDelta = priorityWeight(b.actionItem.priority) - priorityWeight(a.actionItem.priority);
      if (priorityDelta !== 0) return priorityDelta;

      return b.meeting.meetingDate.getTime() - a.meeting.meetingDate.getTime();
    });
}

export function ExecutionCommitmentsBoard({
  projectSlug,
  meetings,
  activityEvents,
}: ExecutionCommitmentsBoardProps) {
  const referenceDate = new Date();
  const commitments = buildCommitments(meetings, referenceDate);
  const overdueCommitments = commitments.filter((item) => item.dueInDays !== null && item.dueInDays < 0);
  const dueSoonCommitments = commitments.filter(
    (item) => item.dueInDays !== null && item.dueInDays >= 0 && item.dueInDays <= 7
  );
  const unassignedCommitments = commitments.filter((item) => !item.actionItem.assignedTo);
  const recentMeetings = meetings.filter((meeting) => {
    const days = getDaysUntil(meeting.meetingDate, referenceDate);
    return days !== null && days >= -14;
  });
  const recentActivity = activityEvents.filter((event) => {
    const days = getDaysUntil(event.createdAt, referenceDate);
    return days !== null && days >= -7;
  });
  const lastMeeting = meetings[0] ?? null;
  const topCommitments = commitments.slice(0, 5);

  return (
    <section style={{ display: "grid", gap: "18px", marginBottom: "24px" }}>
      <div
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "20px 22px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
            marginBottom: "16px",
          }}
        >
          <div style={{ maxWidth: "760px" }}>
            <p className="eyebrow" style={{ marginBottom: "8px" }}>
              Commitments desk
            </p>
            <h3
              style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: "26px",
                fontWeight: 400,
                color: "var(--ink)",
                margin: "0 0 8px",
              }}
            >
              What execution owes next
            </h3>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "14px",
                color: "var(--ink-mid)",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              Turn meetings into accountable follow-through. This surface shows the commitments still open, which ones are slipping, and whether the operating pulse is still active.
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <Link
              href={`/projects/${projectSlug}#section-meetings`}
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                textDecoration: "none",
                color: "var(--bg-card)",
                backgroundColor: "var(--ink)",
                borderRadius: "999px",
                padding: "9px 14px",
              }}
            >
              Open meetings
            </Link>
            <Link
              href={`/projects/${projectSlug}#section-activity`}
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                textDecoration: "none",
                color: "var(--ink)",
                border: "1px solid var(--border)",
                borderRadius: "999px",
                padding: "9px 14px",
              }}
            >
              Review activity
            </Link>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          {[
            { label: "Open commitments", value: commitments.length, tone: "var(--ink)" },
            { label: "Overdue", value: overdueCommitments.length, tone: overdueCommitments.length > 0 ? "var(--accent)" : "var(--teal)" },
            { label: "Due this week", value: dueSoonCommitments.length, tone: dueSoonCommitments.length > 0 ? "var(--gold)" : "var(--teal)" },
            { label: "Unassigned", value: unassignedCommitments.length, tone: unassignedCommitments.length > 0 ? "var(--gold)" : "var(--teal)" },
            { label: "Meetings in 14d", value: recentMeetings.length, tone: "var(--ink)" },
            { label: "Activity in 7d", value: recentActivity.length, tone: recentActivity.length > 0 ? "var(--teal)" : "var(--ink-muted)" },
          ].map((card) => (
            <div
              key={card.label}
              style={{
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "14px 16px",
                backgroundColor: "color-mix(in srgb, var(--bg) 58%, var(--bg-card))",
              }}
            >
              <p
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "9px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--ink-muted)",
                  margin: "0 0 8px",
                }}
              >
                {card.label}
              </p>
              <p
                style={{
                  fontFamily: "'DM Serif Display', Georgia, serif",
                  fontSize: "30px",
                  lineHeight: 1,
                  color: card.tone,
                  margin: 0,
                }}
              >
                {card.value}
              </p>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.2fr) minmax(220px, 0.8fr)",
            gap: "18px",
          }}
        >
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "12px 14px",
                borderBottom: "1px solid var(--border)",
                backgroundColor: "color-mix(in srgb, var(--bg) 70%, var(--bg-card))",
                fontFamily: "'DM Mono', monospace",
                fontSize: "9px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--ink-muted)",
              }}
            >
              Next commitments to move
            </div>

            <div style={{ display: "grid" }}>
              {topCommitments.length > 0 ? (
                topCommitments.map((item, index) => (
                  <div
                    key={item.actionItem.id}
                    style={{
                      padding: "14px 16px",
                      borderTop: index === 0 ? "none" : "1px solid var(--border)",
                      display: "grid",
                      gap: "6px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "14px",
                          fontWeight: 600,
                          color: "var(--ink)",
                          lineHeight: 1.45,
                        }}
                      >
                        {item.actionItem.title}
                      </span>
                      <span
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "9px",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: toneForItem(item),
                          border: `1px solid ${toneForItem(item)}`,
                          borderRadius: "999px",
                          padding: "4px 8px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatRelativeDays(item.dueInDays)}
                      </span>
                    </div>

                    <div
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "10px",
                        color: "var(--ink-muted)",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {item.actionItem.assignedTo?.name ?? "Unassigned"} · {item.meeting.title} · {formatDate(item.actionItem.dueDate)}
                    </div>

                    {item.actionItem.requirementName ? (
                      <div
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "12px",
                          color: "var(--ink-mid)",
                        }}
                      >
                        Linked to {item.actionItem.requirementName}
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <div
                  style={{
                    padding: "18px 16px",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "13px",
                    color: "var(--ink-mid)",
                  }}
                >
                  No open meeting commitments yet.
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gap: "12px" }}>
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "14px 16px",
                backgroundColor: "var(--bg-card)",
              }}
            >
              <p className="eyebrow" style={{ marginBottom: "8px" }}>
                Recent motion
              </p>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "13px",
                  lineHeight: 1.6,
                  color: "var(--ink-mid)",
                  margin: 0,
                }}
              >
                {lastMeeting
                  ? `Last meeting logged ${formatMeetingWindow(lastMeeting.meetingDate)}. ${recentActivity.length > 0 ? `${recentActivity.length} activity events landed in the last 7 days.` : "No activity landed in the last 7 days."}`
                  : "No meetings have been logged yet, so execution does not have a commitment trail."}
              </p>
            </div>

            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "14px 16px",
                backgroundColor: "var(--bg-card)",
              }}
            >
              <p className="eyebrow" style={{ marginBottom: "8px" }}>
                Sponsor readout
              </p>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "13px",
                  lineHeight: 1.6,
                  color: "var(--ink-mid)",
                  margin: 0,
                }}
              >
                {overdueCommitments.length > 0
                  ? `${overdueCommitments.length} commitments are already slipping and should be discussed in the next sponsor review.`
                  : commitments.length > 0
                    ? "No commitments are overdue right now; focus on clearing the due-this-week queue."
                    : "There is no open commitment queue yet. Meetings should start producing accountable follow-through."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
