import type { WalkthroughData } from "@/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Deterministic hash for selecting phrase variants per project+workspace. */
function phraseIndex(projectName: string, workspace: string, count: number): number {
  let hash = 0;
  const key = `${projectName}:${workspace}`;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % count;
}

function pick(projectName: string, workspace: string, phrases: string[]): string {
  return phrases[phraseIndex(projectName, workspace, phrases.length)];
}

function isExim(d: WalkthroughData): boolean {
  return d.dealType === "exim_project_finance";
}

function gateWord(d: WalkthroughData): string {
  if (isExim(d)) return "LOI";
  if (d.dealType === "development_finance") return "Board Approval";
  if (d.dealType === "private_equity") return "IC Approval";
  return "next gate";
}

function formatCapex(cents: number | null): string {
  if (cents === null) return "not set";
  return `$${(cents / 100_000_000).toFixed(1)}M`;
}

function pctLabel(pct: number): string {
  if (pct >= 75) return "strong";
  if (pct >= 50) return "moderate";
  if (pct >= 25) return "early";
  return "minimal";
}

function pluralize(n: number, singular: string, plural?: string): string {
  return n === 1 ? `${n} ${singular}` : `${n} ${plural ?? singular + "s"}`;
}

// ── Workspace labels ─────────────────────────────────────────────────────────

export const WALKTHROUGH_STEPS: Array<{ workspace: string; sectionId: string; label: string }> = [
  { workspace: "overview",  sectionId: "section-overview",     label: "Overview" },
  { workspace: "concept",   sectionId: "section-concept",      label: "Concept" },
  { workspace: "parties",   sectionId: "section-stakeholders", label: "Parties" },
  { workspace: "capital",   sectionId: "section-capital",      label: "Capital" },
  { workspace: "workplan",  sectionId: "section-workplan",     label: "Workplan" },
  { workspace: "documents", sectionId: "section-documents",    label: "Evidence" },
  { workspace: "execution", sectionId: "section-execution",    label: "Execution" },
];

// ── Intro & summary ─────────────────────────────────────────────────────────

export function synthesizeWalkthroughIntro(d: WalkthroughData): string {
  const gate = gateWord(d);
  const opener = pick(d.projectName, "intro", [
    `Let me walk you through ${d.projectName} and tell you what I see.`,
    `Here's my read on ${d.projectName} — I'll go section by section.`,
    `I'll step through ${d.projectName} and flag what matters most right now.`,
  ]);
  const timing = d.daysToNextGate !== null
    ? ` You're ${d.daysToNextGate} days from ${gate}.`
    : "";
  return `${opener}${timing} Starting with the overview.`;
}

export function synthesizeWalkthroughSummary(d: WalkthroughData): string {
  const gate = gateWord(d);
  const readiness = `${d.readinessPct}%`;

  if (d.readinessPct >= 75 && d.loiBlockerCount === 0) {
    return `Overall, ${d.projectName} is in ${pctLabel(d.readinessPct)} position at ${readiness} readiness with no gate blockers. The main priority is ensuring all evidence is linked and documents are in substantially final form before the ${gate} submission.`;
  }

  const topIssues: string[] = [];
  if (d.loiBlockerCount > 0) topIssues.push(`${pluralize(d.loiBlockerCount, "gate blocker")}`);
  if (d.unassignedCriticalCount > 0) topIssues.push(`${pluralize(d.unassignedCriticalCount, "unowned critical item")}`);
  if (d.missingEvidenceCount > 0) topIssues.push(`${pluralize(d.missingEvidenceCount, "requirement")} without linked evidence`);

  const issueStr = topIssues.length > 0
    ? ` Key issues: ${topIssues.join(", ")}.`
    : "";

  return `That's the full picture. ${d.projectName} sits at ${readiness} readiness.${issueStr} Focus on the highest-leverage blocker first — clearing one critical item often unblocks downstream work.`;
}

// ── Per-workspace synthesizers ───────────────────────────────────────────────

