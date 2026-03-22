/**
 * Quick verification script. Run with: npx tsx src/lib/exim/verify.ts
 */
import { EXIM_REQUIREMENTS, LOI_CRITICAL_IDS, TOTAL_WEIGHT } from "./requirements";
import { computeReadiness } from "../scoring/index";

console.log("=== EXIM Requirements Taxonomy Verification ===\n");
console.log(`Total requirements: ${EXIM_REQUIREMENTS.length}`);
console.log(`LOI-critical items: ${LOI_CRITICAL_IDS.length}`);
console.log(`Total weight pool:  ${TOTAL_WEIGHT}`);
console.log(`\nLOI-critical IDs:`);
LOI_CRITICAL_IDS.forEach((id) => console.log(`  - ${id}`));

console.log("\n=== Scoring Scenarios ===\n");

// Scenario 1: All not_started
const empty = computeReadiness([]);
console.log(`All not_started       → ${empty.scoreBps} bps (${(empty.scoreBps / 100).toFixed(2)}%), LOI ready: ${empty.loiReady}`);

// Scenario 2: All executed
const allDone = EXIM_REQUIREMENTS.map((r) => ({
  requirementId: r.id,
  status: "executed" as const,
}));
const full = computeReadiness(allDone);
console.log(`All executed          → ${full.scoreBps} bps (${(full.scoreBps / 100).toFixed(2)}%), LOI ready: ${full.loiReady}`);

// Scenario 3: Only LOI-critical at substantially_final
const loiOnly = LOI_CRITICAL_IDS.map((id) => ({
  requirementId: id,
  status: "substantially_final" as const,
}));
const loiResult = computeReadiness(loiOnly);
console.log(`LOI-critical sub_final → ${loiResult.scoreBps} bps (${(loiResult.scoreBps / 100).toFixed(2)}%), LOI ready: ${loiResult.loiReady}`);

console.log("\nCategory breakdown (LOI-critical only scenario):");
for (const [cat, score] of Object.entries(loiResult.categoryScores)) {
  console.log(`  ${cat.padEnd(22)} ${(score / 100).toFixed(2)}%`);
}

// Scenario 4: Mixed realistic state
const mixedStatuses = [
  { requirementId: "epc_contract", status: "substantially_final" as const },
  { requirementId: "offtake_agreement", status: "draft" as const },
  { requirementId: "implementation_agreement", status: "in_progress" as const },
  { requirementId: "financial_model", status: "substantially_final" as const },
  { requirementId: "project_budget", status: "draft" as const },
  { requirementId: "us_content_report", status: "in_progress" as const },
  { requirementId: "feasibility_study", status: "executed" as const },
  { requirementId: "independent_engineer_report", status: "draft" as const },
  { requirementId: "host_government_approval", status: "executed" as const },
  { requirementId: "esia", status: "in_progress" as const },
  { requirementId: "concession_agreement", status: "draft" as const },
  { requirementId: "project_company_formation", status: "executed" as const },
];
const mixed = computeReadiness(mixedStatuses);
console.log(`\nRealistic mixed state  → ${mixed.scoreBps} bps (${(mixed.scoreBps / 100).toFixed(2)}%), LOI ready: ${mixed.loiReady}`);
console.log(`LOI blockers (${mixed.loiBlockers.length}):`);
mixed.loiBlockers.forEach((id) => console.log(`  ✗ ${id}`));
