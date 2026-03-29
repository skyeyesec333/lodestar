import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getProjectRequirements } from "@/lib/db/requirements";
import { computeReadiness } from "@/lib/scoring/index";
import { anthropic } from "@/lib/ai/client";
import { buildGapAnalysisPrompt } from "@/lib/ai/prompts";
import type { RequirementStatusValue } from "@/types/requirements";

const schema = z.object({ projectId: z.string().min(1) });

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return new Response("Bad request", { status: 400 });
  }

  const { projectId } = parsed.data;

  const projectRow = await db.project.findFirst({
    where: { id: projectId, ownerClerkId: userId },
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

  const reqResult = await getProjectRequirements(projectId);
  if (!reqResult.ok) {
    return new Response("Failed to load requirements", { status: 500 });
  }

  const rows = reqResult.value;
  const { scoreBps } = computeReadiness(
    rows.map((r) => ({ requirementId: r.requirementId, status: r.status as RequirementStatusValue }))
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
    model: "claude-sonnet-4-6",
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
