import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { assertProjectAccess } from "@/lib/db/project-access";
import { getMeetingByIdNoProject } from "@/lib/db/meetings";
import { extractActionItems } from "@/lib/ai/meeting-extraction";
import { getProjectById } from "@/lib/db/projects";

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

const bodySchema = z.object({
  transcript: z.string().min(1, "transcript is required"),
  projectId: z.string().min(1, "projectId is required"),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ meetingId: string }> }
): Promise<Response> {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { meetingId } = await params;

  const { allowed, resetMs } = await checkRateLimit(
    `${userId}:meeting-action-items`,
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_MS
  );
  if (!allowed) {
    return Response.json(
      { error: "Rate limit exceeded. Please wait before retrying.", resetMs },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid request body";
    return Response.json({ error: message }, { status: 400 });
  }

  const { transcript, projectId } = parsed.data;

  // Gate access
  const access = await assertProjectAccess(projectId, userId, "viewer");
  if (!access.ok) {
    return Response.json({ error: access.error.message }, { status: 403 });
  }

  // Verify meeting belongs to project
  const meetingResult = await getMeetingByIdNoProject(meetingId);
  if (!meetingResult.ok) {
    return Response.json({ error: "Meeting not found" }, { status: 404 });
  }
  if (meetingResult.value.projectId !== projectId) {
    return Response.json({ error: "Meeting does not belong to this project" }, { status: 404 });
  }

  // Build project context for better extraction
  const projectResult = await getProjectById(projectId, userId);
  const projectContext = projectResult.ok
    ? `Project: ${projectResult.value.name}, Sector: ${projectResult.value.sector}, Country: ${projectResult.value.countryCode}`
    : "EXIM project finance deal";

  try {
    const actionItems = await extractActionItems(transcript, projectContext);
    return Response.json({ actionItems });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extraction failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
