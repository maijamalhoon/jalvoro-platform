"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  addOrganizationMemberAction,
  createOrganizationAction,
  grantOrganizationPermissionAction,
  revokeOrganizationGrantAction,
  transitionOrganizationAction,
  transitionOrganizationMemberAction,
} from "@/app/admin/organizations/actions";
import {
  JalvoroAddIcon,
  JalvoroSearchIcon,
} from "@/components/icons/jalvoro/components/actions";
import { JalvoroGlobeIcon } from "@/components/icons/jalvoro/components/communication";
import { JalvoroShieldMoneyIcon } from "@/components/icons/jalvoro/components/finance";
import {
  JalvoroUserPlusIcon,
  JalvoroUsersIcon,
} from "@/components/icons/jalvoro/components/identity";
import {
  JalvoroClockIcon,
  JalvoroLockIcon,
} from "@/components/icons/jalvoro/components/objects";
import {
  JalvoroInfoIcon,
  JalvoroPendingIcon,
  JalvoroSuccessIcon,
  JalvoroWarningIcon,
} from "@/components/icons/jalvoro/components/status";
import type { JalvoroIconComponent } from "@/components/icons/jalvoro/types";
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
import {
  ORGANIZATION_MEMBER_ROLES,
  ORGANIZATION_PERMISSIONS,
  type AdminOrganizationAuditEvent,
  type AdminOrganizationOperationsSnapshot,
  type AdminOrganizationSummary,
  type OrganizationStatus,
} from "@/lib/admin/organization-operations";
import { cn } from "@/lib/utils";

type ActionResult =
  | "created"
  | "updated"
  | "member-added"
  | "member-updated"
  | "grant-created"
  | "grant-revoked"
  | "invalid"
  | "forbidden"
  | "missing"
  | "conflict"
  | "blocked"
  | "unavailable"
  | null;

type DetailTab = "overview" | "members" | "access" | "audit";
type Tone = "neutral" | "positive" | "warning" | "danger" | "info";

const inputClass =
  "min-h-11 w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-info/60 focus:ring-2 focus:ring-info/15 disabled:cursor-not-allowed disabled:opacity-60";

const toneClasses: Record<Tone, string> = {
  neutral: "border-border/70 bg-background text-muted-foreground",
  positive: "border-success/25 bg-success/5 text-success",
  warning: "border-warning/25 bg-warning/5 text-warning",
  danger: "border-destructive/25 bg-destructive/5 text-destructive",
  info: "border-info/25 bg-info/5 text-info",
};

const resultMessages: Record<
  Exclude<ActionResult, null>,
  { title: string; detail: string; tone: Tone }
> = {
  created: {
    title: "Organization created",
    detail: "The tenant record and first Owner membership are ready in draft state.",
    tone: "positive",
  },
  updated: {
    title: "Lifecycle updated",
    detail: "The organization status and audit trail were updated.",
    tone: "positive",
  },
  "member-added": {
    title: "Member added",
    detail: "The membership is active and recorded in the organization audit trail.",
    tone: "positive",
  },
  "member-updated": {
    title: "Membership updated",
    detail: "The role or membership lifecycle changed successfully.",
    tone: "positive",
  },
  "grant-created": {
    title: "Scoped access granted",
    detail: "The administrator grant is restricted to this organization.",
    tone: "positive",
  },
  "grant-revoked": {
    title: "Scoped access revoked",
    detail: "The organization grant can no longer authorize operations.",
    tone: "positive",
  },
  invalid: {
    title: "Request rejected",
    detail: "Review the submitted values and try again.",
    tone: "warning",
  },
  forbidden: {
    title: "Owner access required",
    detail: "Your Command Center role cannot perform this operation.",
    tone: "danger",
  },
  missing: {
    title: "Record unavailable",
    detail: "The user, organization, membership or grant no longer exists.",
    tone: "warning",
  },
  conflict: {
    title: "Record already exists",
    detail: "An active organization, membership or grant already uses these values.",
    tone: "warning",
  },
  blocked: {
    title: "Safety rule blocked the change",
    detail: "Lifecycle, last-owner or tenant-scope protection prevented the operation.",
    tone: "warning",
  },
  unavailable: {
    title: "Operation unavailable",
    detail: "No organization state was changed. Try again after reviewing platform health.",
    tone: "danger",
  },
};

function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        toneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}

