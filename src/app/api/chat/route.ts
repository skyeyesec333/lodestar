import { auth } from "@clerk/nextjs/server";
import {
  buildChatCitations,
  buildFallbackChatAnswer,
  searchKnowledgeBase,
  searchOfficialEximSources,
} from "@/lib/ai/chat";
import { getPortfolioChatContext, getProjectChatContext } from "@/lib/db/chat";
import { chatRequestSchema } from "@/types/chat";
import { checkRateLimit } from "@/lib/rate-limit";

const CHAT_MAX_REQUESTS = 20;
const CHAT_WINDOW_MS = 60_000;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { allowed, resetMs } = checkRateLimit(`${userId}:chat`, CHAT_MAX_REQUESTS, CHAT_WINDOW_MS);
  if (!allowed) {
    return Response.json({ error: "Rate limit exceeded. Please wait before retrying.", resetMs }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response("Bad request", { status: 400 });
  }

  const request = parsed.data;
  const [staticAppContext, officialContext, runtimeContextResult] = await Promise.all([
    searchKnowledgeBase(request),
    searchOfficialEximSources(request),
    request.context?.projectId
      ? getProjectChatContext(request.context.projectId, userId)
      : request.context?.page === "projects_list"
      ? getPortfolioChatContext(userId)
      : Promise.resolve({ ok: true as const, value: [] as const }),
  ]);

  if (!runtimeContextResult.ok) {
    return new Response("Failed to load chat context", { status: 500 });
  }

  const retrieval = {
    appContext: [...runtimeContextResult.value, ...staticAppContext],
    officialContext,
  };
  const citations = buildChatCitations(retrieval);

  const streamFallback = (answer: string) => {
    const readable = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        const sendEvent = (event: object) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        };
        sendEvent({ type: "text-delta", text: answer });
        if (citations.length > 0) {
          sendEvent({ type: "sources", citations });
        }
        sendEvent({ type: "done" });
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  };

  return streamFallback(buildFallbackChatAnswer(request, retrieval));
}
