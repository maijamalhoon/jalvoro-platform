"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRateLimitedAdminClient } from "@/lib/admin/server-action-security";

const INCIDENT_REFERENCE_PATTERN = /^INC-[A-F0-9]{12}$/;
const SOURCE_REFERENCE_PATTERN = /^(PRV|ADM|AIN|USR)-[A-F0-9]{12}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const CATEGORIES = new Set([
  "access_governance",
  "privacy_deadline",
  "billing_pipeline",
  "availability",
  "data_boundary",
  "retention",
  "manual_review",
]);
const SEVERITIES = new Set(["low", "medium", "high", "critical"]);
const STATUSES = new Set([
  "open",
  "acknowledged",
  "investigating",
  "monitoring",
  "resolved",
  "dismissed",
]);
const SOURCES = new Set([
  "posture",
  "access",
  "privacy",
  "billing",
  "system",
  "manual",
]);
const RESOLUTIONS = new Set([
  "mitigated",
  "false_positive",
  "duplicate",
  "accepted_risk",
  "no_action_required",
  "superseded",
]);

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

function parseDueDate(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!DATE_PATTERN.test(value)) return undefined;

  const dueAt = new Date(`${value}T23:59:59.999Z`);
  return Number.isNaN(dueAt.getTime()) ? undefined : dueAt.toISOString();
}

function actionRedirect(result: string): never {
  redirect(`/admin?incidentAction=${encodeURIComponent(result)}#admin-incidents`);
}

async function requireSignedInClient() {
  return requireRateLimitedAdminClient({
    scope: "incident",
    loginPath: "/login?next=%2Fadmin",
    failurePath: "/admin?incidentAction=unavailable#admin-incidents",
  });
}

export async function createSecurityIncidentAction(formData: FormData) {
  const category = readText(formData, "category", 32);
  const severity = readText(formData, "severity", 16);
  const source = readText(formData, "source", 16);
  const sourceReferenceValue = readOptionalText(
    formData,
    "sourceReference",
    16,
  );
  const sourceReference =
    typeof sourceReferenceValue === "string"
      ? sourceReferenceValue.toUpperCase()
      : sourceReferenceValue;
  const dueAt = parseDueDate(readOptionalText(formData, "dueDate", 10));

  if (
    !category ||
    !CATEGORIES.has(category) ||
    !severity ||
    !SEVERITIES.has(severity) ||
    !source ||
    !SOURCES.has(source) ||
    sourceReference === undefined ||
    (sourceReference !== null &&
      !SOURCE_REFERENCE_PATTERN.test(sourceReference)) ||
    dueAt === undefined
  ) {
    actionRedirect("invalid");
  }

  const supabase = await requireSignedInClient();
  const { error } = await supabase.rpc("create_platform_security_incident", {
    p_category: category,
    p_severity: severity,
    p_source: source,
    p_source_reference: sourceReference,
    p_due_at: dueAt,
  });

  if (error) {
    if (error.code === "42501") actionRedirect("forbidden");
    if (error.code === "22023") actionRedirect("invalid");
    actionRedirect("unavailable");
  }

  revalidatePath("/admin");
  actionRedirect("created");
}

export async function updateSecurityIncidentAction(formData: FormData) {
  const incidentCode = readText(formData, "incidentCode", 16)?.toUpperCase();
  const status = readText(formData, "status", 16);
  const severity = readText(formData, "severity", 16);
  const resolutionValue = readOptionalText(formData, "resolutionCode", 24);
  const resolutionCode =
    typeof resolutionValue === "string"
      ? resolutionValue.toLowerCase()
      : resolutionValue;
  const dueAt = parseDueDate(readOptionalText(formData, "dueDate", 10));
  const assignToSelf = formData.get("assignToSelf") === "on";

  if (
    !incidentCode?.match(INCIDENT_REFERENCE_PATTERN) ||
    !status ||
    !STATUSES.has(status) ||
    !severity ||
    !SEVERITIES.has(severity) ||
    resolutionCode === undefined ||
    (resolutionCode !== null && !RESOLUTIONS.has(resolutionCode)) ||
    dueAt === undefined
  ) {
    actionRedirect("invalid");
  }

  const terminal = status === "resolved" || status === "dismissed";
  if ((terminal && resolutionCode === null) || (!terminal && resolutionCode !== null)) {
    actionRedirect("invalid");
  }

  const supabase = await requireSignedInClient();
  const { error } = await supabase.rpc(
    "apply_platform_security_incident_workflow",
    {
      p_incident_code: incidentCode,
      p_status: status,
      p_severity: severity,
      p_due_at: dueAt,
      p_assign_to_self: assignToSelf,
      p_resolution_code: resolutionCode,
    },
  );

  if (error) {
    if (error.code === "42501") actionRedirect("forbidden");
    if (error.code === "P0002") actionRedirect("missing");
    if (error.code === "22023") actionRedirect("invalid");
    actionRedirect("unavailable");
  }

  revalidatePath("/admin");
  actionRedirect("updated");
}
