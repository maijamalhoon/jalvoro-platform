import type { PlatformAdminRole } from "./control-center";
import {
  DATA_CLASSIFICATIONS,
  type DataClassification,
} from "./product-registry";

export const ORGANIZATION_STATUSES = [
  "draft",
  "active",
  "suspended",
  "closed",
] as const;
export const ORGANIZATION_MEMBER_ROLES = [
  "organization_owner",
  "organization_admin",
  "billing_admin",
  "analyst",
  "member",
] as const;
export const ORGANIZATION_MEMBER_STATUSES = [
  "active",
  "suspended",
  "revoked",
] as const;
export const ORGANIZATION_GRANT_STATUSES = [
  "active",
  "expired",
  "revoked",
] as const;
export const ORGANIZATION_PERMISSIONS = [
  "command-center:organizations:view",
  "command-center:organizations:manage",
  "command-center:organizations:membership-manage",
] as const;
export const ORGANIZATION_AUDIT_ACTIONS = [
  "organization_created",
  "organization_status_changed",
  "membership_created",
  "membership_role_changed",
  "membership_suspended",
  "membership_reactivated",
  "membership_revoked",
  "organization_admin_permission_granted",
  "organization_admin_permission_revoked",
] as const;

export type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number];
export type OrganizationMemberRole =
  (typeof ORGANIZATION_MEMBER_ROLES)[number];
export type OrganizationMemberStatus =
  (typeof ORGANIZATION_MEMBER_STATUSES)[number];
export type OrganizationGrantStatus =
  (typeof ORGANIZATION_GRANT_STATUSES)[number];
export type OrganizationPermission =
  (typeof ORGANIZATION_PERMISSIONS)[number];
export type OrganizationAuditAction =
  (typeof ORGANIZATION_AUDIT_ACTIONS)[number];

export type AdminOrganizationSummary = {
  organizationCode: string;
  organizationKey: string;
  displayName: string;
  status: OrganizationStatus;
  primaryCountryCode: string | null;
  regionKey: string | null;
  dataClassification: DataClassification;
  version: number;
  createdAt: string;
  updatedAt: string;
  memberships: number;
  activeMemberships: number;
  activeOwners: number;
  activeAdminGrants: number;
};

