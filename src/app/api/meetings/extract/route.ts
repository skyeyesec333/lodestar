import { auth } from "@clerk/nextjs/server";
import { EXIM_REQUIREMENTS } from "@/lib/exim/requirements";
import { extractMeetingInsights } from "@/lib/ai/meeting-extraction";

export async function POST(req: Request): Promise<Response> {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
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

  const { transcript, projectId } = body as Record<string, unknown>;

  if (typeof transcript !== "string" || transcript.trim().length === 0) {
    return Response.json({ error: "transcript is required" }, { status: 400 });
  }

  if (typeof projectId !== "string" || projectId.trim().length === 0) {
    return Response.json({ error: "projectId is required" }, { status: 400 });
  }

  const requirements = EXIM_REQUIREMENTS.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
  }));

  try {
    const result = await extractMeetingInsights(transcript, requirements);
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extraction failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
