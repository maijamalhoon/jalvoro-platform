import { describe, expect, it } from "vitest";

import {
  businessPlanCode,
  isBillingCycle,
  isBusinessPlanKey,
  isPaidPlanKey,
  isSelfServeBusinessPlan,
  personalPlanCode,
} from "./checkout";

describe("checkout validation", () => {
  it("accepts only supported billing cycles", () => {
    expect(isBillingCycle("monthly")).toBe(true);
    expect(isBillingCycle("annual")).toBe(true);
    expect(isBillingCycle("weekly")).toBe(false);
  });

  it("recognizes every personal paid plan key", () => {
    for (const plan of ["go", "student", "plus", "pro"]) {
      expect(isPaidPlanKey(plan)).toBe(true);
    }
    expect(isPaidPlanKey("free")).toBe(false);
    expect(isPaidPlanKey("growth")).toBe(false);
  });

  it("recognizes every business plan key", () => {
    for (const plan of [
      "business_free",
      "solo",
      "starter",
      "growth",
      "scale",
      "enterprise",
    ]) {
      expect(isBusinessPlanKey(plan)).toBe(true);
    }
    expect(isBusinessPlanKey("pro")).toBe(false);
  });

  it("keeps Free and Enterprise out of business self-service checkout", () => {
    expect(isSelfServeBusinessPlan("business_free")).toBe(false);
    expect(isSelfServeBusinessPlan("enterprise")).toBe(false);
    expect(isSelfServeBusinessPlan("solo")).toBe(true);
    expect(isSelfServeBusinessPlan("growth")).toBe(true);
  });

  it("maps personal plan and cycle to stable provider-neutral codes", () => {
    expect(personalPlanCode("go", "monthly")).toBe("go_month");
    expect(personalPlanCode("student", "annual")).toBe("student_year");
    expect(personalPlanCode("pro", "annual")).toBe("pro_year");
  });

  it("maps business plan and cycle to stable provider-neutral codes", () => {
    expect(businessPlanCode("solo", "monthly")).toBe("solo_month");
    expect(businessPlanCode("starter", "annual")).toBe("starter_year");
    expect(businessPlanCode("scale", "annual")).toBe("scale_year");
  });
});
