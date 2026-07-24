import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import type { AdminAccessSnapshot } from "./access-operations";
import type { BillingOperationsSnapshot } from "./billing-operations";
import type { AdminControlCenterSnapshot } from "./control-center";
import { deriveAdminSecurityPosture } from "./security-posture";
import type { AdminUserOperationsSnapshot } from "./user-operations";

const root = resolve(process.cwd());

function read(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

function fixtures() {
  const snapshot: AdminControlCenterSnapshot = {
    generatedAt: "2026-07-24T06:00:00.000Z",
    adminRole: "owner",
    featurePolicy: "unlimited",
    users: {
      total: 2,
      new7d: 1,
      new30d: 2,
      signedIn24h: 1,
      signedIn30d: 1,
    },
    billing: {
      freeUsers: 2,
      trialUsers: 0,
      paidUsers: 0,
      pastDueUsers: 0,
      cancelledUsers: 0,
      providerConnected: false,
      plans: [],
    },
    telemetry: {
      activeUsers24h: 1,
      activeUsers30d: 1,
      events24h: 4,
      failedOperations7d: 0,
      poorPerformanceSignals7d: 0,
      devices: [],
      countries: [],
      topRoutes: [],
      slowRoutes: [],
    },
    privacy: {
      openRequests: 0,
      overdueRequests: 0,
      completedRequests30d: 0,
      requestAuditEvents30d: 0,
      requestOperationsAllowed: true,
      requestQueue: [],
      adminViews30d: 1,
      telemetryEventsStored: 4,
      telemetrySubjectsStored: 1,
      expiredTelemetryPending: 0,
      expiredAdminAuditPending: 0,
      expiredRequestAuditPending: 0,
      lastRetentionRunAt: "2026-07-24T05:00:00.000Z",
      lastRetentionRowsDeleted: 0,
      telemetryRetentionDays: 30,
      adminAuditRetentionMonths: 24,
      requestAuditRetentionMonths: 24,
      rawIpStored: false,
      sessionReplayEnabled: false,
      financeContentInTelemetry: false,
    },
  };

  const access: AdminAccessSnapshot = {
    operationsAllowed: true,
    inviteDelivery: "manual_code",
    rawInviteTokenStored: false,
    userMetadataAuthorization: false,
    serviceRoleExposedToBrowser: false,
    counts: {
      activeOwners: 2,
      activeAdmins: 0,
      activeAnalysts: 0,
      activeSupport: 0,
      disabledMembers: 0,
      pendingInvitations: 0,
    },
    members: [],
    invitations: [],
    recentEvents: [],
  };

  const billing: BillingOperationsSnapshot = {
    operationsAllowed: true,
    providerConnected: false,
    planCatalog: [],
    webhooks: {
      received24h: 0,
      pending: 0,
      processed24h: 0,
      failed24h: 0,
      ignored24h: 0,
      lastReceivedAt: null,
      lastProcessedAt: null,
      expiredPending: 0,
    },
    auditEvents30d: 0,
    expiredAuditPending: 0,
    rawWebhookPayloadStored: false,
    cardDataStored: false,
    featureLimitsAttached: false,
  };

  const users: AdminUserOperationsSnapshot = {
    operationsMode: "read_only",
    lookupKey: "opaque_reference",
    rawEmailReturned: false,
    userIdReturned: false,
    financeDataReturned: false,
    providerIdentifiersReturned: false,
    counts: {
      totalUsers: 2,
      onboardingComplete: 2,
      onboardingPending: 0,
      signedIn30d: 2,
      inactive90d: 0,
      neverSignedIn: 0,
      freeUsers: 2,
      trialingUsers: 0,
      activePaidUsers: 0,
      pastDueUsers: 0,
    },
    users: [],
  };

  return { snapshot, access, billing, users };
}

describe("Admin security posture", () => {
  it("derives a healthy aggregate posture from existing validated snapshots", () => {
    const posture = deriveAdminSecurityPosture(fixtures());

    expect(posture.overall).toBe("healthy");
    expect(posture.criticalFindings).toBe(0);
    expect(posture.attentionFindings).toBe(0);
    expect(posture.boundaryChecksPassed).toBe(13);
    expect(posture.findings).toHaveLength(9);
  });

  it("raises critical findings for overdue privacy work and connected webhook failures", () => {
    const input = fixtures();
    input.snapshot.privacy.overdueRequests = 1;
    input.billing.providerConnected = true;
    input.billing.webhooks.failed24h = 3;

    const posture = deriveAdminSecurityPosture(input);

    expect(posture.overall).toBe("critical");
    expect(posture.criticalFindings).toBe(2);
    expect(
      posture.findings.find((finding) => finding.code === "PRIVACY_OVERDUE")
        ?.level,
    ).toBe("critical");
    expect(
      posture.findings.find((finding) => finding.code === "FAILED_WEBHOOKS")
        ?.level,
    ).toBe("critical");
  });

  it("treats a single owner as a continuity warning without inventing an incident", () => {
    const input = fixtures();
    input.access.counts.activeOwners = 1;

    const posture = deriveAdminSecurityPosture(input);

    expect(posture.overall).toBe("attention");
    expect(posture.criticalFindings).toBe(0);
    expect(
      posture.findings.find((finding) => finding.code === "OWNER_REDUNDANCY")
        ?.level,
    ).toBe("attention");
  });

  it("keeps the Admin page on one aggregate RPC and the panel server-rendered", () => {
    const page = read("app/admin/page.tsx");
    const panel = read("components/admin/AdminSecurityPosturePanel.tsx");

    expect(page.match(/\.rpc\(/g)).toHaveLength(1);
    expect(page).toContain("deriveAdminSecurityPosture");
    expect(page).toContain("AdminSecurityPosturePanel");
    expect(panel).not.toContain('"use client"');
    expect(panel).toContain("No additional database request or client polling");
  });

  it("does not add raw security logs or destructive account controls", () => {
    const posture = read("lib/admin/security-posture.ts");
    const panel = read("components/admin/AdminSecurityPosturePanel.tsx");
    const combined = `${posture}\n${panel}`;

    expect(combined).not.toContain("service_role");
    expect(combined).not.toContain("auth.sessions");
    expect(combined).not.toContain("deleteUser");
    expect(combined).not.toContain("ban_duration");
    expect(combined).not.toContain("rawUserId");
    expect(panel).toContain("Aggregate signals only");
  });
});
