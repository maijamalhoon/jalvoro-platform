import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import type { AdminAccessSnapshot } from "./access-operations";
import type { BillingOperationsSnapshot } from "./billing-operations";
import type { AdminComplianceAuditSnapshot } from "./compliance-audit";
import type { AdminControlCenterSnapshot } from "./control-center";
import type { AdminIncidentOperationsSnapshot } from "./incident-operations";
import {
  deriveAdminReleaseReadiness,
  parseAdminReleaseReadinessSnapshot,
  type AdminReleaseReadinessSnapshot,
} from "./release-readiness";
import type { AdminSecurityPosture } from "./security-posture";

const root = resolve(process.cwd());

function read(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

function releaseFixture() {
  return {
    releaseReadiness: {
      approvalAllowed: true,
      mode: "approve",
      approvalRetentionMonths: 24,
      approvalValidityHours: 24,
      rawIdentityReturned: false,
      financeContentReturned: false,
      runtimeSecretsStored: false,
      freeTextStored: false,
      database: {
        requiredMigrationsApplied: 11,
        requiredMigrationsTotal: 11,
        rlsTablesProtected: 11,
        rlsTablesTotal: 11,
        directAccessDenied: 11,
        directAccessChecksTotal: 11,
        appendOnlyTriggers: 6,
        appendOnlyTriggersExpected: 6,
        requiredFunctionsPresent: 8,
        requiredFunctionsTotal: 8,
        permissionChecksPassed: 8,
        permissionChecksTotal: 8,
      },
      approvals: [
        {
          releaseCode: "REL-A1B2C3D4E5F6",
          revisionSha: "a".repeat(40),
          environment: "production",
          status: "active",
          databaseState: "verified",
          approvedAt: "2026-07-24T10:00:00.000Z",
          expiresAt: "2026-07-25T10:00:00.000Z",
          revokedAt: null,
        },
      ],
    },
  };
}

function derivedInputs() {
  const snapshot = {
    privacy: {
      openRequests: 0,
      overdueRequests: 0,
      expiredTelemetryPending: 0,
      expiredAdminAuditPending: 0,
      expiredRequestAuditPending: 0,
    },
  } as AdminControlCenterSnapshot;
  const billing = {
    providerConnected: true,
    webhooks: { failed24h: 0, pending: 0, expiredPending: 0 },
    expiredAuditPending: 0,
  } as BillingOperationsSnapshot;
  const access = {
    counts: {
      activeOwners: 2,
      pendingInvitations: 0,
      disabledMembers: 0,
    },
  } as AdminAccessSnapshot;
  const incidents = {
    counts: {
      open: 0,
      acknowledged: 0,
      investigating: 0,
      monitoring: 0,
      criticalOpen: 0,
      overdueOpen: 0,
      expiredAuditPending: 0,
      expiredIncidentsPending: 0,
    },
  } as AdminIncidentOperationsSnapshot;
  const compliance = {
    counts: {
      flagged30d: 0,
      attentionPending: 0,
      integrityMismatches: 0,
      expiredReviewsPending: 0,
      expiredReviewAuditPending: 0,
    },
  } as AdminComplianceAuditSnapshot;
  const posture = {
    overall: "healthy",
    boundaryChecksPassed: 13,
  } as AdminSecurityPosture;
  const release = parseAdminReleaseReadinessSnapshot(
    releaseFixture(),
  ) as AdminReleaseReadinessSnapshot;
  const runtime = {
    vercel: true,
    environment: "production" as const,
    revisionSha: "a".repeat(40),
    deploymentId: "dpl_1234567890ABCDEFG",
  };

  return {
    snapshot,
    billing,
    access,
    incidents,
    compliance,
    posture,
    release,
    runtime,
  };
}

describe("Admin release readiness", () => {
  it("parses bounded database controls and opaque approvals", () => {
    const parsed = parseAdminReleaseReadinessSnapshot(releaseFixture());

    expect(parsed).not.toBeNull();
    expect(parsed?.database.requiredMigrationsApplied).toBe(11);
    expect(parsed?.approvals[0]?.releaseCode).toBe("REL-A1B2C3D4E5F6");
  });

  it("fails closed on identity, finance or digest output", () => {
    const identity = releaseFixture() as Record<string, unknown>;
    (identity.releaseReadiness as Record<string, unknown>).approvedBy =
      "00000000-0000-0000-0000-000000000000";
    expect(parseAdminReleaseReadinessSnapshot(identity)).toBeNull();

    const finance = releaseFixture() as Record<string, unknown>;
    (finance.releaseReadiness as Record<string, unknown>).balance = 100;
    expect(parseAdminReleaseReadinessSnapshot(finance)).toBeNull();

    const digest = releaseFixture() as Record<string, unknown>;
    (digest.releaseReadiness as Record<string, unknown>).readinessDigest = "raw";
    expect(parseAdminReleaseReadinessSnapshot(digest)).toBeNull();
  });

  it("rejects impossible database control counts", () => {
    const invalid = releaseFixture();
    invalid.releaseReadiness.database.requiredMigrationsApplied = 12;
    expect(parseAdminReleaseReadinessSnapshot(invalid)).toBeNull();
  });

  it("returns ready only with controls, runtime evidence and approval", () => {
    const readiness = deriveAdminReleaseReadiness(derivedInputs());

    expect(readiness.overall).toBe("ready");
    expect(readiness.releaseReady).toBe(true);
    expect(readiness.blockedChecks).toBe(0);
  });

  it("blocks overdue privacy and stale approvals", () => {
    const overdue = derivedInputs();
    overdue.snapshot.privacy.overdueRequests = 1;
    expect(deriveAdminReleaseReadiness(overdue).overall).toBe("blocked");

    const stale = derivedInputs();
    stale.release.approvals[0]!.databaseState = "stale";
    expect(deriveAdminReleaseReadiness(stale).overall).toBe("blocked");
  });

  it("keeps the Admin page on one aggregate RPC and server rendering", () => {
    const page = read("app/admin/page.tsx");
    const panel = read("components/admin/AdminReleaseReadinessPanel.tsx");
    const actions = read("app/admin/release-actions.ts");

    expect(page.match(/\.rpc\(/g)).toHaveLength(1);
    expect(page).toContain("parseAdminReleaseReadinessSnapshot");
    expect(page).toContain("AdminReleaseReadinessPanel");
    expect(panel).not.toContain('"use client"');
    expect(panel).toContain("No additional client polling");
    expect(actions).toContain('"use server"');
    expect(actions).toContain("approve_admin_release");
  });

  it("requires Owner approval, digest binding and append-only audit", () => {
    const migration = read(
      "supabase/migrations/20260724113000_admin_release_readiness_center.sql",
    );

    expect(migration).toContain("owner_release_approval_required");
    expect(migration).toContain("admin_release_database_state_digest");
    expect(migration).toContain("admin_release_approval_audit_append_only");
    expect(migration).toContain("release_readiness_blocked");
    expect(migration).toContain("interval '24 hours'");
  });

  it("does not introduce free-text or sensitive release fields", () => {
    const migration = read(
      "supabase/migrations/20260724113000_admin_release_readiness_center.sql",
    );
    const panel = read("components/admin/AdminReleaseReadinessPanel.tsx");

    expect(migration).not.toMatch(
      /\b(description|notes|comment|raw_payload|email|finance_data)\s+(text|jsonb)/i,
    );
    expect(panel).not.toContain("textarea");
  });
});
