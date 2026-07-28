import { describe, expect, it } from "vitest";

import {
  getAnnualSavingsPercent,
  getPlanPrice,
  getPricingTier,
  planKeyFromPlanCode,
} from "./catalog";
import {
  canUseFeature,
  getRemainingUsage,
  resolveAccessPlan,
} from "./entitlements";

describe("regional billing catalog", () => {
  it("maps Pakistan and India to the accessible pricing tier", () => {
    expect(getPricingTier("PK")).toBe("D");
    expect(getPricingTier("in")).toBe("D");
    expect(getPlanPrice("student", "PK", "annual")).toBe(15);
  });

  it("falls back safely for unknown country codes", () => {
    expect(getPricingTier("XX")).toBe("C");
    expect(getPlanPrice("pro", "XX", "monthly")).toBe(7.99);
  });

  it("maps database plan codes to product families", () => {
    expect(planKeyFromPlanCode("student_year")).toBe("student");
    expect(planKeyFromPlanCode("pro_month")).toBe("pro");
    expect(planKeyFromPlanCode("unknown_plan")).toBeNull();
  });

  it("keeps annual plans cheaper than twelve monthly payments", () => {
    expect(getAnnualSavingsPercent("go", "PK")).toBeGreaterThan(0);
    expect(getAnnualSavingsPercent("pro", "US")).toBeGreaterThan(0);
  });
});

describe("billing entitlements", () => {
  const now = new Date("2026-07-24T12:00:00.000Z");

  it("keeps an active trial on the selected plan", () => {
    expect(resolveAccessPlan({
      planKey: "pro",
      status: "trialing",
      trialEndsAt: "2026-08-01T00:00:00.000Z",
    }, now)).toBe("pro");
  });

  it("downgrades an expired trial without deleting user data", () => {
    expect(resolveAccessPlan({
      planKey: "pro",
      status: "trialing",
      trialEndsAt: "2026-07-20T00:00:00.000Z",
    }, now)).toBe("free");
  });

  it("ends access for an incomplete subscription", () => {
    expect(resolveAccessPlan({
      planKey: "plus",
      status: "incomplete",
    }, now)).toBe("free");
  });

  it("honors the AI allowance and reports remaining usage", () => {
    expect(canUseFeature("student", "ai_insights", 24)).toBe(true);
    expect(canUseFeature("student", "ai_insights", 25)).toBe(false);
    expect(getRemainingUsage("student", "ai_insights", 9)).toBe(16);
  });
});
