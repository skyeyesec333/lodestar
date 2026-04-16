import { anthropic } from "@/lib/ai/client";

export type ApplicabilitySuggestion = {
  requirementId: string;
  requirementLabel: string;
  suggestedApplicable: boolean;
  confidence: "high" | "medium" | "low";
  reasoning: string;
};

type ProjectInput = {
  sector: string | null;
  country: string | null;
  dealType: string;
  description: string | null;
};

type RequirementInput = {
  id: string;
  label: string;
  category: string;
  applicableSectors: string[];
};

function buildPrompt(project: ProjectInput, requirements: RequirementInput[]): string {
  const projectLines = [
    `- Deal type: ${project.dealType}`,
    `- Sector: ${project.sector ?? "not specified"}`,
    `- Host country: ${project.country ?? "not specified"}`,
    `- Description: ${project.description ?? "not provided"}`,
  ].join("\n");

  const requirementLines = requirements
    .map((r) => {
      const sectorNote =
        r.applicableSectors.length > 0
          ? ` [sector-scoped: applies to ${r.applicableSectors.join(", ")}]`
          : "";
      return `- id: ${r.id} | category: ${r.category} | label: ${r.label}${sectorNote}`;
    })
    .join("\n");

  return `You are an expert in US EXIM Bank project finance requirements.

You are analyzing a project to identify which requirements in its checklist are likely NOT applicable, given the project's characteristics.

PROJECT DETAILS:
${projectLines}

REQUIREMENTS TO ANALYZE:
${requirementLines}

Your task: Return a JSON array containing suggestions ONLY for requirements that may NOT apply to this project. Do not include requirements that clearly do apply. Focus on requirements that are plausibly inapplicable based on sector, deal structure, or project description.

For each suggestion, provide:
- requirementId: the exact id string from the list above
- requirementLabel: the human-readable label
- suggestedApplicable: false (since you are suggesting it may not apply)
- confidence: "high", "medium", or "low" — how confident you are that it does NOT apply
- reasoning: one concise sentence explaining why it may not apply

Rules:
- Only include requirements where suggestedApplicable is false (not-applicable suggestions).
- Do not include requirements that are obviously applicable.
- Do not invent requirement IDs.
- Return only valid JSON — no markdown, no explanation outside the JSON array.

Example format:
[
  {
    "requirementId": "supply_agreement",
    "requirementLabel": "Fuel / Feedstock Supply Agreement",
    "suggestedApplicable": false,
    "confidence": "high",
    "reasoning": "This is a solar power project, which has no fuel or feedstock requirements."
  }
]

If no requirements are clearly inapplicable, return an empty array: []`;
}

const EXIM_CATEGORIES = new Set([
  "exim_eligibility",
  "us_content",
  "exim_environmental",
  "exim_specific",
]);

export function suggestRequirementApplicabilityHeuristic(
  project: ProjectInput,
  requirements: RequirementInput[]
): ApplicabilitySuggestion[] {
  const suggestions: ApplicabilitySuggestion[] = [];

  for (const req of requirements) {
    // Sector mismatch: requirement scoped to specific sectors that don't include this project's sector
    if (
      req.applicableSectors.length > 0 &&
      project.sector &&
      !req.applicableSectors.includes(project.sector)
    ) {
      suggestions.push({
        requirementId: req.id,
        requirementLabel: req.label,
        suggestedApplicable: false,
        confidence: "high",
        reasoning: `This requirement applies to ${req.applicableSectors.join(", ")} projects, but this project is in ${project.sector}.`,
      });
      continue;
    }

    // Non-EXIM deals shouldn't have EXIM-specific requirements
    if (
      project.dealType !== "exim_project_finance" &&
      EXIM_CATEGORIES.has(req.category)
    ) {
      suggestions.push({
        requirementId: req.id,
        requirementLabel: req.label,
        suggestedApplicable: false,
        confidence: "medium",
        reasoning: `This is an EXIM-specific requirement, but this deal is ${project.dealType.replace(/_/g, " ")}.`,
      });
    }
  }

  return suggestions;
}

export async function suggestRequirementApplicability(
  project: ProjectInput,
  requirements: RequirementInput[]
): Promise<ApplicabilitySuggestion[]> {
  if (requirements.length === 0) return [];

  const prompt = buildPrompt(project, requirements);

  const message = await anthropic.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const firstBlock = message.content[0];
  if (!firstBlock || firstBlock.type !== "text") return [];
  const rawText = firstBlock.text.trim();

  try {
    // Strip markdown code fences if Claude wrapped the JSON
    const jsonText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const raw: unknown = JSON.parse(jsonText);

    if (!Array.isArray(raw)) return [];

    const items: unknown[] = raw;
    const suggestions: ApplicabilitySuggestion[] = [];
    for (const entry of items) {
      if (entry === null || typeof entry !== "object") continue;
      const item = entry as Record<string, unknown>;
      if (
        typeof item.requirementId === "string" &&
        typeof item.requirementLabel === "string" &&
        typeof item.suggestedApplicable === "boolean" &&
        (item.confidence === "high" ||
          item.confidence === "medium" ||
          item.confidence === "low") &&
        typeof item.reasoning === "string"
      ) {
        suggestions.push({
          requirementId: item.requirementId,
          requirementLabel: item.requirementLabel,
          suggestedApplicable: item.suggestedApplicable,
          confidence: item.confidence,
          reasoning: item.reasoning,
        });
      }
    }

    return suggestions;
  } catch {
    return [];
  }
}