export type AdminOrganizationMember = {
  membershipCode: string;
  memberReference: string;
  role: OrganizationMemberRole;
  status: OrganizationMemberStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminOrganizationGrant = {
  grantCode: string;
  adminReference: string;
  permissionKey: OrganizationPermission;
  status: OrganizationGrantStatus;
  grantedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
};

export type AdminOrganizationAuditEvent = {
  eventReference: string;
  action: OrganizationAuditAction;
  actorReference: string | null;
  subjectReference: string | null;
  previousStatus: string | null;
  nextStatus: string | null;
  previousRole: string | null;
  nextRole: string | null;
  createdAt: string;
  expiresAt: string;
};

export type AdminOrganizationDetail = {
  organizationCode: string;
  organizationKey: string;
  displayName: string;
  status: OrganizationStatus;
  primaryCountryCode: string | null;
  regionKey: string | null;
  dataClassification: DataClassification;
  version: number;
  createdAt: string;
  updatedAt: string;
  members: AdminOrganizationMember[];
  grants: AdminOrganizationGrant[];
  audit: AdminOrganizationAuditEvent[];
};

export type AdminOrganizationOperationsSnapshot = {
  generatedAt: string;
  adminRole: PlatformAdminRole;
  operationsAllowed: boolean;
  totals: {
    total: number;
    draft: number;
    active: number;
    suspended: number;
    closed: number;
    memberships: number;
    activeMemberships: number;
    activeAdminGrants: number;
  };
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  items: AdminOrganizationSummary[];
  selectedOrganization: AdminOrganizationDetail | null;
  availablePermissions: OrganizationPermission[];
  identityFieldsIncluded: false;
  directTableAccessEnabled: false;
};

const ADMIN_ROLES = new Set<PlatformAdminRole>([
  "owner",
  "admin",
  "analyst",
  "support",
]);
const STATUS_SET = new Set<OrganizationStatus>(ORGANIZATION_STATUSES);
const MEMBER_ROLE_SET = new Set<OrganizationMemberRole>(
  ORGANIZATION_MEMBER_ROLES,
);
const MEMBER_STATUS_SET = new Set<OrganizationMemberStatus>(
  ORGANIZATION_MEMBER_STATUSES,
);
const GRANT_STATUS_SET = new Set<OrganizationGrantStatus>(
  ORGANIZATION_GRANT_STATUSES,
);
const PERMISSION_SET = new Set<OrganizationPermission>(
  ORGANIZATION_PERMISSIONS,
);
const AUDIT_ACTION_SET = new Set<OrganizationAuditAction>(
  ORGANIZATION_AUDIT_ACTIONS,
);
const CLASSIFICATION_SET = new Set<DataClassification>(DATA_CLASSIFICATIONS);

const ORGANIZATION_CODE_PATTERN = /^ORG-[A-F0-9]{12}$/;
const MEMBERSHIP_CODE_PATTERN = /^MBR-[A-F0-9]{12}$/;
const GRANT_CODE_PATTERN = /^CAG-[A-F0-9]{12}$/;
const EVENT_REFERENCE_PATTERN = /^OAE-[A-F0-9]{12}$/;
const USER_REFERENCE_PATTERN = /^USR-[A-F0-9]{12}$/;
const ADMIN_REFERENCE_PATTERN = /^ADM-[A-F0-9]{12}$/;
const ORGANIZATION_KEY_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;
const REGION_KEY_PATTERN = /^[a-z][a-z0-9]*(?:[-_][a-z0-9]+)*$/;
const SAFE_TRANSITION_VALUE_PATTERN = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
const FORBIDDEN_KEYS = new Set([
  "email",
  "userid",
  "subjectid",
  "sessionid",
  "providerid",
  "providercustomerid",
  "providersubscriptionid",
  "rawip",
  "ipaddress",
  "city",
  "payload",
  "metadata",
  "financecontent",
  "legalname",
  "taxid",
  "registrationnumber",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown, maximumLength: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= maximumLength
    ? normalized
    : null;
}

function readNullableString(value: unknown, maximumLength: number) {
  return value === null ? null : readString(value, maximumLength);
}

function readCount(value: unknown) {
  const count = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(count) && count >= 0 ? count : null;
}

function readTimestamp(value: unknown) {
  const timestamp = readString(value, 64);
  return timestamp && !Number.isNaN(Date.parse(timestamp)) ? timestamp : null;
}

function containsForbiddenKey(value: unknown, depth = 0): boolean {
  if (depth > 10 || value === null || typeof value !== "object") return false;
  if (Array.isArray(value)) {
    return value.some((entry) => containsForbiddenKey(entry, depth + 1));
  }

  return Object.entries(value).some(([key, entry]) => {
    const normalized = key.replaceAll(/[^a-z0-9]/gi, "").toLowerCase();
    return (
      FORBIDDEN_KEYS.has(normalized) || containsForbiddenKey(entry, depth + 1)
    );
  });
}

function readOrganizationIdentity(entry: Record<string, unknown>) {
  const organizationCode = readString(entry.organizationCode, 16);
  const organizationKey = readString(entry.organizationKey, 80);
  const displayName = readString(entry.displayName, 120);
  const primaryCountryCode = readNullableString(entry.primaryCountryCode, 2);
  const regionKey = readNullableString(entry.regionKey, 64);
  const version = readCount(entry.version);
  const createdAt = readTimestamp(entry.createdAt);
  const updatedAt = readTimestamp(entry.updatedAt);

  if (
    !organizationCode ||
    !ORGANIZATION_CODE_PATTERN.test(organizationCode) ||
    !organizationKey ||
    !ORGANIZATION_KEY_PATTERN.test(organizationKey) ||
    !displayName ||
    typeof entry.status !== "string" ||
    !STATUS_SET.has(entry.status as OrganizationStatus) ||
    (primaryCountryCode !== null &&
      !COUNTRY_CODE_PATTERN.test(primaryCountryCode)) ||
    (regionKey !== null && !REGION_KEY_PATTERN.test(regionKey)) ||
    typeof entry.dataClassification !== "string" ||
    !CLASSIFICATION_SET.has(entry.dataClassification as DataClassification) ||
    version === null ||
    version < 1 ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }

  return {
    organizationCode,
    organizationKey,
    displayName,
    status: entry.status as OrganizationStatus,
    primaryCountryCode,
    regionKey,
    dataClassification: entry.dataClassification as DataClassification,
    version,
    createdAt,
    updatedAt,
  };
}

function readSummaryItems(value: unknown): AdminOrganizationSummary[] | null {
  if (!Array.isArray(value) || value.length > 100) return null;

  const items: AdminOrganizationSummary[] = [];
  const codes = new Set<string>();
  const keys = new Set<string>();

  for (const candidate of value) {
    if (!isRecord(candidate)) return null;
    const identity = readOrganizationIdentity(candidate);
    const memberships = readCount(candidate.memberships);
    const activeMemberships = readCount(candidate.activeMemberships);
    const activeOwners = readCount(candidate.activeOwners);
    const activeAdminGrants = readCount(candidate.activeAdminGrants);

    if (
      !identity ||
      codes.has(identity.organizationCode) ||
      keys.has(identity.organizationKey) ||
      memberships === null ||
      activeMemberships === null ||
      activeMemberships > memberships ||
      activeOwners === null ||
      activeOwners > activeMemberships ||
      activeAdminGrants === null
    ) {
      return null;
    }

    codes.add(identity.organizationCode);
    keys.add(identity.organizationKey);
    items.push({
      ...identity,
      memberships,
      activeMemberships,
      activeOwners,
      activeAdminGrants,
    });
  }

  return items;
}

function readMembers(value: unknown): AdminOrganizationMember[] | null {
  if (!Array.isArray(value) || value.length > 250) return null;
  const members: AdminOrganizationMember[] = [];
  const codes = new Set<string>();
  const references = new Set<string>();

  for (const candidate of value) {
    if (!isRecord(candidate)) return null;
    const membershipCode = readString(candidate.membershipCode, 16);
    const memberReference = readString(candidate.memberReference, 16);
    const version = readCount(candidate.version);
    const createdAt = readTimestamp(candidate.createdAt);
    const updatedAt = readTimestamp(candidate.updatedAt);

    if (
      !membershipCode ||
      !MEMBERSHIP_CODE_PATTERN.test(membershipCode) ||
      codes.has(membershipCode) ||
      !memberReference ||
      !USER_REFERENCE_PATTERN.test(memberReference) ||
      references.has(memberReference) ||
      typeof candidate.role !== "string" ||
      !MEMBER_ROLE_SET.has(candidate.role as OrganizationMemberRole) ||
      typeof candidate.status !== "string" ||
      !MEMBER_STATUS_SET.has(candidate.status as OrganizationMemberStatus) ||
      version === null ||
      version < 1 ||
      !createdAt ||
      !updatedAt
    ) {
      return null;
    }

    codes.add(membershipCode);
    references.add(memberReference);
    members.push({
      membershipCode,
      memberReference,
      role: candidate.role as OrganizationMemberRole,
      status: candidate.status as OrganizationMemberStatus,
      version,
      createdAt,
      updatedAt,
    });
  }

  return members;
}

function readGrants(value: unknown): AdminOrganizationGrant[] | null {
  if (!Array.isArray(value) || value.length > 250) return null;
  const grants: AdminOrganizationGrant[] = [];
  const codes = new Set<string>();

  for (const candidate of value) {
    if (!isRecord(candidate)) return null;
    const grantCode = readString(candidate.grantCode, 16);
    const adminReference = readString(candidate.adminReference, 16);
    const grantedAt = readTimestamp(candidate.grantedAt);
    const expiresAt =
      candidate.expiresAt === null ? null : readTimestamp(candidate.expiresAt);
    const revokedAt =
      candidate.revokedAt === null ? null : readTimestamp(candidate.revokedAt);

    if (
      !grantCode ||
      !GRANT_CODE_PATTERN.test(grantCode) ||
      codes.has(grantCode) ||
      !adminReference ||
      !ADMIN_REFERENCE_PATTERN.test(adminReference) ||
      typeof candidate.permissionKey !== "string" ||
      !PERMISSION_SET.has(candidate.permissionKey as OrganizationPermission) ||
      typeof candidate.status !== "string" ||
      !GRANT_STATUS_SET.has(candidate.status as OrganizationGrantStatus) ||
      !grantedAt ||
      (candidate.expiresAt !== null && !expiresAt) ||
      (candidate.revokedAt !== null && !revokedAt) ||
      (candidate.status === "revoked" && !revokedAt) ||
      (candidate.status === "active" && revokedAt !== null)
    ) {
      return null;
    }

    codes.add(grantCode);
    grants.push({
      grantCode,
      adminReference,
      permissionKey: candidate.permissionKey as OrganizationPermission,
      status: candidate.status as OrganizationGrantStatus,
      grantedAt,
      expiresAt,
      revokedAt,
    });
  }

  return grants;
}

function readTransitionValue(value: unknown) {
  if (value === null) return null;
  const parsed = readString(value, 64);
  return parsed && SAFE_TRANSITION_VALUE_PATTERN.test(parsed) ? parsed : null;
}

function readAudit(value: unknown): AdminOrganizationAuditEvent[] | null {
  if (!Array.isArray(value) || value.length > 100) return null;
  const events: AdminOrganizationAuditEvent[] = [];
  const references = new Set<string>();

  for (const candidate of value) {
    if (!isRecord(candidate)) return null;
    const eventReference = readString(candidate.eventReference, 16);
    const actorReference = readNullableString(candidate.actorReference, 16);
    const subjectReference = readNullableString(candidate.subjectReference, 16);
    const previousStatus = readTransitionValue(candidate.previousStatus);
    const nextStatus = readTransitionValue(candidate.nextStatus);
    const previousRole = readTransitionValue(candidate.previousRole);
    const nextRole = readTransitionValue(candidate.nextRole);
    const createdAt = readTimestamp(candidate.createdAt);
    const expiresAt = readTimestamp(candidate.expiresAt);

    if (
      !eventReference ||
      !EVENT_REFERENCE_PATTERN.test(eventReference) ||
      references.has(eventReference) ||
      typeof candidate.action !== "string" ||
      !AUDIT_ACTION_SET.has(candidate.action as OrganizationAuditAction) ||
      (actorReference !== null &&
        !USER_REFERENCE_PATTERN.test(actorReference)) ||
      (subjectReference !== null &&
        !USER_REFERENCE_PATTERN.test(subjectReference)) ||
      (candidate.previousStatus !== null && previousStatus === null) ||
      (candidate.nextStatus !== null && nextStatus === null) ||
      (candidate.previousRole !== null && previousRole === null) ||
      (candidate.nextRole !== null && nextRole === null) ||
      !createdAt ||
      !expiresAt ||
      Date.parse(expiresAt) <= Date.parse(createdAt)
    ) {
      return null;
    }

    references.add(eventReference);
    events.push({
      eventReference,
      action: candidate.action as OrganizationAuditAction,
      actorReference,
      subjectReference,
      previousStatus,
      nextStatus,
      previousRole,
      nextRole,
      createdAt,
      expiresAt,
    });
  }

  return events;
}

function readDetail(value: unknown): AdminOrganizationDetail | null {
  if (!isRecord(value)) return null;
  const identity = readOrganizationIdentity(value);
  const members = readMembers(value.members);
  const grants = readGrants(value.grants);
  const audit = readAudit(value.audit);

  return identity && members && grants && audit
    ? { ...identity, members, grants, audit }
    : null;
}

export function parseAdminOrganizationOperationsSnapshot(
  value: unknown,
): AdminOrganizationOperationsSnapshot | null {
  if (!isRecord(value) || containsForbiddenKey(value)) return null;

  const generatedAt = readTimestamp(value.generatedAt);
  const adminRole = value.adminRole;
  const totals = value.totals;
  const pagination = value.pagination;
  const items = readSummaryItems(value.items);
  const selectedOrganization =
    value.selectedOrganization === null
      ? null
      : readDetail(value.selectedOrganization);

  if (
    !generatedAt ||
    typeof adminRole !== "string" ||
    !ADMIN_ROLES.has(adminRole as PlatformAdminRole) ||
    typeof value.operationsAllowed !== "boolean" ||
    value.operationsAllowed !== (adminRole === "owner") ||
    !isRecord(totals) ||
    !isRecord(pagination) ||
    !items ||
    (value.selectedOrganization !== null && !selectedOrganization) ||
    !Array.isArray(value.availablePermissions) ||
    value.availablePermissions.length !== ORGANIZATION_PERMISSIONS.length ||
    !value.availablePermissions.every(
      (permission) =>
        typeof permission === "string" &&
        PERMISSION_SET.has(permission as OrganizationPermission),
    ) ||
    new Set(value.availablePermissions).size !== value.availablePermissions.length ||
    value.identityFieldsIncluded !== false ||
    value.directTableAccessEnabled !== false
  ) {
    return null;
  }

  const total = readCount(totals.total);
  const draft = readCount(totals.draft);
  const active = readCount(totals.active);
  const suspended = readCount(totals.suspended);
  const closed = readCount(totals.closed);
  const memberships = readCount(totals.memberships);
  const activeMemberships = readCount(totals.activeMemberships);
  const activeAdminGrants = readCount(totals.activeAdminGrants);
  const limit = readCount(pagination.limit);
  const offset = readCount(pagination.offset);

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
    limit === null ||
    limit < 1 ||
    limit > 100 ||
    offset === null ||
    typeof pagination.hasMore !== "boolean" ||
    items.length > limit ||
    offset + items.length > total + limit ||
    (selectedOrganization &&
      !items.some(
        (item) =>
          item.organizationCode === selectedOrganization.organizationCode,
      ) &&
      total <= limit)
  ) {
    return null;
  }

  return {
    generatedAt,
    adminRole: adminRole as PlatformAdminRole,
    operationsAllowed: value.operationsAllowed,
    totals: {
      total,
      draft,
      active,
      suspended,
      closed,
      memberships,
      activeMemberships,
      activeAdminGrants,
    },
    pagination: {
      limit,
      offset,
      hasMore: pagination.hasMore,
    },
    items,
    selectedOrganization,
    availablePermissions:
      value.availablePermissions as OrganizationPermission[],
    identityFieldsIncluded: false,
    directTableAccessEnabled: false,
  };
}
