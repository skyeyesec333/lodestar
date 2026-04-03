import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { ProjectListQuery, ProjectListSort } from "@/types";
import { getProjectsByUser } from "@/lib/db/projects";
import { checkRateLimit } from "@/lib/rate-limit";

const exportSchema = z.object({
  q: z.string().optional().default(""),
  sector: z.string().optional().default("all"),
  readiness: z.string().optional().default("all"),
  sort: z.string().optional().default("created_desc"),
});

const EXPORT_MAX_REQUESTS = 10;
const EXPORT_WINDOW_MS = 60_000;

function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const str = String(value);

  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

function formatReadinessPercentage(score: number | null): string {
  if (score === null) {
    return "";
  }
  return `${(score / 100).toFixed(2)}%`;
}

function formatDate(date: Date | null): string {
  if (!date) return "";
  return date.toISOString().split("T")[0];
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed, resetMs } = await checkRateLimit(
    `${userId}:projects-export`,
    EXPORT_MAX_REQUESTS,
    EXPORT_WINDOW_MS
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait before retrying.", resetMs },
      { status: 429 }
    );
  }

  const parsed = exportSchema.safeParse({
    q: req.nextUrl.searchParams.get("q") ?? undefined,
    sector: req.nextUrl.searchParams.get("sector") ?? undefined,
    readiness: req.nextUrl.searchParams.get("readiness") ?? undefined,
    sort: req.nextUrl.searchParams.get("sort") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters." },
      { status: 400 }
    );
  }

  const query: ProjectListQuery = {
    q: parsed.data.q,
    sector: parsed.data.sector as ProjectListQuery["sector"],
    readiness: parsed.data.readiness as ProjectListQuery["readiness"],
    sort: parsed.data.sort as ProjectListSort,
  };

  const result = await getProjectsByUser(userId, query);
  if (!result.ok) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  const projects = result.value;

  const headers = [
    "Name",
    "Slug",
    "Stage",
    "Sector",
    "Country",
    "Readiness %",
    "LOI Target",
    "Created",
  ];

  const rows = projects.map((project) => [
    escapeCSVValue(project.name),
    escapeCSVValue(project.slug),
    escapeCSVValue(project.stage),
    escapeCSVValue(project.sector),
    escapeCSVValue(project.countryCode),
    formatReadinessPercentage(project.cachedReadinessScore),
    formatDate(project.targetLoiDate),
    formatDate(project.createdAt),
  ]);

  const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");

  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lodestar-projects-${dateStr}.csv"`,
    },
  });
}
