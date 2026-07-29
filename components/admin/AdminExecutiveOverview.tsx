import Link from "next/link";

import type { AdminAccessSnapshot } from "@/lib/admin/access-operations";
import type { BillingOperationsSnapshot } from "@/lib/admin/billing-operations";
import type { AdminControlCenterSnapshot } from "@/lib/admin/control-center";
import type { AdminIncidentOperationsSnapshot } from "@/lib/admin/incident-operations";
import type { AdminOrganizationOperationsSnapshot } from "@/lib/admin/organization-operations";
import type { AdminReleaseReadiness } from "@/lib/admin/release-readiness";
import type { AdminSecurityPosture } from "@/lib/admin/security-posture";
import type { AdminUserOperationsSnapshot } from "@/lib/admin/user-operations";
import { cn } from "@/lib/utils";

type Priority = {
  label: string;
  detail: string;
  value: number | string;
  tone: "healthy" | "attention" | "critical";
  href: string;
};

function Metric({ label, value, detail, href, tone = "neutral" }: {
  label: string;
  value: number | string;
  detail: string;
  href: string;
  tone?: "neutral" | "positive" | "warning" | "danger" | "info";
}) {
  return (
    <Link href={href} className={cn("cc-exec-metric", `cc-exec-metric-${tone}`)}>
      <span>{label}</span><strong>{value}</strong><small>{detail}</small>
    </Link>
  );
}

function priorityTone(priority: Priority["tone"]) {
  if (priority === "critical") return "danger";
  if (priority === "attention") return "warning";
  return "positive";
}

