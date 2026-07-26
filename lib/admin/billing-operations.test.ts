import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  formatPlanPrice,
  parseBillingOperationsSnapshot,
} from "./billing-operations";

const validSnapshot = {
  billingOperations: {
    operationsAllowed: true,
    providerConnected: false,
    planCatalog: [
      {
        code: "free",
        name: "Free",
        kind: "free",
        billingInterval: "free",
        priceMajor: 0,
        currency: null,
        currencyExponent: 2,
        isActive: true,
        totalUsers: 120,
        trialUsers: 0,
        activeUsers: 0,
        pastDueUsers: 0,
        cancelledUsers: 0,
        editable: false,
      },
      {
        code: "pro_monthly",
        name: "JALVORO Pro",
        kind: "paid",
        billingInterval: "month",
        priceMajor: 9.99,
        currency: "USD",
        currencyExponent: 2,
        isActive: true,
        totalUsers: 20,
        trialUsers: 3,
        activeUsers: 14,
        pastDueUsers: 1,
        cancelledUsers: 2,
        editable: true,
      },
    ],
    webhooks: {
      received24h: 12,
      pending: 1,
      processed24h: 10,
      failed24h: 1,
      ignored24h: 0,
      lastReceivedAt: "2026-07-24T03:00:00.000Z",
      lastProcessedAt: "2026-07-24T03:01:00.000Z",
      expiredPending: 0,
    },
    auditEvents30d: 4,
    expiredAuditPending: 0,
    rawWebhookPayloadStored: false,
    cardDataStored: false,
    featureLimitsAttached: false,
  },
};

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("billing plan operations contracts", () => {
  it("accepts the owner-safe plan catalog and webhook health snapshot", () => {
    expect(parseBillingOperationsSnapshot(validSnapshot)).toMatchObject({
      operationsAllowed: true,
      providerConnected: false,
      planCatalog: [
        { code: "free", editable: false },
        {
          code: "pro_monthly",
          priceMajor: 9.99,
          currency: "USD",
          editable: true,
        },
      ],
      webhooks: { received24h: 12, failed24h: 1 },
      rawWebhookPayloadStored: false,
      cardDataStored: false,
      featureLimitsAttached: false,
    });
  });

  it("fails closed on unsafe billing boundaries", () => {
    for (const unsafeBoundary of [
      "rawWebhookPayloadStored",
      "cardDataStored",
      "featureLimitsAttached",
    ] as const) {
      expect(
        parseBillingOperationsSnapshot({
          billingOperations: {
            ...validSnapshot.billingOperations,
            [unsafeBoundary]: true,
          },
        }),
      ).toBeNull();
    }
  });

  it("rejects malformed money, currency and subscriber totals", () => {
    expect(
      parseBillingOperationsSnapshot({
        billingOperations: {
          ...validSnapshot.billingOperations,
          planCatalog: [
            {
              ...validSnapshot.billingOperations.planCatalog[1],
              currency: "US",
            },
          ],
        },
      }),
    ).toBeNull();

    expect(
      parseBillingOperationsSnapshot({
        billingOperations: {
          ...validSnapshot.billingOperations,
          planCatalog: [
            {
              ...validSnapshot.billingOperations.planCatalog[1],
              priceMajor: -1,
            },
          ],
        },
      }),
    ).toBeNull();

    expect(
      parseBillingOperationsSnapshot({
        billingOperations: {
          ...validSnapshot.billingOperations,
          planCatalog: [
            {
              ...validSnapshot.billingOperations.planCatalog[1],
              totalUsers: 1,
            },
          ],
        },
      }),
    ).toBeNull();
  });

  it("protects the free plan invariant", () => {
    expect(
      parseBillingOperationsSnapshot({
        billingOperations: {
          ...validSnapshot.billingOperations,
          planCatalog: [
            {
              ...validSnapshot.billingOperations.planCatalog[0],
              editable: true,
            },
          ],
        },
      }),
    ).toBeNull();
  });

  it("formats global currency precision", () => {
    const parsed = parseBillingOperationsSnapshot(validSnapshot);
    expect(parsed).not.toBeNull();
    expect(formatPlanPrice(parsed!.planCatalog[0])).toBe("Free");
    expect(formatPlanPrice(parsed!.planCatalog[1])).toMatch(/9\.99/);
  });

  it("keeps billing data read-only and paid administration out of launch", () => {
    const page = read("app/admin/page.tsx");
    const action = read("app/admin/billing-actions.ts");
    const migration = read(
      "supabase/migrations/20260724041000_billing_plan_operations.sql",
    );

    expect(page).not.toContain('"use client"');
    expect(action).toContain('"use server"');
    expect(page.match(/\.rpc\(/g)).toHaveLength(1);
    expect(page).toContain("parseBillingOperationsSnapshot");
    expect(page).not.toContain("BillingPlanOperations");
    expect(action).toContain("billingAction=out-of-scope");
    expect(action).not.toContain(".rpc(");

    expect(migration).toContain("private.billing_plan_audit");
    expect(migration).toContain("billing_plan_audit_deny_direct");
    expect(migration).toContain("v_admin_role <> 'owner'");
    expect(migration).toContain("security invoker");
    expect(migration).toContain("featureLimitsAttached', false");
    expect(migration).toContain("rawWebhookPayloadStored', false");
    expect(migration).toContain("cardDataStored', false");
    expect(migration).not.toMatch(/payload\s+jsonb/i);
    expect(migration).not.toMatch(/card_(number|token)\s+text/i);
    expect(migration).not.toMatch(/cvv\s+text/i);
    expect(migration).not.toMatch(/feature_limit/i);
  });
});
