import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  BUSINESS_PLAN_ORDER,
  BUSINESS_PLANS,
  BUSINESS_SYSTEMS,
  PERSONAL_PLAN_ORDER,
  PERSONAL_PLANS,
  getBusinessPlanPrice,
  getPersonalPlanPrice,
  getPricingTier,
} from "./catalog";
import {
  BUSINESS_PLAN_MARKETING,
  PERSONAL_PLAN_MARKETING,
  PRICING_FAQS,
} from "./marketing";

const root = resolve(process.cwd());

function read(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

describe("frontend-only global pricing experience", () => {
  it("publishes every approved Personal and Business plan", () => {
    expect(PERSONAL_PLAN_ORDER).toEqual(["free", "go", "student", "plus", "pro"]);
    expect(BUSINESS_PLAN_ORDER).toEqual([
      "business_free",
      "solo",
      "starter",
      "growth",
      "scale",
      "enterprise",
    ]);

    for (const plan of PERSONAL_PLAN_ORDER) {
      expect(PERSONAL_PLANS[plan].name).toBeTruthy();
      expect(PERSONAL_PLAN_MARKETING[plan].summary.length).toBeGreaterThan(40);
      expect(PERSONAL_PLAN_MARKETING[plan].outcomes).toHaveLength(3);
    }

    for (const plan of BUSINESS_PLAN_ORDER) {
      expect(BUSINESS_PLANS[plan].name).toBeTruthy();
      expect(BUSINESS_PLAN_MARKETING[plan].summary.length).toBeGreaterThan(40);
      expect(BUSINESS_PLAN_MARKETING[plan].outcomes).toHaveLength(3);
    }
  });

  it("keeps regional prices deterministic", () => {
    expect(getPricingTier("PK")).toBe("D");
    expect(getPricingTier("US")).toBe("A");
    expect(getPersonalPlanPrice("plus", "PK", "annual")).toBe(24);
    expect(getBusinessPlanPrice("growth", "PK", "monthly")).toBe(29);
  });

  it("keeps permanent Free paths and global business-system coverage", () => {
    expect(PERSONAL_PLANS.free.features.core_tracking).toBe(true);
    expect(BUSINESS_PLANS.business_free.includedSeats).toBe(1);
    expect(BUSINESS_PLANS.business_free.includedBranches).toBe(1);
    expect(BUSINESS_SYSTEMS.length).toBeGreaterThanOrEqual(12);
    expect(PRICING_FAQS.some((faq) => faq.question.includes("pay today"))).toBe(true);
  });

  it("locks responsive cards, mobile comparison scrolling, and detail routes", () => {
    const pricing = read("components/pricing/PricingExperience.tsx");
    const detail = read("app/pricing/[universe]/[plan]/page.tsx");
    const selection = read("app/plan-selected/page.tsx");

    expect(pricing).toContain("sm:grid-cols-2");
    expect(pricing).toContain("xl:grid-cols-5");
    expect(pricing).toContain("2xl:grid-cols-6");
    expect(pricing).toContain("overflow-x-auto");
    expect(pricing).toContain("Continue Free");
    expect(pricing).toContain("/pricing/personal/");
    expect(pricing).toContain("/pricing/business/");
    expect(detail).toContain("generateStaticParams");
    expect(selection).toContain("cannot charge a card");
  });

  it("contains no provider secret or payment API integration in pricing frontend", () => {
    const files = [
      read("components/pricing/PricingExperience.tsx"),
      read("app/pricing/page.tsx"),
      read("app/pricing/[universe]/[plan]/page.tsx"),
      read("app/plan-selected/page.tsx"),
      read("lib/pricing/catalog.ts"),
    ].join("\n");

    for (const forbidden of [
      "PADDLE_API_KEY",
      "PADDLE_WEBHOOK_SECRET",
      "Paddle.Initialize",
      "/api/billing",
      "card_number",
      "cvv",
      "service_role",
    ]) {
      expect(files).not.toContain(forbidden);
    }
  });
});