function synthesizeOverview(d: WalkthroughData): string {
  const gate = gateWord(d);
  const opener = pick(d.projectName, "overview", [
    `${d.projectName} is currently at ${d.readinessPct}% readiness in the ${d.stage.replace(/_/g, " ")} stage.`,
    `The deal is tracking at ${d.readinessPct}% readiness, sitting in ${d.stage.replace(/_/g, " ")}.`,
    `Right now, ${d.projectName} shows ${d.readinessPct}% readiness at the ${d.stage.replace(/_/g, " ")} stage.`,
  ]);

  let timing = "";
  if (d.daysToNextGate !== null) {
    if (d.daysToNextGate < 0) {
      timing = ` The ${gate} target date has passed by ${Math.abs(d.daysToNextGate)} days — this needs immediate attention.`;
    } else if (d.daysToNextGate <= 30) {
      timing = ` ${gate} is ${d.daysToNextGate} days away, which is tight given the current readiness level.`;
    } else if (d.daysToNextGate <= 90) {
      timing = ` ${gate} is ${d.daysToNextGate} days out — enough runway if the team maintains pace.`;
    } else {
      timing = ` ${gate} is ${d.daysToNextGate} days away, giving the team room to be deliberate.`;
    }
  } else {
    timing = ` No ${gate} target date has been set yet — setting one activates urgency tracking across the platform.`;
  }

  let blockerNote = "";
  if (d.loiBlockerCount > 0) {
    blockerNote = ` There ${d.loiBlockerCount === 1 ? "is" : "are"} ${pluralize(d.loiBlockerCount, `${gate} blocker`)} that must be cleared before submission.`;
  } else if (d.readinessPct >= 50) {
    blockerNote = ` No gate blockers remain — the path to ${gate} is clear.`;
  }

  return `${opener}${timing}${blockerNote}`;
}

function synthesizeConcept(d: WalkthroughData): string {
  const opener = pick(d.projectName, "concept", [
    "The concept workspace frames why this deal exists and whether it should proceed.",
    "Concept is where the strategic logic for this deal gets tested.",
    "This workspace captures the deal thesis, assumptions, and go/no-go stance.",
  ]);

  let thesisNote = "";
  if (d.conceptThesis) {
    const wordCount = d.conceptThesis.split(/\s+/).length;
    thesisNote = wordCount > 30
      ? " The deal thesis is documented and substantive."
      : " There's a thesis written, but it's brief — a stronger framing helps lender conversations.";
  } else {
    thesisNote = " No deal thesis has been written yet. This is the first thing a lender or credit committee will look for — I'd prioritize drafting one.";
  }

  let completenessNote = "";
  if (d.conceptPromptsRemaining === 0) {
    completenessNote = " All concept fields are filled in, which puts the framing in good shape.";
  } else if (d.conceptPromptsRemaining <= 3) {
    completenessNote = ` ${pluralize(d.conceptPromptsRemaining, "concept field")} still need attention — worth completing before the next stakeholder review.`;
  } else {
    completenessNote = ` ${pluralize(d.conceptPromptsRemaining, "concept field")} are empty. The concept workspace is underused — filling it in forces the team to confront assumptions early.`;
  }

  let goNoGoNote = "";
  if (d.goNoGoRecommendation) {
    goNoGoNote = ` The current go/no-go recommendation is "${d.goNoGoRecommendation}".`;
  }

  return `${opener}${thesisNote}${completenessNote}${goNoGoNote}`;
}

function synthesizeParties(d: WalkthroughData): string {
  const opener = pick(d.projectName, "parties", [
    "The parties workspace maps the institutions and people around the deal.",
    "This section tracks who's at the table and who's missing.",
    "Parties captures the stakeholder landscape for the deal.",
  ]);

  let stakeholderNote = "";
  if (d.stakeholderCount === 0) {
    stakeholderNote = " No stakeholders have been added yet. At minimum, the sponsor, EPC contractor, and off-taker should be tracked here.";
  } else if (d.stakeholderCount < 3) {
    stakeholderNote = ` Only ${pluralize(d.stakeholderCount, "stakeholder")} tracked — most deals at this stage need the sponsor, contractor, off-taker, and legal counsel at minimum.`;
  } else {
    stakeholderNote = ` ${pluralize(d.stakeholderCount, "stakeholder")} are tracked.`;
  }

  let epcNote = "";
  if (isExim(d)) {
    if (d.epcBidCount === 0) {
      epcNote = " No EPC bids are logged. For EXIM, the EPC contractor and US content certification are central to the application — this is a gap worth closing early.";
    } else {
      epcNote = ` ${pluralize(d.epcBidCount, "EPC bid")} ${d.epcBidCount === 1 ? "is" : "are"} logged. Make sure the selected contractor can certify >51% US content for EXIM eligibility.`;
    }
  }

  return `${opener}${stakeholderNote}${epcNote}`;
}

