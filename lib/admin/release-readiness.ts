import type { AdminAccessSnapshot } from "./access-operations";
import type { BillingOperationsSnapshot } from "./billing-operations";
import type { AdminComplianceAuditSnapshot } from "./compliance-audit";
import type { AdminControlCenterSnapshot } from "./control-center";
import type { AdminIncidentOperationsSnapshot } from "./incident-operations";
import type { AdminSecurityPosture } from "./security-posture";

export type ReleaseReadinessLevel = "ready" | "attention" | "blocked";
export type ReleaseEnvironment =
  | "production"
  | "preview"
  | "development"
  | "unknown";

export type ReleaseApproval = {
  releaseCode: string;
  revisionSha: string;
  environment: "production" | "preview";
  status: "active" | "expired" | "revoked";
  databaseState: "verified" | "stale";
  approvedAt: string;
  expiresAt: string;
  revokedAt: string | null;
};

export type AdminReleaseReadinessSnapshot = {
  approvalAllowed: boolean;
  mode: "approve" | "read_only";
  approvalRetentionMonths: 24;
  approvalValidityHours: 24;
  rawIdentityReturned: false;
  financeContentReturned: false;
  runtimeSecretsStored: false;
  freeTextStored: false;
  database: {
    requiredMigrationsApplied: number;
    requiredMigrationsTotal: number;
    rlsTablesProtected: number;
    rlsTablesTotal: number;
    directAccessDenied: number;
    directAccessChecksTotal: number;
    appendOnlyTriggers: number;
    appendOnlyTriggersExpected: number;
    requiredFunctionsPresent: number;
    requiredFunctionsTotal: number;
    permissionChecksPassed: number;
    permissionChecksTotal: number;
  };
  approvals: ReleaseApproval[];
};

export type ReleaseRuntimeEvidence = {
  vercel: boolean;
  environment: ReleaseEnvironment;
  revisionSha: string | null;
  deploymentId: string | null;
};

export type ReleaseReadinessCheck = {
  code: string;
  label: string;
  detail: string;
  level: ReleaseReadinessLevel;
  value: number | string;
};

export type AdminReleaseReadiness = {
  overall: ReleaseReadinessLevel;
  score: number;
  readyChecks: number;
  attentionChecks: number;
  blockedChecks: number;
  releaseReady: boolean;
  runtime: ReleaseRuntimeEvidence;
  matchingApproval: ReleaseApproval | null;
  checks: ReleaseReadinessCheck[];
};

const FORBIDDEN_KEYS = new Set([
  "email",
  "userId",
  "actorUserId",
  "approvedBy",
  "rawIp",
  "ipAddress",
  "sessionReplay",
  "financeData",
  "balance",
  "transaction",
  "amount",
  "providerPayload",
  "providerCustomerId",
  "providerSubscriptionId",
  "password",
  "token",
  "serviceRoleKey",
  "databaseDigest",
  "readinessDigest",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasForbiddenKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasForbiddenKey);
  if (!isRecord(value)) return false;

  return Object.entries(value).some(
    ([key, nested]) => FORBIDDEN_KEYS.has(key) || hasForbiddenKey(nested),
  );
}

function readCount(value: unknown) {
  const count = typeof value === "number" ? value : Number(value);
  return Number.isFinite(count) && count >= 0 ? Math.floor(count) : null;
}

function readString(value: unknown, maximumLength: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= maximumLength
    ? normalized
    : null;
}

function readDate(value: unknown, nullable = false) {
  if (nullable && value === null) return null;
  const text = readString(value, 64);
  return text && !Number.isNaN(Date.parse(text)) ? text : undefined;
}

