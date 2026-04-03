import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { getProjectBySlug } from "@/lib/db/projects";
import { getStatusReportData } from "@/lib/db/status-report";
import { generateStatusReport } from "@/lib/ai/status-report";
import { checkRateLimit } from "@/lib/rate-limit";

const STATUS_REPORT_MAX_REQUESTS = 3;
const STATUS_REPORT_WINDOW_MS = 60_000;

const slugSchema = z.string().min(1).max(120).regex(/^[a-z0-9-]+$/);

export async function GET(
  _req: Request,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { slug } = await context.params;
  const slugParsed = slugSchema.safeParse(slug);
  if (!slugParsed.success) {
    return Response.json({ error: "Invalid project slug" }, { status: 400 });
  }

  const { allowed, resetMs } = await checkRateLimit(
    `${userId}:status-report`,
    STATUS_REPORT_MAX_REQUESTS,
    STATUS_REPORT_WINDOW_MS
  );
  if (!allowed) {
    return Response.json(
      { error: "Rate limit exceeded. Please wait before retrying.", resetMs },
      { status: 429 }
    );
  }

  const projectResult = await getProjectBySlug(slugParsed.data, userId);
  if (!projectResult.ok) {
    const status = projectResult.error.code === "NOT_FOUND" ? 404 : 500;
    return new Response(projectResult.error.message, { status });
  }

  const project = projectResult.value;

  const dataResult = await getStatusReportData(project.id, userId);
  if (!dataResult.ok) {
    return Response.json({ error: dataResult.error.message }, { status: 500 });
  }

  try {
    const report = await generateStatusReport(dataResult.value);
    return Response.json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate status report";
    return Response.json({ error: message }, { status: 500 });
  }
}
