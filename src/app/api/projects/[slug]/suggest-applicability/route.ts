import { auth } from "@clerk/nextjs/server";
import { getProjectBySlug } from "@/lib/db/projects";
import { getProjectRequirements } from "@/lib/db/requirements";
import { getRequirementsForDealType } from "@/lib/requirements/index";
import {
  suggestRequirementApplicability,
  suggestRequirementApplicabilityHeuristic,
} from "@/lib/ai/applicability";
import type { ApplicabilitySuggestion } from "@/lib/ai/applicability";
import { checkRateLimit } from "@/lib/rate-limit";
import { requestLogger } from "@/lib/logger";

const SUGGEST_MAX_REQUESTS = 5;
const SUGGEST_WINDOW_MS = 60_000;

export async function POST(
  _req: Request,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { userId } = await auth();
  const log = requestLogger({ userId, route: "/api/projects/[slug]/suggest-applicability" });

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { slug } = await context.params;

  const { allowed, resetMs } = await checkRateLimit(
    `${userId}:suggest-applicability`,
    SUGGEST_MAX_REQUESTS,
    SUGGEST_WINDOW_MS
  );
  if (!allowed) {
    return Response.json(
      { error: "Rate limit exceeded. Please wait before retrying.", resetMs },
      { status: 429 }
    );
  }

  const projectResult = await getProjectBySlug(slug, userId);
  if (!projectResult.ok) {
    const status = projectResult.error.code === "NOT_FOUND" ? 404 : 500;
    return new Response(projectResult.error.message, { status });
  }

  const project = projectResult.value;

  const reqResult = await getProjectRequirements(project.id, project.dealType, project.sector);
  if (!reqResult.ok) {
    log.error({ error: reqResult.error }, "Failed to load requirements for applicability suggestion");
    return new Response("Failed to load requirements", { status: 500 });
  }

  const taxonomy = getRequirementsForDealType(project.dealType);
  const taxonomyById = new Map(taxonomy.map((t) => [t.id, t]));

  const requirementInputs = reqResult.value.map((r) => ({
    id: r.requirementId,
    label: r.name,
    category: r.category,
    applicableSectors: [...(taxonomyById.get(r.requirementId)?.applicableSectors ?? [])],
  }));

  const projectInput = {
    sector: project.sector,
    country: project.countryCode,
    dealType: project.dealType,
    description: project.description,
  };

  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
  const suggestions: ApplicabilitySuggestion[] = hasApiKey
    ? await suggestRequirementApplicability(projectInput, requirementInputs)
    : suggestRequirementApplicabilityHeuristic(projectInput, requirementInputs);

  return Response.json(suggestions);
}
