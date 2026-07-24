import type { AdminAccessSnapshot } from "./access-operations";
import type { BillingOperationsSnapshot } from "./billing-operations";
import type { AdminControlCenterSnapshot } from "./control-center";
import type { AdminUserOperationsSnapshot } from "./user-operations";

export type SecurityPostureLevel = "healthy" | "attention" | "critical";

export type SecurityPostureFinding = {
  code: string;
  label: string;
  detail: string;
  level: SecurityPostureLevel;
  value: number | string;
};

export type AdminSecurityPosture = {
  overall: SecurityPostureLevel;
  criticalFindings: number;
  attentionFindings: number;
  healthyControls: number;
  boundaryChecksPassed: number;
  findings: SecurityPostureFinding[];
};

function levelForCount(value: number, criticalAt: number): SecurityPostureLevel {
  if (value <= 0) return "healthy";
  return value >= criticalAt ? "critical" : "attention";
}

export function deriveAdminSecurityPosture({
  snapshot,
  access,
  billing,
  users,
}: {
  snapshot: AdminControlCenterSnapshot;
  access: AdminAccessSnapshot;
  billing: BillingOperationsSnapshot;
  users: AdminUserOperationsSnapshot;
}): AdminSecurityPosture {
  const retentionBacklog =
    snapshot.privacy.expiredTelemetryPending +
    snapshot.privacy.expiredAdminAuditPending +
    snapshot.privacy.expiredRequestAuditPending +
    billing.webhooks.expiredPending +
    billing.expiredAuditPending;

  const failedOperationsLevel = levelForCount(
    snapshot.telemetry.failedOperations7d,
    10,
  );
  const failedWebhookLevel = billing.providerConnected
    ? levelForCount(billing.webhooks.failed24h, 3)
    : "healthy";
  const pendingWebhookLevel = billing.providerConnected
    ? levelForCount(billing.webhooks.pending, 10)
    : "healthy";
  const ownerRedundancyLevel =
    access.counts.activeOwners >= 2 ? "healthy" : "attention";

  const findings: SecurityPostureFinding[] = [
    {
      code: "PRIVACY_OVERDUE",
      label: "Overdue privacy requests",
      detail:
        snapshot.privacy.overdueRequests === 0
          ? "No overdue structured privacy request is waiting in the queue."
          : "Overdue privacy requests require an owner or admin review.",
      level: levelForCount(snapshot.privacy.overdueRequests, 1),
      value: snapshot.privacy.overdueRequests,
    },
    {
      code: "FAILED_OPERATIONS",
      label: "Failed operations in 7 days",
      detail:
        snapshot.telemetry.failedOperations7d === 0
          ? "No failed operational telemetry signal was recorded."
          : "Review failure trends before they affect more users.",
      level: failedOperationsLevel,
      value: snapshot.telemetry.failedOperations7d,
    },
    {
      code: "FAILED_WEBHOOKS",
      label: "Failed billing webhooks in 24 hours",
      detail: billing.providerConnected
        ? billing.webhooks.failed24h === 0
          ? "Connected provider events have no recent failure signal."
          : "Provider-neutral webhook failures require investigation."
        : "No payment provider is connected, so webhook failure monitoring is dormant.",
      level: failedWebhookLevel,
      value: billing.providerConnected ? billing.webhooks.failed24h : "Dormant",
    },
    {
      code: "PENDING_WEBHOOKS",
      label: "Pending billing webhooks",
      detail: billing.providerConnected
        ? billing.webhooks.pending === 0
          ? "No connected-provider event is waiting for processing."
          : "Pending provider-neutral events should be reviewed."
        : "No payment provider is connected, so the queue is dormant.",
      level: pendingWebhookLevel,
      value: billing.providerConnected ? billing.webhooks.pending : "Dormant",
    },
    {
      code: "RETENTION_BACKLOG",
      label: "Expired operational data backlog",
      detail:
        retentionBacklog === 0
          ? "Telemetry, admin audit, privacy audit and billing retention queues are clear."
          : "Expired operational rows are waiting for the service-role retention job.",
      level: levelForCount(retentionBacklog, 100),
      value: retentionBacklog,
    },
    {
      code: "OWNER_REDUNDANCY",
      label: "Owner access redundancy",
      detail:
        access.counts.activeOwners >= 2
          ? "More than one active owner can recover Admin Panel governance."
          : "Only one active owner exists; add a second trusted owner before global launch.",
      level: ownerRedundancyLevel,
      value: access.counts.activeOwners,
    },
    {
      code: "DISABLED_ADMINS",
      label: "Disabled Admin Panel members",
      detail:
        access.counts.disabledMembers === 0
          ? "No disabled member grant is retained in the active access roster."
          : "Disabled grants remain visible for owner review and audit continuity.",
      level: levelForCount(access.counts.disabledMembers, 5),
      value: access.counts.disabledMembers,
    },
    {
      code: "PENDING_INVITES",
      label: "Pending Admin Panel invitations",
      detail:
        access.counts.pendingInvitations === 0
          ? "No one-time access invitation is waiting for acceptance."
          : "Pending one-time invitations should be accepted or revoked before expiry.",
      level: levelForCount(access.counts.pendingInvitations, 5),
      value: access.counts.pendingInvitations,
    },
    {
      code: "NEVER_SIGNED_IN",
      label: "Accounts never signed in",
      detail:
        users.counts.neverSignedIn === 0
          ? "Every current account has a recorded sign-in."
          : "Review onboarding delivery for accounts that never completed a sign-in.",
      level: levelForCount(users.counts.neverSignedIn, 25),
      value: users.counts.neverSignedIn,
    },
  ];

  const boundaryChecks = [
    snapshot.privacy.rawIpStored === false,
    snapshot.privacy.sessionReplayEnabled === false,
    snapshot.privacy.financeContentInTelemetry === false,
    access.rawInviteTokenStored === false,
    access.userMetadataAuthorization === false,
    access.serviceRoleExposedToBrowser === false,
    billing.rawWebhookPayloadStored === false,
    billing.cardDataStored === false,
    billing.featureLimitsAttached === false,
    users.rawEmailReturned === false,
    users.userIdReturned === false,
    users.financeDataReturned === false,
    users.providerIdentifiersReturned === false,
  ];

  const criticalFindings = findings.filter(
    (finding) => finding.level === "critical",
  ).length;
  const attentionFindings = findings.filter(
    (finding) => finding.level === "attention",
  ).length;
  const healthyControls = findings.filter(
    (finding) => finding.level === "healthy",
  ).length;

  return {
    overall:
      criticalFindings > 0
        ? "critical"
        : attentionFindings > 0
          ? "attention"
          : "healthy",
    criticalFindings,
    attentionFindings,
    healthyControls,
    boundaryChecksPassed: boundaryChecks.filter(Boolean).length,
    findings,
  };
}
