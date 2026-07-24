import {
  createSecurityIncidentAction,
  updateSecurityIncidentAction,
} from "@/app/admin/incident-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatAdminCount,
  formatAdminGeneratedAt,
} from "@/lib/admin/control-center";
import type {
  AdminIncidentOperationsSnapshot,
  SecurityIncidentCategory,
  SecurityIncidentQueueItem,
  SecurityIncidentSeverity,
  SecurityIncidentSource,
} from "@/lib/admin/incident-operations";
import { cn } from "@/lib/utils";

type ActionResult =
  | "created"
  | "updated"
  | "invalid"
  | "forbidden"
  | "missing"
  | "unavailable"
  | null;

const categoryLabels: Record<SecurityIncidentCategory, string> = {
  access_governance: "Access governance",
  privacy_deadline: "Privacy deadline",
  billing_pipeline: "Billing pipeline",
  availability: "Availability",
  data_boundary: "Data boundary",
  retention: "Retention",
  manual_review: "Manual review",
};

const sourceLabels: Record<SecurityIncidentSource, string> = {
  posture: "Security posture",
  access: "Admin access",
  privacy: "Privacy operations",
  billing: "Billing operations",
  system: "System signal",
  manual: "Manual review",
};

const severityLabels: Record<SecurityIncidentSeverity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

const statusLabels = {
  open: "Open",
  acknowledged: "Acknowledged",
  investigating: "Investigating",
  monitoring: "Monitoring",
  resolved: "Resolved",
  dismissed: "Dismissed",
} as const;

const resolutionLabels = {
  mitigated: "Mitigated",
  false_positive: "False positive",
  duplicate: "Duplicate",
  accepted_risk: "Accepted risk",
  no_action_required: "No action required",
  superseded: "Superseded",
} as const;

const actionMessages: Record<Exclude<ActionResult, null>, string> = {
  created: "Security incident created, assigned and audited.",
  updated: "Incident workflow updated and audited.",
  invalid: "The requested incident change is invalid or incomplete.",
  forbidden: "This incident is assigned elsewhere or your role is read-only.",
  missing: "The incident no longer exists.",
  unavailable: "The incident workflow could not be changed. No partial update was saved.",
};

