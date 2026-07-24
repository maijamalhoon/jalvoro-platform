export type ComplianceAuditDomain =
  | "privacy"
  | "billing"
  | "access"
  | "incident";

export type ComplianceReviewStatus = "pending" | "reviewed" | "flagged";
export type ComplianceIntegrityState = "unverified" | "verified" | "mismatch";

export type ComplianceAuditEvent = {
  eventCode: string;
  domain: ComplianceAuditDomain;
  action: string;
  subjectReference: string | null;
  occurredAt: string;
  previousState: string | null;
  nextState: string | null;
  attentionRequired: boolean;
  reviewStatus: ComplianceReviewStatus;
  reviewedAt: string | null;
  integrityState: ComplianceIntegrityState;
};

export type AdminComplianceAuditSnapshot = {
  operationsAllowed: boolean;
  mode: "review" | "read_only";
  appendOnlySources: true;
  sourceDigestVerification: true;
  rawIdentityReturned: false;
  financeContentReturned: false;
  rawLogsReturned: false;
  providerPayloadReturned: false;
  counts: {
    events30d: number;
    pending30d: number;
    reviewed30d: number;
    flagged30d: number;
    attentionPending: number;
    integrityMismatches: number;
    reviewTransitions30d: number;
    expiredReviewsPending: number;
    expiredReviewAuditPending: number;
  };
  timeline: ComplianceAuditEvent[];
};

const DOMAINS = new Set<ComplianceAuditDomain>([
  "privacy",
  "billing",
  "access",
  "incident",
]);

const REVIEW_STATUSES = new Set<ComplianceReviewStatus>([
  "pending",
  "reviewed",
  "flagged",
]);

const INTEGRITY_STATES = new Set<ComplianceIntegrityState>([
  "unverified",
  "verified",
  "mismatch",
]);

const DOMAIN_ACTIONS: Record<ComplianceAuditDomain, Set<string>> = {
  privacy: new Set(["workflow_updated", "claimed_and_updated"]),
  billing: new Set(["created", "updated", "activated", "deactivated"]),
  access: new Set([
    "invitation_created",
    "invitation_revoked",
    "invitation_accepted",
    "role_changed",
    "access_disabled",
    "access_restored",
  ]),
  incident: new Set(["created", "workflow_updated"]),
};

