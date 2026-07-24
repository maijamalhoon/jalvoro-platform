"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  ORGANIZATION_MEMBER_ROLES,
  ORGANIZATION_PERMISSIONS,
} from "@/lib/admin/organization-operations";
import { createClient } from "@/lib/supabase/server";

const ORGANIZATION_CODE_PATTERN = /^ORG-[A-F0-9]{12}$/;
const MEMBERSHIP_CODE_PATTERN = /^MBR-[A-F0-9]{12}$/;
const GRANT_CODE_PATTERN = /^CAG-[A-F0-9]{12}$/;
const ORGANIZATION_KEY_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COUNTRY_PATTERN = /^[A-Z]{2}$/;
const REGION_PATTERN = /^[a-z][a-z0-9]*(?:[-_][a-z0-9]+)*$/;
const CLASSIFICATIONS = new Set([
  "public",
  "internal",
  "confidential",
  "restricted",
]);
const ORGANIZATION_ACTIONS = new Set(["activate", "suspend", "close"]);
const MEMBERSHIP_ACTIONS = new Set([
  "change_role",
  "suspend",
  "reactivate",
  "revoke",
]);
const MEMBERSHIP_ROLES = new Set<string>(ORGANIZATION_MEMBER_ROLES);
const PERMISSIONS = new Set<string>(ORGANIZATION_PERMISSIONS);
const EXPIRY_DAYS = new Set([0, 7, 30, 90]);

type ActionResult =
  | "created"
  | "updated"
  | "member-added"
  | "member-updated"
  | "grant-created"
  | "grant-revoked"
  | "invalid"
  | "forbidden"
  | "missing"
  | "conflict"
  | "blocked"
  | "unavailable";

function readText(formData: FormData, name: string, maximumLength: number) {
  const value = formData.get(name);
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= maximumLength
    ? normalized
    : null;
}

function readOptionalText(
  formData: FormData,
  name: string,
  maximumLength: number,
) {
  const value = formData.get(name);
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length === 0
    ? null
    : normalized.length <= maximumLength
      ? normalized
      : undefined;
}

function organizationPath(
  result: ActionResult,
  organizationCode?: string | null,
) {
  const params = new URLSearchParams({ result });
  if (organizationCode?.match(ORGANIZATION_CODE_PATTERN)) {
    params.set("organization", organizationCode);
  }
  return `/admin/organizations?${params.toString()}`;
}

function redirectResult(
  result: ActionResult,
  organizationCode?: string | null,
): never {
  redirect(organizationPath(result, organizationCode));
}

function mapErrorCode(code: string | undefined): ActionResult {
  if (code === "42501") return "forbidden";
  if (code === "P0002") return "missing";
  if (code === "23505") return "conflict";
  if (code === "23514" || code === "55000") return "blocked";
  if (code === "22023") return "invalid";
  return "unavailable";
}

async function authenticatedClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login?next=%2Fadmin%2Forganizations");
  }

  return supabase;
}

