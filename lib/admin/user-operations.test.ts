import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { parseAdminUserOperationsSnapshot } from "./user-operations";

const root = resolve(process.cwd());

function read(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

function validSnapshot() {
  return {
    userOperations: {
      operationsMode: "read_only",
      lookupKey: "opaque_reference",
      rawEmailReturned: false,
      userIdReturned: false,
      financeDataReturned: false,
      providerIdentifiersReturned: false,
      counts: {
        totalUsers: 2,
        onboardingComplete: 1,
        onboardingPending: 1,
        signedIn30d: 1,
        inactive90d: 0,
        neverSignedIn: 1,
        freeUsers: 1,
        trialingUsers: 1,
        activePaidUsers: 0,
        pastDueUsers: 0,
      },
      users: [
        {
          userReference: "USR-A1B2C3D4E5F6",
          maskedEmail: "j*****@example.com",
          onboardingStatus: "complete",
          activityState: "active_30d",
          joinedAt: "2026-07-01T00:00:00.000Z",
          lastSignInAt: "2026-07-23T00:00:00.000Z",
          planCode: "free",
          planName: "Free",
          planKind: "free",
          subscriptionStatus: "free",
          trialEndsAt: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        },
        {
          userReference: "USR-0A1B2C3D4E5F",
          maskedEmail: "a****@example.net",
          onboardingStatus: "pending",
          activityState: "never_signed_in",
          joinedAt: "2026-07-20T00:00:00.000Z",
          lastSignInAt: null,
          planCode: "pro_trial",
          planName: "Pro Trial",
          planKind: "paid",
          subscriptionStatus: "trialing",
          trialEndsAt: "2026-08-03T00:00:00.000Z",
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        },
      ],
    },
  };
}

describe("admin user operations", () => {
  it("parses masked account, onboarding and subscription state", () => {
    const parsed = parseAdminUserOperationsSnapshot(validSnapshot());

    expect(parsed?.counts.totalUsers).toBe(2);
    expect(parsed?.users).toHaveLength(2);
    expect(parsed?.users[0]?.userReference).toBe("USR-A1B2C3D4E5F6");
    expect(parsed?.users[1]?.subscriptionStatus).toBe("trialing");
  });

  it("fails closed on identity, provider or finance keys", () => {
    for (const unsafe of [
      { email: "full@example.com" },
      { userId: "00000000-0000-0000-0000-000000000000" },
      { providerSubscriptionId: "external-reference" },
      { balance: 100 },
      { transaction: { memo: "private" } },
    ]) {
      const snapshot = validSnapshot();
      Object.assign(snapshot.userOperations.users[0]!, unsafe);
      expect(parseAdminUserOperationsSnapshot(snapshot)).toBeNull();
    }
  });

  it("rejects unmasked identities and inconsistent onboarding totals", () => {
    const exposed = validSnapshot();
    exposed.userOperations.users[0]!.maskedEmail = "jamal@example.com";
    expect(parseAdminUserOperationsSnapshot(exposed)).toBeNull();

    const inconsistent = validSnapshot();
    inconsistent.userOperations.counts.onboardingPending = 0;
    expect(parseAdminUserOperationsSnapshot(inconsistent)).toBeNull();
  });

  it("keeps the database directory aggregate-only and bounded", () => {
    const migration = read(
      "supabase/migrations/20260724060000_admin_user_account_operations.sql",
    );

    expect(migration).toContain("private.get_admin_user_operations_snapshot");
    expect(migration).toContain("private.platform_user_reference");
    expect(migration).toContain("'operationsMode', 'read_only'");
    expect(migration).toContain("'lookupKey', 'opaque_reference'");
    expect(migration).toContain("'rawEmailReturned', false");
    expect(migration).toContain("'userIdReturned', false");
    expect(migration).toContain("'financeDataReturned', false");
    expect(migration).toContain("'providerIdentifiersReturned', false");
    expect(migration).toContain("limit 100");
    expect(migration).not.toContain("provider_customer_id");
    expect(migration).not.toContain("provider_subscription_id");
    expect(migration).not.toMatch(/jsonb_build_object\([\s\S]*?'userId'/);
  });

  it("preserves one aggregate RPC and opaque-reference-only UI lookup", () => {
    const page = read("app/admin/page.tsx");
    const panel = read("components/admin/AdminUserOperationsPanel.tsx");

    expect(page.match(/\.rpc\(/g)).toHaveLength(1);
    expect(page).toContain("parseAdminUserOperationsSnapshot");
    expect(page).toContain("AdminUserOperationsPanel");
    expect(panel).toContain("user.userReference.startsWith(normalizedQuery)");
    expect(panel).not.toContain("user.maskedEmail.includes");
    expect(panel).toContain("Opaque lookup");
    expect(panel).toContain("Full email returned");
    expect(panel).toContain("Provider IDs returned");
  });
});
