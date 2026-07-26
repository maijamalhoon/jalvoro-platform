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

  it("does not render paid-plan administration", () => {
    expect(adminPage).not.toContain("BillingPlanOperations");
  });

  it("fails the legacy plan mutation closed", () => {
    expect(billingAction).toContain("billingAction=out-of-scope");
    expect(billingAction).not.toContain(".rpc(");
  });
});
