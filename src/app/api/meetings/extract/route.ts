import { auth } from "@clerk/nextjs/server";
import { getRequirementsForDealType } from "@/lib/requirements";
import { extractMeetingInsights } from "@/lib/ai/meeting-extraction";
import { checkRateLimit } from "@/lib/rate-limit";

const EXTRACT_MAX_REQUESTS = 10;
const EXTRACT_WINDOW_MS = 60_000;

export async function POST(req: Request): Promise<Response> {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed, resetMs } = await checkRateLimit(`${userId}:meetings-extract`, EXTRACT_MAX_REQUESTS, EXTRACT_WINDOW_MS);
  if (!allowed) {
    return Response.json({ error: "Rate limit exceeded. Please wait before retrying.", resetMs }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return Response.json({ error: "Request body must be an object" }, { status: 400 });
  }

  const { transcript, projectId, dealType } = body as Record<string, unknown>;

  if (typeof transcript !== "string" || transcript.trim().length === 0) {
    return Response.json({ error: "transcript is required" }, { status: 400 });
  }

  if (typeof projectId !== "string" || projectId.trim().length === 0) {
    return Response.json({ error: "projectId is required" }, { status: 400 });
  }

  const effectiveDealType = typeof dealType === "string" ? dealType : "exim_project_finance";
  const requirements = getRequirementsForDealType(effectiveDealType).map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
  }));

  try {
    const result = await extractMeetingInsights(transcript, requirements, effectiveDealType);
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extraction failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
