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

export type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number];

export type AdminOrganizationFoundationItem = {
  organizationCode: string;
  organizationKey: string;
  displayName: string;
  status: OrganizationStatus;
  primaryCountryCode: string | null;
  regionKey: string | null;
  dataClassification: DataClassification;
  version: number;
  memberships: number;
  activeMemberships: number;
  activeOwners: number;
  activeAdminGrants: number;
};

export type AdminOrganizationFoundationSnapshot = {
  generatedAt: string;
  adminRole: PlatformAdminRole;
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
  items: AdminOrganizationFoundationItem[];
  identityFieldsIncluded: false;
  directTableAccessEnabled: false;
};

const ADMIN_ROLES = new Set<PlatformAdminRole>([
  "owner",
  "admin",
  "analyst",
  "support",
]);
const ORGANIZATION_STATUS_SET = new Set<OrganizationStatus>(ORGANIZATION_STATUSES);
const CLASSIFICATION_SET = new Set<DataClassification>(DATA_CLASSIFICATIONS);
const ORGANIZATION_CODE_PATTERN = /^ORG-[A-F0-9]{12}$/;
const ORGANIZATION_KEY_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;
const REGION_KEY_PATTERN = /^[a-z][a-z0-9]*(?:[-_][a-z0-9]+)*$/;
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

function readCount(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function readString(value: unknown, maximumLength: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= maximumLength
    ? normalized
    : null;
}

function containsForbiddenKey(value: unknown, depth = 0): boolean {
  if (depth > 8 || value === null || typeof value !== "object") return false;
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

function readItems(value: unknown): AdminOrganizationFoundationItem[] | null {
  if (!Array.isArray(value) || value.length > 100) return null;

  const items: AdminOrganizationFoundationItem[] = [];
  const organizationCodes = new Set<string>();
  const organizationKeys = new Set<string>();

  for (const entry of value) {
    if (!isRecord(entry)) return null;

    const organizationCode = readString(entry.organizationCode, 16);
    const organizationKey = readString(entry.organizationKey, 80);
    const displayName = readString(entry.displayName, 120);
    const primaryCountryCode =
      entry.primaryCountryCode === null
        ? null
        : readString(entry.primaryCountryCode, 2);
    const regionKey =
      entry.regionKey === null ? null : readString(entry.regionKey, 64);
    const version = readCount(entry.version);
    const memberships = readCount(entry.memberships);
    const activeMemberships = readCount(entry.activeMemberships);
    const activeOwners = readCount(entry.activeOwners);
    const activeAdminGrants = readCount(entry.activeAdminGrants);

    if (
      !organizationCode ||
      !ORGANIZATION_CODE_PATTERN.test(organizationCode) ||
      organizationCodes.has(organizationCode) ||
      !organizationKey ||
      !ORGANIZATION_KEY_PATTERN.test(organizationKey) ||
      organizationKeys.has(organizationKey) ||
      !displayName ||
      typeof entry.status !== "string" ||
      !ORGANIZATION_STATUS_SET.has(entry.status as OrganizationStatus) ||
      (primaryCountryCode !== null &&
        !COUNTRY_CODE_PATTERN.test(primaryCountryCode)) ||
      (regionKey !== null && !REGION_KEY_PATTERN.test(regionKey)) ||
      typeof entry.dataClassification !== "string" ||
      !CLASSIFICATION_SET.has(entry.dataClassification as DataClassification) ||
      version === null ||
      version < 1 ||
      memberships === null ||
      activeMemberships === null ||
      activeMemberships > memberships ||
      activeOwners === null ||
      activeOwners > activeMemberships ||
      activeAdminGrants === null
    ) {
      return null;
    }

    organizationCodes.add(organizationCode);
    organizationKeys.add(organizationKey);
    items.push({
      organizationCode,
      organizationKey,
      displayName,
      status: entry.status as OrganizationStatus,
      primaryCountryCode,
      regionKey,
      dataClassification: entry.dataClassification as DataClassification,
      version,
      memberships,
      activeMemberships,
      activeOwners,
      activeAdminGrants,
    });
  }

  return items;
}

export function parseAdminOrganizationFoundationSnapshot(
  value: unknown,
): AdminOrganizationFoundationSnapshot | null {
  if (!isRecord(value) || containsForbiddenKey(value)) return null;

  const generatedAt = readString(value.generatedAt, 64);
  const adminRole = value.adminRole;
  const totals = value.totals;
  const items = readItems(value.items);

  if (
    !generatedAt ||
    Number.isNaN(Date.parse(generatedAt)) ||
    typeof adminRole !== "string" ||
    !ADMIN_ROLES.has(adminRole as PlatformAdminRole) ||
    !isRecord(totals) ||
    !items ||
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
    items.length > total
  ) {
    return null;
  }

  return {
    generatedAt,
    adminRole: adminRole as PlatformAdminRole,
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
    items,
    identityFieldsIncluded: false,
    directTableAccessEnabled: false,
  };
}
