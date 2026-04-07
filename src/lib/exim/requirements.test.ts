import { describe, it, expect } from "vitest";
import {
  EXIM_REQUIREMENTS,
  LOI_CRITICAL_IDS,
  TOTAL_WEIGHT,
  REQUIREMENTS_BY_ID,
  REQUIREMENT_CATEGORIES,
  type EximRequirementDef,
} from "./requirements";

describe("EXIM requirements taxonomy", () => {
  it("has at least 40 requirements", () => {
    expect(EXIM_REQUIREMENTS.length).toBeGreaterThanOrEqual(40);
  });

  it("assigns every requirement a unique id", () => {
    const ids = EXIM_REQUIREMENTS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("assigns every requirement a positive weight", () => {
    for (const req of EXIM_REQUIREMENTS) {
      expect(req.weight, `${req.id} should have positive weight`).toBeGreaterThan(0);
    }
  });

  it("assigns every requirement a valid category", () => {
    const validCategories = new Set<string>(REQUIREMENT_CATEGORIES);
    for (const req of EXIM_REQUIREMENTS) {
      expect(validCategories.has(req.category), `${req.id} has invalid category: ${req.category}`).toBe(true);
    }
  });

  it("assigns every requirement a valid phaseRequired", () => {
    const validPhases = new Set(["loi", "final_commitment"]);
    for (const req of EXIM_REQUIREMENTS) {
      expect(validPhases.has(req.phaseRequired), `${req.id} has invalid phase: ${req.phaseRequired}`).toBe(true);
    }
  });

  it("covers all 6 categories", () => {
    const categoriesUsed = new Set(EXIM_REQUIREMENTS.map((r) => r.category));
    for (const cat of REQUIREMENT_CATEGORIES) {
      expect(categoriesUsed.has(cat), `missing category: ${cat}`).toBe(true);
    }
  });
});

describe("LOI_CRITICAL_IDS", () => {
  it("contains only IDs that have isLoiCritical=true", () => {
    for (const id of LOI_CRITICAL_IDS) {
      const req = REQUIREMENTS_BY_ID.get(id);
      expect(req, `${id} not found in REQUIREMENTS_BY_ID`).toBeDefined();
      expect(req!.isLoiCritical, `${id} should be LOI-critical`).toBe(true);
    }
  });

  it("includes every isLoiCritical requirement", () => {
    const criticalReqs = EXIM_REQUIREMENTS.filter((r) => r.isLoiCritical);
    expect(LOI_CRITICAL_IDS.length).toBe(criticalReqs.length);
  });

  it("has at least 10 LOI-critical items", () => {
    expect(LOI_CRITICAL_IDS.length).toBeGreaterThanOrEqual(10);
  });
});

describe("REQUIREMENTS_BY_ID", () => {
  it("maps every requirement by its id", () => {
    expect(REQUIREMENTS_BY_ID.size).toBe(EXIM_REQUIREMENTS.length);
    for (const req of EXIM_REQUIREMENTS) {
      expect(REQUIREMENTS_BY_ID.get(req.id)).toBe(req);
    }
  });
});

describe("TOTAL_WEIGHT", () => {
  it("equals the sum of all requirement weights", () => {
    const computed = EXIM_REQUIREMENTS.reduce((s, r) => s + r.weight, 0);
    expect(TOTAL_WEIGHT).toBe(computed);
  });

  it("is a positive integer", () => {
    expect(TOTAL_WEIGHT).toBeGreaterThan(0);
    expect(Number.isInteger(TOTAL_WEIGHT)).toBe(true);
  });
});

describe("sortOrder consistency", () => {
  it("has unique sortOrder within each category", () => {
    const byCategory = new Map<string, number[]>();
    for (const req of EXIM_REQUIREMENTS) {
      const orders = byCategory.get(req.category) ?? [];
      orders.push(req.sortOrder);
      byCategory.set(req.category, orders);
    }
    for (const [category, orders] of byCategory) {
      expect(new Set(orders).size, `duplicate sortOrder in ${category}`).toBe(orders.length);
    }
  });
});
