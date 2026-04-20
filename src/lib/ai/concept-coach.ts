/**
 * Concept Coach — deterministic, project-aware draft generation for each of the
 * seven Concept fields. A stand-in for Claude streaming while the AI budget is
 * parked (see memory/project_api_backlog.md). Every draft is templated from the
 * project's real fields so the output looks and reads like a Lodestar-native
 * artifact instead of a generic AI stub.
 *
 * When Vercel AI SDK + @ai-sdk/anthropic is wired, replace `generateConceptDraft`
 * with a streamed call; the component's streaming contract stays the same.
 */
import type { ProjectConceptRow } from "@/lib/db/project-concepts";
import type { Project } from "@/types";
import { countryLabel } from "@/lib/projects/country-label";
import { formatDealTypeLabel } from "@/lib/projects/labels";

export type ConceptFieldKey =
  | "thesis"
  | "sponsorRationale"
  | "targetOutcome"
  | "knownUnknowns"
  | "fatalFlaws"
  | "nextActions"
  | "goNoGoRecommendation";

export const CONCEPT_FIELDS: Array<{ key: ConceptFieldKey; label: string; hint: string }> = [
  { key: "thesis",               label: "Thesis",               hint: "Why this deal is worth pursuing now" },
  { key: "sponsorRationale",     label: "Sponsor rationale",    hint: "What makes the sponsor the right operator" },
  { key: "targetOutcome",        label: "Target outcome",       hint: "Concrete measurable goal by a date" },
  { key: "knownUnknowns",        label: "Known unknowns",       hint: "Unresolved questions that could move the capital path" },
  { key: "fatalFlaws",           label: "Fatal flaws",          hint: "Risks that could kill the deal — to disprove early" },
  { key: "nextActions",          label: "Next actions",         hint: "Specific moves to advance the concept" },
  { key: "goNoGoRecommendation", label: "Go / no-go",           hint: "Current stance with triggers for a flip" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCapex(cents: number | null): string | null {
  if (cents == null) return null;
  const millions = cents / 100_000_000;
  if (millions >= 1000) return `$${(millions / 1000).toFixed(1)}B CAPEX`;
  if (millions >= 1) return `$${millions.toFixed(0)}M CAPEX`;
  return null;
}

function formatStage(stage: string): string {
  return stage
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTargetGateDate(project: Project): string | null {
  const isExim = project.dealType === "exim_project_finance";
  const target = isExim
    ? (project.targetLoiDate ?? project.targetCloseDate)
    : (project.targetCloseDate ?? project.targetLoiDate);
  if (!target) return null;
  const now = new Date();
  const days = Math.ceil(
    (new Date(target).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / 86_400_000
  );
  if (days < 0) return `${Math.abs(days)} days past ${isExim ? "target LOI" : "target close"}`;
  if (days === 0) return `${isExim ? "Target LOI" : "Target close"} is today`;
  return `${days} days to ${isExim ? "target LOI" : "target close"}`;
}

function sectorNoun(sector: string): string {
  const map: Record<string, string> = {
    power: "power-generation",
    water: "water",
    transport: "transport-logistics",
    telecom: "telecom",
    mining: "mining",
    other: "infrastructure",
  };
  return map[sector] ?? sector;
}

// ── Per-field drafts ─────────────────────────────────────────────────────────

type Ctx = {
  project: Project;
  concept: ProjectConceptRow | null;
};

function draftThesis({ project, concept }: Ctx): string {
  const country = countryLabel(project.countryCode);
  const dealTypeLabel = formatDealTypeLabel(project.dealType);
  const capex = formatCapex(project.capexUsdCents);
  const stage = formatStage(project.stage);
  const isExim = project.dealType === "exim_project_finance";
  const sector = sectorNoun(project.sector);
  const gateClock = formatTargetGateDate(project);

  const lines: string[] = [];
  lines.push(
    `**${project.name}** is a ${capex ? `${capex} ` : ""}${sector} project in ${country}, currently in ${stage} on a ${dealTypeLabel} path.`
  );
  lines.push("");
  lines.push("The thesis rests on three pillars:");
  lines.push("");
  lines.push(
    `1. **Capital structure fit** — ${isExim ? "EXIM’s comprehensive cover maps cleanly to the project’s US-content EPC package and off-take profile" : "the counterparty mix supports a ${dealTypeLabel.toLowerCase()} tranche without reopening sponsor equity"}.`
  );
  lines.push(
    `2. **Deliverability** — the project has reached ${stage} with the gate artifacts aligned; the short path to LOI is a question of execution rather than origination.`
  );
  lines.push(
    `3. **Downside containment** — fatal-flaw work is bounded by a small number of specific failure modes (see Fatal flaws).`
  );
  lines.push("");
  if (gateClock) {
    lines.push(`**Timing:** ${gateClock}. The thesis is only load-bearing inside this window.`);
  }
  if (concept?.targetOutcome) {
    lines.push("");
    lines.push(`_Target outcome on file:_ ${concept.targetOutcome}`);
  }
  lines.push("");
  lines.push("Refine the language to reflect the sponsor’s voice before submitting to lenders.");
  return lines.join("\n");
}

function draftSponsorRationale({ project }: Ctx): string {
  const country = countryLabel(project.countryCode);
  const sector = sectorNoun(project.sector);
  return [
    `The sponsor is pursuing **${project.name}** for three reasons that the thesis should make explicit:`,
    "",
    `1. **Operating fit** — the sponsor team has on-the-ground operating experience in ${country} and in ${sector}, so the execution risk is priced into a team that has done this work before.`,
    `2. **Capital alignment** — the sponsor is bringing equity against a financing path (${formatDealTypeLabel(project.dealType)}) whose structure rewards the sponsor’s risk profile rather than diluting it.`,
    `3. **Portfolio logic** — this asset complements adjacent work the sponsor is already executing in ${country} or in ${sector}; the investment is compounding, not standalone.`,
    "",
    "Adjust the specifics to the sponsor’s actual operating record — that record is what lenders will test first.",
  ].join("\n");
}

function draftTargetOutcome({ project }: Ctx): string {
  const isExim = project.dealType === "exim_project_finance";
  const target = isExim ? project.targetLoiDate : project.targetCloseDate;
  const dateLabel = target
    ? new Date(target).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "the next external gate";
  const capex = formatCapex(project.capexUsdCents);
  return [
    `Reach **${isExim ? "EXIM Letter of Interest submission" : "financial close-ready posture"}** for ${project.name} by **${dateLabel}**, with:`,
    "",
    `- Every primary-gate artifact in substantially-final form${capex ? ` supporting the ${capex} capital plan` : ""}`,
    `- ${isExim ? "US-content sourcing verified at >51% eligible goods and services" : "Capital stack committed by at least one senior lender"}`,
    `- Off-taker and ${isExim ? "host-government consent" : "regulatory approval"} documented in the data room`,
    `- Deal thesis, fatal flaws, and next actions documented and shared with the sponsor team`,
    "",
    "The outcome should read like a binary: on the target date, you either submitted/closed, or you did not.",
  ].join("\n");
}

function draftKnownUnknowns({ project }: Ctx): string {
  const isExim = project.dealType === "exim_project_finance";
  return [
    `Unknowns that could move the capital path for **${project.name}**:`,
    "",
    `- **Off-taker credit posture** — is the counterparty rated, is the PPA bankable as written, and would a major lender require a sovereign guarantee or credit wrap?`,
    `- **EPC pricing volatility** — has the EPC locked raw-material and logistics pricing, and what is the window before the EPC quote expires?`,
    isExim
      ? `- **EXIM CLS position** — is ${countryLabel(project.countryCode)} currently eligible for the intended cover, and what is the most recent published schedule?`
      : `- **DFI / commercial bank appetite** — do the likely lenders have open country exposure and sector appetite this quarter?`,
    `- **ESIA category** — what category does the project fall into, and how long is the disclosure window before financing can close?`,
    `- **Fiscal regime stability** — are the corporate tax, VAT, and FX repatriation rules stable under the current government, or is a change in cabinet a material risk?`,
    "",
    "Answering any one of these may reshape the deal structure. Prioritize the ones with shortest resolution windows first.",
  ].join("\n");
}

function draftFatalFlaws({ project }: Ctx): string {
  const sector = sectorNoun(project.sector);
  const isExim = project.dealType === "exim_project_finance";
  return [
    `Fatal flaws to disprove early for **${project.name}**:`,
    "",
    `- **Off-taker non-performance** — the off-take contract is unenforceable, the counterparty is unrated, or the demand fundamentals behind ${sector} in ${countryLabel(project.countryCode)} are thinner than the base case assumes.`,
    `- **Resource/feedstock risk** — the project cannot secure the inputs (fuel, water, raw materials, or traffic) at the price the financial model assumes.`,
    isExim
      ? `- **US-content shortfall** — the EPC package cannot credibly sustain >51% eligible US goods and services, invalidating the EXIM path.`
      : `- **Capital stack gap** — no senior lender or DFI will take the ${formatDealTypeLabel(project.dealType)} position at the target pricing.`,
    `- **Political / expropriation risk** — change in government or regulatory framework would materially rework the concession terms.`,
    `- **Permitting cliff** — a single permit (environmental, land, fiscal) whose denial or delay collapses the timeline.`,
    "",
    "Each flaw needs an early, cheap, falsifiable test. If the flaw survives the test, the deal does not advance past the next gate.",
  ].join("\n");
}

function draftNextActions({ project, concept }: Ctx): string {
  const gateClock = formatTargetGateDate(project);
  const lines: string[] = [
    `Specific moves for **${project.name}** in the next four weeks:`,
    "",
    `- **Week 1** — lock the off-take paper: circulate the PPA term sheet, confirm take-or-pay structure, and get sponsor counsel review queued.`,
    `- **Week 1–2** — open the EXIM / DFI pre-consultation: submit a concept paper and schedule a 60-minute call to validate cover type and CLS position.`,
    `- **Week 2** — close the EPC long-list: no more than three candidates, with comparable scopes, priced against the financial model base case.`,
    `- **Week 3** — ESIA category check: engage an independent environmental consultant to classify the project and scope the disclosure window.`,
    `- **Week 3–4** — draft the deal thesis and fatal-flaw register (if blank); route for sponsor review before the next steering committee.`,
  ];
  if (gateClock) {
    lines.push("");
    lines.push(`_Sequencing pressure:_ ${gateClock}. Anything that cannot close inside this window should be flagged as a timeline risk on the Workplan.`);
  }
  if (!concept?.thesis) {
    lines.push("");
    lines.push("Write the thesis first — every action after it inherits its logic.");
  }
  return lines.join("\n");
}

function draftGoNoGo({ project, concept }: Ctx): string {
  const stance = concept?.goNoGoRecommendation?.trim() || null;
  const currentStanceLine = stance
    ? `Current stance on file: _${stance.slice(0, 160)}${stance.length > 160 ? "…" : ""}_`
    : "No go / no-go stance on file yet. Take one.";
  const isExim = project.dealType === "exim_project_finance";
  return [
    `Working stance on **${project.name}**: **conditional go**, contingent on the fatal-flaw tests returning clean inside the next 30 days.`,
    "",
    currentStanceLine,
    "",
    "**Triggers to flip to no-go:**",
    "",
    `- A fatal flaw (off-taker, resource, US-content${isExim ? "" : " / senior lender appetite"}, political, permit) fails its early test.`,
    `- The sponsor equity required grows by >20% from the base case due to EPC or financing-cost drift.`,
    `- ${countryLabel(project.countryCode)} moves to a restricted tier on the ${isExim ? "EXIM Country Limitation Schedule" : "DFI country list"} before submission.`,
    "",
    "**Triggers to promote to unconditional go:**",
    "",
    `- Off-take counterparty issues a signed term sheet aligned with the base case PPA.`,
    `- ${isExim ? "EXIM confirms comprehensive cover eligibility in pre-consultation" : "At least one senior lender issues an indicative term sheet"}.`,
    `- ESIA category confirmed and disclosure window fits the target gate.`,
    "",
    "The stance should be reviewed at every steering committee and the triggers tightened as evidence comes in.",
  ].join("\n");
}

const GENERATORS: Record<ConceptFieldKey, (ctx: Ctx) => string> = {
  thesis: draftThesis,
  sponsorRationale: draftSponsorRationale,
  targetOutcome: draftTargetOutcome,
  knownUnknowns: draftKnownUnknowns,
  fatalFlaws: draftFatalFlaws,
  nextActions: draftNextActions,
  goNoGoRecommendation: draftGoNoGo,
};

export function generateConceptDraft(field: ConceptFieldKey, ctx: Ctx): string {
  return GENERATORS[field](ctx);
}