function readApprovals(value: unknown): ReleaseApproval[] | null {
  if (!Array.isArray(value) || value.length > 10) return null;

  const parsed: ReleaseApproval[] = [];
  const releaseCodes = new Set<string>();

  for (const item of value) {
    if (!isRecord(item)) return null;

    const releaseCode = readString(item.releaseCode, 16);
    const revisionSha = readString(item.revisionSha, 40)?.toLowerCase();
    const approvedAt = readDate(item.approvedAt);
    const expiresAt = readDate(item.expiresAt);
    const revokedAt = readDate(item.revokedAt, true);

    if (
      !releaseCode?.match(/^REL-[A-F0-9]{12}$/) ||
      releaseCodes.has(releaseCode) ||
      !revisionSha?.match(/^[a-f0-9]{40}$/) ||
      (item.environment !== "production" && item.environment !== "preview") ||
      !["active", "expired", "revoked"].includes(String(item.status)) ||
      (item.databaseState !== "verified" && item.databaseState !== "stale") ||
      !approvedAt ||
      !expiresAt ||
      revokedAt === undefined ||
      (item.status === "revoked" && revokedAt === null) ||
      (item.status !== "revoked" && revokedAt !== null)
    ) {
      return null;
    }

    releaseCodes.add(releaseCode);
    parsed.push({
      releaseCode,
      revisionSha,
      environment: item.environment,
      status: item.status as ReleaseApproval["status"],
      databaseState: item.databaseState,
      approvedAt,
      expiresAt,
      revokedAt,
    });
  }

  return parsed;
}

export function parseAdminReleaseReadinessSnapshot(
  value: unknown,
): AdminReleaseReadinessSnapshot | null {
  if (!isRecord(value) || hasForbiddenKey(value)) return null;

  const release = value.releaseReadiness;
  if (!isRecord(release) || !isRecord(release.database)) return null;

  const database = {
    requiredMigrationsApplied: readCount(
      release.database.requiredMigrationsApplied,
    ),
    requiredMigrationsTotal: readCount(release.database.requiredMigrationsTotal),
    rlsTablesProtected: readCount(release.database.rlsTablesProtected),
    rlsTablesTotal: readCount(release.database.rlsTablesTotal),
    directAccessDenied: readCount(release.database.directAccessDenied),
    directAccessChecksTotal: readCount(
      release.database.directAccessChecksTotal,
    ),
    appendOnlyTriggers: readCount(release.database.appendOnlyTriggers),
    appendOnlyTriggersExpected: readCount(
      release.database.appendOnlyTriggersExpected,
    ),
    requiredFunctionsPresent: readCount(
      release.database.requiredFunctionsPresent,
    ),
    requiredFunctionsTotal: readCount(release.database.requiredFunctionsTotal),
    permissionChecksPassed: readCount(release.database.permissionChecksPassed),
    permissionChecksTotal: readCount(release.database.permissionChecksTotal),
  };
  const approvals = readApprovals(release.approvals);

  if (
    Object.values(database).some((count) => count === null) ||
    typeof release.approvalAllowed !== "boolean" ||
    (release.mode !== "approve" && release.mode !== "read_only") ||
    release.approvalAllowed !== (release.mode === "approve") ||
    release.approvalRetentionMonths !== 24 ||
    release.approvalValidityHours !== 24 ||
    release.rawIdentityReturned !== false ||
    release.financeContentReturned !== false ||
    release.runtimeSecretsStored !== false ||
    release.freeTextStored !== false ||
    !approvals
  ) {
    return null;
  }

  if (
    database.requiredMigrationsApplied! > database.requiredMigrationsTotal! ||
    database.rlsTablesProtected! > database.rlsTablesTotal! ||
    database.directAccessDenied! > database.directAccessChecksTotal! ||
    database.appendOnlyTriggers! > database.appendOnlyTriggersExpected! ||
    database.requiredFunctionsPresent! > database.requiredFunctionsTotal! ||
    database.permissionChecksPassed! > database.permissionChecksTotal!
  ) {
    return null;
  }

  return {
    approvalAllowed: release.approvalAllowed,
    mode: release.mode,
    approvalRetentionMonths: 24,
    approvalValidityHours: 24,
    rawIdentityReturned: false,
    financeContentReturned: false,
    runtimeSecretsStored: false,
    freeTextStored: false,
    database: {
      requiredMigrationsApplied: database.requiredMigrationsApplied!,
      requiredMigrationsTotal: database.requiredMigrationsTotal!,
      rlsTablesProtected: database.rlsTablesProtected!,
      rlsTablesTotal: database.rlsTablesTotal!,
      directAccessDenied: database.directAccessDenied!,
      directAccessChecksTotal: database.directAccessChecksTotal!,
      appendOnlyTriggers: database.appendOnlyTriggers!,
      appendOnlyTriggersExpected: database.appendOnlyTriggersExpected!,
      requiredFunctionsPresent: database.requiredFunctionsPresent!,
      requiredFunctionsTotal: database.requiredFunctionsTotal!,
      permissionChecksPassed: database.permissionChecksPassed!,
      permissionChecksTotal: database.permissionChecksTotal!,
    },
    approvals,
  };
}

