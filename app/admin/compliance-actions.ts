"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRateLimitedAdminClient } from "@/lib/admin/server-action-security";

const EVENT_CODE_PATTERN = /^AUD-[A-F0-9]{12}$/;
const REVIEW_STATUSES = new Set(["pending", "reviewed", "flagged"]);

function actionRedirect(result: string): never {
  redirect(`/admin?complianceAction=${encodeURIComponent(result)}#admin-compliance`);
}

function readText(formData: FormData, name: string, maximumLength: number) {
  const value = formData.get(name);
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= maximumLength
    ? normalized
    : null;
}

export async function updateComplianceReviewAction(formData: FormData) {
  const eventCode = readText(formData, "eventCode", 16)?.toUpperCase();
  const status = readText(formData, "status", 16)?.toLowerCase();

  if (
    !eventCode?.match(EVENT_CODE_PATTERN) ||
    !status ||
    !REVIEW_STATUSES.has(status)
  ) {
    actionRedirect("invalid");
  }

  const supabase = await requireRateLimitedAdminClient({
    scope: "compliance",
    loginPath: "/login?next=%2Fadmin",
    failurePath: "/admin?complianceAction=unavailable#admin-compliance",
  });

  const { error } = await supabase.rpc("apply_admin_compliance_review", {
    p_event_code: eventCode,
    p_status: status,
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
