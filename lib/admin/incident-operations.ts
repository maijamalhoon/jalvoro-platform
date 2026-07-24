export type SecurityIncidentCategory =
  | "access_governance"
  | "privacy_deadline"
  | "billing_pipeline"
  | "availability"
  | "data_boundary"
  | "retention"
  | "manual_review";

export type SecurityIncidentSeverity = "low" | "medium" | "high" | "critical";

export type SecurityIncidentStatus =
  | "open"
  | "acknowledged"
  | "investigating"
  | "monitoring"
  | "resolved"
  | "dismissed";

export type SecurityIncidentSource =
  | "posture"
  | "access"
  | "privacy"
  | "billing"
  | "system"
  | "manual";

export type SecurityIncidentResolution =
  | "mitigated"
  | "false_positive"
  | "duplicate"
  | "accepted_risk"
  | "no_action_required"
  | "superseded";

export type SecurityIncidentQueueItem = {
  incidentCode: string;
  category: SecurityIncidentCategory;
  severity: SecurityIncidentSeverity;
  status: Exclude<SecurityIncidentStatus, "resolved" | "dismissed">;
  source: SecurityIncidentSource;
  sourceReference: string | null;
  createdAt: string;
  dueAt: string | null;
  assigned: boolean;
  assignedToMe: boolean;
  overdue: boolean;
  manageable: boolean;
};

export type AdminIncidentOperationsSnapshot = {
  operationsAllowed: boolean;
  freeTextStored: false;
  rawIpStored: false;
  sessionReplayStored: false;
  userIdentityReturned: false;
  financeContentStored: false;
  providerPayloadStored: false;
  counts: {
    open: number;
    acknowledged: number;
    investigating: number;
    monitoring: number;
    criticalOpen: number;
    overdueOpen: number;
    resolved30d: number;
    auditEvents30d: number;
    expiredAuditPending: number;
    expiredIncidentsPending: number;
  };
  queue: SecurityIncidentQueueItem[];
};

const CATEGORIES = new Set<SecurityIncidentCategory>([
  "access_governance",
  "privacy_deadline",
  "billing_pipeline",
  "availability",
  "data_boundary",
  "retention",
  "manual_review",
]);

const SEVERITIES = new Set<SecurityIncidentSeverity>([
  "low",
  "medium",
  "high",
  "critical",
]);

const OPEN_STATUSES = new Set<SecurityIncidentQueueItem["status"]>([
  "open",
  "acknowledged",
  "investigating",
  "monitoring",
]);

const SOURCES = new Set<SecurityIncidentSource>([
  "posture",
  "access",
  "privacy",
  "billing",
  "system",
  "manual",
]);

const FORBIDDEN_KEYS = new Set([
  "description",
  "message",
  "notes",
  "freeText",
  "email",
  "userId",
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

function readString(value: unknown, maximumLength = 160) {
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

function readQueue(value: unknown): SecurityIncidentQueueItem[] | null {
  if (!Array.isArray(value) || value.length > 40) return null;

  const parsed: SecurityIncidentQueueItem[] = [];
  const references = new Set<string>();

  for (const item of value) {
    if (!isRecord(item)) return null;

    const incidentCode = readString(item.incidentCode, 16);
    const sourceReference =
      item.sourceReference === null
        ? null
        : readString(item.sourceReference, 16);
    const createdAt = readDate(item.createdAt);
    const dueAt = readDate(item.dueAt, true);

    if (
      !incidentCode?.match(/^INC-[A-F0-9]{12}$/) ||
      references.has(incidentCode) ||
      typeof item.category !== "string" ||
      !CATEGORIES.has(item.category as SecurityIncidentCategory) ||
      typeof item.severity !== "string" ||
      !SEVERITIES.has(item.severity as SecurityIncidentSeverity) ||
      typeof item.status !== "string" ||
      !OPEN_STATUSES.has(item.status as SecurityIncidentQueueItem["status"]) ||
      typeof item.source !== "string" ||
      !SOURCES.has(item.source as SecurityIncidentSource) ||
      (sourceReference !== null &&
        !sourceReference.match(/^(PRV|ADM|AIN|USR)-[A-F0-9]{12}$/)) ||
      !createdAt ||
      dueAt === undefined ||
      typeof item.assigned !== "boolean" ||
      typeof item.assignedToMe !== "boolean" ||
      typeof item.overdue !== "boolean" ||
      typeof item.manageable !== "boolean" ||
      (item.assignedToMe && !item.assigned) ||
      (item.overdue && dueAt === null)
    ) {
      return null;
    }

    references.add(incidentCode);
    parsed.push({
      incidentCode,
      category: item.category as SecurityIncidentCategory,
      severity: item.severity as SecurityIncidentSeverity,
      status: item.status as SecurityIncidentQueueItem["status"],
      source: item.source as SecurityIncidentSource,
      sourceReference,
      createdAt,
      dueAt,
      assigned: item.assigned,
      assignedToMe: item.assignedToMe,
      overdue: item.overdue,
      manageable: item.manageable,
    });
  }

  return parsed;
}

export function parseAdminIncidentOperationsSnapshot(
  value: unknown,
): AdminIncidentOperationsSnapshot | null {
  if (!isRecord(value) || hasForbiddenKey(value)) return null;

  const incidents = value.incidents;
  if (!isRecord(incidents) || !isRecord(incidents.counts)) return null;

  const counts = {
    open: readCount(incidents.counts.open),
    acknowledged: readCount(incidents.counts.acknowledged),
    investigating: readCount(incidents.counts.investigating),
    monitoring: readCount(incidents.counts.monitoring),
    criticalOpen: readCount(incidents.counts.criticalOpen),
    overdueOpen: readCount(incidents.counts.overdueOpen),
    resolved30d: readCount(incidents.counts.resolved30d),
    auditEvents30d: readCount(incidents.counts.auditEvents30d),
    expiredAuditPending: readCount(incidents.counts.expiredAuditPending),
    expiredIncidentsPending: readCount(
      incidents.counts.expiredIncidentsPending,
    ),
  };
  const queue = readQueue(incidents.queue);

  if (
    Object.values(counts).some((count) => count === null) ||
    typeof incidents.operationsAllowed !== "boolean" ||
    incidents.freeTextStored !== false ||
    incidents.rawIpStored !== false ||
    incidents.sessionReplayStored !== false ||
    incidents.userIdentityReturned !== false ||
    incidents.financeContentStored !== false ||
    incidents.providerPayloadStored !== false ||
    !queue
  ) {
    return null;
  }

  const activeTotal =
    counts.open! +
    counts.acknowledged! +
    counts.investigating! +
    counts.monitoring!;

  if (
    counts.criticalOpen! > activeTotal ||
    counts.overdueOpen! > activeTotal
  ) {
    return null;
  }

  return {
    operationsAllowed: incidents.operationsAllowed,
    freeTextStored: false,
    rawIpStored: false,
    sessionReplayStored: false,
    userIdentityReturned: false,
    financeContentStored: false,
    providerPayloadStored: false,
    counts: {
      open: counts.open!,
      acknowledged: counts.acknowledged!,
      investigating: counts.investigating!,
      monitoring: counts.monitoring!,
      criticalOpen: counts.criticalOpen!,
      overdueOpen: counts.overdueOpen!,
      resolved30d: counts.resolved30d!,
      auditEvents30d: counts.auditEvents30d!,
      expiredAuditPending: counts.expiredAuditPending!,
      expiredIncidentsPending: counts.expiredIncidentsPending!,
    },
    queue,
  };
}
