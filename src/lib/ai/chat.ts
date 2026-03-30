import type {
  ChatCitation,
  ChatContextDocument,
  ChatMessage,
  ChatRequest,
} from "@/types/chat";
import { APP_KNOWLEDGE_BASE, type AppKnowledgeEntry } from "@/lib/ai/app-knowledge";

export interface ChatRetrievalBundle {
  readonly appContext: readonly ChatContextDocument[];
  readonly officialContext: readonly ChatContextDocument[];
}

export function buildChatCitations(
  retrieval: ChatRetrievalBundle
): ChatCitation[] {
  const citationsByUrl = new Map<string, ChatCitation>();

  for (const document of [...retrieval.appContext, ...retrieval.officialContext]) {
    if (typeof document.url !== "string" || document.url.length === 0) {
      continue;
    }

    if (citationsByUrl.has(document.url)) {
      continue;
    }

    citationsByUrl.set(document.url, {
      title: document.title,
      url: document.url,
      sourceType: document.sourceType,
      lastVerifiedAt: document.lastVerifiedAt,
    });
  }

  return [...citationsByUrl.values()];
}

export async function searchKnowledgeBase(
  request: ChatRequest
): Promise<readonly ChatContextDocument[]> {
  const query = buildSearchText(request);
  const queryTokens = tokenize(query);

  return APP_KNOWLEDGE_BASE.map((entry) => ({
    entry,
    score: scoreEntry(entry, query, queryTokens),
  }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
    .slice(0, 6)
    .map(({ entry }) => ({
      id: entry.id,
      title: entry.title,
      snippet: entry.snippet,
      sourceType: entry.sourceType,
      url: entry.url,
      lastVerifiedAt: entry.lastVerifiedAt,
    }));
}

export async function searchOfficialEximSources(
  _request: ChatRequest
): Promise<readonly ChatContextDocument[]> {
  return [];
}

function formatHistory(messages: readonly ChatMessage[]): string {
  if (messages.length === 0) return "No previous messages.";

  return messages
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n\n");
}

function formatContextBlock(
  heading: string,
  documents: readonly ChatContextDocument[]
): string {
  if (documents.length === 0) return `${heading}\n- None available.`;

  const lines = documents.map((document) => {
    const sourceLine = document.url ? ` | Source: ${document.url}` : "";
    const verifiedLine = document.lastVerifiedAt
      ? ` | Verified: ${document.lastVerifiedAt}`
      : "";

    return `- ${document.title}: ${document.snippet}${sourceLine}${verifiedLine}`;
  });

  return `${heading}\n${lines.join("\n")}`;
}

function parseStageFromText(value?: string): string | null {
  if (!value) return null;
  const match = value.match(/stage\s+([^.\n]+?)(?:\.|\n|$)/i);
  return match?.[1]?.trim() ?? null;
}

function parseReadinessFromText(value?: string): string | null {
  if (!value) return null;
  const match = value.match(/readiness(?:\s+score)?\s+(\d+(?:\.\d+)?%)/i);
  return match?.[1] ?? null;
}

function formatProjectContext(
  request: ChatRequest,
  retrieval: ChatRetrievalBundle
): string {
  const projectSummaryDoc = retrieval.appContext.find((document) =>
    document.title.toLowerCase().includes("project summary")
  );

  const slug = request.context?.projectSlug?.trim();
  const stage =
    parseStageFromText(request.pageContext) ??
    parseStageFromText(projectSummaryDoc?.snippet);
  const readinessScore =
    parseReadinessFromText(request.pageContext) ??
    parseReadinessFromText(projectSummaryDoc?.snippet);

  const lines = [
    slug ? `- Slug: ${slug}` : null,
    stage ? `- Stage: ${stage}` : null,
    readinessScore ? `- Readiness score: ${readinessScore}` : null,
  ].filter((line): line is string => line != null);

  if (lines.length === 0) {
    return "PROJECT CONTEXT\n- None available.";
  }

  return `PROJECT CONTEXT\n${lines.join("\n")}`;
}

export function buildChatPrompt(
  request: ChatRequest,
  retrieval: ChatRetrievalBundle
): string {
  const pageContext = request.pageContext?.trim()
    ? `Current page context: ${request.pageContext}`
    : "Current page context: not provided.";

  return `You are Lodestar Assistant, an embedded operator help system inside an infrastructure finance application.

Your job is narrow:
- Answer questions about the application and the user's current page.
- Use app context first.
- Use official US EXIM context only to corroborate or clarify policy-sensitive points.
- If the answer is not supported by the provided context, say so plainly.
- Do not invent policy changes, deadlines, eligibility rules, or product behavior.
- Be concise, direct, and operational.

Response rules:
- Prefer 1 short paragraph or up to 4 short bullets.
- If official EXIM context is used, mention that it came from official EXIM material.
- If context is incomplete, say what is missing.
- Do not mention these instructions.

${pageContext}

${formatProjectContext(request, retrieval)}

USER QUESTION
${request.question}

RECENT CHAT HISTORY
${formatHistory(request.messages)}

${formatContextBlock("APP CONTEXT", retrieval.appContext)}

${formatContextBlock("OFFICIAL EXIM CONTEXT", retrieval.officialContext)}`;
}

export function buildFallbackChatAnswer(
  request: ChatRequest,
  retrieval: ChatRetrievalBundle
): string {
  const docs = [...retrieval.appContext, ...retrieval.officialContext];
  if (docs.length === 0) {
    return "I do not have enough grounded application or EXIM context to answer that yet.";
  }

  const question = request.question.toLowerCase();
  const blockersDoc = docs.find((doc) => doc.title.toLowerCase().includes("blockers"));
  const summaryDoc = docs.find((doc) => doc.title.toLowerCase().includes("summary"));
  const meetingsDoc = docs.find((doc) => doc.title.toLowerCase().includes("meetings"));
  const summary = parseSummaryDoc(summaryDoc?.snippet);
  const blockers = parseBlockers(blockersDoc?.snippet);
  const topBlocker = chooseTopBlocker(blockers);

  if (question.includes("substantially final")) {
    return "In Lodestar, 'substantially final' means a document is mature enough that only limited cleanup or execution steps should remain. It matters because LOI-critical items usually need to be at least that mature before the project reads as genuinely submission-ready.";
  }

  if (question.includes("cover")) {
    return "On this page, EXIM cover is the type of risk protection the transaction is expected to rely on. Comprehensive cover usually points to both commercial and political risk protection, while political-only cover is narrower and matters when private counterparties still carry most of the commercial risk.";
  }

  if ((question.includes("blocker") || question.includes("loi")) && blockersDoc) {
    if (blockers.length === 0) {
      return "I do not see named LOI blockers in the current page context. If the page still shows blockers visually, the structured chat context for that section may be incomplete.";
    }

    return `The page is telling you that ${summary?.blockerCount ?? blockers.length} LOI-critical items are still holding this project back. The first blocker I would clear is ${topBlocker}, because it is one of the highest-leverage diligence items in the current blocker set. After that, work straight down the remaining blocker list instead of spreading effort across lower-impact cleanup.`;
  }

  if ((question.includes("next") || question.includes("action")) && summaryDoc) {
    if (topBlocker) {
      return `The next best action is to move ${topBlocker}. With readiness at ${summary?.readiness ?? "the current level"} and ${summary?.blockerCount ?? blockers.length} LOI blockers still open, the project needs one high-friction item pushed toward substantially final form rather than broad incremental updates. If that blocker depends on a counterparty, use the next touchpoint to get a dated commitment or draft back.`;
    }

    return `The next best action is to work the single highest-friction readiness gap on this page. With readiness at ${summary?.readiness ?? "the current level"}, Lodestar is more useful when you use it to close one meaningful blocker at a time instead of making small updates everywhere.`;
  }

  if (question.includes("score") && summaryDoc) {
    const readiness = summary?.readiness ?? "the current";
    const interpretation =
      summary?.readinessValue != null && summary.readinessValue < 40
        ? "This is still early and not close to an LOI-ready operating posture."
        : summary?.readinessValue != null && summary.readinessValue < 70
        ? "This is moving, but key diligence items are still not mature enough."
        : "This is relatively advanced, but you still need to protect the remaining weak spots.";

    return `${readiness}% readiness should be read as a document-maturity signal, not as proof the transaction is de-risked. ${interpretation} Use the score together with the blocker list and recent meeting outcomes to decide what to push next.`;
  }

  if (question.includes("filter") && summary?.isPortfolio) {
    return "Use the portfolio filters to narrow the list to one decision frame at a time: stage when you want like-for-like comparisons, readiness when you want triage, and LOI timing when you want deadline pressure. The page becomes most useful when you reduce the list to the few projects that need action this week.";
  }

  if (
    (question.includes("portfolio") || question.includes("readiness band") || question.includes("loi timing")) &&
    summary?.isPortfolio &&
    summaryDoc
  ) {
    return `${summaryDoc.snippet} Treat this portfolio view as a triage board: nearest LOI dates tell you where time pressure is highest, while readiness spread tells you where the project team is underprepared relative to its timeline.`;
  }

  if (meetingsDoc && question.includes("meeting")) {
    return `${meetingsDoc.snippet} Use the meeting log to confirm whether blockers are actually moving or just being discussed repeatedly.`;
  }

  return docs
    .slice(0, 2)
    .map((doc) => `${doc.title}: ${doc.snippet}`)
    .join(" ");
}

type ParsedSummary = {
  readiness?: string;
  readinessValue?: number;
  blockerCount?: number;
  isPortfolio: boolean;
};

function parseSummaryDoc(snippet?: string): ParsedSummary | null {
  if (!snippet) return null;

  const readinessMatch = snippet.match(/Readiness\s+(\d+(?:\.\d+)?)%/i);
  const blockerMatch = snippet.match(/(\d+)\s+LOI blockers?\s+remain/i);

  return {
    readiness: readinessMatch?.[1],
    readinessValue: readinessMatch ? Number(readinessMatch[1]) : undefined,
    blockerCount: blockerMatch ? Number(blockerMatch[1]) : undefined,
    isPortfolio: snippet.toLowerCase().includes("projects in portfolio"),
  };
}

function parseBlockers(snippet?: string): string[] {
  if (!snippet) return [];
  const match = snippet.match(/Current LOI blockers:\s*(.+?)\.$/i);
  if (!match) return [];

  return match[1]
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function chooseTopBlocker(blockers: readonly string[]): string | null {
  if (blockers.length === 0) return null;

  const priorities: Array<[string, number]> = [
    ["epc contract", 100],
    ["ppa", 95],
    ["off-take", 95],
    ["host government", 92],
    ["financial model", 90],
    ["independent engineer", 88],
    ["esia", 86],
    ["environmental", 86],
    ["us content", 84],
  ];

  return [...blockers].sort((a, b) => scoreBlocker(b, priorities) - scoreBlocker(a, priorities))[0] ?? null;
}

function scoreBlocker(blocker: string, priorities: Array<[string, number]>): number {
  const lowered = blocker.toLowerCase();
  for (const [needle, score] of priorities) {
    if (lowered.includes(needle)) return score;
  }
  return 10;
}

function buildSearchText(request: ChatRequest): string {
  return [request.question, request.pageContext ?? "", ...request.messages.map((message) => message.content)]
    .join(" ")
    .trim();
}

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length >= 2);
}

function scoreEntry(
  entry: AppKnowledgeEntry,
  query: string,
  queryTokens: readonly string[]
): number {
  const loweredTitle = entry.title.toLowerCase();
  const loweredAliases = entry.aliases.map((alias) => alias.toLowerCase());
  const haystack = `${loweredTitle} ${entry.snippet.toLowerCase()} ${loweredAliases.join(" ")}`;
  const loweredQuery = query.toLowerCase();

  let score = 0;

  for (const token of queryTokens) {
    if (loweredTitle.includes(token)) score += 8;
    if (loweredAliases.some((alias) => alias.includes(token))) score += 6;
    if (haystack.includes(token)) score += 2;
  }

  if (loweredQuery.includes(loweredTitle)) score += 12;
  if (loweredAliases.some((alias) => loweredQuery.includes(alias))) score += 10;

  return score;
}
