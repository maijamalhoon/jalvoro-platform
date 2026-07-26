"use server";

import { createHash, randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRateLimitedAdminClient } from "@/lib/admin/server-action-security";

const ADMIN_REFERENCE_PATTERN = /^ADM-[A-F0-9]{12}$/;
const INVITATION_REFERENCE_PATTERN = /^AIN-[A-F0-9]{12}$/;
const ACCESS_CODE_PATTERN = /^JAV-[A-F0-9]{40}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVITE_ROLES = new Set(["admin", "analyst", "support"]);
const MEMBER_ROLES = new Set(["owner", "admin", "analyst", "support"]);
const MEMBER_ACTIONS = new Set(["set_role", "disable", "restore"]);
const INVITE_EXPIRIES = new Set([24, 72, 168]);

export type CreateAdminInvitationState = {
  status: "idle" | "created" | "invalid" | "forbidden" | "unavailable";
  accessCode: string | null;
  invitationCode: string | null;
  maskedEmail: string | null;
  role: string | null;
  expiresAt: string | null;
};

const emptyInvitationState: CreateAdminInvitationState = {
  status: "idle",
  accessCode: null,
  invitationCode: null,
  maskedEmail: null,
  role: null,
  expiresAt: null,
};

function readText(formData: FormData, name: string, max: number) {
  const value = formData.get(name);
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= max ? normalized : null;
}

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function actionRedirect(result: string): never {
  redirect(`/admin?accessAction=${encodeURIComponent(result)}#admin-access`);
}

export async function createAdminInvitationAction(
  _previous: CreateAdminInvitationState,
  formData: FormData,
): Promise<CreateAdminInvitationState> {
  const email = readText(formData, "email", 254)?.toLowerCase() ?? null;
  const role = readText(formData, "role", 16);
  const expiryText = readText(formData, "expiresInHours", 3);
  const expiresInHours = expiryText ? Number(expiryText) : Number.NaN;

  if (
    !email ||
    !EMAIL_PATTERN.test(email) ||
    !role ||
    !INVITE_ROLES.has(role) ||
    !Number.isInteger(expiresInHours) ||
    !INVITE_EXPIRIES.has(expiresInHours)
  ) {
    return { ...emptyInvitationState, status: "invalid" };
  }

  const supabase = await requireRateLimitedAdminClient({
    scope: "access",
    loginPath: "/login?next=%2Fadmin",
    failurePath: "/admin?accessAction=unavailable#admin-access",
  });

  const accessCode = `JAV-${randomBytes(20).toString("hex").toUpperCase()}`;
  const { data, error } = await supabase.rpc("create_platform_admin_invitation", {
    p_email: email,
    p_role: role,
    p_token_sha256: sha256(accessCode),
    p_expires_in_hours: expiresInHours,
  });

  if (error) {
    return {
      ...emptyInvitationState,
      status:
        error.code === "42501"
          ? "forbidden"
          : error.code === "22023"
            ? "invalid"
            : "unavailable",
    };
  }

  const result =
    typeof data === "object" && data !== null && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : null;
  const invitationCode =
    typeof result?.invitationCode === "string" ? result.invitationCode : null;
  const maskedEmail =
    typeof result?.maskedEmail === "string" ? result.maskedEmail : null;
  const expiresAt = typeof result?.expiresAt === "string" ? result.expiresAt : null;

  if (
    !invitationCode?.match(INVITATION_REFERENCE_PATTERN) ||
    !maskedEmail ||
    !expiresAt ||
    Number.isNaN(Date.parse(expiresAt))
  ) {
    return { ...emptyInvitationState, status: "unavailable" };
  }

  revalidatePath("/admin");
  return {
    status: "created",
    accessCode,
    invitationCode,
    maskedEmail,
    role,
    expiresAt,
  };
}

export async function updateAdminMemberAction(formData: FormData) {
  const adminReference = readText(formData, "adminReference", 16);
  const action = readText(formData, "action", 16);
  const roleValue = readText(formData, "role", 16);
  const role = action === "set_role" ? roleValue : null;

  if (
    !adminReference?.match(ADMIN_REFERENCE_PATTERN) ||
    !action ||
    !MEMBER_ACTIONS.has(action) ||
    (action === "set_role" && (!role || !MEMBER_ROLES.has(role)))
  ) {
    actionRedirect("invalid");
  }

  const supabase = await requireRateLimitedAdminClient({
    scope: "access",
    loginPath: "/login?next=%2Fadmin",
    failurePath: "/admin?accessAction=unavailable#admin-access",
  });

  const { error } = await supabase.rpc("apply_platform_admin_member_action", {
    p_admin_reference: adminReference,
    p_action: action,
    p_role: role,
  });

  if (error) {
    if (error.code === "42501") actionRedirect("forbidden");
    if (error.code === "P0002") actionRedirect("missing");
    if (error.code === "22023") actionRedirect("invalid");
    actionRedirect("unavailable");
  }

  revalidatePath("/admin");
  actionRedirect("updated");
}

export async function revokeAdminInvitationAction(formData: FormData) {
  const invitationCode = readText(formData, "invitationCode", 16);
  if (!invitationCode?.match(INVITATION_REFERENCE_PATTERN)) {
    actionRedirect("invalid");
  }

  const supabase = await requireRateLimitedAdminClient({
    scope: "access",
    loginPath: "/login?next=%2Fadmin",
    failurePath: "/admin?accessAction=unavailable#admin-access",
  });

  const { error } = await supabase.rpc("revoke_platform_admin_invitation", {
    p_invitation_code: invitationCode,
  });
  if (error) {
    if (error.code === "42501") actionRedirect("forbidden");
    if (error.code === "P0002") actionRedirect("missing");
    actionRedirect("unavailable");
  }

  revalidatePath("/admin");
  actionRedirect("revoked");
}

export async function acceptAdminInvitationAction(formData: FormData) {
  const accessCode = readText(formData, "accessCode", 44)?.toUpperCase();
  if (!accessCode?.match(ACCESS_CODE_PATTERN)) {
    redirect("/admin/claim?result=invalid");
  }

  const supabase = await requireRateLimitedAdminClient({
    scope: "access-claim",
    loginPath: "/login?next=%2Fadmin%2Fclaim",
    failurePath: "/admin/claim?result=unavailable",
    limit: 10,
    windowSeconds: 300,
  });

  const { error } = await supabase.rpc("accept_platform_admin_invitation", {
    p_token_sha256: sha256(accessCode),
  });
  if (error) {
    const result =
      error.code === "P0002"
        ? "missing"
        : error.code === "42501"
          ? "forbidden"
          : error.code === "22023"
            ? "invalid"
            : "unavailable";
    redirect(`/admin/claim?result=${result}`);
  }

  revalidatePath("/admin");
  redirect("/admin?accessAction=accepted#admin-access");
}