function synthesizeCapital(d: WalkthroughData): string {
  const opener = pick(d.projectName, "capital", [
    "Capital tracks the financing path and funder relationships.",
    "The capital workspace shows the deal's financing structure and lender pipeline.",
    "This section covers how the deal is being financed and who's providing capital.",
  ]);

  let capexNote = d.capexUsdCents !== null
    ? ` CAPEX is set at ${formatCapex(d.capexUsdCents)}.`
    : " No CAPEX figure has been set — this is foundational for sizing the financing package.";

  let funderNote = "";
  if (d.funderCount === 0) {
    funderNote = " No funders are tracked in the pipeline. Even at concept stage, having early lender conversations logged helps build the capital narrative.";
  } else {
    funderNote = ` ${pluralize(d.funderCount, "funder")} in the pipeline.`;
  }

  let covenantNote = "";
  if (d.covenantCount > 0) {
    covenantNote = ` ${pluralize(d.covenantCount, "covenant")} are being tracked — stay on top of compliance dates.`;
  }

  let coverNote = "";
  if (isExim(d)) {
    if (d.eximCoverType) {
      const coverLabel = d.eximCoverType === "comprehensive" ? "comprehensive (political + commercial)" : "political-only";
      coverNote = ` EXIM cover path is set to ${coverLabel}.`;
    } else {
      coverNote = " No EXIM cover type selected yet. Choosing between comprehensive and political-only cover frames the entire lender conversation — worth deciding early.";
    }
  }

  return `${opener}${capexNote}${funderNote}${covenantNote}${coverNote}`;
}

function synthesizeWorkplan(d: WalkthroughData): string {
  const gate = gateWord(d);
  const pct = d.readinessPct;
  const done = d.doneRequirements;
  const total = d.totalRequirements;

  const opener = pick(d.projectName, "workplan", [
    `The workplan shows ${done} of ${total} requirements complete, putting readiness at ${pct}%.`,
    `${done} of ${total} requirements are done — that's ${pct}% readiness.`,
    `Workplan readiness is at ${pct}% with ${done}/${total} requirements in final form.`,
  ]);

  let velocityNote = "";
  if (d.recentVelocity > 0) {
    const weeksToFinish = total - done > 0 ? Math.ceil((total - done) / d.recentVelocity) : 0;
    velocityNote = ` The team is completing about ${d.recentVelocity.toFixed(1)} requirements per week. At that pace, the remaining work would take ~${weeksToFinish} weeks.`;
    if (d.daysToNextGate !== null && weeksToFinish * 7 > d.daysToNextGate) {
      velocityNote += " That's slower than the target timeline — the team needs to accelerate or re-scope.";
    }
  } else if (total - done > 0) {
    velocityNote = " No requirement completions in the last 28 days — the workplan has stalled.";
  }

  let blockerDetail = "";
  if (d.loiBlockerCount > 0 && d.loiBlockerNames.length > 0) {
    const names = d.loiBlockerNames.slice(0, 3).join(", ");
    blockerDetail = ` Top ${gate} blockers: ${names}.`;
  }

  let ownershipNote = "";
  if (d.unassignedCriticalCount > 0) {
    ownershipNote = ` ${pluralize(d.unassignedCriticalCount, "critical item")} ${d.unassignedCriticalCount === 1 ? "has" : "have"} no assigned owner — nobody is accountable for moving ${d.unassignedCriticalCount === 1 ? "it" : "them"} forward.`;
  }

  let overdueNote = "";
  if (d.overdueCount > 0) {
    overdueNote = ` ${pluralize(d.overdueCount, "requirement")} ${d.overdueCount === 1 ? "is" : "are"} past the target date.`;
  }

  // Pick most impactful category
  const weakest = [...d.categoryBreakdown]
    .filter((c) => c.total > 0)
    .sort((a, b) => a.scorePct - b.scorePct)[0];
  let categoryNote = "";
  if (weakest && weakest.scorePct < 50) {
    categoryNote = ` The weakest category is ${weakest.label} at ${weakest.scorePct}% — that's where focused effort will move the needle most.`;
  }

  return `${opener}${velocityNote}${blockerDetail}${ownershipNote}${overdueNote}${categoryNote}`;
}

