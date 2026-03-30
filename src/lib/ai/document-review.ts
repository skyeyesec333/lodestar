import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export type DocumentGap = {
  issue: string;
  severity: "blocking" | "major" | "minor";
  recommendation: string;
  eximStandard: string;
};

export type DocumentReviewResult = {
  documentName: string;
  linkedRequirement: string | null;
  overallAssessment:
    | "substantially_final"
    | "needs_work"
    | "early_draft"
    | "cannot_assess";
  summary: string;
  gaps: DocumentGap[];
  strengths: string[];
  nextSteps: string[];
};

const SYSTEM_PROMPT =
  "You are an EXIM project finance document reviewer. Assess whether documents meet EXIM's substantially final standard. Return valid JSON only — no markdown, no explanation outside the JSON.";

function buildUserPrompt(input: {
  filename: string;
  requirementName: string | null;
  requirementCategory: string | null;
  documentType: string;
  projectSector: string;
  projectCountry: string;
  additionalContext?: string;
}): string {
  const requirementLine =
    input.requirementName !== null
      ? `Linked EXIM Requirement: ${input.requirementName} (category: ${input.requirementCategory ?? "unknown"})`
      : "Linked EXIM Requirement: None — this document is not linked to a specific requirement.";

  const contextLine =
    input.additionalContext && input.additionalContext.trim().length > 0
      ? `\nAdditional context from the project team: ${input.additionalContext.trim()}`
      : "";

  return `You are reviewing a document submitted as part of an EXIM Bank project finance data room.

IMPORTANT: You cannot read the file contents. Your assessment is based entirely on metadata provided below. You must be transparent about this limitation in your summary.

Document metadata:
- Filename: ${input.filename}
- Document type: ${input.documentType}
- Project sector: ${input.projectSector}
- Project host country: ${input.projectCountry}
- ${requirementLine}${contextLine}

Assess whether this document is likely to meet EXIM's "substantially final" standard for project finance, based on:
1. The filename and document type (as signals of document maturity and purpose)
2. The linked EXIM requirement it is meant to satisfy (if any)
3. Any additional context provided by the project team
4. EXIM's standard requirements for the project's sector and country

Return a JSON object matching this exact schema — no markdown, no code fences, raw JSON only:

{
  "documentName": string,
  "linkedRequirement": string | null,
  "overallAssessment": "substantially_final" | "needs_work" | "early_draft" | "cannot_assess",
  "summary": string (2-4 sentences explaining your assessment, noting that this is based on metadata only),
  "gaps": [
    {
      "issue": string,
      "severity": "blocking" | "major" | "minor",
      "recommendation": string,
      "eximStandard": string (cite the specific EXIM standard or policy being referenced)
    }
  ],
  "strengths": string[] (what appears to be in order, if anything),
  "nextSteps": string[] (concrete, numbered actions the team should take)
}

Use "cannot_assess" if you have insufficient metadata to form a meaningful view. Always be conservative — EXIM's standard is high and documents must be near-executed form, not summaries or outlines.`;
}

function buildFallbackResult(
  filename: string,
  requirementName: string | null,
  _rawText: string
): DocumentReviewResult {
  return {
    documentName: filename,
    linkedRequirement: requirementName,
    overallAssessment: "cannot_assess",
    summary: "Could not parse AI response.",
    gaps: [],
    strengths: [],
    nextSteps: [],
  };
}

export async function reviewDocument(input: {
  filename: string;
  requirementName: string | null;
  requirementCategory: string | null;
  documentType: string;
  projectSector: string;
  projectCountry: string;
  additionalContext?: string;
}): Promise<DocumentReviewResult> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildUserPrompt(input),
      },
    ],
  });

  const firstBlock = message.content[0];
  const rawText =
    firstBlock && firstBlock.type === "text" ? firstBlock.text.trim() : "";

  // Strip markdown code fences before parsing
  const stripped = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  try {
    const parsed = JSON.parse(stripped) as DocumentReviewResult;
    return parsed;
  } catch {
    return buildFallbackResult(input.filename, input.requirementName, rawText);
  }
}
