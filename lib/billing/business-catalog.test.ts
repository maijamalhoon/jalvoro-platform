import { describe, expect, it } from "vitest";

import {
  BUSINESS_PLAN_ORDER,
  BUSINESS_PLANS,
  BUSINESS_SYSTEMS,
  businessPlanKeyFromPlanCode,
  getBusinessAnnualSavingsPercent,
  getBusinessPlanPrice,
} from "./business-catalog";

describe("business billing catalog", () => {
  it("keeps personal and business plan identities separate", () => {
    expect(BUSINESS_PLAN_ORDER).toEqual([
      "business_free",
      "solo",
      "starter",
      "growth",
      "scale",
      "enterprise",
    ]);
    expect(businessPlanKeyFromPlanCode("growth_year")).toBe("growth");
    expect(businessPlanKeyFromPlanCode("enterprise_contract")).toBe(
      "enterprise",
    );
    expect(businessPlanKeyFromPlanCode("pro_month")).toBeNull();
  });

  it("uses accessible business pricing for Pakistan", () => {
    expect(getBusinessPlanPrice("solo", "PK", "monthly")).toBe(3.99);
    expect(getBusinessPlanPrice("starter", "PK", "annual")).toBe(84);
    expect(getBusinessPlanPrice("growth", "PK", "monthly")).toBe(29);
  });

  it("keeps annual business prices below twelve monthly payments", () => {
    expect(getBusinessAnnualSavingsPercent("solo", "US")).toBeGreaterThan(0);
    expect(getBusinessAnnualSavingsPercent("growth", "PK")).toBeGreaterThan(0);
    expect(getBusinessAnnualSavingsPercent("scale", "NG")).toBeGreaterThan(0);
  });

  it("separates seats, branches, and enterprise custom pricing", () => {
    expect(BUSINESS_PLANS.solo.includedSeats).toBe(2);
    expect(BUSINESS_PLANS.growth.includedBranches).toBe(3);
    expect(BUSINESS_PLANS.scale.includedSeats).toBe(50);
    expect(BUSINESS_PLANS.enterprise.customPricing).toBe(true);
    expect(BUSINESS_PLANS.enterprise.includedSeats).toBeNull();
  });

  it("keeps AI out of every business plan", () => {
    for (const plan of Object.values(BUSINESS_PLANS)) {
      expect("ai_insights" in plan.features).toBe(false);
    }
  });

  it("models business natures as distinct operating systems", () => {
    const codes = BUSINESS_SYSTEMS.map((system) => system.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).toContain("dealership");
    expect(codes).toContain("retail_pos");
    expect(codes).toContain("restaurant");
    expect(codes).toContain("construction");
    expect(codes).toContain("manufacturing");
    expect(BUSINESS_PLAN_ORDER).not.toContain("dealership");
  });
});
