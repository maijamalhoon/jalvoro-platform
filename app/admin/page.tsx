import { notFound } from "next/navigation";

import AdminComplianceAuditPanel from "@/components/admin/AdminComplianceAuditPanel";
import AdminExecutiveOverview from "@/components/admin/AdminExecutiveOverview";
import AdminGlobalOperationsPanel from "@/components/admin/AdminGlobalOperationsPanel";
import AdminIncidentOperationsPanel from "@/components/admin/AdminIncidentOperationsPanel";
import AdminOrganizationOperationsPanel from "@/components/admin/AdminOrganizationOperationsPanel";
import AdminReleaseReadinessPanel, {
  type ReleaseActionResult,
} from "@/components/admin/AdminReleaseReadinessPanel";
import AdminSecurityPosturePanel from "@/components/admin/AdminSecurityPosturePanel";
import AdminTeamAccessPanel from "@/components/admin/AdminTeamAccessPanel";
import AdminUser360Panel from "@/components/admin/AdminUser360Panel";
import AdminUserOperationsPanel from "@/components/admin/AdminUserOperationsPanel";
import AdminWorkspaceNavigation, {
  ADMIN_WORKSPACE_VIEWS,
  type AdminWorkspaceView,
} from "@/components/admin/AdminWorkspaceNavigation";
import BillingPlanOperations from "@/components/admin/BillingPlanOperations";
import PrivacyGovernancePanel from "@/components/admin/PrivacyGovernancePanel";
import PrivacyRequestOperations from "@/components/admin/PrivacyRequestOperations";
import ControlPlaneLogin from "@/components/control-plane/ControlPlaneLogin";
import { parseAdminAccessSnapshot } from "@/lib/admin/access-operations";
import { parseBillingOperationsSnapshot } from "@/lib/admin/billing-operations";
import {
  parseAdminComplianceAuditSnapshot,
  type ComplianceAuditDomain,
  type ComplianceReviewStatus,
} from "@/lib/admin/compliance-audit";
import { getCommandCenterSession } from "@/lib/admin/command-center-session";
import { parseAdminControlCenterSnapshot } from "@/lib/admin/control-center";
import { parseAdminGlobalOperationsSnapshot } from "@/lib/admin/global-operations";
import { parseAdminIncidentOperationsSnapshot } from "@/lib/admin/incident-operations";
import { parseAdminOrganizationOperationsSnapshot } from "@/lib/admin/organization-operations-guard";
import {
  deriveAdminReleaseReadiness,
  getAdminReleaseRuntimeEvidence,
  parseAdminReleaseReadinessSnapshot,
} from "@/lib/admin/release-readiness";
import { deriveAdminSecurityPosture } from "@/lib/admin/security-posture";
import { parseCommandCenterUser360 } from "@/lib/admin/user-360";
import { parseAdminUserOperationsSnapshot } from "@/lib/admin/user-operations";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const USER_REFERENCE = /^USR-[A-F0-9]{12}$/;
const ORGANIZATION_CODE = /^ORG-[A-F0-9]{12}$/;
const WORKSPACE_VIEW_SET = new Set<string>(ADMIN_WORKSPACE_VIEWS);

const PRIVACY_ACTION_RESULTS = new Set([
  "updated", "invalid", "forbidden", "missing", "unavailable",
]);
const BILLING_ACTION_RESULTS = new Set([
  "saved", "invalid", "forbidden", "unavailable",
]);
const ACCESS_ACTION_RESULTS = new Set([
  "updated", "revoked", "accepted", "invalid", "forbidden", "missing", "unavailable",
]);
const INCIDENT_ACTION_RESULTS = new Set([
  "created", "updated", "invalid", "forbidden", "missing", "unavailable",
]);
const COMPLIANCE_ACTION_RESULTS = new Set([
  "updated", "invalid", "forbidden", "missing", "unavailable",
]);
const RELEASE_ACTION_RESULTS = new Set<ReleaseActionResult>([
  "approved", "revoked", "blocked", "invalid", "forbidden", "missing", "unavailable",
]);
const ORGANIZATION_ACTION_RESULTS = new Set([
  "created", "updated", "member-added", "member-updated", "grant-created",
  "grant-revoked", "invalid", "forbidden", "missing", "conflict", "blocked", "unavailable",
]);
const AUDIT_DOMAINS = new Set<ComplianceAuditDomain>([
  "privacy", "billing", "access", "incident",
]);
const AUDIT_STATUSES = new Set<ComplianceReviewStatus>([
  "pending", "reviewed", "flagged",
]);

type AdminPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function single(value: string | string[] | undefined) {
  return typeof value === "string" ? value : null;
}

function actionResult<T extends string>(
  value: string | null,
  allowed: ReadonlySet<string>,
): T | null {
  return value && allowed.has(value) ? (value as T) : null;
}

function pageNumber(value: string | null) {
  if (!value) return 1;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 2001
    ? parsed
    : 1;
}

function readGlobalOperations(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return (value as Record<string, unknown>).globalOperations;
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const commandCenterSession = await getCommandCenterSession();
  if (!commandCenterSession) return <ControlPlaneLogin />;

  const params = await searchParams;
  const requestedView = single(params.view)?.toLowerCase() ?? "overview";
  const view: AdminWorkspaceView = WORKSPACE_VIEW_SET.has(requestedView)
    ? (requestedView as AdminWorkspaceView)
    : "overview";
  const selectedUser = single(params.user)?.trim().toUpperCase() ?? null;
  const selectedOrganization = single(params.organization)?.trim().toUpperCase() ?? null;
  const organizationPage = pageNumber(single(params.page));
  const organizationLimit = 50;
  const organizationOffset = (organizationPage - 1) * organizationLimit;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_platform_admin_snapshot");
  if (error?.code === "42501") notFound();
  if (error) throw new Error(`Admin snapshot unavailable: ${error.code ?? "unknown"}`);

  const snapshot = parseAdminControlCenterSnapshot(data);
  const billing = parseBillingOperationsSnapshot(data);
  const access = parseAdminAccessSnapshot(data);
  const users = parseAdminUserOperationsSnapshot(data);
  const incidents = parseAdminIncidentOperationsSnapshot(data);
  const compliance = parseAdminComplianceAuditSnapshot(data);
  const releaseSnapshot = parseAdminReleaseReadinessSnapshot(data);
  const globalOperations = parseAdminGlobalOperationsSnapshot(readGlobalOperations(data));
  if (!snapshot || !billing || !access || !users || !incidents || !compliance || !releaseSnapshot || !globalOperations) {
    throw new Error("Admin snapshot returned an invalid contract.");
  }

  const organizationReference =
    view === "organizations" && selectedOrganization?.match(ORGANIZATION_CODE)
      ? selectedOrganization
      : null;
  const { data: organizationData, error: organizationError } = await supabase.rpc (
    "get_command_center_organization_operations_snapshot",
    {
      p_organization_code: organizationReference,
      p_limit: view === "organizations" ? organizationLimit : 1,
      p_offset: view === "organizations" ? organizationOffset : 0,
    },
  );
  if (organizationError?.code === "42501") notFound();
  if (organizationError) {
    throw new Error(`Organization snapshot unavailable: ${organizationError.code ?? "unknown"}`);
  }
  const organizations = parseAdminOrganizationOperationsSnapshot(organizationData);
  if (!organizations) throw new Error("Organization snapshot returned an invalid contract.");

  const security = deriveAdminSecurityPosture({ snapshot, access, billing, users });
  const release = deriveAdminReleaseReadiness({
    snapshot,
    billing,
    access,
    incidents,
    compliance,
    posture: security,
    release: releaseSnapshot,
    runtime: getAdminReleaseRuntimeEvidence(),
  });

  let user360 = null;
  let userLookupState: "idle" | "invalid" | "missing" | "forbidden" | "unavailable" | "loaded" = "idle";
  if (view === "users" && selectedUser) {
    if (!USER_REFERENCE.test(selectedUser)) {
      userLookupState = "invalid";
    } else {
      const { data: userData, error: userError } = await supabase.rpc (
        "get_command_center_user_360",
        { p_user_reference: selectedUser },
      );
      if (userError) {
        userLookupState =
          userError.code === "P0002"
            ? "missing"
            : userError.code === "42501"
              ? "forbidden"
              : "unavailable";
      } else {
        user360 = parseCommandCenterUser360(userData);
        userLookupState = user360 ? "loaded" : "unavailable";
      }
    }
  }

  const privacyActionResult = actionResult<"updated" | "invalid" | "forbidden" | "missing" | "unavailable">(
    single(params.privacyAction), PRIVACY_ACTION_RESULTS,
  );
  const billingActionResult = actionResult<"saved" | "invalid" | "forbidden" | "unavailable">(
    single(params.billingAction), BILLING_ACTION_RESULTS,
  );
  const accessActionResult = actionResult<"updated" | "revoked" | "accepted" | "invalid" | "forbidden" | "missing" | "unavailable">(
    single(params.accessAction), ACCESS_ACTION_RESULTS,
  );
  const incidentActionResult = actionResult<"created" | "updated" | "invalid" | "forbidden" | "missing" | "unavailable">(
    single(params.incidentAction), INCIDENT_ACTION_RESULTS,
  );
  const complianceActionResult = actionResult<"updated" | "invalid" | "forbidden" | "missing" | "unavailable">(
    single(params.complianceAction), COMPLIANCE_ACTION_RESULTS,
  );
  const releaseActionResult = actionResult<ReleaseActionResult>(
    single(params.releaseAction), RELEASE_ACTION_RESULTS,
  );
  const organizationActionResult = actionResult<
    "created" | "updated" | "member-added" | "member-updated" | "grant-created" |
    "grant-revoked" | "invalid" | "forbidden" | "missing" | "conflict" | "blocked" | "unavailable"
  >(single(params.result), ORGANIZATION_ACTION_RESULTS);
  const auditDomainValue = single(params.auditDomain);
  const auditDomain: ComplianceAuditDomain | "all" =
    auditDomainValue && AUDIT_DOMAINS.has(auditDomainValue as ComplianceAuditDomain)
      ? (auditDomainValue as ComplianceAuditDomain)
      : "all";
  const auditStatusValue = single(params.auditStatus);
  const auditStatus: ComplianceReviewStatus | "all" =
    auditStatusValue && AUDIT_STATUSES.has(auditStatusValue as ComplianceReviewStatus)
      ? (auditStatusValue as ComplianceReviewStatus)
      : "all";

  return (
    <div className="cc-workspace">
      <AdminWorkspaceNavigation active={view} />

      {view === "overview" ? (
        <AdminExecutiveOverview
          snapshot={snapshot}
          security={security}
          release={release}
          incidents={incidents}
          access={access}
          billing={billing}
          users={users}
          organizations={organizations}
        />
      ) : null}

      {view === "users" ? (
        <div className="cc-workspace-stack">
          <AdminUser360Panel
            user={user360}
            selectedReference={selectedUser}
            lookupState={userLookupState}
          />
          <AdminUserOperationsPanel operations={users} />
        </div>
      ) : null}

      {view === "organizations" ? (
        <AdminOrganizationOperationsPanel
          operations={organizations}
          actionResult={organizationActionResult}
          page={organizationPage}
        />
      ) : null}

      {view === "security" ? (
        <div className="cc-workspace-stack">
          <AdminSecurityPosturePanel posture={security} />
          <AdminTeamAccessPanel access={access} actionResult={accessActionResult} />
        </div>
      ) : null}

      {view === "reliability" ? (
        <div className="cc-workspace-stack">
          <section className="cc-signal-strip" aria-label="Reliability signals">
            <div><span>Failed operations · 7d</span><strong>{snapshot.telemetry.failedOperations7d}</strong></div>
            <div><span>Poor performance signals · 7d</span><strong>{snapshot.telemetry.poorPerformanceSignals7d}</strong></div>
            <div><span>Active users · 24h</span><strong>{snapshot.telemetry.activeUsers24h}</strong></div>
            <div><span>Product events · 24h</span><strong>{snapshot.telemetry.events24h}</strong></div>
          </section>
          <AdminIncidentOperationsPanel incidents={incidents} actionResult={incidentActionResult} />
        </div>
      ) : null}

      {view === "finance" ? (
        <BillingPlanOperations billing={billing} actionResult={billingActionResult} />
      ) : null}

      {view === "governance" ? (
        <div className="cc-workspace-stack">
          <AdminComplianceAuditPanel
            audit={compliance}
            actionResult={complianceActionResult}
            domainFilter={auditDomain}
            statusFilter={auditStatus}
          />
          <PrivacyGovernancePanel privacy={snapshot.privacy} />
          <PrivacyRequestOperations privacy={snapshot.privacy} actionResult={privacyActionResult} />
        </div>
      ) : null}

      {view === "releases" ? (
        <AdminReleaseReadinessPanel
          readiness={release}
          release={releaseSnapshot}
          actionResult={releaseActionResult}
        />
      ) : null}

      {view === "operations" ? (
        <AdminGlobalOperationsPanel operations={globalOperations} />
      ) : null}
    </div>
  );
}
