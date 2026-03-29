import { describe, it, expect } from "vitest";
import { computeReadiness } from "./index";
import { EXIM_REQUIREMENTS, LOI_CRITICAL_IDS, TOTAL_WEIGHT } from "../exim/requirements";
import type { RequirementStatusValue } from "../../types/requirements";

const allWith = (status: RequirementStatusValue) =>
  EXIM_REQUIREMENTS.map((r) => ({ requirementId: r.id, status }));

const LOI_CRITICAL_SET = new Set(LOI_CRITICAL_IDS);

const LOI_CRITICAL_WEIGHT = EXIM_REQUIREMENTS.filter((r) => r.isLoiCritical).reduce(
  (sum, r) => sum + r.weight,
  0
);

describe("computeReadiness", () => {
  describe("empty / default inputs", () => {
    it("returns scoreBps=0 for empty array (all default to not_started)", () => {
      const result = computeReadiness([]);
      expect(result.scoreBps).toBe(0);
    });

    it("returns loiReady=false for empty array", () => {
      expect(computeReadiness([]).loiReady).toBe(false);
    });

    it("returns all LOI-critical IDs as blockers for empty array", () => {
      const result = computeReadiness([]);
      expect(result.loiBlockers).toHaveLength(LOI_CRITICAL_IDS.length);
      expect(result.loiBlockers.sort()).toEqual([...LOI_CRITICAL_IDS].sort());
    });

    it("explicit all-not_started matches empty array result", () => {
      const explicit = computeReadiness(allWith("not_started"));
      const implicit = computeReadiness([]);
      expect(explicit).toEqual(implicit);
    });
  });

  describe("score arithmetic", () => {
    it("all executed → scoreBps=10000", () => {
      expect(computeReadiness(allWith("executed")).scoreBps).toBe(10000);
    });

    it("all waived → scoreBps=10000 (waived counts as complete)", () => {
      expect(computeReadiness(allWith("waived")).scoreBps).toBe(10000);
    });

    it("all substantially_final → scoreBps=9000", () => {
      expect(computeReadiness(allWith("substantially_final")).scoreBps).toBe(9000);
    });

    it("all in_progress → scoreBps=2000", () => {
      expect(computeReadiness(allWith("in_progress")).scoreBps).toBe(2000);
    });

    it("all draft → scoreBps=5000", () => {
      expect(computeReadiness(allWith("draft")).scoreBps).toBe(5000);
    });

    it("only epc_contract executed → scoreBps reflects weight 200 / TOTAL_WEIGHT", () => {
      const expected = Math.round((200 / TOTAL_WEIGHT) * 10000);
      const result = computeReadiness([
        { requirementId: "epc_contract", status: "executed" },
      ]);
      expect(result.scoreBps).toBe(expected);
    });

    it("scoreBps is always an integer", () => {
      const mixed = [
        { requirementId: "epc_contract", status: "substantially_final" as const },
        { requirementId: "offtake_agreement", status: "draft" as const },
        { requirementId: "financial_model", status: "in_progress" as const },
        { requirementId: "esia", status: "executed" as const },
      ];
      const result = computeReadiness(mixed);
      expect(result.scoreBps % 1).toBe(0);
    });

    it("scoreBps is bounded between 0 and 10000", () => {
      const empty = computeReadiness([]);
      const full = computeReadiness(allWith("executed"));
      expect(empty.scoreBps).toBeGreaterThanOrEqual(0);
      expect(full.scoreBps).toBeLessThanOrEqual(10000);
    });
  });

  describe("LOI readiness", () => {
    it("all LOI-critical at substantially_final → loiReady=true, no blockers", () => {
      const statuses = LOI_CRITICAL_IDS.map((id) => ({
        requirementId: id,
        status: "substantially_final" as const,
      }));
      const result = computeReadiness(statuses);
      expect(result.loiReady).toBe(true);
      expect(result.loiBlockers).toHaveLength(0);
    });

    it("all LOI-critical at substantially_final → correct partial score", () => {
      const statuses = LOI_CRITICAL_IDS.map((id) => ({
        requirementId: id,
        status: "substantially_final" as const,
      }));
      const expected = Math.round((LOI_CRITICAL_WEIGHT * 0.9 / TOTAL_WEIGHT) * 10000); // 3987
      expect(computeReadiness(statuses).scoreBps).toBe(expected);
    });

    it("all LOI-critical at executed → loiReady=true", () => {
      const statuses = LOI_CRITICAL_IDS.map((id) => ({
        requirementId: id,
        status: "executed" as const,
      }));
      expect(computeReadiness(statuses).loiReady).toBe(true);
    });

    it("all LOI-critical at waived → loiReady=true", () => {
      const statuses = LOI_CRITICAL_IDS.map((id) => ({
        requirementId: id,
        status: "waived" as const,
      }));
      expect(computeReadiness(statuses).loiReady).toBe(true);
    });

    it("one LOI-critical at draft, rest substantially_final → loiReady=false", () => {
      const statuses = LOI_CRITICAL_IDS.map((id, i) => ({
        requirementId: id,
        status: (i === 0 ? "draft" : "substantially_final") as RequirementStatusValue,
      }));
      const result = computeReadiness(statuses);
      expect(result.loiReady).toBe(false);
      expect(result.loiBlockers).toHaveLength(1);
      expect(result.loiBlockers[0]).toBe(LOI_CRITICAL_IDS[0]);
    });

    it("LOI-critical at in_progress is still a blocker", () => {
      const statuses = LOI_CRITICAL_IDS.map((id) => ({
        requirementId: id,
        status: "in_progress" as const,
      }));
      const result = computeReadiness(statuses);
      expect(result.loiReady).toBe(false);
      expect(result.loiBlockers).toHaveLength(LOI_CRITICAL_IDS.length);
    });

    it("loiBlockers only contains LOI-critical IDs", () => {
      const result = computeReadiness([]);
      for (const id of result.loiBlockers) {
        expect(LOI_CRITICAL_SET.has(id)).toBe(true);
      }
    });

    it("non-LOI-critical requirements at not_started don't appear in loiBlockers", () => {
      // All LOI-critical complete, non-critical all not_started
      const statuses = LOI_CRITICAL_IDS.map((id) => ({
        requirementId: id,
        status: "executed" as const,
      }));
      const result = computeReadiness(statuses);
      expect(result.loiReady).toBe(true);
      expect(result.loiBlockers).toHaveLength(0);
    });
  });

  describe("category scores", () => {
    it("all contracts executed, rest not_started → categoryScores.contracts=10000", () => {
      const contractIds = EXIM_REQUIREMENTS.filter(
        (r) => r.category === "contracts"
      ).map((r) => r.id);
      const statuses = contractIds.map((id) => ({
        requirementId: id,
        status: "executed" as const,
      }));
      const result = computeReadiness(statuses);
      expect(result.categoryScores["contracts"]).toBe(10000);
    });

    it("all contracts at draft → categoryScores.contracts=5000", () => {
      const contractIds = EXIM_REQUIREMENTS.filter(
        (r) => r.category === "contracts"
      ).map((r) => r.id);
      const statuses = contractIds.map((id) => ({
        requirementId: id,
        status: "draft" as const,
      }));
      const result = computeReadiness(statuses);
      expect(result.categoryScores["contracts"]).toBe(5000);
    });

    it("all contracts not_started → categoryScores.contracts=0", () => {
      expect(computeReadiness([]).categoryScores["contracts"]).toBe(0);
    });

    it("category scores are independent — changing financial doesn't affect contracts", () => {
      const contractsOnly = EXIM_REQUIREMENTS.filter(
        (r) => r.category === "contracts"
      ).map((r) => ({ requirementId: r.id, status: "executed" as const }));

      const withFinancial = [
        ...contractsOnly,
        ...EXIM_REQUIREMENTS.filter((r) => r.category === "financial").map(
          (r) => ({ requirementId: r.id, status: "in_progress" as const })
        ),
      ];

      const a = computeReadiness(contractsOnly);
      const b = computeReadiness(withFinancial);
      expect(a.categoryScores["contracts"]).toBe(b.categoryScores["contracts"]);
    });

    it("returns a score entry for all 6 categories", () => {
      const result = computeReadiness(allWith("executed"));
      const expectedCategories = [
        "contracts",
        "financial",
        "studies",
        "permits",
        "corporate",
        "environmental_social",
      ];
      for (const cat of expectedCategories) {
        expect(result.categoryScores).toHaveProperty(cat);
      }
    });
  });

  describe("edge cases", () => {
    it("duplicate requirementId — last entry wins, score is not corrupted", () => {
      // epc_contract appears twice: first as not_started, then as executed
      const statuses = [
        { requirementId: "epc_contract", status: "not_started" as const },
        { requirementId: "epc_contract", status: "executed" as const },
      ];
      const expected = Math.round((200 / TOTAL_WEIGHT) * 10000);
      expect(computeReadiness(statuses).scoreBps).toBe(expected);
    });

    it("unknown requirementId in input is silently ignored", () => {
      const statuses = [
        { requirementId: "nonexistent_requirement", status: "executed" as const },
      ];
      expect(computeReadiness(statuses).scoreBps).toBe(0);
    });

    it("not_applicable is excluded from both numerator and denominator", () => {
      // Mark all as not_applicable except epc_contract which is executed.
      // Score should be 10000 (100%) because epc_contract is the only applicable item.
      const statuses = EXIM_REQUIREMENTS.map((r) => ({
        requirementId: r.id,
        status: (r.id === "epc_contract" ? "executed" : "not_applicable") as RequirementStatusValue,
      }));
      expect(computeReadiness(statuses).scoreBps).toBe(10000);
    });

    it("not_applicable LOI-critical items are not included in loiBlockers", () => {
      // All requirements not_applicable except epc_contract which is executed.
      const statuses = EXIM_REQUIREMENTS.map((r) => ({
        requirementId: r.id,
        status: (r.id === "epc_contract" ? "executed" : "not_applicable") as RequirementStatusValue,
      }));
      const result = computeReadiness(statuses);
      expect(result.loiReady).toBe(true);
      expect(result.loiBlockers).toHaveLength(0);
    });

    it("all not_applicable → scoreBps=0 (no applicable items)", () => {
      const statuses = EXIM_REQUIREMENTS.map((r) => ({
        requirementId: r.id,
        status: "not_applicable" as const,
      }));
      expect(computeReadiness(statuses).scoreBps).toBe(0);
    });
  });
});