function toDateInput(value: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function severityTone(severity: SecurityIncidentSeverity) {
  if (severity === "critical") return "danger" as const;
  if (severity === "high") return "warning" as const;
  if (severity === "medium") return "info" as const;
  return "neutral" as const;
}

function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "positive" | "warning" | "danger" | "info";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        tone === "neutral" &&
          "border-border/70 bg-background text-muted-foreground",
        tone === "positive" &&
          "border-success/25 bg-success/5 text-success",
        tone === "warning" &&
          "border-warning/25 bg-warning/5 text-warning",
        tone === "danger" &&
          "border-destructive/25 bg-destructive/5 text-destructive",
        tone === "info" && "border-info/25 bg-info/5 text-info",
      )}
    >
      {children}
    </span>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <Card className="border-border/70 bg-card/88 shadow-sm">
      <CardHeader>
        <CardDescription className="text-xs font-semibold uppercase tracking-[0.14em]">
          {label}
        </CardDescription>
        <CardTitle className="font-mono text-3xl tracking-[-0.04em]">
          {formatAdminCount(value)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function IncidentCard({
  incident,
  operationsAllowed,
}: {
  incident: SecurityIncidentQueueItem;
  operationsAllowed: boolean;
}) {
  const controlsEnabled = operationsAllowed && incident.manageable;

  return (
    <Card
      className={cn(
        "border-border/70 bg-card/90 shadow-sm",
        incident.overdue && "border-destructive/35",
        incident.severity === "critical" && "ring-1 ring-destructive/20",
      )}
    >
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs font-semibold tracking-[0.12em] text-muted-foreground">
              {incident.incidentCode}
            </p>
            <CardTitle className="mt-1 text-lg">
              {categoryLabels[incident.category]}
            </CardTitle>
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill tone={severityTone(incident.severity)}>
              {severityLabels[incident.severity]}
            </Pill>
            <Pill tone={incident.overdue ? "danger" : "warning"}>
              {incident.overdue
                ? "Overdue"
                : statusLabels[incident.status]}
            </Pill>
          </div>
        </div>

        <CardDescription className="grid gap-2 text-xs sm:grid-cols-2 xl:grid-cols-4">
          <span>Created {formatAdminGeneratedAt(incident.createdAt)} UTC</span>
          <span>
            Due {incident.dueAt ? `${formatAdminGeneratedAt(incident.dueAt)} UTC` : "not assigned"}
          </span>
          <span>Source: {sourceLabels[incident.source]}</span>
          <span>
            Assignment: {incident.assignedToMe
              ? "Assigned to you"
              : incident.assigned
                ? "Assigned to another administrator"
                : "Unassigned"}
          </span>
          {incident.sourceReference ? (
            <span className="font-mono">Reference: {incident.sourceReference}</span>
          ) : null}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {controlsEnabled ? (
          <form action={updateSecurityIncidentAction} className="space-y-4">
            <input
              type="hidden"
              name="incidentCode"
              value={incident.incidentCode}
            />

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
                Workflow status
                <select
                  name="status"
                  defaultValue={incident.status}
                  className="finance-focus min-h-11 rounded-xl border border-input bg-background px-3 text-sm text-foreground"
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
                Severity
                <select
                  name="severity"
                  defaultValue={incident.severity}
                  className="finance-focus min-h-11 rounded-xl border border-input bg-background px-3 text-sm text-foreground"
                >
                  {Object.entries(severityLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
                Due date
                <input
                  type="date"
                  name="dueDate"
                  defaultValue={toDateInput(incident.dueAt)}
                  className="finance-focus min-h-11 rounded-xl border border-input bg-background px-3 text-sm text-foreground"
                />
              </label>

              <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
                Resolution code
                <select
                  name="resolutionCode"
                  defaultValue=""
                  className="finance-focus min-h-11 rounded-xl border border-input bg-background px-3 text-sm text-foreground"
                >
                  <option value="">Required only when closing</option>
                  {Object.entries(resolutionLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-col gap-3 border-t border-divider/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  name="assignToSelf"
                  defaultChecked={!incident.assigned || incident.assignedToMe}
                  className="finance-focus size-4 rounded border-input"
                />
                {incident.assignedToMe
                  ? "Keep assigned to me"
                  : incident.assigned
                    ? "Owner reassignment to me"
                    : "Assign to me"}
              </label>

              <Button type="submit" size="sm" className="sm:min-w-36">
                Save incident
              </Button>
            </div>

            <p className="text-xs leading-5 text-muted-foreground">
              Resolved or dismissed incidents require a controlled resolution
              code. Critical dismissal requires the platform Owner. No incident
              description or arbitrary notes are stored.
            </p>
          </form>
        ) : (
          <div className="rounded-2xl border border-border/70 bg-background/65 p-4 text-sm leading-6 text-muted-foreground">
            {operationsAllowed
              ? "This incident is assigned to another administrator. Only the Owner can take it over."
              : "Your platform role can review structured incidents, but only an Owner or Admin can operate the workflow."}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminIncidentOperationsPanel({
  incidents,
  actionResult,
}: {
  incidents: AdminIncidentOperationsSnapshot;
  actionResult: ActionResult;
}) {
  const activeTotal =
    incidents.counts.open +
    incidents.counts.acknowledged +
    incidents.counts.investigating +
    incidents.counts.monitoring;

  return (
    <section
      id="admin-incidents"
      className="mx-auto w-full max-w-[1500px] scroll-mt-24 px-4 pb-12 sm:px-6 lg:px-8"
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-info">
              Incident and alert operations
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Structured security incident queue
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Create, assign, acknowledge, investigate, monitor and close security
              incidents without storing descriptions, identities, raw logs,
              finance content or provider payloads.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill tone={incidents.operationsAllowed ? "positive" : "neutral"}>
              {incidents.operationsAllowed ? "Owner/Admin operations" : "Read only"}
            </Pill>
            <Pill tone="info">{incidents.counts.auditEvents30d} audited changes · 30d</Pill>
          </div>
        </div>

        {actionResult ? (
          <div
            role="status"
            className={cn(
              "rounded-2xl border px-4 py-3 text-sm",
              actionResult === "created" || actionResult === "updated"
                ? "border-success/20 bg-success/5 text-success"
                : actionResult === "forbidden"
                  ? "border-destructive/20 bg-destructive/5 text-destructive"
                  : "border-warning/20 bg-warning/5 text-warning",
            )}
          >
            {actionMessages[actionResult]}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Active incidents" value={activeTotal} detail="All non-terminal incident workflow states." />
          <Metric label="Critical open" value={incidents.counts.criticalOpen} detail="Critical incidents requiring immediate review." />
          <Metric label="Overdue" value={incidents.counts.overdueOpen} detail="Active incidents past their structured due date." />
          <Metric label="Investigating" value={incidents.counts.investigating} detail="Incidents currently under investigation." />
          <Metric label="Resolved 30d" value={incidents.counts.resolved30d} detail="Incidents resolved during the last 30 days." />
        </div>

        {incidents.operationsAllowed ? (
          <Card className="border-border/70 bg-card/88 shadow-sm">
            <CardHeader>
              <CardTitle>Create structured incident</CardTitle>
              <CardDescription>
                The creator is assigned automatically. Source reference is optional
                and accepts only an opaque PRV, ADM, AIN or USR reference.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createSecurityIncidentAction} className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
                    Category
                    <select name="category" defaultValue="manual_review" className="finance-focus min-h-11 rounded-xl border border-input bg-background px-3 text-sm text-foreground">
                      {Object.entries(categoryLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
                    Severity
                    <select name="severity" defaultValue="medium" className="finance-focus min-h-11 rounded-xl border border-input bg-background px-3 text-sm text-foreground">
                      {Object.entries(severityLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
                    Source
                    <select name="source" defaultValue="manual" className="finance-focus min-h-11 rounded-xl border border-input bg-background px-3 text-sm text-foreground">
                      {Object.entries(sourceLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
                    Opaque reference
                    <input name="sourceReference" maxLength={16} autoComplete="off" spellCheck={false} placeholder="PRV-… / ADM-…" className="finance-focus min-h-11 rounded-xl border border-input bg-background px-3 font-mono text-sm uppercase text-foreground" />
                  </label>

                  <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
                    Due date
                    <input type="date" name="dueDate" className="finance-focus min-h-11 rounded-xl border border-input bg-background px-3 text-sm text-foreground" />
                  </label>
                </div>

                <div className="flex flex-col gap-3 border-t border-divider/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-5 text-muted-foreground">
                    No title, description, notes, raw evidence or attachment is accepted.
                  </p>
                  <Button type="submit" className="sm:min-w-40">Create incident</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-2">
          {incidents.queue.map((incident) => (
            <IncidentCard
              key={incident.incidentCode}
              incident={incident}
              operationsAllowed={incidents.operationsAllowed}
            />
          ))}
        </div>

        {incidents.queue.length === 0 ? (
          <Card className="border-border/70 bg-card/88 shadow-sm">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No active structured security incidents.
            </CardContent>
          </Card>
        ) : null}

        <Card className="border-border/70 bg-card/88 shadow-sm">
          <CardHeader>
            <CardTitle>Incident data boundaries</CardTitle>
            <CardDescription>
              Enforced by the private database snapshot and validated again before rendering.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Free text stored", incidents.freeTextStored ? "Yes" : "No"],
              ["Raw IP stored", incidents.rawIpStored ? "Yes" : "No"],
              ["Session replay stored", incidents.sessionReplayStored ? "Yes" : "No"],
              ["User identity returned", incidents.userIdentityReturned ? "Yes" : "No"],
              ["Finance content stored", incidents.financeContentStored ? "Yes" : "No"],
              ["Provider payload stored", incidents.providerPayloadStored ? "Yes" : "No"],
              ["Expired audit backlog", String(incidents.counts.expiredAuditPending)],
              ["Expired incident backlog", String(incidents.counts.expiredIncidentsPending)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
                <p className={cn("mt-1 font-medium", value === "No" || value === "0" ? "text-success" : "text-warning")}>{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