function synthesizeDocuments(d: WalkthroughData): string {
  const opener = pick(d.projectName, "documents", [
    "The evidence workspace tracks whether requirements have linked proof.",
    "Evidence is where the data room comes together — documents linked to requirements.",
    "This section answers a simple question: what proof exists, and what's still missing.",
  ]);

  let coverageNote = "";
  if (d.linkedCoveragePct >= 80) {
    coverageNote = ` Evidence coverage is at ${d.linkedCoveragePct}% — most requirements have linked documents. Focus on the remaining gaps and ensure documents are in substantially final form.`;
  } else if (d.linkedCoveragePct >= 40) {
    coverageNote = ` Evidence coverage is at ${d.linkedCoveragePct}% — there's a foundation, but significant gaps remain. ${pluralize(d.missingEvidenceCount, "requirement")} still ${d.missingEvidenceCount === 1 ? "has" : "have"} no linked evidence.`;
  } else {
    coverageNote = ` Evidence coverage is at ${d.linkedCoveragePct}%, which means most requirements don't have any linked documents yet. ${pluralize(d.missingEvidenceCount, "requirement")} ${d.missingEvidenceCount === 1 ? "needs" : "need"} evidence attached.`;
  }

  let orphanNote = "";
  if (d.orphanedEvidenceCount > 0) {
    orphanNote = ` ${pluralize(d.orphanedEvidenceCount, "document")} ${d.orphanedEvidenceCount === 1 ? "is" : "are"} uploaded but not linked to any requirement — these should be mapped or removed to keep the data room clean.`;
  }

  let expiryNote = "";
  if (d.expiringDocumentCount > 0) {
    expiryNote = ` ${pluralize(d.expiringDocumentCount, "document")} ${d.expiringDocumentCount === 1 ? "is" : "are"} expiring within 90 days — flag these for renewal before the gate submission.`;
  }

  return `${opener}${coverageNote}${orphanNote}${expiryNote}`;
}

function synthesizeExecution(d: WalkthroughData): string {
  const opener = pick(d.projectName, "execution", [
    "Execution brings together meetings, activity, and the project timeline.",
    "The execution workspace shows whether the deal is actually moving.",
    "This section is the operational pulse of the deal.",
  ]);

  let meetingNote = "";
  if (d.meetingCount === 0) {
    meetingNote = " No meetings are logged yet. Logging key meetings creates an audit trail and lets Beacon track action items automatically.";
  } else {
    meetingNote = ` ${pluralize(d.meetingCount, "meeting")} logged.`;
  }

  let velocityNote = "";
  if (d.recentVelocity > 0) {
    velocityNote = ` The team has been completing ~${d.recentVelocity.toFixed(1)} requirements per week over the last 28 days — that's a healthy signal of forward motion.`;
  } else {
    velocityNote = " No requirements have been completed in the last 28 days. If the deal is active, something is blocking execution.";
  }

  let actionNote = "";
  if (d.readinessPct < 40 && d.recentVelocity === 0) {
    actionNote = " I'd recommend a working session to unblock the top 2-3 requirements and re-establish momentum.";
  } else if (d.readinessPct >= 70) {
    actionNote = " The deal is in the final stretch — focus on closing the last gaps and preparing the gate package.";
  }

  return `${opener}${meetingNote}${velocityNote}${actionNote}`;
}

// ── Main dispatcher ─────────────────────────────────────────────────────────

const SYNTHESIZERS: Record<string, (d: WalkthroughData) => string> = {
  overview: synthesizeOverview,
  concept: synthesizeConcept,
  parties: synthesizeParties,
  capital: synthesizeCapital,
  workplan: synthesizeWorkplan,
  documents: synthesizeDocuments,
  execution: synthesizeExecution,
};

export function synthesizeWalkthroughStep(
  workspace: string,
  data: WalkthroughData,
): { content: string; label: string } {
  const step = WALKTHROUGH_STEPS.find((s) => s.workspace === workspace);
  const fn = SYNTHESIZERS[workspace];
  if (!step || !fn) {
    return { content: "No analysis available for this section.", label: workspace };
  }
  return { content: fn(data), label: step.label };
}
