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

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

const SYSTEM_PROMPT =
  "You are an EXIM project finance document reviewer. Assess whether documents meet EXIM's substantially final standard. Return valid JSON only — no markdown, no explanation outside the JSON.";

function formatFileSize(bytes: bigint): string {
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0] ?? date.toISOString();
}

function buildUserPrompt(input: {
  filename: string;
  requirementName: string | null;
  requirementCategory: string | null;
  requirementDescription: string | null;
  documentType: string;
  documentState: string;
  documentSizeBytes: bigint;
  documentUploadedAt: Date;
  projectSector: string;
  projectCountry: string;
  projectStage: string;
  additionalContext?: string;
}): string {
  const requirementSection =
    input.requirementName !== null
      ? `REQUIREMENT BEING SATISFIED
- Category: ${input.requirementCategory ?? "unknown"}
- Label: ${input.requirementName}${input.requirementDescription ? `\n- Description: ${input.requirementDescription}` : ""}
- EXIM Standard: Must be in "substantially final form" — near-executed, not summaries or outlines`
      : `REQUIREMENT BEING SATISFIED
- None — this document is not linked to a specific EXIM requirement.`;

  const contextLine =
    input.additionalContext && input.additionalContext.trim().length > 0
      ? `\nAdditional context from the project team: ${input.additionalContext.trim()}`
      : "";

  return `You are reviewing a document submitted as part of an EXIM Bank project finance data room.

IMPORTANT: You cannot read the file contents. Your assessment is based entirely on metadata provided below. You must be transparent about this limitation in your summary.

DOCUMENT CONTEXT
- Filename: ${input.filename}
- Document Type: ${input.documentType}
- File Size: ${formatFileSize(input.documentSizeBytes)}
- Current State: ${input.documentState} (current = active version; superseded = replaced by a newer upload)
- Uploaded: ${formatDate(input.documentUploadedAt)}

PROJECT CONTEXT
- Sector: ${input.projectSector}
- Country: ${input.projectCountry}
- Stage: ${input.projectStage}

${requirementSection}

REVIEW CRITERIA
Based on the requirement type and document metadata, assess:
1. Is this document type appropriate for this requirement?
2. Does the filename suggest it contains the right content?
3. Is the document state appropriate? (superseded documents cannot satisfy executed requirements; draft filenames signal immaturity)
4. Are there any red flags (e.g., "draft", "template", "placeholder", "v1", "wip" in the filename)?
5. Does the file size seem reasonable for this document type? (e.g., a 5 KB "Financial Model" is suspicious)${contextLine}

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

Use "cannot_assess" if you have insufficient metadata to form a meaningful view. Always be conservative — EXIM's standard is high and documents must be in near-executed form, not summaries or outlines.`;
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
  requirementDescription: string | null;
  documentType: string;
  documentState: string;
  documentSizeBytes: bigint;
  documentUploadedAt: Date;
  projectSector: string;
  projectCountry: string;
  projectStage: string;
  additionalContext?: string;
}): Promise<DocumentReviewResult> {
  const message = await client.messages.create({
    model: MODEL,
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
