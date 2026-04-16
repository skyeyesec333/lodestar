import { anthropic } from "@/lib/ai/client";

export type StatusReportInput = {
  projectName: string;
  sector: string;
  country: string;
  stage: string;
  readinessScoreBps: number;
  openBlockers: string[];
  upcomingMilestones: string[];
  recentActivity: string[];
  targetLoiDate: string | null;
  daysSinceLastUpdate: number;
};

export type StatusReport = {
  headline: string;
  readinessSummary: string;
  keyRisks: string[];
  progressSummary: string;
  nextSteps: string[];
  generatedAt: Date;
};

function buildStatusReportPrompt(input: StatusReportInput): string {
  const readinessPct = (input.readinessScoreBps / 100).toFixed(1);

  const blockersBlock =
    input.openBlockers.length > 0
      ? input.openBlockers.map((b) => `- ${b}`).join("\n")
      : "- None identified";

  const milestonesBlock =
    input.upcomingMilestones.length > 0
      ? input.upcomingMilestones.map((m) => `- ${m}`).join("\n")
      : "- None upcoming";

  const activityBlock =
    input.recentActivity.length > 0
      ? input.recentActivity.slice(0, 10).map((a) => `- ${a}`).join("\n")
      : "- No recent activity recorded";

  const loiLine = input.targetLoiDate
    ? `Target LOI date: ${input.targetLoiDate}`
    : "Target LOI date: not set";

  const staleness =
    input.daysSinceLastUpdate > 7
      ? `WARNING: No updates recorded in ${input.daysSinceLastUpdate} days.`
      : `Last updated ${input.daysSinceLastUpdate} day(s) ago.`;

  return `You are an expert project finance advisor preparing a concise weekly deal status report for an infrastructure sponsor pursuing US EXIM Bank project finance.

PROJECT: ${input.projectName}
Country: ${input.country} | Sector: ${input.sector} | Stage: ${input.stage.replace(/_/g, " ")}
Readiness score: ${readinessPct}% (${input.readinessScoreBps} bps)
${loiLine}
${staleness}

OPEN BLOCKERS:
${blockersBlock}

UPCOMING MILESTONES:
${milestonesBlock}

RECENT ACTIVITY:
${activityBlock}

Produce a structured weekly status report in exactly the following JSON format. Do not include markdown fences or any text outside the JSON.

{
  "headline": "<one punchy sentence summarising where this deal stands this week>",
  "readinessSummary": "<2-3 sentences interpreting the readiness score in context: trajectory, what is driving it, and what the score means for LOI timing>",
  "keyRisks": [
    "<concise risk statement>",
    "<concise risk statement>",
    "<concise risk statement>"
  ],
  "progressSummary": "<2-3 sentences summarising what moved forward this week based on the activity log and milestone progress>",
  "nextSteps": [
    "<specific action with owner implication>",
    "<specific action with owner implication>",
    "<specific action with owner implication>"
  ]
}

Rules:
- keyRisks: exactly 3 items, ordered by severity. Focus on EXIM-specific risks (US content, off-take creditworthiness, LOI timeline slippage, EPC status).
- nextSteps: exactly 3 items, ordered by priority. Be concrete — name documents, counterparties, or deadlines where possible.
- If the activity log is sparse, flag that as a process risk.
- Do not hedge excessively. Give direct expert judgement.`;
}

type RawStatusReportJson = {
  headline: string;
  readinessSummary: string;
  keyRisks: string[];
  progressSummary: string;
  nextSteps: string[];
};

function isRawStatusReportJson(value: Record<string, unknown>): value is RawStatusReportJson {
  return (
    typeof value.headline === "string" &&
    typeof value.readinessSummary === "string" &&
    Array.isArray(value.keyRisks) &&
    typeof value.progressSummary === "string" &&
    Array.isArray(value.nextSteps)
  );
}

function parseStatusReportJson(raw: string): Omit<StatusReport, "generatedAt"> {
  const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/, "");
  const parsed: Record<string, unknown> = JSON.parse(cleaned) as Record<string, unknown>;

  if (!isRawStatusReportJson(parsed)) {
    throw new Error("Unexpected shape in status report JSON from model");
  }

  return {
    headline: parsed.headline,
    readinessSummary: parsed.readinessSummary,
    keyRisks: parsed.keyRisks.map(String),
    progressSummary: parsed.progressSummary,
    nextSteps: parsed.nextSteps.map(String),
  };
}

export async function generateStatusReport(input: StatusReportInput): Promise<StatusReport> {
  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
  const prompt = buildStatusReportPrompt(input);

  const message = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const block = message.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("No text block returned from status report generation");
  }

  const parsed = parseStatusReportJson(block.text);

  return { ...parsed, generatedAt: new Date() };
}