function readRpcRecord(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export async function createOrganizationAction(formData: FormData) {
  const organizationKey = readText(formData, "organizationKey", 80)?.toLowerCase();
  const displayName = readText(formData, "displayName", 120);
  const ownerEmail = readText(formData, "ownerEmail", 254)?.toLowerCase();
  const countryValue = readOptionalText(formData, "primaryCountryCode", 2);
  const regionValue = readOptionalText(formData, "regionKey", 64);
  const classification = readText(formData, "dataClassification", 16)?.toLowerCase();
  const primaryCountryCode =
    typeof countryValue === "string" ? countryValue.toUpperCase() : countryValue;
  const regionKey =
    typeof regionValue === "string" ? regionValue.toLowerCase() : regionValue;

  if (
    !organizationKey ||
    !ORGANIZATION_KEY_PATTERN.test(organizationKey) ||
    !displayName ||
    !ownerEmail ||
    !EMAIL_PATTERN.test(ownerEmail) ||
    countryValue === undefined ||
    (primaryCountryCode !== null &&
      !COUNTRY_PATTERN.test(primaryCountryCode)) ||
    regionValue === undefined ||
    (regionKey !== null && !REGION_PATTERN.test(regionKey)) ||
    !classification ||
    !CLASSIFICATIONS.has(classification)
  ) {
    redirectResult("invalid");
  }

  const supabase = await authenticatedClient();
  const { data, error } = await supabase.rpc(
    "create_command_center_organization_by_email",
    {
      p_organization_key: organizationKey,
      p_display_name: displayName,
      p_owner_email: ownerEmail,
      p_primary_country_code: primaryCountryCode,
      p_region_key: regionKey,
      p_data_classification: classification,
    },
  );

  if (error) redirectResult(mapErrorCode(error.code));

  const result = readRpcRecord(data);
  const organizationCode =
    typeof result?.organizationCode === "string"
      ? result.organizationCode
      : null;
  if (!organizationCode?.match(ORGANIZATION_CODE_PATTERN)) {
    redirectResult("unavailable");
  }

  revalidatePath("/admin/organizations");
  redirectResult("created", organizationCode);
}

export async function transitionOrganizationAction(formData: FormData) {
  const organizationCode = readText(formData, "organizationCode", 16)?.toUpperCase();
  const action = readText(formData, "action", 16)?.toLowerCase();

  if (
    !organizationCode?.match(ORGANIZATION_CODE_PATTERN) ||
    !action ||
    !ORGANIZATION_ACTIONS.has(action)
  ) {
    redirectResult("invalid", organizationCode);
  }

  const supabase = await authenticatedClient();
  const { error } = await supabase.rpc("transition_command_center_organization", {
    p_organization_code: organizationCode,
    p_action: action,
  });

  if (error) redirectResult(mapErrorCode(error.code), organizationCode);

  revalidatePath("/admin/organizations");
  redirectResult("updated", organizationCode);
}

export async function addOrganizationMemberAction(formData: FormData) {
  const organizationCode = readText(formData, "organizationCode", 16)?.toUpperCase();
  const memberEmail = readText(formData, "memberEmail", 254)?.toLowerCase();
  const role = readText(formData, "role", 32)?.toLowerCase();

  if (
    !organizationCode?.match(ORGANIZATION_CODE_PATTERN) ||
    !memberEmail ||
    !EMAIL_PATTERN.test(memberEmail) ||
    !role ||
    !MEMBERSHIP_ROLES.has(role)
  ) {
    redirectResult("invalid", organizationCode);
  }

  const supabase = await authenticatedClient();
  const { error } = await supabase.rpc(
    "create_command_center_organization_membership_by_email",
    {
      p_organization_code: organizationCode,
      p_member_email: memberEmail,
      p_role: role,
    },
  );

  if (error) redirectResult(mapErrorCode(error.code), organizationCode);

  revalidatePath("/admin/organizations");
  redirectResult("member-added", organizationCode);
}

export async function transitionOrganizationMemberAction(formData: FormData) {
  const organizationCode = readText(formData, "organizationCode", 16)?.toUpperCase();
  const membershipCode = readText(formData, "membershipCode", 16)?.toUpperCase();
  const action = readText(formData, "action", 24)?.toLowerCase();
  const roleValue = readOptionalText(formData, "role", 32);
  const role = typeof roleValue === "string" ? roleValue.toLowerCase() : roleValue;

  if (
    !organizationCode?.match(ORGANIZATION_CODE_PATTERN) ||
    !membershipCode?.match(MEMBERSHIP_CODE_PATTERN) ||
    !action ||
    !MEMBERSHIP_ACTIONS.has(action) ||
    roleValue === undefined ||
    (action === "change_role" && (!role || !MEMBERSHIP_ROLES.has(role)))
  ) {
    redirectResult("invalid", organizationCode);
  }

  const supabase = await authenticatedClient();
  const { error } = await supabase.rpc(
    "transition_command_center_organization_membership",
    {
      p_membership_code: membershipCode,
      p_action: action,
      p_role: action === "change_role" ? role : null,
    },
  );

  if (error) redirectResult(mapErrorCode(error.code), organizationCode);

  revalidatePath("/admin/organizations");
  redirectResult("member-updated", organizationCode);
}

export async function grantOrganizationPermissionAction(formData: FormData) {
  const organizationCode = readText(formData, "organizationCode", 16)?.toUpperCase();
  const adminEmail = readText(formData, "adminEmail", 254)?.toLowerCase();
  const permissionKey = readText(formData, "permissionKey", 80)?.toLowerCase();
  const expiryText = readText(formData, "expiresInDays", 3);
  const expiresInDays = expiryText ? Number(expiryText) : Number.NaN;

  if (
    !organizationCode?.match(ORGANIZATION_CODE_PATTERN) ||
    !adminEmail ||
    !EMAIL_PATTERN.test(adminEmail) ||
    !permissionKey ||
    !PERMISSIONS.has(permissionKey) ||
    !Number.isInteger(expiresInDays) ||
    !EXPIRY_DAYS.has(expiresInDays)
  ) {
    redirectResult("invalid", organizationCode);
  }

  const expiresAt =
    expiresInDays === 0
      ? null
      : new Date(Date.now() + expiresInDays * 86_400_000).toISOString();
  const supabase = await authenticatedClient();
  const { error } = await supabase.rpc(
    "grant_command_center_organization_permission_by_email",
    {
      p_admin_email: adminEmail,
      p_permission_key: permissionKey,
      p_organization_code: organizationCode,
      p_expires_at: expiresAt,
    },
  );

  if (error) redirectResult(mapErrorCode(error.code), organizationCode);

  revalidatePath("/admin/organizations");
  redirectResult("grant-created", organizationCode);
}

export async function revokeOrganizationGrantAction(formData: FormData) {
  const organizationCode = readText(formData, "organizationCode", 16)?.toUpperCase();
  const grantCode = readText(formData, "grantCode", 16)?.toUpperCase();

  if (
    !organizationCode?.match(ORGANIZATION_CODE_PATTERN) ||
    !grantCode?.match(GRANT_CODE_PATTERN)
  ) {
    redirectResult("invalid", organizationCode);
  }

  const supabase = await authenticatedClient();
  const { error } = await supabase.rpc("revoke_command_center_permission", {
    p_grant_code: grantCode,
  });

  if (error) redirectResult(mapErrorCode(error.code), organizationCode);

  revalidatePath("/admin/organizations");
  redirectResult("grant-revoked", organizationCode);
}
