import Link from "next/link";
import type { CSSProperties } from "react";

import type { AdminAccessSnapshot } from "@/lib/admin/access-operations";
import type { BillingOperationsSnapshot } from "@/lib/admin/billing-operations";
import {
  formatAdminCount,
  formatAdminGeneratedAt,
  type AdminControlCenterSnapshot,
} from "@/lib/admin/control-center";
import type { AdminIncidentOperationsSnapshot } from "@/lib/admin/incident-operations";
import type { AdminOrganizationOperationsSnapshot } from "@/lib/admin/organization-operations";
import type { AdminReleaseReadiness } from "@/lib/admin/release-readiness";
import type { AdminSecurityPosture } from "@/lib/admin/security-posture";
import type { AdminUserOperationsSnapshot } from "@/lib/admin/user-operations";

type ActionTone = "critical" | "high" | "medium" | "clear";

type ActionItem = {
  key: string;
  tone: ActionTone;
  domain: string;
  issue: string;
  evidence: string;
  owner: string;
  href: string;
};

type ActivityItem = {
  key: string;
  createdAt: string;
  label: string;
  reference: string;
  domain: string;
};

function accessActionLabel(action: string) {
  return {
    invitation_created: "Operator invitation created",
    invitation_revoked: "Operator invitation revoked",
    invitation_accepted: "Operator invitation accepted",
    role_changed: "Operator role changed",
    access_disabled: "Operator access disabled",
    access_restored: "Operator access restored",
  }[action] ?? "Access control changed";
}

function incidentLabel(category: string) {
  return category.replaceAll("_", " ");
}

function Metric({
  label,
  value,
  detail,
  href,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  detail: string;
  href: string;
  tone?: "neutral" | "positive" | "warning" | "danger" | "info";
}) {
  return (
    <Link href={href} className="cc-next-metric" data-tone={tone}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </Link>
  );
}

