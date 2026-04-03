import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { UpcomingMilestone } from "@/lib/db/milestones-upcoming";

interface UpcomingMilestonesWidgetProps {
  milestones: UpcomingMilestone[];
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDaysUntil(daysUntil: number): string {
  if (daysUntil < 0) {
    const absDays = Math.abs(daysUntil);
    return `${absDays} day${absDays === 1 ? "" : "s"} ago`;
  }
  if (daysUntil === 0) {
    return "Today";
  }
  return `In ${daysUntil} day${daysUntil === 1 ? "" : "s"}`;
}

function urgencyVariant(
  urgency: UpcomingMilestone["urgency"]
): "default" | "secondary" | "destructive" | "outline" {
  switch (urgency) {
    case "overdue":
      return "destructive";
    case "critical":
      return "destructive";
    case "warning":
      return "secondary";
    case "normal":
      return "outline";
  }
}

function urgencyLabel(urgency: UpcomingMilestone["urgency"]): string {
  switch (urgency) {
    case "overdue":
      return "Overdue";
    case "critical":
      return "Due soon";
    case "warning":
      return "This week";
    case "normal":
      return "Upcoming";
  }
}

export function UpcomingMilestonesWidget({
  milestones,
}: UpcomingMilestonesWidgetProps) {
  if (milestones.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "11px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ink-muted)",
              fontWeight: 500,
            }}
          >
            Upcoming Milestones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "13px",
              color: "var(--ink-muted)",
            }}
          >
            No milestones due in the next 30 days
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "11px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ink-muted)",
            fontWeight: 500,
          }}
        >
          Upcoming Milestones
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Milestone</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {milestones.map((milestone) => (
              <TableRow key={milestone.id}>
                <TableCell>
                  <Link
                    href={`/projects/${milestone.projectSlug}`}
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "12px",
                      color: "var(--accent)",
                      textDecoration: "none",
                      fontWeight: 500,
                    }}
                  >
                    {milestone.projectName}
                  </Link>
                </TableCell>
                <TableCell>
                  <span
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "12px",
                      color: "var(--ink-muted)",
                    }}
                  >
                    {milestone.name}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "12px",
                      color: "var(--ink-muted)",
                    }}
                  >
                    {formatDate(milestone.targetDate)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant={urgencyVariant(milestone.urgency)}>
                      {urgencyLabel(milestone.urgency)}
                    </Badge>
                    <span
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "11px",
                        color: "var(--ink-muted)",
                      }}
                    >
                      {formatDaysUntil(milestone.daysUntil)}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