export function getAdminReleaseRuntimeEvidence(): ReleaseRuntimeEvidence {
  const rawEnvironment =
    process.env.VERCEL_ENV ?? process.env.VERCEL_TARGET_ENV ?? "unknown";
  const environment: ReleaseEnvironment = [
    "production",
    "preview",
    "development",
  ].includes(rawEnvironment)
    ? (rawEnvironment as ReleaseEnvironment)
    : "unknown";

  const rawRevision = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.trim();
  const revisionSha = rawRevision?.match(/^[a-fA-F0-9]{40}$/)
    ? rawRevision.toLowerCase()
    : null;

  const rawDeploymentId = process.env.VERCEL_DEPLOYMENT_ID?.trim();
  const deploymentId = rawDeploymentId?.match(/^dpl_[A-Za-z0-9]{8,80}$/)
    ? rawDeploymentId
    : null;

  return {
    vercel: process.env.VERCEL === "1",
    environment,
    revisionSha,
    deploymentId,
  };
}

function countLevel(
  value: number,
  attentionAt = 1,
  blockedAt = Number.POSITIVE_INFINITY,
): ReleaseReadinessLevel {
  if (value >= blockedAt) return "blocked";
  if (value >= attentionAt) return "attention";
  return "ready";
}

function completeLevel(done: number, total: number): ReleaseReadinessLevel {
  return total > 0 && done === total ? "ready" : "blocked";
}

