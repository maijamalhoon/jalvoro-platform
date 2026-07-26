"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseAdminAccessSnapshot } from "@/lib/admin/access-operations";
import { parseBillingOperationsSnapshot } from "@/lib/admin/billing-operations";
import { parseAdminComplianceAuditSnapshot } from "@/lib/admin/compliance-audit";
import { parseAdminControlCenterSnapshot } from "@/lib/admin/control-center";
import { parseAdminIncidentOperationsSnapshot } from "@/lib/admin/incident-operations";
import {
  deriveAdminReleaseReadiness,
  getAdminReleaseRuntimeEvidence,
  parseAdminReleaseReadinessSnapshot,
} from "@/lib/admin/release-readiness";
import { deriveAdminSecurityPosture } from "@/lib/admin/security-posture";
import { parseAdminUserOperationsSnapshot } from "@/lib/admin/user-operations";
import { createClient } from "@/lib/supabase/server";

const RELEASE_CODE_PATTERN = /^REL-[A-F0-9]{12}$/;

function releaseRedirect(result: string): never {
  redirect(`/admin?releaseAction=${encodeURIComponent(result)}#admin-release-readiness`);
}

async function requireSignedInClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) redirect("/login?next=%2Fadmin");
  return supabase;
}

export async function approveCurrentAdminReleaseAction() {
  const runtime = getAdminReleaseRuntimeEvidence();
  if (
    !runtime.vercel ||
    (runtime.environment !== "production" && runtime.environment !== "preview") ||
    !runtime.revisionSha ||
    !runtime.deploymentId
  ) {
    releaseRedirect("invalid");
  }

  const supabase = await requireSignedInClient();
  const { data, error } = await supabase.rpc("get_platform_admin_snapshot");

  if (error) {
    if (error.code === "42501") releaseRedirect("forbidden");
    releaseRedirect("unavailable");
  }

  const snapshot = parseAdminControlCenterSnapshot(data);
  const billing = parseBillingOperationsSnapshot(data);
  const access = parseAdminAccessSnapshot(data);
  const users = parseAdminUserOperationsSnapshot(data);
  const incidents = parseAdminIncidentOperationsSnapshot(data);
  const compliance = parseAdminComplianceAuditSnapshot(data);
  const release = parseAdminReleaseReadinessSnapshot(data);

  if (
    !snapshot ||
    !billing ||
    !access ||
    !users ||
    !incidents ||
    !compliance ||
    !release
  ) {
    releaseRedirect("unavailable");
  }

  const posture = deriveAdminSecurityPosture({ snapshot, access, billing, users });
  const readiness = deriveAdminReleaseReadiness({
    snapshot,
    billing,
    access,
    incidents,
    compliance,
    posture,
    release,
    runtime,
  });

  if (readiness.blockedChecks > 0) releaseRedirect("blocked");

  const { error: approvalError } = await supabase.rpc("approve_admin_release", {
    p_revision_sha: runtime.revisionSha,
    p_environment: runtime.environment,
  });

  if (approvalError) {
    if (approvalError.code === "42501") releaseRedirect("forbidden");
    if (approvalError.code === "22023") releaseRedirect("invalid");
    if (approvalError.code === "55000") releaseRedirect("blocked");
    releaseRedirect("unavailable");
  }

  revalidatePath("/admin");
  releaseRedirect("approved");
}

export async function revokeAdminReleaseAction(formData: FormData) {
  const rawReleaseCode = formData.get("releaseCode");
  const releaseCode =
    typeof rawReleaseCode === "string"
      ? rawReleaseCode.trim().toUpperCase()
      : null;

  if (!releaseCode?.match(RELEASE_CODE_PATTERN)) releaseRedirect("invalid");

  const supabase = await requireSignedInClient();
  const { error } = await supabase.rpc("revoke_admin_release", {
    p_release_code: releaseCode,
  });

  if (error) {
    if (error.code === "42501") releaseRedirect("forbidden");
    if (error.code === "22023") releaseRedirect("invalid");
    if (error.code === "P0002") releaseRedirect("missing");
    releaseRedirect("unavailable");
  }

  revalidatePath("/admin");
  releaseRedirect("revoked");
}
