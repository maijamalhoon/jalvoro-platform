import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const packageJson = readFileSync(resolve(root, "package.json"), "utf8");
const adminPage = readFileSync(resolve(root, "app/admin/page.tsx"), "utf8");
const billingAction = readFileSync(
  resolve(root, "app/admin/billing-actions.ts"),
  "utf8",
);

describe("payment launch scope", () => {
  it("does not ship Stripe runtime dependencies", () => {
    expect(packageJson).not.toContain('"stripe"');
    expect(packageJson).not.toContain('"@stripe/');
  });

  it("renders provider-neutral plan metadata administration", () => {
    expect(adminPage).toContain("BillingPlanOperations");
    expect(adminPage).toContain("parseBillingOperationsSnapshot");
  });

  it("keeps plan mutations owner-gated and checkout-free", () => {
    expect(billingAction).toContain("requireRateLimitedAdminClient");
    expect(billingAction).toContain('"apply_billing_plan_operation"');
    expect(billingAction).not.toContain("stripe");
    expect(billingAction).not.toContain("checkout");
  });
});
