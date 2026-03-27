import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getProjectRequirements } from "@/lib/db/requirements";
import { computeReadiness } from "@/lib/scoring/index";
import type { RequirementStatusValue } from "@/types/requirements";

const schema = z.object({ projectId: z.string().min(1) });

function buildMockAnalysis(
  projectName: string,
  scorePct: string,
  loiBlockerNames: string[],
  stage: string,
  topNotStarted: string[]
): string {
  const stageLabel = stage.replace(/_/g, " ");
  const blocker1 = loiBlockerNames[0] ?? "EPC Contract";
  const blocker2 = loiBlockerNames[1] ?? "Off-take Agreement";
  const blocker3 = loiBlockerNames[2] ?? "Financial Model";
  const notStarted1 = topNotStarted[0] ?? blocker1;
  const notStarted2 = topNotStarted[1] ?? blocker2;

  return `**Priority 1: Advance ${blocker1} to Draft**
This is your highest-leverage LOI-critical item currently at not-started status. EXIM requires this document in substantially final form before issuing a Letter of Interest — without it, no other progress unlocks the submission. Engage counsel this week to circulate a first draft term sheet, even if commercial terms are still open.

**Priority 2: Initiate ${blocker2} Negotiations**
The ${blocker2} is a gating condition for EXIM comprehensive cover and needs to be in substantially final form well before your LOI target. Begin negotiations with the off-taker now to establish the revenue covenant structure — EXIM will scrutinize tenor, indexation, and creditworthiness of the counterparty closely.

**Priority 3: Commission the Financial Model**
At ${scorePct}% readiness with stage at ${stageLabel}, EXIM will expect a project finance model showing debt service coverage ratios, IDC, and sensitivity tables at LOI. Engage a financial advisor to build or validate the base case model — this also anchors the CAPEX figure you'll need to lock in your application.

**Outlook**
${projectName} is in early-stage territory at ${scorePct}% readiness. The immediate priority is unblocking the ${loiBlockerNames.length > 0 ? loiBlockerNames.length : "several"} LOI-critical items that remain at not-started — without progress on these, the overall score will stay low regardless of activity elsewhere. Focus the next 30 days exclusively on ${notStarted1} and ${notStarted2} to generate visible score momentum.`;
}

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
    select: { id: true, name: true, stage: true },
  });

  if (!projectRow) {
    return new Response("Not found", { status: 404 });
  }

  const reqResult = await getProjectRequirements(projectId);
  if (!reqResult.ok) {
    return new Response("Failed to load requirements", { status: 500 });
  }

  const rows = reqResult.value;
  const { scoreBps, loiBlockers } = computeReadiness(
    rows.map((r) => ({ requirementId: r.requirementId, status: r.status as RequirementStatusValue }))
  );

  const scorePct = (scoreBps / 100).toFixed(1);
  const loiBlockerNames = loiBlockers
    .map((id) => rows.find((r) => r.requirementId === id)?.name ?? id)
    .slice(0, 4);

  const topNotStarted = rows
    .filter((r) => r.isLoiCritical && r.status === "not_started")
    .map((r) => r.name)
    .slice(0, 2);

  const fullText = buildMockAnalysis(
    projectRow.name,
    scorePct,
    loiBlockerNames,
    projectRow.stage,
    topNotStarted
  );

  // Stream the mock response word-by-word with a small delay to simulate real AI output
  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const words = fullText.split(/( |\n)/);
      for (const word of words) {
        controller.enqueue(encoder.encode(word));
        await new Promise((r) => setTimeout(r, 18));
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
