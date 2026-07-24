import Link from "next/link";

import { updateComplianceReviewAction } from "@/app/admin/compliance-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  AdminComplianceAuditSnapshot,
  ComplianceAuditDomain,
  ComplianceAuditEvent,
  ComplianceReviewStatus,
} from "@/lib/admin/compliance-audit";
import { formatAdminCount } from "@/lib/admin/control-center";
import { cn } from "@/lib/utils";

const domainLabels: Record<ComplianceAuditDomain, string> = {
  privacy: "Privacy",
  billing: "Billing",
  access: "Team access",
  incident: "Incidents",
};

const statusLabels: Record<ComplianceReviewStatus, string> = {
  pending: "Pending",
  reviewed: "Reviewed",
  flagged: "Flagged",
};

const actionLabels: Record<string, string> = {
  workflow_updated: "Workflow updated",
  claimed_and_updated: "Claimed and updated",
  created: "Created",
  updated: "Updated",
  activated: "Activated",
  deactivated: "Deactivated",
  invitation_created: "Invitation created",
  invitation_revoked: "Invitation revoked",
  invitation_accepted: "Invitation accepted",
  role_changed: "Role changed",
  access_disabled: "Access disabled",
  access_restored: "Access restored",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function StatusPill({ status }: { status: ComplianceReviewStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
        status === "pending" && "border-warning/25 bg-warning/5 text-warning",
        status === "reviewed" && "border-success/25 bg-success/5 text-success",
        status === "flagged" &&
          "border-destructive/25 bg-destructive/5 text-destructive",
      )}
    >
      {statusLabels[status]}
    </span>
  );
}