function statusTone(status: string): Tone {
  if (status === "active") return "positive";
  if (status === "draft" || status === "suspended" || status === "expired") {
    return "warning";
  }
  if (status === "closed" || status === "revoked") return "danger";
  return "neutral";
}

function Metric({
  label,
  value,
  detail,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: number;
  detail: string;
  icon: JalvoroIconComponent;
  tone?: Tone;
}) {
  return (
    <Card className="cc-org-metric">
      <CardHeader className="grid grid-cols-[1fr_auto] gap-3">
        <div>
          <CardDescription className="text-xs font-semibold uppercase tracking-[0.14em]">
            {label}
          </CardDescription>
          <CardTitle className="mt-2 font-mono text-3xl tracking-[-0.04em]">
            {formatAdminCount(value)}
          </CardTitle>
        </div>
        <span className={cn("cc-org-metric-icon", toneClasses[tone])}>
          <Icon size={19} context="heading" aria-hidden="true" />
        </span>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function Notice({ result }: { result: ActionResult }) {
  if (!result) return null;
  const message = resultMessages[result];

  return (
    <div className={cn("cc-org-notice", toneClasses[message.tone])}>
      <strong>{message.title}</strong>
      <span>{message.detail}</span>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function humanize(value: string) {
  return value
    .replaceAll("command-center:organizations:", "")
    .replaceAll("_", " ")
    .replaceAll("-", " ");
}

function OrganizationRegistryItem({
  item,
  selected,
}: {
  item: AdminOrganizationSummary;
  selected: boolean;
}) {
  return (
    <Link
      href={`/admin/organizations?organization=${encodeURIComponent(item.organizationCode)}`}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "cc-org-registry-item finance-focus",
        selected && "cc-org-registry-item-active",
      )}
    >
      <span className="cc-org-registry-symbol" aria-hidden="true">
        <JalvoroUsersIcon size={20} context="content" />
      </span>
      <span className="cc-org-registry-copy">
        <strong>{item.displayName}</strong>
        <small>
          {item.organizationCode} · {item.organizationKey}
        </small>
        <span>
          {formatAdminCount(item.activeMemberships)} active members ·{" "}
          {formatAdminCount(item.activeAdminGrants)} scoped grants
        </span>
      </span>
      <Pill tone={statusTone(item.status)}>{item.status}</Pill>
    </Link>
  );
}

function OrganizationCreateForm() {
  return (
    <details className="cc-org-create">
      <summary className="finance-focus">
        <span>
          <JalvoroAddIcon size={18} context="compact" aria-hidden="true" />
          Register organization
        </span>
        <small>Owner-controlled tenant creation</small>
      </summary>
      <form action={createOrganizationAction} className="cc-org-form">
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span>Display name</span>
            <input
              className={inputClass}
              name="displayName"
              required
              maxLength={120}
              placeholder="JALVORO Pakistan Operations"
            />
          </label>
          <label>
            <span>Organization key</span>
            <input
              className={inputClass}
              name="organizationKey"
              required
              maxLength={80}
              pattern="[a-z][a-z0-9]*(?:-[a-z0-9]+)*"
              placeholder="pakistan-operations"
            />
          </label>
        </div>
        <label>
          <span>Initial Owner email</span>
          <input
            className={inputClass}
            type="email"
            name="ownerEmail"
            required
            maxLength={254}
            autoComplete="off"
            placeholder="owner@example.com"
          />
          <small>Email is resolved server-side and never returned by the operations snapshot.</small>
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label>
            <span>Country code</span>
            <input
              className={inputClass}
              name="primaryCountryCode"
              maxLength={2}
              placeholder="PK"
            />
          </label>
          <label>
            <span>Region</span>
            <input
              className={inputClass}
              name="regionKey"
              maxLength={64}
              defaultValue="global"
            />
          </label>
          <label>
            <span>Classification</span>
            <select
              className={inputClass}
              name="dataClassification"
              defaultValue="confidential"
            >
              <option value="public">Public</option>
              <option value="internal">Internal</option>
              <option value="confidential">Confidential</option>
              <option value="restricted">Restricted</option>
            </select>
          </label>
        </div>
        <Button type="submit" className="w-full sm:w-auto">
          Create draft organization
        </Button>
      </form>
    </details>
  );
}

function LifecycleControls({
  organizationCode,
  organizationKey,
  status,
}: {
  organizationCode: string;
  organizationKey: string;
  status: OrganizationStatus;
}) {
  const [closeConfirmed, setCloseConfirmed] = useState(false);

  return (
    <div className="cc-org-lifecycle-controls">
      {status === "draft" || status === "suspended" ? (
        <form action={transitionOrganizationAction}>
          <input type="hidden" name="organizationCode" value={organizationCode} />
          <input type="hidden" name="action" value="activate" />
          <Button type="submit">Activate organization</Button>
        </form>
      ) : null}
      {status === "active" ? (
        <form action={transitionOrganizationAction}>
          <input type="hidden" name="organizationCode" value={organizationCode} />
          <input type="hidden" name="action" value="suspend" />
          <Button type="submit" variant="outline">
            Suspend
          </Button>
        </form>
      ) : null}
      {status !== "closed" ? (
        <details className="cc-org-danger-zone">
          <summary className="finance-focus">Close organization</summary>
          <div>
            <p>
              Closing <strong>{organizationKey}</strong> revokes every active membership
              and organization-scoped administrator grant. This cannot be reversed.
            </p>
            <label>
              <input
                type="checkbox"
                checked={closeConfirmed}
                onChange={(event) => setCloseConfirmed(event.target.checked)}
              />
              I understand the organization will be permanently closed.
            </label>
            <form action={transitionOrganizationAction}>
              <input type="hidden" name="organizationCode" value={organizationCode} />
              <input type="hidden" name="action" value="close" />
              <Button type="submit" variant="destructive" disabled={!closeConfirmed}>
                Close organization
              </Button>
            </form>
          </div>
        </details>
      ) : null}
    </div>
  );
}

function MemberOperations({
  operations,
}: {
  operations: AdminOrganizationOperationsSnapshot;
}) {
  const organization = operations.selectedOrganization;
  if (!organization) return null;

  return (
    <div className="cc-org-detail-grid">
      {operations.operationsAllowed && organization.status !== "closed" ? (
        <Card>
          <CardHeader>
            <CardTitle>Add organization member</CardTitle>
            <CardDescription>
              Resolve an existing account by email without returning its identity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={addOrganizationMemberAction} className="cc-org-form">
              <input
                type="hidden"
                name="organizationCode"
                value={organization.organizationCode}
              />
              <label>
                <span>Member email</span>
                <input
                  className={inputClass}
                  type="email"
                  name="memberEmail"
                  required
                  maxLength={254}
                  autoComplete="off"
                  placeholder="member@example.com"
                />
              </label>
              <label>
                <span>Organization role</span>
                <select className={inputClass} name="role" defaultValue="member">
                  {ORGANIZATION_MEMBER_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {humanize(role)}
                    </option>
                  ))}
                </select>
              </label>
              <Button type="submit">Add membership</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card className={cn(!operations.operationsAllowed && "xl:col-span-2")}>
        <CardHeader>
          <CardTitle>Membership registry</CardTitle>
          <CardDescription>
            Opaque references only. The final active Owner cannot be removed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {organization.members.length === 0 ? (
            <div className="cc-org-empty">No memberships are registered.</div>
          ) : (
            <div className="cc-org-stack">
              {organization.members.map((member) => (
                <article key={member.membershipCode} className="cc-org-member-row">
                  <div>
                    <strong>{member.memberReference}</strong>
                    <small>
                      {member.membershipCode} · version {member.version}
                    </small>
                  </div>
                  <div className="cc-org-member-state">
                    <Pill>{humanize(member.role)}</Pill>
                    <Pill tone={statusTone(member.status)}>{member.status}</Pill>
                  </div>
                  {operations.operationsAllowed &&
                  organization.status !== "closed" &&
                  member.status !== "revoked" ? (
                    <div className="cc-org-row-actions">
                      <form action={transitionOrganizationMemberAction}>
                        <input
                          type="hidden"
                          name="organizationCode"
                          value={organization.organizationCode}
                        />
                        <input
                          type="hidden"
                          name="membershipCode"
                          value={member.membershipCode}
                        />
                        <input
                          type="hidden"
                          name="action"
                          value={member.status === "active" ? "suspend" : "reactivate"}
                        />
                        <Button type="submit" size="sm" variant="outline">
                          {member.status === "active" ? "Suspend" : "Reactivate"}
                        </Button>
                      </form>
                      <form action={transitionOrganizationMemberAction}>
                        <input
                          type="hidden"
                          name="organizationCode"
                          value={organization.organizationCode}
                        />
                        <input
                          type="hidden"
                          name="membershipCode"
                          value={member.membershipCode}
                        />
                        <input type="hidden" name="action" value="change_role" />
                        <select
                          className="cc-org-inline-select"
                          name="role"
                          defaultValue={member.role}
                          aria-label={`Change role for ${member.memberReference}`}
                        >
                          {ORGANIZATION_MEMBER_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {humanize(role)}
                            </option>
                          ))}
                        </select>
                        <Button type="submit" size="sm" variant="outline">
                          Save role
                        </Button>
                      </form>
                      <form action={transitionOrganizationMemberAction}>
                        <input
                          type="hidden"
                          name="organizationCode"
                          value={organization.organizationCode}
                        />
                        <input
                          type="hidden"
                          name="membershipCode"
                          value={member.membershipCode}
                        />
                        <input type="hidden" name="action" value="revoke" />
                        <Button type="submit" size="sm" variant="destructive">
                          Revoke
                        </Button>
                      </form>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AccessOperations({
  operations,
}: {
  operations: AdminOrganizationOperationsSnapshot;
}) {
  const organization = operations.selectedOrganization;
  if (!organization) return null;

  return (
    <div className="cc-org-detail-grid">
      {operations.operationsAllowed && organization.status === "active" ? (
        <Card>
          <CardHeader>
            <CardTitle>Grant tenant-scoped access</CardTitle>
            <CardDescription>
              The target must already be an active Command Center administrator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={grantOrganizationPermissionAction} className="cc-org-form">
              <input
                type="hidden"
                name="organizationCode"
                value={organization.organizationCode}
              />
              <label>
                <span>Administrator email</span>
                <input
                  className={inputClass}
                  type="email"
                  name="adminEmail"
                  required
                  maxLength={254}
                  autoComplete="off"
                  placeholder="admin@example.com"
                />
              </label>
              <label>
                <span>Permission</span>
                <select
                  className={inputClass}
                  name="permissionKey"
                  defaultValue="command-center:organizations:view"
                >
                  {ORGANIZATION_PERMISSIONS.map((permission) => (
                    <option key={permission} value={permission}>
                      {humanize(permission)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Expiry</span>
                <select className={inputClass} name="expiresInDays" defaultValue="30">
                  <option value="7">7 days</option>
                  <option value="30">30 days</option>
                  <option value="90">90 days</option>
                  <option value="0">No expiry</option>
                </select>
              </label>
              <Button type="submit">Grant scoped permission</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card className={cn(!operations.operationsAllowed && "xl:col-span-2")}>
        <CardHeader>
          <CardTitle>Organization grants</CardTitle>
          <CardDescription>
            Region, organization and classification are enforced by the private grant resolver.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {organization.grants.length === 0 ? (
            <div className="cc-org-empty">No scoped administrator grants exist.</div>
          ) : (
            <div className="cc-org-stack">
              {organization.grants.map((grant) => (
                <article key={grant.grantCode} className="cc-org-member-row">
                  <div>
                    <strong>{grant.adminReference}</strong>
                    <small>{grant.grantCode}</small>
                    <span>{humanize(grant.permissionKey)}</span>
                  </div>
                  <div className="cc-org-member-state">
                    <Pill tone={statusTone(grant.status)}>{grant.status}</Pill>
                    <small>
                      {grant.expiresAt
                        ? `Expires ${formatDate(grant.expiresAt)}`
                        : "No expiry"}
                    </small>
                  </div>
                  {operations.operationsAllowed && grant.status === "active" ? (
                    <form action={revokeOrganizationGrantAction}>
                      <input
                        type="hidden"
                        name="organizationCode"
                        value={organization.organizationCode}
                      />
                      <input type="hidden" name="grantCode" value={grant.grantCode} />
                      <Button type="submit" size="sm" variant="destructive">
                        Revoke grant
                      </Button>
                    </form>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AuditTimeline({ events }: { events: AdminOrganizationAuditEvent[] }) {
  if (events.length === 0) {
    return <div className="cc-org-empty">No organization audit events exist.</div>;
  }

  return (
    <div className="cc-org-audit-timeline">
      {events.map((event) => (
        <article key={event.eventReference}>
          <span className="cc-org-audit-dot" aria-hidden="true" />
          <div>
            <div className="cc-org-audit-head">
              <strong>{humanize(event.action)}</strong>
              <time dateTime={event.createdAt}>{formatDate(event.createdAt)}</time>
            </div>
            <p>
              Actor {event.actorReference ?? "system"}
              {event.subjectReference ? ` · Subject ${event.subjectReference}` : ""}
            </p>
            {event.previousStatus || event.nextStatus || event.previousRole || event.nextRole ? (
              <div className="cc-org-audit-transition">
                {event.previousStatus ? <Pill>{event.previousStatus}</Pill> : null}
                {event.nextStatus ? <Pill tone={statusTone(event.nextStatus)}>{event.nextStatus}</Pill> : null}
                {event.previousRole ? <Pill>{humanize(event.previousRole)}</Pill> : null}
                {event.nextRole ? <Pill tone="info">{humanize(event.nextRole)}</Pill> : null}
              </div>
            ) : null}
            <code>{event.eventReference}</code>
          </div>
        </article>
      ))}
    </div>
  );
}

export default function AdminOrganizationOperationsPanel({
  operations,
  actionResult,
  page,
}: {
  operations: AdminOrganizationOperationsSnapshot;
  actionResult: ActionResult;
  page: number;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrganizationStatus | "all">("all");
  const [detailTab, setDetailTab] = useState<DetailTab>("overview");
  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("en-US");
    return operations.items.filter((item) => {
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesQuery =
        !normalized ||
        [item.displayName, item.organizationKey, item.organizationCode, item.regionKey ?? ""]
          .join(" ")
          .toLocaleLowerCase("en-US")
          .includes(normalized);
      return matchesStatus && matchesQuery;
    });
  }, [operations.items, query, statusFilter]);
  const selected = operations.selectedOrganization;

  return (
    <div className="cc-org-world">
      <section className="cc-org-hero">
        <div>
          <div className="flex flex-wrap gap-2">
            <Pill tone="positive">
              <JalvoroLockIcon size={13} context="compact" className="mr-1.5" aria-hidden="true" />
              Tenant-isolated control plane
            </Pill>
            <Pill>{operations.adminRole}</Pill>
            <Pill tone="info">Identity-minimised</Pill>
          </div>
          <p className="cc-kicker mt-5">Global organization operations</p>
          <h1>Organizations, memberships and tenant control</h1>
          <p>
            A private operating layer for every future JALVORO organization—lifecycle,
            people, scoped administrators and immutable audit history in one place.
          </p>
        </div>
        <div className="cc-org-snapshot">
          <JalvoroClockIcon size={19} context="content" aria-hidden="true" />
          <span>
            <strong>Snapshot generated</strong>
            <small>{formatAdminGeneratedAt(operations.generatedAt)} UTC</small>
          </span>
        </div>
      </section>

      <Notice result={actionResult} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
        <Metric label="Organizations" value={operations.totals.total} detail="Visible tenant records." icon={JalvoroGlobeIcon} tone="info" />
        <Metric label="Active" value={operations.totals.active} detail="Operational organizations." icon={JalvoroSuccessIcon} tone="positive" />
        <Metric label="Draft" value={operations.totals.draft} detail="Awaiting activation." icon={JalvoroPendingIcon} tone="warning" />
        <Metric label="Suspended" value={operations.totals.suspended} detail="Temporarily paused." icon={JalvoroWarningIcon} tone="warning" />
        <Metric label="Closed" value={operations.totals.closed} detail="Permanently retired." icon={JalvoroInfoIcon} />
        <Metric label="Active members" value={operations.totals.activeMemberships} detail={`${formatAdminCount(operations.totals.memberships)} total memberships.`} icon={JalvoroUsersIcon} />
        <Metric label="Scoped grants" value={operations.totals.activeAdminGrants} detail="Active tenant administrator grants." icon={JalvoroShieldMoneyIcon} />
      </section>

      <section className="cc-org-workspace">
        <aside className="cc-org-registry">
          <div className="cc-org-registry-head">
            <div>
              <p className="cc-kicker">Organization registry</p>
              <h2>Worldwide tenants</h2>
            </div>
            <Pill tone="info">Page {page}</Pill>
          </div>

          <div className="cc-org-filter-grid">
            <label className="cc-org-search">
              <JalvoroSearchIcon size={17} context="compact" aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search this page…"
                aria-label="Search organizations on this page"
              />
            </label>
            <select
              className={inputClass}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as OrganizationStatus | "all")}
              aria-label="Filter organizations by status"
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {operations.operationsAllowed ? <OrganizationCreateForm /> : null}

          <div className="cc-org-registry-list">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <OrganizationRegistryItem
                  key={item.organizationCode}
                  item={item}
                  selected={selected?.organizationCode === item.organizationCode}
                />
              ))
            ) : (
              <div className="cc-org-empty">
                {operations.items.length === 0
                  ? "No organizations exist yet. Register the first tenant when the real organization is ready."
                  : "No organization on this page matches the filter."}
              </div>
            )}
          </div>

          <div className="cc-org-pagination">
            {page > 1 ? (
              <Link href={`/admin/organizations?page=${page - 1}`} className="finance-focus">
                Previous
              </Link>
            ) : <span />}
            {operations.pagination.hasMore ? (
              <Link href={`/admin/organizations?page=${page + 1}`} className="finance-focus">
                Next page
              </Link>
            ) : null}
          </div>
        </aside>

        <div className="cc-org-detail">
          {selected ? (
            <>
              <header className="cc-org-detail-head">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Pill tone={statusTone(selected.status)}>{selected.status}</Pill>
                    <Pill>{selected.dataClassification}</Pill>
                    <Pill tone="info">version {selected.version}</Pill>
                  </div>
                  <h2>{selected.displayName}</h2>
                  <p>
                    {selected.organizationCode} · {selected.organizationKey}
                  </p>
                </div>
                {operations.operationsAllowed ? (
                  <LifecycleControls
                    organizationCode={selected.organizationCode}
                    organizationKey={selected.organizationKey}
                    status={selected.status}
                  />
                ) : (
                  <Pill tone="warning">Read-only role</Pill>
                )}
              </header>

              <nav className="cc-org-tabs" aria-label="Organization detail sections">
                {(["overview", "members", "access", "audit"] as DetailTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={cn("finance-focus", detailTab === tab && "active")}
                    onClick={() => setDetailTab(tab)}
                  >
                    {tab}
                    {tab === "members" ? ` (${selected.members.length})` : ""}
                    {tab === "access" ? ` (${selected.grants.length})` : ""}
                  </button>
                ))}
              </nav>

              {detailTab === "overview" ? (
                <div className="cc-org-overview-grid">
                  {[
                    ["Country", selected.primaryCountryCode ?? "Not assigned"],
                    ["Region", selected.regionKey ?? "Not assigned"],
                    ["Classification", selected.dataClassification],
                    ["Created", formatDate(selected.createdAt)],
                    ["Last updated", formatDate(selected.updatedAt)],
                    ["Direct table access", operations.directTableAccessEnabled ? "Enabled" : "Blocked"],
                  ].map(([label, value]) => (
                    <Card key={label} size="sm">
                      <CardHeader>
                        <CardDescription>{label}</CardDescription>
                        <CardTitle className="capitalize">{value}</CardTitle>
                      </CardHeader>
                    </Card>
                  ))}
                  <Card className="sm:col-span-2 xl:col-span-3">
                    <CardHeader>
                      <CardTitle>Global operating boundaries</CardTitle>
                      <CardDescription>
                        Identity fields are excluded, table access is denied directly,
                        and mutations pass through audited Owner-only functions.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-3">
                      <div className="cc-org-boundary"><JalvoroLockIcon size={18} context="content" aria-hidden="true" /><span><strong>Private schema</strong><small>RLS + revoked direct grants</small></span></div>
                      <div className="cc-org-boundary"><JalvoroUsersIcon size={18} context="content" aria-hidden="true" /><span><strong>Opaque identities</strong><small>No emails or raw user IDs returned</small></span></div>
                      <div className="cc-org-boundary"><JalvoroClockIcon size={18} context="content" aria-hidden="true" /><span><strong>Append-only audit</strong><small>Two-year controlled retention</small></span></div>
                    </CardContent>
                  </Card>
                </div>
              ) : null}

              {detailTab === "members" ? <MemberOperations operations={operations} /> : null}
              {detailTab === "access" ? <AccessOperations operations={operations} /> : null}
              {detailTab === "audit" ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Organization audit timeline</CardTitle>
                    <CardDescription>
                      Latest 100 identity-minimised lifecycle, membership and grant events.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AuditTimeline events={selected.audit} />
                  </CardContent>
                </Card>
              ) : null}
            </>
          ) : (
            <div className="cc-org-detail-empty">
              <span aria-hidden="true"><JalvoroUserPlusIcon size={34} context="hero" /></span>
              <p className="cc-kicker">Organization world</p>
              <h2>Select a tenant to open its control room</h2>
              <p>
                Memberships, scoped administrators, lifecycle state and audit history
                will appear here without exposing customer identities.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
