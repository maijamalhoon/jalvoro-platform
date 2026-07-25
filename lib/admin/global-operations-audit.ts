import {
  parseAdminGlobalOperationsSnapshot,
  type AdminGlobalOperationsSnapshot,
} from "./global-operations";

export type RegisteredOrganizationOperationsSummary = {
  sourceStatus: "registered";
  total: number;
  draft: number;
  active: number;
  suspended: number;
  closed: number;
  memberships: number;
  activeMemberships: number;
  activeAdminGrants: number;
  identityFieldsIncluded: false;
};

export type AuditedAdminGlobalOperationsSnapshot = Omit<
  AdminGlobalOperationsSnapshot,
  "organizations"
> & {
  organizations:
    | AdminGlobalOperationsSnapshot["organizations"]
    | RegisteredOrganizationOperationsSummary;
};

const REGISTERED_ORGANIZATION_KEYS = new Set([
  "sourceStatus",
  "total",
  "draft",
  "active",
  "suspended",
  "closed",
  "memberships",
  "activeMemberships",
  "activeAdminGrants",
  "identityFieldsIncluded",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readCount(value: unknown) {
  const count = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(count) && count >= 0 ? count : null;
}

function parseRegisteredOrganizationSummary(
  value: unknown,
): RegisteredOrganizationOperationsSummary | null {
  if (!isRecord(value) || value.sourceStatus !== "registered") return null;
  if (Object.keys(value).some((key) => !REGISTERED_ORGANIZATION_KEYS.has(key))) {
    return null;
  }

  const total = readCount(value.total);
  const draft = readCount(value.draft);
  const active = readCount(value.active);
  const suspended = readCount(value.suspended);
  const closed = readCount(value.closed);
  const memberships = readCount(value.memberships);
  const activeMemberships = readCount(value.activeMemberships);
  const activeAdminGrants = readCount(value.activeAdminGrants);

  if (
    total === null ||
    draft === null ||
    active === null ||
    suspended === null ||
    closed === null ||
    draft + active + suspended + closed !== total ||
    memberships === null ||
    activeMemberships === null ||
    activeMemberships > memberships ||
    activeAdminGrants === null ||
    value.identityFieldsIncluded !== false
  ) {
    return null;
  }

  return {
    sourceStatus: "registered",
    total,
    draft,
    active,
    suspended,
    closed,
    memberships,
    activeMemberships,
    activeAdminGrants,
    identityFieldsIncluded: false,
  };
}

export function parseAuditedAdminGlobalOperationsSnapshot(
  value: unknown,
): AuditedAdminGlobalOperationsSnapshot | null {
  if (!isRecord(value) || !isRecord(value.organizations)) {
    return null;
  }

  if (value.organizations.sourceStatus !== "registered") {
    return parseAdminGlobalOperationsSnapshot(value);
  }

  const organizations = parseRegisteredOrganizationSummary(value.organizations);
  if (!organizations) return null;

  const compatiblePayload = {
    ...value,
    organizations: {
      sourceStatus: "not_registered",
      reason: "organization_data_source_not_registered",
      total: 0,
      active: 0,
      suspended: 0,
    },
  };
  const base = parseAdminGlobalOperationsSnapshot(compatiblePayload);
  if (!base) return null;

  return { ...base, organizations };
}