function Metric({
  label,
  value,
  detail,
  attention = false,
}: {
  label: string;
  value: number;
  detail: string;
  attention?: boolean;
}) {
  return (
    <Card className="border-border/70 bg-card/88 shadow-sm">
      <CardHeader>
        <CardDescription className="text-xs font-semibold uppercase tracking-[0.14em]">
          {label}
        </CardDescription>
        <CardTitle
          className={cn(
            "font-mono text-3xl tracking-[-0.04em]",
            attention && value > 0 && "text-destructive",
          )}
        >
          {formatAdminCount(value)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function filterHref(domain: string, status: string) {
  const params = new URLSearchParams();
  if (domain !== "all") params.set("auditDomain", domain);
  if (status !== "all") params.set("auditStatus", status);
  const query = params.toString();
  return `/admin${query ? `?${query}` : ""}#admin-compliance`;
}

function AuditEventCard({
  event,
  operationsAllowed,
}: {
  event: ComplianceAuditEvent;
  operationsAllowed: boolean;
}) {
  return (
    <Card className="border-border/70 bg-card/88 shadow-sm">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <code className="font-mono text-xs text-muted-foreground">
                {event.eventCode}
              </code>
              <span className="rounded-full border border-info/20 bg-info/5 px-2.5 py-1 text-xs font-semibold text-info">
                {domainLabels[event.domain]}
              </span>
              <StatusPill status={event.reviewStatus} />
              {event.attentionRequired ? (
                <span className="rounded-full border border-destructive/25 bg-destructive/5 px-2.5 py-1 text-xs font-semibold text-destructive">
                  Attention
                </span>
              ) : null}
              {event.integrityState === "mismatch" ? (
                <span className="rounded-full border border-destructive/25 bg-destructive/5 px-2.5 py-1 text-xs font-semibold text-destructive">
                  Integrity mismatch
                </span>
              ) : event.integrityState === "verified" ? (
                <span className="rounded-full border border-success/25 bg-success/5 px-2.5 py-1 text-xs font-semibold text-success">
                  Digest verified
                </span>
              ) : null}
            </div>
            <CardTitle className="mt-3 text-lg">
              {actionLabels[event.action] ?? event.action.replaceAll("_", " ")}
            </CardTitle>
            <CardDescription className="mt-1">
              {event.subjectReference ?? "No subject reference"} · {formatDate(event.occurredAt)}
            </CardDescription>
          </div>
          <div className="text-xs text-muted-foreground">
            Reviewed: {formatDate(event.reviewedAt)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Previous state
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {event.previousState ?? "—"}
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Next state
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {event.nextState ?? "—"}
            </p>
          </div>
        </div>

        {operationsAllowed ? (
          <form
            action={updateComplianceReviewAction}
            className="flex flex-col gap-3 border-t border-divider/70 pt-4 sm:flex-row sm:items-end sm:justify-end"
          >
            <input type="hidden" name="eventCode" value={event.eventCode} />
            <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
              Review status
              <select
                name="status"
                defaultValue={event.reviewStatus}
                className="finance-focus min-h-11 rounded-xl border border-input bg-background px-3 text-sm text-foreground"
              >
                <option value="pending">Pending</option>
                <option value="reviewed">Reviewed</option>
                <option value="flagged">Flagged</option>
              </select>
            </label>
            <Button type="submit">Save review</Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function AdminComplianceAuditPanel({
  audit,
  actionResult,
  domainFilter,
  statusFilter,
}: {
  audit: AdminComplianceAuditSnapshot;
  actionResult: "updated" | "invalid" | "forbidden" | "missing" | "unavailable" | null;
  domainFilter: ComplianceAuditDomain | "all";
  statusFilter: ComplianceReviewStatus | "all";
}) {
  const filteredEvents = audit.timeline.filter(
    (event) =>
      (domainFilter === "all" || event.domain === domainFilter) &&
      (statusFilter === "all" || event.reviewStatus === statusFilter),
  );

  return (
    <section
      id="admin-compliance"
      className="mx-auto w-full max-w-[1500px] scroll-mt-24 px-4 pb-12 sm:px-6 lg:px-8"
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-info">
              Governance review
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Compliance &amp; Audit Review Center
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Centralized, structured review of privacy, billing, team-access and
              incident actions. Source rows are append-only and reviewed events
              are bound to a SHA-256 digest. No additional database request or
              client polling is used.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-info/25 bg-info/5 px-2.5 py-1 text-xs font-semibold text-info">
              {audit.mode === "review" ? "Owner/Admin review" : "Read-only"}
            </span>
            <span className="rounded-full border border-success/25 bg-success/5 px-2.5 py-1 text-xs font-semibold text-success">
              Append-only sources
            </span>
          </div>
        </div>

        {actionResult ? (
          <div
            role="status"
            className={cn(
              "rounded-2xl border px-4 py-3 text-sm",
              actionResult === "updated"
                ? "border-success/20 bg-success/5 text-success"
                : actionResult === "forbidden"
                  ? "border-destructive/20 bg-destructive/5 text-destructive"
                  : "border-warning/20 bg-warning/5 text-warning",
            )}
          >
            {actionResult === "updated"
              ? "Audit review status updated."
              : actionResult === "forbidden"
                ? "Owner or Admin review access is required."
                : actionResult === "missing"
                  ? "The source audit event is no longer available."
                  : actionResult === "invalid"
                    ? "The review request was invalid."
                    : "Compliance review is temporarily unavailable."}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Events 30d" value={audit.counts.events30d} detail="Structured source events from the last 30 days." />
          <Metric label="Pending" value={audit.counts.pending30d} detail="Recent events awaiting compliance review." />
          <Metric label="Flagged" value={audit.counts.flagged30d} detail="Reviewed events intentionally flagged for follow-up." attention />
          <Metric label="Attention pending" value={audit.counts.attentionPending} detail="High-signal events not yet reviewed." attention />
          <Metric label="Integrity mismatch" value={audit.counts.integrityMismatches} detail="Reviewed source digests that no longer match." attention />
        </div>

        <Card className="border-border/70 bg-card/88 shadow-sm">
          <CardHeader>
            <CardTitle>Secure filters</CardTitle>
            <CardDescription>
              Filters operate on the already validated 60-event server snapshot.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {(["all", "privacy", "billing", "access", "incident"] as const).map((domain) => (
                <Link
                  key={domain}
                  href={filterHref(domain, statusFilter)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                    domainFilter === domain
                      ? "border-info/30 bg-info/10 text-info"
                      : "border-border/70 bg-background/70 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {domain === "all" ? "All domains" : domainLabels[domain]}
                </Link>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {(["all", "pending", "reviewed", "flagged"] as const).map((status) => (
                <Link
                  key={status}
                  href={filterHref(domainFilter, status)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                    statusFilter === status
                      ? "border-info/30 bg-info/10 text-info"
                      : "border-border/70 bg-background/70 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {status === "all" ? "All statuses" : statusLabels[status]}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          {filteredEvents.map((event) => (
            <AuditEventCard
              key={event.eventCode}
              event={event}
              operationsAllowed={audit.operationsAllowed}
            />
          ))}
        </div>

        {filteredEvents.length === 0 ? (
          <Card className="border-border/70 bg-card/88 shadow-sm">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No structured audit events match the selected filters.
            </CardContent>
          </Card>
        ) : null}

        <Card className="border-border/70 bg-card/88 shadow-sm">
          <CardHeader>
            <CardTitle>Audit boundary contract</CardTitle>
            <CardDescription>
              Enforced in the private database snapshot and validated again before rendering.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Source audit updates", audit.appendOnlySources ? "Blocked" : "Allowed"],
              ["Digest verification", audit.sourceDigestVerification ? "Enabled" : "Disabled"],
              ["Raw identity", audit.rawIdentityReturned ? "Returned" : "Excluded"],
              ["Finance content", audit.financeContentReturned ? "Returned" : "Excluded"],
              ["Raw logs", audit.rawLogsReturned ? "Returned" : "Excluded"],
              ["Provider payload", audit.providerPayloadReturned ? "Returned" : "Excluded"],
              ["Review transitions 30d", String(audit.counts.reviewTransitions30d)],
              ["Expired review backlog", String(audit.counts.expiredReviewsPending + audit.counts.expiredReviewAuditPending)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
                <p className={cn("mt-1 font-medium", ["Blocked", "Enabled", "Excluded", "0"].includes(value) ? "text-success" : "text-foreground")}>{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
