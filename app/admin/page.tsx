import { notFound, redirect } from "next/navigation";

import AdminComplianceAuditPanel from "@/components/admin/AdminComplianceAuditPanel";
import AdminControlCenter from "@/components/admin/AdminControlCenter";
import AdminIncidentOperationsPanel from "@/components/admin/AdminIncidentOperationsPanel";
import AdminReleaseReadinessPanel, {
  type ReleaseActionResult,
} from "@/components/admin/AdminReleaseReadinessPanel";
import AdminSecurityPosturePanel from "@/components/admin/AdminSecurityPosturePanel";
import AdminTeamAccessPanel from "@/components/admin/AdminTeamAccessPanel";
import AdminUserOperationsPanel from "@/components/admin/AdminUserOperationsPanel";
import BillingPlanOperations from "@/components/admin/BillingPlanOperations";
import PrivacyGovernancePanel from "@/components/admin/PrivacyGovernancePanel";
import PrivacyRequestOperations from "@/components/admin/PrivacyRequestOperations";
import { parseAdminAccessSnapshot } from "@/lib/admin/access-operations";
import { parseBillingOperationsSnapshot } from "@/lib/admin/billing-operations";
import {
  parseAdminComplianceAuditSnapshot,
  type ComplianceAuditDomain,
  type ComplianceReviewStatus,
} from "@/lib/admin/compliance-audit";
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

export const dynamic = "force-dynamic";

const PRIVACY_ACTION_RESULTS = new Set([
  "updated",
  "invalid",
  "forbidden",
  "missing",
  "unavailable",
]);

const BILLING_ACTION_RESULTS = new Set([
  "saved",
  "invalid",
  "forbidden",
  "unavailable",
]);

const ACCESS_ACTION_RESULTS = new Set([
  "updated",
  "revoked",
  "accepted",
  "invalid",
  "forbidden",
  "missing",
  "unavailable",
]);

const INCIDENT_ACTION_RESULTS = new Set([
  "created",
  "updated",
  "invalid",
  "forbidden",
  "missing",
  "unavailable",
]);

const COMPLIANCE_ACTION_RESULTS = new Set([
  "updated",
  "invalid",
  "forbidden",
  "missing",
  "unavailable",
]);

const RELEASE_ACTION_RESULTS = new Set<ReleaseActionResult>([
  "approved",
  "revoked",
  "blocked",
  "invalid",
  "forbidden",
  "missing",
  "unavailable",
]);

const AUDIT_DOMAINS = new Set<ComplianceAuditDomain>([
  "privacy",
  "billing",
  "access",
  "incident",
]);

const AUDIT_STATUSES = new Set<ComplianceReviewStatus>([
  "pending",
  "reviewed",
  "flagged",
]);

type AdminPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login?next=%2Fadmin");
  }

  const { data, error } = await supabase.rpc("get_platform_admin_snapshot");

  if (error?.code === "42501") {
    notFound();
  }

  if (error) {
    throw new Error(`Admin snapshot unavailable: ${error.code ?? "unknown"}`);
  }

  const snapshot = parseAdminControlCenterSnapshot(data);
  const billingOperations = parseBillingOperationsSnapshot(data);
  const accessOperations = parseAdminAccessSnapshot(data);
  const userOperations = parseAdminUserOperationsSnapshot(data);
  const incidentOperations = parseAdminIncidentOperationsSnapshot(data);
  const complianceAudit = parseAdminComplianceAuditSnapshot(data);
  const releaseSnapshot = parseAdminReleaseReadinessSnapshot(data);
  if (
    !snapshot ||
    !billingOperations ||
    !accessOperations ||
    !userOperations ||
    !incidentOperations ||
    !complianceAudit ||
    !releaseSnapshot
  ) {
    throw new Error("Admin snapshot returned an invalid contract.");
  }

  const securityPosture = deriveAdminSecurityPosture({
    snapshot,
    access: accessOperations,
    billing: billingOperations,
    users: userOperations,
  });
  const releaseReadiness = deriveAdminReleaseReadiness({
    snapshot,
    billing: billingOperations,
    access: accessOperations,
    incidents: incidentOperations,
    compliance: complianceAudit,
    posture: securityPosture,
    release: releaseSnapshot,
    runtime: getAdminReleaseRuntimeEvidence(),
  });

  const resolvedSearchParams = await searchParams;
  const rawPrivacyActionResult = resolvedSearchParams.privacyAction;
  const privacyActionResult =
    typeof rawPrivacyActionResult === "string" &&
    PRIVACY_ACTION_RESULTS.has(rawPrivacyActionResult)
      ? (rawPrivacyActionResult as
          | "updated"
          | "invalid"
          | "forbidden"
          | "missing"
          | "unavailable")
      : null;

  const rawBillingActionResult = resolvedSearchParams.billingAction;
  const billingActionResult =
    typeof rawBillingActionResult === "string" &&
    BILLING_ACTION_RESULTS.has(rawBillingActionResult)
      ? (rawBillingActionResult as
          | "saved"
          | "invalid"
          | "forbidden"
          | "unavailable")
      : null;

  const rawAccessActionResult = resolvedSearchParams.accessAction;
  const accessActionResult =
    typeof rawAccessActionResult === "string" &&
    ACCESS_ACTION_RESULTS.has(rawAccessActionResult)
      ? (rawAccessActionResult as
          | "updated"
          | "revoked"
          | "accepted"
          | "invalid"
          | "forbidden"
          | "missing"
          | "unavailable")
      : null;

  const rawIncidentActionResult = resolvedSearchParams.incidentAction;
  const incidentActionResult =
    typeof rawIncidentActionResult === "string" &&
    INCIDENT_ACTION_RESULTS.has(rawIncidentActionResult)
      ? (rawIncidentActionResult as
          | "created"
          | "updated"
          | "invalid"
          | "forbidden"
          | "missing"
          | "unavailable")
      : null;

  const rawComplianceActionResult = resolvedSearchParams.complianceAction;
  const complianceActionResult =
    typeof rawComplianceActionResult === "string" &&
    COMPLIANCE_ACTION_RESULTS.has(rawComplianceActionResult)
      ? (rawComplianceActionResult as
          | "updated"
          | "invalid"
          | "forbidden"
          | "missing"
          | "unavailable")
      : null;

  const rawReleaseActionResult = resolvedSearchParams.releaseAction;
  const releaseActionResult =
    typeof rawReleaseActionResult === "string" &&
    RELEASE_ACTION_RESULTS.has(rawReleaseActionResult as ReleaseActionResult)
      ? (rawReleaseActionResult as ReleaseActionResult)
      : null;

  const rawAuditDomain = resolvedSearchParams.auditDomain;
  const auditDomain =
    typeof rawAuditDomain === "string" &&
    AUDIT_DOMAINS.has(rawAuditDomain as ComplianceAuditDomain)
      ? (rawAuditDomain as ComplianceAuditDomain)
      : "all";

  const rawAuditStatus = resolvedSearchParams.auditStatus;
  const auditStatus =
    typeof rawAuditStatus === "string" &&
    AUDIT_STATUSES.has(rawAuditStatus as ComplianceReviewStatus)
      ? (rawAuditStatus as ComplianceReviewStatus)
      : "all";

  return (
    <>
      <AdminControlCenter snapshot={snapshot} />
      <AdminSecurityPosturePanel posture={securityPosture} />
      <AdminReleaseReadinessPanel
        readiness={releaseReadiness}
        release={releaseSnapshot}
        actionResult={releaseActionResult}
      />
      <AdminIncidentOperationsPanel
        incidents={incidentOperations}
        actionResult={incidentActionResult}
      />
      <AdminComplianceAuditPanel
        audit={complianceAudit}
        actionResult={complianceActionResult}
        domainFilter={auditDomain}
        statusFilter={auditStatus}
      />
      <section className="mx-auto w-full max-w-[1500px] pb-12">
        <AdminTeamAccessPanel
          access={accessOperations}
          actionResult={accessActionResult}
        />
      </section>
      <section className="mx-auto w-full max-w-[1500px] pb-12">
        <AdminUserOperationsPanel operations={userOperations} />
      </section>
      <section className="mx-auto w-full max-w-[1500px] pb-12">
        <BillingPlanOperations
          billing={billingOperations}
          actionResult={billingActionResult}
        />
      </section>
      <PrivacyGovernancePanel privacy={snapshot.privacy} />
      <section className="mx-auto w-full max-w-[1500px] pb-12">
        <PrivacyRequestOperations
          privacy={snapshot.privacy}
          actionResult={privacyActionResult}
        />
      </section>
    </>
  );
}