export default function AdminExecutiveOverview({
  snapshot,
  security,
  release,
  incidents,
  access,
  billing,
  users,
  organizations,
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
  const openIncidents =
    incidents.counts.open +
    incidents.counts.acknowledged +
    incidents.counts.investigating +
    incidents.counts.monitoring;
  const billingAttention =
    snapshot.billing.pastDueUsers +
    billing.webhooks.pending +
    billing.webhooks.failed24h;
  const activeOperators =
    access.counts.activeOwners +
    access.counts.activeAdmins +
    access.counts.activeAnalysts +
    access.counts.activeSupport;

  const actions: ActionItem[] = [
    {
      key: "security",
      tone: security.criticalFindings > 0 ? "critical" : "clear",
      domain: "Security",
      issue: "Critical findings",
      evidence: `${formatAdminCount(security.criticalFindings)} open`,
      owner: "Security",
      href: "/admin?view=security",
    },
    {
      key: "incidents",
      tone: incidents.counts.criticalOpen > 0 ? "critical" : openIncidents > 0 ? "high" : "clear",
      domain: "Reliability",
      issue: "Active incidents",
      evidence: `${formatAdminCount(openIncidents)} open · ${formatAdminCount(incidents.counts.criticalOpen)} critical`,
      owner: incidents.queue.some((item) => item.assignedToMe) ? "You" : "Operations",
      href: "/admin?view=reliability",
    },
    {
      key: "deadlines",
      tone:
        incidents.counts.overdueOpen + snapshot.privacy.overdueRequests > 0
          ? "critical"
          : "clear",
      domain: "Governance",
      issue: "Overdue work",
      evidence: `${formatAdminCount(incidents.counts.overdueOpen + snapshot.privacy.overdueRequests)} overdue`,
      owner: "Governance",
      href: "/admin?view=governance",
    },
    {
      key: "release",
      tone:
        release.overall === "blocked"
          ? "critical"
          : release.overall === "attention"
            ? "medium"
            : "clear",
      domain: "Release",
      issue: "Readiness gate",
      evidence: `${release.score}% · ${formatAdminCount(release.blockedChecks)} blocked`,
      owner: "Release",
      href: "/admin?view=releases",
    },
    {
      key: "billing",
      tone:
        billing.webhooks.failed24h > 0 || snapshot.billing.pastDueUsers > 0
          ? "high"
          : billing.webhooks.pending > 0
            ? "medium"
            : "clear",
      domain: "Billing",
      issue: billing.providerConnected ? "Pipeline attention" : "Provider disconnected",
      evidence: billing.providerConnected
        ? `${formatAdminCount(billingAttention)} signals`
        : "Internal plans available",
      owner: "Finance",
      href: "/admin?view=finance",
    },
    {
      key: "operators",
      tone: access.counts.pendingInvitations > 0 ? "medium" : "clear",
      domain: "Access",
      issue: "Pending invitations",
      evidence: `${formatAdminCount(access.counts.pendingInvitations)} pending`,
      owner: "Owner",
      href: "/admin?view=security",
    },
  ];

  const activity: ActivityItem[] = [
    ...access.recentEvents.map((event) => ({
      key: `access-${event.eventReference}`,
      createdAt: event.createdAt,
      label: accessActionLabel(event.action),
      reference:
        event.subjectReference ?? event.invitationCode ?? event.eventReference,
      domain: "Access",
    })),
    ...incidents.queue.map((incident) => ({
      key: `incident-${incident.incidentCode}`,
      createdAt: incident.createdAt,
      label: `${incident.severity} ${incidentLabel(incident.category)}`,
      reference: incident.incidentCode,
      domain: "Incident",
    })),
    ...snapshot.privacy.requestQueue.map((request) => ({
      key: `privacy-${request.requestCode}`,
      createdAt: request.createdAt,
      label: `${request.requestType.replaceAll("_", " ")} request`,
      reference: request.requestCode,
      domain: "Privacy",
    })),
  ]
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    )
    .slice(0, 8);

  const healthRows = [
    {
      system: "Application runtime",
      state: release.runtime.vercel ? "live" : "waiting",
      status: release.runtime.vercel ? "Live" : "Unavailable",
      evidence: release.runtime.vercel
        ? `${release.runtime.environment} · ${release.runtime.revisionSha?.slice(0, 8) ?? "revision unavailable"}`
        : "No runtime evidence",
    },
    {
      system: "Isolated access plane",
      state: access.serviceRoleExposedToBrowser ? "critical" : "live",
      status: access.serviceRoleExposedToBrowser ? "Unsafe" : "Protected",
      evidence: `${formatAdminCount(activeOperators)} active operators · MFA boundary`,
    },
    {
      system: "Identity directory",
      state: users.counts.totalUsers > 0 ? "live" : "waiting",
      status: users.counts.totalUsers > 0 ? "Live" : "Waiting",
      evidence: `${formatAdminCount(users.counts.totalUsers)} accounts`,
    },
    {
      system: "Product telemetry",
      state: snapshot.telemetry.events24h > 0 ? "live" : "waiting",
      status: snapshot.telemetry.events24h > 0 ? "Streaming" : "No events",
      evidence: `${formatAdminCount(snapshot.telemetry.events24h)} events · 24h`,
    },
    {
      system: "Billing provider",
      state: billing.providerConnected ? "live" : "waiting",
      status: billing.providerConnected ? "Connected" : "Disconnected",
      evidence: billing.providerConnected
        ? `${formatAdminCount(billing.webhooks.processed24h)} processed · 24h`
        : "Plan catalog remains available",
    },
    {
      system: "Release gate",
      state: release.overall === "ready" ? "live" : release.overall === "blocked" ? "critical" : "attention",
      status: release.overall,
      evidence: `${formatAdminCount(release.readyChecks)} ready · ${formatAdminCount(release.blockedChecks)} blocked`,
    },
  ];

  return (
    <section className="cc-next-overview" aria-labelledby="cc-next-overview-title">
      <header className="cc-next-overview-head">
        <div>
          <span className="cc-next-eyebrow">LIVE CONTROL PLANE</span>
          <h1 id="cc-next-overview-title">Command Center</h1>
          <p>Identity, organizations, reliability, money movement and release control in one operating surface.</p>
        </div>
        <div
          className="cc-next-readiness"
          data-state={release.overall}
          style={{ "--cc-score": release.score } as CSSProperties}
          aria-label={`Platform readiness ${release.score} percent, ${release.overall}`}
        >
          <div><strong>{release.score}</strong><span>%</span></div>
          <small>READINESS</small>
        </div>
      </header>

      <div className="cc-next-metric-strip" aria-label="Live platform metrics">
        <Metric label="Users" value={formatAdminCount(snapshot.users.total)} detail={`${formatAdminCount(snapshot.users.signedIn24h)} active · 24h`} href="/admin?view=users" tone="info" />
        <Metric label="Organizations" value={formatAdminCount(organizations.totals.active)} detail={`${formatAdminCount(organizations.totals.memberships)} memberships`} href="/admin?view=organizations" />
        <Metric label="Incidents" value={formatAdminCount(openIncidents)} detail={`${formatAdminCount(incidents.counts.criticalOpen)} critical`} href="/admin?view=reliability" tone={incidents.counts.criticalOpen > 0 ? "danger" : "positive"} />
        <Metric label="Paid accounts" value={formatAdminCount(snapshot.billing.paidUsers)} detail={`${formatAdminCount(snapshot.billing.pastDueUsers)} past due`} href="/admin?view=finance" tone={snapshot.billing.pastDueUsers > 0 ? "warning" : "positive"} />
        <Metric label="Product events" value={formatAdminCount(snapshot.telemetry.events24h)} detail={`${formatAdminCount(snapshot.telemetry.activeUsers24h)} active users`} href="/admin?view=operations" tone="info" />
      </div>

      <div className="cc-next-overview-grid">
        <section className="cc-next-panel cc-next-action-center" aria-labelledby="cc-next-actions-title">
          <header>
            <div>
              <span className="cc-next-eyebrow">PRIORITY QUEUE</span>
              <h2 id="cc-next-actions-title">Action Center</h2>
            </div>
            <span>Server snapshot · {formatAdminGeneratedAt(snapshot.generatedAt)} UTC</span>
          </header>
          <div className="cc-next-action-table" role="table" aria-label="Operational priorities">
            <div className="cc-next-action-head" role="row">
              <span>Signal</span><span>Issue</span><span>Domain</span><span>Owner</span><span />
            </div>
            {actions.map((item) => (
              <Link key={item.key} href={item.href} className="cc-next-action-row" data-tone={item.tone} role="row">
                <span className="cc-next-action-signal"><i aria-hidden="true" />{item.evidence}</span>
                <span><strong>{item.issue}</strong></span>
                <span>{item.domain}</span>
                <span>{item.owner}</span>
                <b>Open</b>
              </Link>
            ))}
          </div>
        </section>

        <section className="cc-next-panel cc-next-continuum" aria-labelledby="cc-next-continuum-title">
          <header>
            <div>
              <span className="cc-next-eyebrow">SYSTEM CONTINUUM</span>
              <h2 id="cc-next-continuum-title">Live systems</h2>
            </div>
          </header>
          <div className="cc-next-continuum-list">
            {healthRows.map((row) => (
              <div key={row.system} data-state={row.state}>
                <span className="cc-next-system-dot" aria-hidden="true" />
                <span><strong>{row.system}</strong><small>{row.evidence}</small></span>
                <b>{row.status}</b>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="cc-next-panel cc-next-activity" aria-labelledby="cc-next-activity-title">
        <header>
          <div>
            <span className="cc-next-eyebrow">AUDITED STREAM</span>
            <h2 id="cc-next-activity-title">Recent activity</h2>
          </div>
          <span>{activity.length} latest events</span>
        </header>
        {activity.length ? (
          <div className="cc-next-activity-list">
            {activity.map((item) => (
              <div key={item.key}>
                <time dateTime={item.createdAt}>{formatAdminGeneratedAt(item.createdAt)}</time>
                <span className="cc-next-activity-node" aria-hidden="true" />
                <span><strong>{item.label}</strong><small>{item.domain} · {item.reference}</small></span>
              </div>
            ))}
          </div>
        ) : (
          <div className="cc-next-state" data-state="clear">
            <strong>No recent audited changes</strong>
            <span>The current server snapshot contains no access, incident or privacy events.</span>
          </div>
        )}
      </section>
    </section>
  );
}
