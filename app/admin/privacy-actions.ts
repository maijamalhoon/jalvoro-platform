"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRateLimitedAdminClient } from "@/lib/admin/server-action-security";

const REQUEST_CODE_PATTERN = /^PRV-[A-F0-9]{12}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const REQUEST_STATUSES = new Set([
  "pending",
  "identity_verification",
  "in_progress",
  "completed",
  "rejected",
  "cancelled",
]);
const VERIFICATION_STATUSES = new Set([
  "not_started",
  "pending",
  "verified",
  "failed",
]);

function readField(formData: FormData, name: string, maximumLength: number) {
  const value = formData.get(name);
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= maximumLength
    ? normalized
    : null;
}

function actionRedirect(result: string): never {
  redirect(`/admin?privacyAction=${encodeURIComponent(result)}#privacy-queue`);
}

export async function updatePrivacyRequestWorkflow(formData: FormData) {
  const requestCode = readField(formData, "requestCode", 16);
  const status = readField(formData, "status", 32);
  const verificationStatus = readField(formData, "verificationStatus", 32);
  const dueDateValue = formData.get("dueDate");
  const dueDate =
    typeof dueDateValue === "string" && dueDateValue.trim().length > 0
      ? dueDateValue.trim()
      : null;
  const assignToSelf = formData.get("assignToSelf") === "on";

  if (
    !requestCode ||
    !REQUEST_CODE_PATTERN.test(requestCode) ||
    !status ||
    !REQUEST_STATUSES.has(status) ||
    !verificationStatus ||
    !VERIFICATION_STATUSES.has(verificationStatus) ||
    (dueDate !== null && !DATE_PATTERN.test(dueDate))
  ) {
    actionRedirect("invalid");
  }

  const supabase = await requireRateLimitedAdminClient({
    scope: "privacy",
    loginPath: "/login?next=%2Fadmin",
    failurePath: "/admin?privacyAction=unavailable#privacy-queue",
  });

  const { error } = await supabase.rpc("apply_privacy_request_workflow", {
    p_request_code: requestCode,
    p_status: status,
    p_verification_status: verificationStatus,
    p_due_date: dueDate,
    p_assign_to_self: assignToSelf,
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
