import { auth } from "@clerk/nextjs/server";
import { getProjectBySlug } from "@/lib/db/projects";
import { computeReadinessTrendline } from "@/lib/scoring/trendline";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(
  _req: Request,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const rateLimit = await checkRateLimit(`trendline:${userId}`, 30, 60_000);
  if (!rateLimit.allowed) {
    return new Response("Too many requests", {
      status: 429,
      headers: { "Retry-After": String(Math.ceil(rateLimit.resetMs / 1000)) },
    });
  }

  const { slug } = await context.params;
  const projectResult = await getProjectBySlug(slug, userId);

  if (!projectResult.ok) {
    const status = projectResult.error.code === "NOT_FOUND" ? 404 : 500;
    return new Response(
      projectResult.error.code === "NOT_FOUND" ? "Not found" : "Failed to load project",
      { status }
    );
  }

  const project = projectResult.value;
  const trendlineResult = await computeReadinessTrendline(
    project.id,
    project.cachedReadinessScore ?? 0,
    project.dealType
  );

  if (!trendlineResult.ok) {
    return new Response(trendlineResult.error.message, { status: 500 });
  }

  return new Response(JSON.stringify(trendlineResult.value), {
    headers: { "Content-Type": "application/json" },
  });
}
