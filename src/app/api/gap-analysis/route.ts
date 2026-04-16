import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getProjectAccessById } from "@/lib/db/project-access";
import { getProjectRequirements } from "@/lib/db/requirements";
import { computeReadiness, mapRequirementStatuses } from "@/lib/scoring/index";
import { anthropic } from "@/lib/ai/client";
import { buildGapAnalysisPrompt } from "@/lib/ai/prompts";
import { checkRateLimit } from "@/lib/rate-limit";
import { requestLogger } from "@/lib/logger";

const schema = z.object({ projectId: z.string().min(1) });

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
const GAP_MAX_REQUESTS = 5;
const GAP_WINDOW_MS = 60_000;

export async function POST(req: Request) {
  const { userId } = await auth();
  const log = requestLogger({ userId, route: "/api/gap-analysis" });

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return new Response("Bad request", { status: 400 });
  }

  const { projectId } = parsed.data;

  // Verify the caller has at least viewer access (owners, editors, and viewers may run gap analysis)
  const projectAccess = await getProjectAccessById(projectId, userId);
  if (!projectAccess) {
    return new Response("Not found", { status: 404 });
  }

  const projectRow = await db.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      slug: true,
      stage: true,
      countryCode: true,
      sector: true,
      capexUsdCents: true,
      dealType: true,
      eximCoverType: true,
      targetLoiDate: true,
      description: true,
    },
  });

  if (!projectRow) {
    return new Response("Not found", { status: 404 });
  }

  const { allowed, resetMs } = await checkRateLimit(`${userId}:gap-analysis:${projectId}`, GAP_MAX_REQUESTS, GAP_WINDOW_MS);
  if (!allowed) {
    return Response.json({ error: "Rate limit exceeded. Please wait before retrying.", resetMs }, { status: 429 });
  }

  const reqResult = await getProjectRequirements(projectId, projectRow.dealType, projectRow.sector);
  if (!reqResult.ok) {
    return new Response("Failed to load requirements", { status: 500 });
  }

  const rows = reqResult.value;
  const { scoreBps } = computeReadiness(
    mapRequirementStatuses(rows),
    projectRow.dealType
  );

  const serializableProject = {
    id: projectRow.id,
    name: projectRow.name,
    slug: projectRow.slug,
    description: projectRow.description,
    countryCode: projectRow.countryCode,
    sector: projectRow.sector,
    dealType: projectRow.dealType,
    capexUsdCents: projectRow.capexUsdCents != null ? Number(projectRow.capexUsdCents) : null,
    eximCoverType: projectRow.eximCoverType,
    stage: projectRow.stage,
    targetLoiDate: projectRow.targetLoiDate ? projectRow.targetLoiDate.toISOString() : null,
  };

  const prompt = buildGapAnalysisPrompt(serializableProject, rows, scoreBps);

  const stream = await anthropic.messages.stream({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
