import { anthropic as client } from "./client";
import { tokenize } from "@/lib/ai/chat";
import { getRequirementsForDealType } from "@/lib/requirements";

export type ExtractedActionItem = {
  title: string;
  description: string | null;
  assigneeName: string | null; // name mentioned in notes, not a DB ID
  dueDateText: string | null;  // e.g. "end of month", "March 15" — raw text
  requirementId: string | null; // matched EXIM requirement ID or null
  requirementName: string | null;
  priority: "low" | "medium" | "high";
  suggestedRequirementId?: string; // keyword-overlap suggestion (in-memory only)
};

export type ExtractedCommitment = {
  text: string;           // the commitment as stated
  party: string | null;   // who made it
  requirementId: string | null;
  requirementName: string | null;
};

export type MeetingExtractionResult = {
  summary: string;              // 2-3 sentence meeting summary
  actionItems: ExtractedActionItem[];
  commitments: ExtractedCommitment[];
  requirementIds: string[];     // all requirement IDs mentioned/relevant
};

type RequirementRef = {
  id: string;
  name: string;
  category: string;
};

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

const SYSTEM_PROMPT =
  "You are an EXIM project finance assistant. Extract structured information from meeting notes. Return valid JSON only. Do not include any text before or after the JSON object.";

function buildUserMessage(
  transcript: string,
  requirements: RequirementRef[]
): string {
  const reqList = requirements
    .map((r, i) => `${i + 1}. [${r.id}] ${r.name} (${r.category})`)
    .join("\n");

  return `You are reviewing notes from a project finance meeting related to US EXIM Bank financing.

EXIM REQUIREMENTS REFERENCE LIST:
${reqList}

MEETING NOTES / TRANSCRIPT:
${transcript}

Extract the following and return a single JSON object matching this exact schema:
{
  "summary": "2-3 sentence summary of the meeting",
  "actionItems": [
    {
      "title": "short action item title",
      "description": "additional detail or null",
      "assigneeName": "person's name from notes or null",
      "dueDateText": "raw due date text like 'end of month' or null",
      "requirementId": "requirement ID from the list above or null",
      "requirementName": "requirement name or null",
      "priority": "low | medium | high"
    }
  ],
  "commitments": [
    {
      "text": "the commitment as stated in the notes",
      "party": "who made the commitment or null",
      "requirementId": "requirement ID from the list above or null",
      "requirementName": "requirement name or null"
    }
  ],
  "requirementIds": ["array of all requirement IDs mentioned or relevant"]
}

Rules:
- Only use requirement IDs that appear in the EXIM REQUIREMENTS REFERENCE LIST above.
- If no requirement is relevant to an item, set requirementId and requirementName to null.
- requirementIds should be a deduplicated list of all requirement IDs referenced across all items.
- Return valid JSON only — no markdown, no prose.`;
}

function emptyResult(rawText: string): MeetingExtractionResult {
  return {
    summary: rawText.slice(0, 500),
    actionItems: [],
    commitments: [],
    requirementIds: [],
  };
}

function isValidPriority(value: unknown): value is "low" | "medium" | "high" {
  return value === "low" || value === "medium" || value === "high";
}

function coercePriority(value: unknown): "low" | "medium" | "high" {
  if (isValidPriority(value)) return value;
  return "medium";
}

function parseExtraction(raw: string): MeetingExtractionResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return emptyResult(raw);
  }

  if (typeof parsed !== "object" || parsed === null) {
    return emptyResult(raw);
  }

  const obj = parsed as Record<string, unknown>;

  const summary = typeof obj.summary === "string" ? obj.summary : "";

  const rawItems = Array.isArray(obj.actionItems) ? obj.actionItems : [];
  const actionItems: ExtractedActionItem[] = rawItems
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      title: typeof item.title === "string" ? item.title : "Untitled action item",
      description: typeof item.description === "string" ? item.description : null,
      assigneeName: typeof item.assigneeName === "string" ? item.assigneeName : null,
      dueDateText: typeof item.dueDateText === "string" ? item.dueDateText : null,
      requirementId: typeof item.requirementId === "string" ? item.requirementId : null,
      requirementName: typeof item.requirementName === "string" ? item.requirementName : null,
      priority: coercePriority(item.priority),
    }));

  const rawCommitments = Array.isArray(obj.commitments) ? obj.commitments : [];
  const commitments: ExtractedCommitment[] = rawCommitments
    .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null)
    .map((c) => ({
      text: typeof c.text === "string" ? c.text : "",
      party: typeof c.party === "string" ? c.party : null,
      requirementId: typeof c.requirementId === "string" ? c.requirementId : null,
      requirementName: typeof c.requirementName === "string" ? c.requirementName : null,
    }))
    .filter((c) => c.text.length > 0);

  const rawIds = Array.isArray(obj.requirementIds) ? obj.requirementIds : [];
  const requirementIds: string[] = rawIds.filter((id): id is string => typeof id === "string");

  return { summary, actionItems, commitments, requirementIds };
}

