import {
  parseAdminOrganizationOperationsSnapshot as parseBaseOrganizationOperationsSnapshot,
  type AdminOrganizationOperationsSnapshot,
} from "./organization-operations";

const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;
const REGION_KEY_PATTERN = /^[a-z][a-z0-9]*(?:[-_][a-z0-9]+)*$/;
const USER_REFERENCE_PATTERN = /^USR-[A-F0-9]{12}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullablePattern(value: unknown, pattern: RegExp) {
  return value === null || (typeof value === "string" && pattern.test(value));
}

function hasSafeOrganizationLocation(value: unknown) {
  return (
    isRecord(value) &&
    isNullablePattern(value.primaryCountryCode, COUNTRY_CODE_PATTERN) &&
    isNullablePattern(value.regionKey, REGION_KEY_PATTERN)
  );
}

function hasSafeAuditReferences(value: unknown) {
  if (!Array.isArray(value)) return false;
  return value.every(
    (entry) =>
      isRecord(entry) &&
      isNullablePattern(entry.actorReference, USER_REFERENCE_PATTERN) &&
      isNullablePattern(entry.subjectReference, USER_REFERENCE_PATTERN),
  );
}

export function parseAdminOrganizationOperationsSnapshot(
  value: unknown,
): AdminOrganizationOperationsSnapshot | null {
  if (!isRecord(value) || !Array.isArray(value.items)) return null;
  if (!value.items.every(hasSafeOrganizationLocation)) return null;

  if (value.selectedOrganization !== null) {
    if (
      !hasSafeOrganizationLocation(value.selectedOrganization) ||
      !isRecord(value.selectedOrganization) ||
      !hasSafeAuditReferences(value.selectedOrganization.audit)
    ) {
      return null;
    }
  }

  return parseBaseOrganizationOperationsSnapshot(value);
}
