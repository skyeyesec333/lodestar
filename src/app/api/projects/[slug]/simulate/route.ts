import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { getProjectBySlug } from "@/lib/db/projects";
import { getProjectRequirements } from "@/lib/db/requirements";
import { computeReadiness } from "@/lib/scoring/index";
import { simulateRequirementChanges } from "@/lib/scoring/simulator";
import { checkRateLimit } from "@/lib/rate-limit";
import type { RequirementStatusValue } from "@/types/requirements";

const requirementChangeSchema = z.object({
  requirementId: z.string().min(1),
  newStatus: z.enum([
    "not_started",
    "in_progress",
    "draft",
    "substantially_final",
    "executed",
    "waived",
    "not_applicable",
  ] as const satisfies readonly RequirementStatusValue[]),
});

const simulateBodySchema = z.object({
  changes: z.array(requirementChangeSchema).min(1).max(50),
});

export async function POST(
  req: Request,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const rateLimit = await checkRateLimit(`simulate:${userId}`, 30, 60_000);
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const parsed = simulateBodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const reqResult = await getProjectRequirements(project.id, project.dealType, project.sector);
  if (!reqResult.ok) {
    return new Response("Failed to load requirements", { status: 500 });
  }
  const rows = reqResult.value;

  const currentScore = computeReadiness(
    rows.map((r) => ({
      requirementId: r.requirementId,
      status: r.isApplicable === false
        ? ("not_applicable" as RequirementStatusValue)
        : r.status,
    })),
    project.dealType
  );

  const result = simulateRequirementChanges(
    rows,
    parsed.data.changes,
    currentScore.scoreBps,
    project.dealType
  );

  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
}
