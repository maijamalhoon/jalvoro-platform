import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { BUSINESS_PLAN_ORDER } from "./business-catalog";
import { PLAN_ORDER } from "./catalog";
import {
  BUSINESS_PLAN_MARKETING,
  PERSONAL_PLAN_MARKETING,
  PRICING_FAQS,
} from "./marketing";

const root = resolve(process.cwd());

function read(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

describe("global pricing experience", () => {
  it("has complete customer-facing marketing content for every plan", () => {
    for (const plan of PLAN_ORDER) {
      const content = PERSONAL_PLAN_MARKETING[plan];
      expect(content.headline.length).toBeGreaterThan(12);
      expect(content.summary.length).toBeGreaterThan(30);
      expect(content.outcomes).toHaveLength(3);
      expect(content.idealFor).toHaveLength(3);
      expect(content.confidence).toHaveLength(3);
    }

    for (const plan of BUSINESS_PLAN_ORDER) {
      const content = BUSINESS_PLAN_MARKETING[plan];
      expect(content.headline.length).toBeGreaterThan(12);
      expect(content.summary.length).toBeGreaterThan(30);
      expect(content.outcomes).toHaveLength(3);
      expect(content.idealFor).toHaveLength(3);
      expect(content.confidence).toHaveLength(3);
    }

    expect(PRICING_FAQS.length).toBeGreaterThanOrEqual(6);
  });

  it("keeps the overview responsive, comparable, and Free-first", () => {
    const pricing = read("components/billing/RegionalPricing.tsx");

    expect(pricing).toContain("sm:grid-cols-2");
    expect(pricing).toContain("overflow-x-auto");
    expect(pricing).toContain("Continue Free");
    expect(pricing).toContain("PRICING_FAQS");
    expect(pricing).toContain("/pricing/personal/");
    expect(pricing).toContain("/pricing/business/");
    expect(pricing).toContain("Business data stays AI-free");
    expect(pricing).not.toContain("PADDLE_API_KEY");
    expect(pricing).not.toContain("PADDLE_WEBHOOK_SECRET");
  });

  it("keeps detailed plan pages checkout-ready but unable to charge today", () => {
    const detail = read("app/pricing/[universe]/[plan]/page.tsx");
    const landing = read("app/pricing/page.tsx");

    expect(detail).toContain("Payment processing remains disabled");
    expect(detail).toContain("No charge can happen from this page today");
    expect(detail).toContain("Continue Free instead");
    expect(detail).toContain("sm:grid-cols-2");
    expect(detail).toContain("lg:grid-cols");
    expect(landing).toContain("Provider connection comes last");
    expect(landing).toContain("Explore all plans");
    expect(landing).toContain("Continue Free");
  });
});
