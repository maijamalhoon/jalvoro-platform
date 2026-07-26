import { describe, expect, it } from "vitest";

import type { AdminAccessSnapshot } from "./access-operations";
import type { AdminControlCenterSnapshot } from "./control-center";
import {
  deriveCommandCenterDecisionOverview,
  deriveCommandCenterFreshness,
} from "./command-center-decision-overview";
import type { AdminIncidentOperationsSnapshot } from "./incident-operations";
import type { AdminSecurityPosture } from "./security-posture";

const NOW = Date.parse("2026-07-25T18:00:00.000Z");

function snapshot(): AdminControlCenterSnapshot {
  return {
    generatedAt: "2026-07-25T17:55:00.000Z",
    adminRole: "owner",
    featurePolicy: "unlimited",
    users: {
      total: 100,
      new7d: 5,
      new30d: 20,
      signedIn24h: 40,
      signedIn30d: 80,
    },
    billing: {
      freeUsers: 100,
      trialUsers: 0,
      paidUsers: 0,
      pastDueUsers: 0,
      cancelledUsers: 0,
      providerConnected: false,
      plans: [],
    },
    telemetry: {
      activeUsers24h: 30,
      activeUsers30d: 70,
      events24h: 500,
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
      adminViews30d: 0,
      telemetryEventsStored: 0,
      telemetrySubjectsStored: 0,
      expiredTelemetryPending: 0,
      expiredAdminAuditPending: 0,
      expiredRequestAuditPending: 0,
      lastRetentionRunAt: null,
      lastRetentionRowsDeleted: 0,
      telemetryRetentionDays: 30,
      adminAuditRetentionMonths: 12,
      requestAuditRetentionMonths: 12,
      rawIpStored: false,
      sessionReplayEnabled: false,
      financeContentInTelemetry: false,
    },
  };
}

function posture(): AdminSecurityPosture {
  return {
    overall: "healthy",
    criticalFindings: 0,
    attentionFindings: 0,
    healthyControls: 9,
    boundaryChecksPassed: 13,
    findings: [],
  };
}

function incidents(): AdminIncidentOperationsSnapshot {
  return {
    operationsAllowed: true,
    freeTextStored: false,
    rawIpStored: false,
    sessionReplayStored: false,
    userIdentityReturned: false,
    financeContentStored: false,
    providerPayloadStored: false,
    counts: {
      open: 0,
      acknowledged: 0,
      investigating: 0,
      monitoring: 0,
      criticalOpen: 0,
      overdueOpen: 0,
      resolved30d: 0,
      auditEvents30d: 0,
      expiredAuditPending: 0,
      expiredIncidentsPending: 0,
    },
    queue: [],
  };
}

function access(): AdminAccessSnapshot {
  return {
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
}

describe("Command Center decision overview", () => {
  it("classifies snapshot freshness without claiming live data indefinitely", () => {
    expect(
      deriveCommandCenterFreshness("2026-07-25T17:55:00.000Z", NOW).value,
    ).toBe("Live");
    expect(
      deriveCommandCenterFreshness("2026-07-25T17:30:00.000Z", NOW).value,
    ).toBe("Delayed");
    expect(
      deriveCommandCenterFreshness("2026-07-25T16:00:00.000Z", NOW).value,
    ).toBe("Stale");
    expect(deriveCommandCenterFreshness("invalid", NOW).value).toBe("Unknown");
    expect(
      deriveCommandCenterFreshness("2026-07-25T18:10:00.000Z", NOW).tone,
    ).toBe("attention");
  });

  it("raises overdue privacy work to critical even when incidents are clear", () => {
    const currentSnapshot = snapshot();
    currentSnapshot.privacy.openRequests = 2;
    currentSnapshot.privacy.overdueRequests = 1;

    const result = deriveCommandCenterDecisionOverview({
      snapshot: currentSnapshot,
      posture: posture(),
      incidents: incidents(),
      access: access(),
      nowMs: NOW,
    });

    expect(result.systemValue).toBe("Critical");
    expect(result.actions[0]).toMatchObject({
      key: "privacy-overdue",
      tone: "critical",
      value: 1,
    });
    expect(result.pendingReviewsHref).toBe("#admin-privacy");
  });

  it("orders critical incident work before lower-risk operational signals", () => {
    const currentSnapshot = snapshot();
    currentSnapshot.telemetry.failedOperations7d = 7;
    const currentIncidents = incidents();
    currentIncidents.counts.open = 2;
    currentIncidents.counts.criticalOpen = 1;
    const currentAccess = access();
    currentAccess.counts.pendingInvitations = 3;

    const result = deriveCommandCenterDecisionOverview({
      snapshot: currentSnapshot,
      posture: posture(),
      incidents: currentIncidents,
      access: currentAccess,
      nowMs: NOW,
    });

    expect(result.actions.map((item) => item.key)).toEqual([
      "critical-incidents",
      "failed-operations",
      "access-invitations",
    ]);
    expect(result.pendingReviewsHref).toBe("#admin-access");
  });

  it("labels freshness actions with minutes instead of an unlabeled count", () => {
    const currentSnapshot = snapshot();
    currentSnapshot.generatedAt = "2026-07-25T16:00:00.000Z";

    const result = deriveCommandCenterDecisionOverview({
      snapshot: currentSnapshot,
      posture: posture(),
      incidents: incidents(),
      access: access(),
      nowMs: NOW,
    });

    expect(result.actions[0]).toMatchObject({
      key: "stale-snapshot",
      value: 120,
      valueLabel: "120m",
    });
  });

  it("reports the full country count while limiting the visual ranking", () => {
    const currentSnapshot = snapshot();
    currentSnapshot.telemetry.countries = Array.from({ length: 12 }, (_, index) => ({
      label: `C${index + 1}`,
      users: index + 1,
    }));

    const result = deriveCommandCenterDecisionOverview({
      snapshot: currentSnapshot,
      posture: posture(),
      incidents: incidents(),
      access: access(),
      nowMs: NOW,
    });

    expect(result.totalCountries).toBe(12);
    expect(result.countries).toHaveLength(8);
    expect(result.countries[0]).toEqual({ label: "C12", users: 12 });
  });

  it("keeps a clean system healthy with an empty action queue", () => {
    const result = deriveCommandCenterDecisionOverview({
      snapshot: snapshot(),
      posture: posture(),
      incidents: incidents(),
      access: access(),
      nowMs: NOW,
    });

    expect(result.systemValue).toBe("Healthy");
    expect(result.actions).toEqual([]);
  });
});