export default function AdminExecutiveOverview({
  snapshot, security, release, incidents, access, billing, users, organizations,
}: {
  snapshot: AdminControlCenterSnapshot;
  security: AdminSecurityPosture;
  release: AdminReleaseReadiness;
  incidents: AdminIncidentOperationsSnapshot;
  access: AdminAccessSnapshot;
  billing: BillingOperationsSnapshot;
  users: AdminUserOperationsSnapshot;
  organizations: AdminOrganizationOperationsSnapshot;
}) {
  const activeOperators = access.counts.activeOwners + access.counts.activeAdmins +
    access.counts.activeAnalysts + access.counts.activeSupport;
  const openIncidents = incidents.counts.open + incidents.counts.acknowledged +
    incidents.counts.investigating + incidents.counts.monitoring;

  const priorities: Priority[] = [
    {
      label: "Critical security findings",
      detail: "Deterministic controls that require immediate review.",
      value: security.criticalFindings,
      tone: security.criticalFindings > 0 ? "critical" : "healthy",
      href: "/admin?view=security",
    },
    {
      label: "Critical open incidents",
      detail: "Unresolved incidents marked critical.",
      value: incidents.counts.criticalOpen,
      tone: incidents.counts.criticalOpen > 0 ? "critical" : "healthy",
      href: "/admin?view=reliability",
    },
    {
      label: "Overdue operational work",
      detail: "Incident and privacy deadlines already missed.",
      value: incidents.counts.overdueOpen + snapshot.privacy.overdueRequests,
      tone: incidents.counts.overdueOpen + snapshot.privacy.overdueRequests > 0
        ? "critical" : "healthy",
      href: "/admin?view=governance",
    },
    {
      label: "Release readiness",
      detail: `${release.readyChecks} checks ready; ${release.blockedChecks} blocked.`,
      value: `${release.score}%`,
      tone: release.overall === "blocked" ? "critical"
        : release.overall === "attention" ? "attention" : "healthy",
      href: "/admin?view=releases",
    },
    {
      label: "Billing pipeline",
      detail: billing.providerConnected
        ? "Connected provider queue and failures."
        : "Provider integration is not connected yet.",
      value: billing.providerConnected
        ? billing.webhooks.pending + billing.webhooks.failed24h : "Dormant",
      tone: billing.providerConnected && billing.webhooks.failed24h > 0
        ? "critical" : billing.providerConnected && billing.webhooks.pending > 0
          ? "attention" : "healthy",
      href: "/admin?view=finance",
    },
  ];

  return (
    <section className="cc-exec" aria-labelledby="cc-exec-title">
      <header className="cc-exec-head">
        <div>
          <p className="cc-workspace-kicker">Global operating pulse</p>
          <h1 id="cc-exec-title">JALVORO Ecosystem Command Center</h1>
          <p>One action-first view of identity, organizations, security, reliability, finance operations, governance and release control.</p>
        </div>
        <div className="cc-exec-readiness" data-state={release.overall}>
          <span>Platform readiness</span><strong>{release.score}%</strong><small>{release.overall}</small>
        </div>
      </header>

      <div className="cc-exec-metrics">
        <Metric label="Registered users" value={snapshot.users.total}
          detail={`${snapshot.users.signedIn24h} signed in during 24h`} href="/admin?view=users" tone="info" />
        <Metric label="Active organizations" value={organizations.totals.active}
          detail={`${organizations.totals.memberships} total memberships`} href="/admin?view=organizations" />
        <Metric label="Active operators" value={activeOperators}
          detail={`${access.counts.pendingInvitations} pending invitations`} href="/admin?view=security" tone="positive" />
        <Metric label="Open incidents" value={openIncidents}
          detail={`${incidents.counts.criticalOpen} critical`} href="/admin?view=reliability"
          tone={incidents.counts.criticalOpen > 0 ? "danger" : "neutral"} />
        <Metric label="Paid accounts" value={snapshot.billing.paidUsers}
          detail={`${snapshot.billing.pastDueUsers} past due`} href="/admin?view=finance"
          tone={snapshot.billing.pastDueUsers > 0 ? "warning" : "positive"} />
        <Metric label="Active product users" value={snapshot.telemetry.activeUsers24h}
          detail={`${snapshot.telemetry.events24h} events in 24h`} href="/admin?view=operations" tone="info" />
      </div>

      <div className="cc-exec-columns">
        <section className="cc-exec-priority" aria-labelledby="cc-priority-title">
          <div className="cc-exec-section-head">
            <div><p className="cc-workspace-kicker">Priority queue</p><h2 id="cc-priority-title">What needs attention now</h2></div>
            <span>Live server snapshot</span>
          </div>
          <div className="cc-exec-priority-list">
            {priorities.map((priority) => (
              <Link href={priority.href} key={priority.label} className="cc-exec-priority-row"
                data-tone={priorityTone(priority.tone)}>
                <span className="cc-exec-priority-signal" aria-hidden="true" />
                <span><strong>{priority.label}</strong><small>{priority.detail}</small></span>
                <b>{priority.value}</b>
              </Link>
            ))}
          </div>
        </section>

        <section className="cc-exec-coverage" aria-labelledby="cc-coverage-title">
          <div className="cc-exec-section-head">
            <div><p className="cc-workspace-kicker">Operational coverage</p><h2 id="cc-coverage-title">Real data sources</h2></div>
          </div>
          <div className="cc-exec-coverage-list">
            <div data-state="live"><span>Identity and authentication</span><strong>{users.counts.totalUsers} accounts</strong></div>
            <div data-state={snapshot.privacy.telemetrySubjectsStored > 0 ? "live" : "waiting"}>
              <span>Device, location and product telemetry</span>
              <strong>{snapshot.privacy.telemetrySubjectsStored > 0
                ? `${snapshot.privacy.telemetrySubjectsStored} observed users` : "No observations yet"}</strong>
            </div>
            <div data-state="live"><span>Organization control plane</span><strong>{organizations.totals.total} organizations</strong></div>
            <div data-state={billing.providerConnected ? "live" : "waiting"}>
              <span>Payment provider pipeline</span><strong>{billing.providerConnected ? "Connected" : "Not connected"}</strong>
            </div>
            <div data-state="live"><span>Privacy and compliance</span><strong>{snapshot.privacy.openRequests} open requests</strong></div>
            <div data-state={release.runtime.vercel ? "live" : "waiting"}>
              <span>Deployment runtime evidence</span><strong>{release.runtime.vercel ? release.runtime.environment : "Unavailable"}</strong>
            </div>
          </div>
        </section>
      </div>

      <nav className="cc-exec-actions" aria-label="Primary operating workspaces">
        {[
          ["Investigate users", "Identity, sessions, devices and risk", "/admin?view=users"],
          ["Manage organizations", "Tenants, members, roles and grants", "/admin?view=organizations"],
          ["Review security", "Operators, permissions and posture", "/admin?view=security"],
          ["Operate reliability", "Incidents, errors and performance", "/admin?view=reliability"],
          ["Run finance ops", "Plans, billing and subscriptions", "/admin?view=finance"],
          ["Govern data", "Privacy, compliance and retention", "/admin?view=governance"],
          ["Control releases", "Readiness evidence and approvals", "/admin?view=releases"],
          ["View global topology", "Products, regions and platforms", "/admin?view=operations"],
        ].map(([label, detail, href]) => (
          <Link key={href} href={href}><strong>{label}</strong><small>{detail}</small><span aria-hidden="true">→</span></Link>
        ))}
      </nav>
    </section>
  );
}