export type ActionItem = {
  description: string;
  assignee: string | null;
  dueDate: string | null;
  priority: "high" | "medium" | "low";
};

function buildActionItemsMessage(transcript: string, projectContext: string): string {
  return `You are an EXIM project finance meeting assistant.

PROJECT CONTEXT:
${projectContext}

MEETING TRANSCRIPT / NOTES:
${transcript}

Extract all clear, specific action items from the meeting notes above. For each action item, identify:
- The specific task or deliverable
- Who is responsible (if mentioned)
- When it is due (if mentioned, as raw text)
- How urgent/important it is

Return a JSON array of action items matching this exact schema:
[
  {
    "description": "specific action item description",
    "assignee": "person name or null",
    "dueDate": "raw due date text like 'end of month' or 'March 15' or null",
    "priority": "high | medium | low"
  }
]

Rules:
- Only extract concrete tasks, not vague discussion points
- If no due date is mentioned, set dueDate to null
- If no assignee is mentioned, set assignee to null
- Priority: high = blocking/urgent/EXIM submission critical, medium = important but not blocking, low = nice to have
- Return valid JSON array only — no markdown, no prose`;
}

function parseActionItems(raw: string): ActionItem[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      description: typeof item.description === "string" ? item.description : "Untitled action item",
      assignee: typeof item.assignee === "string" ? item.assignee : null,
      dueDate: typeof item.dueDate === "string" ? item.dueDate : null,
      priority: coercePriority(item.priority),
    }));
}

export async function extractActionItems(
  transcript: string,
  projectContext: string
): Promise<ActionItem[]> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system:
      "You are an EXIM project finance assistant. Extract action items from meeting notes. Return valid JSON only. Do not include any text before or after the JSON array.",
    messages: [
      {
        role: "user",
        content: buildActionItemsMessage(transcript, projectContext),
      },
    ],
  });

  const firstBlock = message.content[0];
  if (!firstBlock || firstBlock.type !== "text") return [];

  return parseActionItems(firstBlock.text.trim());
}

function suggestRequirementForActionItem(
  title: string,
  dealType: string
): string | undefined {
  const requirements = getRequirementsForDealType(dealType);
  const titleTokens = new Set(tokenize(title));
  let bestId: string | undefined;
  let bestScore = 0;

  for (const req of requirements) {
    const reqTokens = tokenize(req.name);
    let overlap = 0;
    for (const token of reqTokens) {
      if (titleTokens.has(token)) overlap++;
    }
    if (overlap > bestScore) {
      bestScore = overlap;
      bestId = req.id;
    }
  }

  return bestScore >= 3 ? bestId : undefined;
}

export async function extractMeetingInsights(
  transcript: string,
  requirements: RequirementRef[],
  dealType = "exim_project_finance"
): Promise<MeetingExtractionResult> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildUserMessage(transcript, requirements),
      },
    ],
  });

  const firstBlock = message.content[0];
  if (!firstBlock || firstBlock.type !== "text") {
    return emptyResult("No response from model.");
  }

  const result = parseExtraction(firstBlock.text.trim());

  // Annotate action items with keyword-overlap requirement suggestions
  const annotatedItems = result.actionItems.map((item) => {
    if (item.requirementId) return item; // already linked by AI
    const suggestedRequirementId = suggestRequirementForActionItem(item.title, dealType);
    return suggestedRequirementId ? { ...item, suggestedRequirementId } : item;
  });

  return { ...result, actionItems: annotatedItems };
}