const FORBIDDEN_KEYS = new Set([
  "email",
  "userId",
  "actorUserId",
  "subjectUserId",
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
  "sourceDigest",
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

function readState(value: unknown) {
  if (value === null) return null;
  const state = readString(value, 96);
  return state && /^[A-Za-z0-9 _/.-]+$/.test(state) ? state : undefined;
}

function readSubjectReference(value: unknown) {
  if (value === null) return null;
  const reference = readString(value, 32);
  if (!reference) return undefined;

  return /^(PRV|ADM|AIN|USR|INC)-[A-F0-9]{12}$/.test(reference) ||
    /^[A-Z0-9][A-Z0-9_-]{0,31}$/.test(reference)
    ? reference
    : undefined;
}

function readTimeline(value: unknown): ComplianceAuditEvent[] | null {
  if (!Array.isArray(value) || value.length > 60) return null;

  const parsed: ComplianceAuditEvent[] = [];
  const eventCodes = new Set<string>();

  for (const item of value) {
    if (!isRecord(item)) return null;

    const eventCode = readString(item.eventCode, 16);
    const occurredAt = readDate(item.occurredAt);
    const reviewedAt = readDate(item.reviewedAt, true);
    const previousState = readState(item.previousState);
    const nextState = readState(item.nextState);
    const subjectReference = readSubjectReference(item.subjectReference);

    if (
      !eventCode?.match(/^AUD-[A-F0-9]{12}$/) ||
      eventCodes.has(eventCode) ||
      typeof item.domain !== "string" ||
      !DOMAINS.has(item.domain as ComplianceAuditDomain) ||
      typeof item.action !== "string" ||
      !DOMAIN_ACTIONS[item.domain as ComplianceAuditDomain].has(item.action) ||
      subjectReference === undefined ||
      !occurredAt ||
      previousState === undefined ||
      nextState === undefined ||
      typeof item.attentionRequired !== "boolean" ||
      typeof item.reviewStatus !== "string" ||
      !REVIEW_STATUSES.has(item.reviewStatus as ComplianceReviewStatus) ||
      reviewedAt === undefined ||
      typeof item.integrityState !== "string" ||
      !INTEGRITY_STATES.has(item.integrityState as ComplianceIntegrityState)
    ) {
      return null;
    }

    const pending = item.reviewStatus === "pending";
    if (
      (pending && (reviewedAt !== null || item.integrityState !== "unverified")) ||
      (!pending && (reviewedAt === null || item.integrityState === "unverified"))
    ) {
      return null;
    }

    eventCodes.add(eventCode);
    parsed.push({
      eventCode,
      domain: item.domain as ComplianceAuditDomain,
      action: item.action,
      subjectReference,
      occurredAt,
      previousState,
      nextState,
      attentionRequired: item.attentionRequired,
      reviewStatus: item.reviewStatus as ComplianceReviewStatus,
      reviewedAt,
      integrityState: item.integrityState as ComplianceIntegrityState,
    });
  }

  return parsed;
}

export function parseAdminComplianceAuditSnapshot(
  value: unknown,
): AdminComplianceAuditSnapshot | null {
  if (!isRecord(value) || hasForbiddenKey(value)) return null;

  const compliance = value.complianceAudit;
  if (!isRecord(compliance) || !isRecord(compliance.counts)) return null;

  const counts = {
    events30d: readCount(compliance.counts.events30d),
    pending30d: readCount(compliance.counts.pending30d),
    reviewed30d: readCount(compliance.counts.reviewed30d),
    flagged30d: readCount(compliance.counts.flagged30d),
    attentionPending: readCount(compliance.counts.attentionPending),
    integrityMismatches: readCount(compliance.counts.integrityMismatches),
    reviewTransitions30d: readCount(compliance.counts.reviewTransitions30d),
    expiredReviewsPending: readCount(compliance.counts.expiredReviewsPending),
    expiredReviewAuditPending: readCount(
      compliance.counts.expiredReviewAuditPending,
    ),
  };
  const timeline = readTimeline(compliance.timeline);

  if (
    Object.values(counts).some((count) => count === null) ||
    typeof compliance.operationsAllowed !== "boolean" ||
    (compliance.mode !== "review" && compliance.mode !== "read_only") ||
    compliance.operationsAllowed !== (compliance.mode === "review") ||
    compliance.appendOnlySources !== true ||
    compliance.sourceDigestVerification !== true ||
    compliance.rawIdentityReturned !== false ||
    compliance.financeContentReturned !== false ||
    compliance.rawLogsReturned !== false ||
    compliance.providerPayloadReturned !== false ||
    !timeline
  ) {
    return null;
  }

  if (
    counts.pending30d! + counts.reviewed30d! + counts.flagged30d! !==
      counts.events30d! ||
    counts.integrityMismatches! >
      counts.reviewed30d! + counts.flagged30d!
  ) {
    return null;
  }

  return {
    operationsAllowed: compliance.operationsAllowed,
    mode: compliance.mode,
    appendOnlySources: true,
    sourceDigestVerification: true,
    rawIdentityReturned: false,
    financeContentReturned: false,
    rawLogsReturned: false,
    providerPayloadReturned: false,
    counts: {
      events30d: counts.events30d!,
      pending30d: counts.pending30d!,
      reviewed30d: counts.reviewed30d!,
      flagged30d: counts.flagged30d!,
      attentionPending: counts.attentionPending!,
      integrityMismatches: counts.integrityMismatches!,
      reviewTransitions30d: counts.reviewTransitions30d!,
      expiredReviewsPending: counts.expiredReviewsPending!,
      expiredReviewAuditPending: counts.expiredReviewAuditPending!,
    },
    timeline,
  };
}