export function deriveAdminReleaseReadiness({
  snapshot,
  billing,
  access,
  incidents,
  compliance,
  posture,
  release,
  runtime,
}: {
  snapshot: AdminControlCenterSnapshot;
  billing: BillingOperationsSnapshot;
  access: AdminAccessSnapshot;
  incidents: AdminIncidentOperationsSnapshot;
  compliance: AdminComplianceAuditSnapshot;
  posture: AdminSecurityPosture;
  release: AdminReleaseReadinessSnapshot;
  runtime: ReleaseRuntimeEvidence;
}): AdminReleaseReadiness {
  const activeIncidentCount =
    incidents.counts.open +
    incidents.counts.acknowledged +
    incidents.counts.investigating +
    incidents.counts.monitoring;
  const retentionBacklog =
    snapshot.privacy.expiredTelemetryPending +
    snapshot.privacy.expiredAdminAuditPending +
    snapshot.privacy.expiredRequestAuditPending +
    billing.webhooks.expiredPending +
    billing.expiredAuditPending +
    incidents.counts.expiredAuditPending +
    incidents.counts.expiredIncidentsPending +
    compliance.counts.expiredReviewsPending +
    compliance.counts.expiredReviewAuditPending;

  const runtimeEnvironment =
    runtime.environment === "production" || runtime.environment === "preview"
      ? runtime.environment
      : null;
  const matchingApproval =
    runtime.revisionSha && runtimeEnvironment
      ? release.approvals.find(
          (approval) =>
            approval.revisionSha === runtime.revisionSha &&
            approval.environment === runtimeEnvironment,
        ) ?? null
      : null;

  const privacyLevel: ReleaseReadinessLevel =
    snapshot.privacy.overdueRequests > 0
      ? "blocked"
      : snapshot.privacy.openRequests > 0
        ? "attention"
        : "ready";
  const incidentLevel: ReleaseReadinessLevel =
    incidents.counts.criticalOpen > 0 || incidents.counts.overdueOpen > 0
      ? "blocked"
      : activeIncidentCount > 0
        ? "attention"
        : "ready";
  const complianceLevel: ReleaseReadinessLevel =
    compliance.counts.integrityMismatches > 0
      ? "blocked"
      : compliance.counts.flagged30d > 0 ||
          compliance.counts.attentionPending > 0
        ? "attention"
        : "ready";
  const billingLevel: ReleaseReadinessLevel = billing.providerConnected
    ? billing.webhooks.failed24h > 0 || billing.webhooks.expiredPending > 0
      ? "blocked"
      : billing.webhooks.pending > 0
        ? "attention"
        : "ready"
    : "ready";
  const accessLevel: ReleaseReadinessLevel =
    access.counts.activeOwners < 1
      ? "blocked"
      : access.counts.activeOwners < 2 ||
          access.counts.pendingInvitations > 0 ||
          access.counts.disabledMembers > 0
        ? "attention"
        : "ready";
  const runtimeLevel: ReleaseReadinessLevel =
    runtime.vercel && runtimeEnvironment && runtime.revisionSha && runtime.deploymentId
      ? "ready"
      : runtime.vercel
        ? "blocked"
        : "attention";
  const approvalLevel: ReleaseReadinessLevel = matchingApproval
    ? matchingApproval.status === "active"
      ? matchingApproval.databaseState === "verified"
        ? "ready"
        : "blocked"
      : "attention"
    : "attention";

  const checks: ReleaseReadinessCheck[] = [
    {
      code: "MIGRATIONS_CURRENT",
      label: "Required database migrations",
      detail: "Every Admin Panel governance migration required by this release must be recorded.",
      level: completeLevel(
        release.database.requiredMigrationsApplied,
        release.database.requiredMigrationsTotal,
      ),
      value: `${release.database.requiredMigrationsApplied}/${release.database.requiredMigrationsTotal}`,
    },
    {
      code: "RLS_PROTECTION",
      label: "Private table RLS protection",
      detail: "Every release-governance table must keep row-level security enabled.",
      level: completeLevel(
        release.database.rlsTablesProtected,
        release.database.rlsTablesTotal,
      ),
      value: `${release.database.rlsTablesProtected}/${release.database.rlsTablesTotal}`,
    },
    {
      code: "DIRECT_ACCESS_DENIED",
      label: "Browser table access boundaries",
      detail: "Authenticated browser roles must not read private Admin release tables directly.",
      level: completeLevel(
        release.database.directAccessDenied,
        release.database.directAccessChecksTotal,
      ),
      value: `${release.database.directAccessDenied}/${release.database.directAccessChecksTotal}`,
    },
    {
      code: "APPEND_ONLY_AUDIT",
      label: "Append-only governance audit",
      detail: "Privacy, billing, access, incident, compliance and release audit rows remain immutable.",
      level: completeLevel(
        release.database.appendOnlyTriggers,
        release.database.appendOnlyTriggersExpected,
      ),
      value: `${release.database.appendOnlyTriggers}/${release.database.appendOnlyTriggersExpected}`,
    },
    {
      code: "REQUIRED_FUNCTIONS",
      label: "Required secure functions",
      detail: "Snapshot, approval, revocation and retention boundaries must all be installed.",
      level: completeLevel(
        release.database.requiredFunctionsPresent,
        release.database.requiredFunctionsTotal,
      ),
      value: `${release.database.requiredFunctionsPresent}/${release.database.requiredFunctionsTotal}`,
    },
    {
      code: "RPC_PERMISSIONS",
      label: "RPC permission contract",
      detail: "Anonymous mutation and browser retention execution must remain denied.",
      level: completeLevel(
        release.database.permissionChecksPassed,
        release.database.permissionChecksTotal,
      ),
      value: `${release.database.permissionChecksPassed}/${release.database.permissionChecksTotal}`,
    },
    {
      code: "PRIVACY_QUEUE",
      label: "Privacy deadline readiness",
      detail:
        privacyLevel === "ready"
          ? "No open privacy request is blocking release readiness."
          : privacyLevel === "blocked"
            ? "At least one privacy request is overdue and blocks approval."
            : "Open privacy requests should be reviewed before release.",
      level: privacyLevel,
      value: snapshot.privacy.overdueRequests,
    },
    {
      code: "INCIDENT_QUEUE",
      label: "Security incident readiness",
      detail:
        incidentLevel === "ready"
          ? "No active structured incident is waiting in the queue."
          : incidentLevel === "blocked"
            ? "Critical or overdue incidents block release approval."
            : "Active incidents require an explicit release review.",
      level: incidentLevel,
      value: activeIncidentCount,
    },
    {
      code: "COMPLIANCE_INTEGRITY",
      label: "Compliance audit integrity",
      detail:
        complianceLevel === "ready"
          ? "Audit digests and controlled review states are clear."
          : complianceLevel === "blocked"
            ? "An audit digest mismatch blocks release approval."
            : "Flagged or attention-required audit events remain open.",
      level: complianceLevel,
      value: compliance.counts.integrityMismatches,
    },
    {
      code: "BILLING_PIPELINE",
      label: "Billing webhook readiness",
      detail: billing.providerConnected
        ? billingLevel === "ready"
          ? "Connected-provider webhook processing is clear."
          : billingLevel === "blocked"
            ? "Failed or expired billing events block release approval."
            : "Pending provider events should finish before release."
        : "No payment provider is connected; the webhook gate is dormant.",
      level: billingLevel,
      value: billing.providerConnected ? billing.webhooks.failed24h : "Dormant",
    },
    {
      code: "ADMIN_ACCESS",
      label: "Admin access resilience",
      detail:
        accessLevel === "ready"
          ? "Owner redundancy and access queues are healthy."
          : accessLevel === "blocked"
            ? "No active owner is available to govern release."
            : "Owner redundancy, invitations or disabled grants need attention.",
      level: accessLevel,
      value: access.counts.activeOwners,
    },
    {
      code: "RETENTION_BACKLOG",
      label: "Retention cleanup readiness",
      detail:
        retentionBacklog === 0
          ? "No expired Admin operational row is awaiting cleanup."
          : "Expired operational rows should be purged by the service-role job.",
      level: countLevel(retentionBacklog, 1, 1000),
      value: retentionBacklog,
    },
    {
      code: "SECURITY_POSTURE",
      label: "Unified security posture",
      detail:
        posture.overall === "healthy"
          ? "All current security posture findings are healthy."
          : posture.overall === "critical"
            ? "Critical posture findings block release approval."
            : "Non-critical posture findings require owner review.",
      level:
        posture.overall === "healthy"
          ? "ready"
          : posture.overall === "critical"
            ? "blocked"
            : "attention",
      value: `${posture.boundaryChecksPassed}/13`,
    },
    {
      code: "RUNTIME_EVIDENCE",
      label: "Vercel runtime evidence",
      detail:
        runtimeLevel === "ready"
          ? "Deployment environment, Git revision and deployment ID are available at runtime."
          : runtime.vercel
            ? "A Vercel runtime variable required for release evidence is missing or invalid."
            : "Local development cannot provide production deployment evidence.",
      level: runtimeLevel,
      value: runtime.environment,
    },
    {
      code: "OWNER_APPROVAL",
      label: "Owner release approval",
      detail:
        approvalLevel === "ready"
          ? "The current runtime revision has an active approval bound to the current database state."
          : approvalLevel === "blocked"
            ? "The matching approval is stale because release state changed after approval."
            : "The current runtime revision does not have an active Owner approval.",
      level: approvalLevel,
      value: matchingApproval?.releaseCode ?? "Not approved",
    },
  ];

  const blockedChecks = checks.filter((check) => check.level === "blocked").length;
  const attentionChecks = checks.filter(
    (check) => check.level === "attention",
  ).length;
  const readyChecks = checks.length - blockedChecks - attentionChecks;
  const score = Math.round(
    checks.reduce(
      (total, check) =>
        total + (check.level === "ready" ? 100 : check.level === "attention" ? 60 : 0),
      0,
    ) / checks.length,
  );
  const overall: ReleaseReadinessLevel =
    blockedChecks > 0
      ? "blocked"
      : attentionChecks > 0
        ? "attention"
        : "ready";

  return {
    overall,
    score,
    readyChecks,
    attentionChecks,
    blockedChecks,
    releaseReady: overall === "ready",
    runtime,
    matchingApproval,
    checks,
  };
}
