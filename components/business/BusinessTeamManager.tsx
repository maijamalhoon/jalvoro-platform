"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  ChevronRight,
  Clipboard,
  Crown,
  History,
  MailPlus,
  RefreshCcw,
  Save,
  ShieldCheck,
  UserCog,
  UserRoundCheck,
  UserRoundX,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BUSINESS_TEAM_ASSIGNABLE_ROLES,
  businessRoleLabel,
  isPrivilegedBusinessRole,
  isSensitiveBusinessPermission,
  suggestedBusinessPermissions,
  visibleBusinessPermissionGroups,
  type BusinessPermissionGroup,
} from "@/lib/business/team-access";
import { createClient } from "@/lib/supabase/client";

type WorkspaceMode = "advanced_company" | "simple_shop";

type TeamMember = {
  user_id: string;
  name: string;
  email: string | null;
  role: string;
  status: "active" | "suspended" | "revoked";
  permissions: string[];
  joined_at: string | null;
  created_at: string;
  is_primary_owner: boolean;
};

type TeamInvitation = {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  status: "pending" | "accepted" | "cancelled" | "expired";
  expires_at: string;
  delivery_status: "pending" | "sent" | "failed" | "manual";
  delivery_error: string | null;
  last_sent_at: string | null;
  resend_count: number;
  created_at: string;
  invited_by: string;
};

type AuditEvent = {
  id: number | string;
  action: string;
  actor_user_id: string | null;
  actor_name: string | null;
  target_user_id: string | null;
  target_name: string | null;
  invitation_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

type TeamSnapshot = {
  business: {
    id: string;
    name: string;
    slug: string;
    workspace_mode: WorkspaceMode;
    owner_user_id: string;
  };
  members: TeamMember[];
  invitations: TeamInvitation[];
  audit: AuditEvent[];
  permission_catalog: string[];
};

type BusinessTeamManagerProps = {
  businessId: string;
  businessSlug: string;
  workspaceMode: WorkspaceMode;
  currentUserId: string;
  isPrimaryOwner: boolean;
  canManage: boolean;
  snapshot: TeamSnapshot;
};

function displayDate(value: string | null, includeTime = false) {
  if (!value) return "Not yet";
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(value));
}

function statusTone(status: string) {
  if (status === "active" || status === "accepted" || status === "sent") {
    return "bg-success-soft text-success";
  }
  if (status === "pending") return "bg-primary-soft text-primary";
  if (status === "suspended" || status === "expired" || status === "failed") {
    return "bg-warning-soft text-warning";
  }
  return "bg-danger-soft text-danger";
}

function auditLabel(action: string) {
  const labels: Record<string, string> = {
    invitation_created: "Invitation created",
    invitation_sent: "Invitation sent",
    invitation_failed: "Email delivery failed",
    invitation_resent: "Invitation resent",
    invitation_cancelled: "Invitation cancelled",
    invitation_accepted: "Invitation accepted",
    member_updated: "Member access updated",
    member_suspended: "Member suspended",
    member_reactivated: "Member reactivated",
    member_revoked: "Member removed",
    ownership_transferred: "Ownership transferred",
  };
  return labels[action] ?? action.replace(/_/g, " ");
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success("Secure invitation link copied.");
  } catch {
    toast.error("Copy failed. Select and copy the link manually.");
  }
}

export default function BusinessTeamManager({
  businessId,
  businessSlug,
  workspaceMode,
  currentUserId,
  isPrimaryOwner,
  canManage,
  snapshot,
}: BusinessTeamManagerProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(workspaceMode === "simple_shop" ? "cashier" : "employee");
  const [permissions, setPermissions] = useState<string[]>(
    suggestedBusinessPermissions(workspaceMode === "simple_shop" ? "cashier" : "employee", workspaceMode),
  );
  const [expiresDays, setExpiresDays] = useState("7");
  const [sending, setSending] = useState(false);
  const [busyInvitation, setBusyInvitation] = useState<string | null>(null);
  const [manualLink, setManualLink] = useState<string | null>(null);

  const pendingInvitations = snapshot.invitations.filter((invitation) =>
    ["pending", "expired"].includes(invitation.status),
  );
  const historicalInvitations = snapshot.invitations.filter(
    (invitation) => !["pending", "expired"].includes(invitation.status),
  );
  const groups = visibleBusinessPermissionGroups(workspaceMode);

  function changeInviteRole(nextRole: string) {
    setRole(nextRole);
    setPermissions(suggestedBusinessPermissions(nextRole, workspaceMode));
  }

  function togglePermission(permission: string) {
    setPermissions((current) =>
      current.includes(permission)
        ? current.filter((value) => value !== permission)
        : [...current, permission],
    );
  }

  async function sendInvitation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;

    setSending(true);
    setManualLink(null);
    try {
      const result = await fetch("/api/business/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          businessId,
          email,
          role,
          permissions,
          expiresDays: Number(expiresDays),
        }),
      });
      const body = (await result.json()) as {
        ok?: boolean;
        message?: string;
        manualUrl?: string;
      };

      if (body.manualUrl) setManualLink(body.manualUrl);
      if (!result.ok || !body.ok) {
        toast.error(body.message ?? "Invitation email could not be sent.");
        router.refresh();
        return;
      }

      toast.success(body.message ?? "Invitation email sent.");
      setEmail("");
      router.refresh();
    } catch {
      toast.error("Invitation delivery is temporarily unavailable.");
    } finally {
      setSending(false);
    }
  }

  async function resendInvitation(invitation: TeamInvitation) {
    if (busyInvitation) return;
    setBusyInvitation(invitation.id);
    setManualLink(null);
    try {
      const result = await fetch("/api/business/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resend",
          businessId,
          invitationId: invitation.id,
          expiresDays: 7,
        }),
      });
      const body = (await result.json()) as {
        ok?: boolean;
        message?: string;
        manualUrl?: string;
      };
      if (body.manualUrl) setManualLink(body.manualUrl);
      if (!result.ok || !body.ok) toast.error(body.message ?? "Invitation could not be resent.");
      else toast.success(body.message ?? "Invitation sent again.");
      router.refresh();
    } catch {
      toast.error("Invitation could not be resent.");
    } finally {
      setBusyInvitation(null);
    }
  }

  async function cancelInvitation(invitationId: string) {
    if (busyInvitation) return;
    setBusyInvitation(invitationId);
    const { error } = await supabase.rpc("cancel_business_invitation", {
      p_business_id: businessId,
      p_invitation_id: invitationId,
    });
    setBusyInvitation(null);

    if (error) {
      console.error("Business invitation cancellation failed", { code: error.code });
      toast.error("Invitation could not be cancelled.");
      return;
    }

    toast.success("Invitation cancelled.");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {canManage ? (
        <section className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6 sm:py-6">
          <div className="flex items-start gap-3">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
              <MailPlus className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-black text-text-primary sm:text-lg">Invite a team member</h2>
              <p className="mt-1 text-sm leading-6 text-text-secondary">
                An authenticated, email-bound link expires automatically. Role access and optional custom permissions apply only inside this business.
              </p>
            </div>
          </div>

          <form onSubmit={sendInvitation} className="mt-6 space-y-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.4fr_0.8fr_0.55fr]">
              <label className="space-y-2">
                <span className="text-sm font-bold text-text-primary">Email address</span>
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="team@example.com"
                  autoComplete="email"
                  maxLength={320}
                  disabled={sending}
                  required
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold text-text-primary">Role</span>
                <select
                  value={role}
                  onChange={(event) => changeInviteRole(event.target.value)}
                  className="field-input min-h-11 w-full"
                  disabled={sending}
                >
                  {BUSINESS_TEAM_ASSIGNABLE_ROLES.filter((option) => isPrimaryOwner || !isPrivilegedBusinessRole(option.value)).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold text-text-primary">Expires</span>
                <select
                  value={expiresDays}
                  onChange={(event) => setExpiresDays(event.target.value)}
                  className="field-input min-h-11 w-full"
                  disabled={sending}
                >
                  <option value="3">3 days</option>
                  <option value="7">7 days</option>
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                </select>
              </label>
            </div>

            <div className="rounded-[var(--radius-button)] bg-surface-secondary px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black text-text-primary">Additional permissions</h3>
                  <p className="mt-1 text-xs text-text-secondary">
                    The least-privilege role template is preselected. Customize only when the job requires an exception.
                  </p>
                </div>
                <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-black text-primary">
                  {permissions.length} selected
                </span>
              </div>
              <PermissionGrid
                groups={groups}
                selected={permissions}
                onToggle={togglePermission}
                disabled={sending}
                canGrantSensitivePermissions={isPrimaryOwner}
              />
            </div>

            {manualLink ? (
              <div className="rounded-[var(--radius-button)] bg-warning-soft px-4 py-4 text-warning">
                <p className="text-sm font-black">Secure copy-link fallback</p>
                <p className="mt-1 break-all text-xs leading-5 opacity-90">{manualLink}</p>
                <Button type="button" variant="secondary" className="mt-3" onClick={() => void copyText(manualLink)}>
                  <Clipboard aria-hidden="true" /> Copy invitation link
                </Button>
              </div>
            ) : null}

            <Button type="submit" loading={sending} loadingLabel="Sending invitation…" className="w-full sm:w-auto">
              <MailPlus aria-hidden="true" /> Send invitation
            </Button>
          </form>
        </section>
      ) : null}

      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">Team directory</p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-text-primary">Members and access</h2>
          </div>
          <span className="text-sm font-black tabular-nums text-text-secondary">{snapshot.members.length}</span>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {snapshot.members.map((member) => (
            <MemberEditor
              key={member.user_id}
              businessId={businessId}
              businessSlug={businessSlug}
              workspaceMode={workspaceMode}
              currentUserId={currentUserId}
              isPrimaryOwner={isPrimaryOwner}
              canManage={canManage}
              member={member}
              groups={groups}
              permissionCatalog={snapshot.permission_catalog}
            />
          ))}
        </div>
      </section>

      {canManage || pendingInvitations.length > 0 ? (
        <section className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <MailPlus className="mt-0.5 size-5 text-primary" aria-hidden="true" />
              <div>
                <h2 className="font-black text-text-primary">Invitations</h2>
                <p className="mt-1 text-sm text-text-secondary">Pending, expired, accepted, and cancelled access requests.</p>
              </div>
            </div>
            <span className="rounded-full bg-surface-secondary px-2.5 py-1 text-xs font-black text-text-secondary">
              {pendingInvitations.length} open
            </span>
          </div>

          {snapshot.invitations.length === 0 ? (
            <div className="mt-5 rounded-[var(--radius-button)] bg-surface-secondary px-5 py-8 text-center text-sm text-text-secondary">
              No team invitation has been created yet.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {[...pendingInvitations, ...historicalInvitations].map((invitation) => (
                <article key={invitation.id} className="rounded-[var(--radius-button)] bg-surface-secondary px-4 py-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="truncate text-sm text-text-primary">{invitation.email}</strong>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${statusTone(invitation.status)}`}>
                          {invitation.status}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${statusTone(invitation.delivery_status)}`}>
                          email {invitation.delivery_status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-text-secondary">
                        {businessRoleLabel(invitation.role)} · expires {displayDate(invitation.expires_at)} · resent {invitation.resend_count} times
                      </p>
                    </div>
                    {canManage && ["pending", "expired"].includes(invitation.status) ? (
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          loading={busyInvitation === invitation.id}
                          loadingLabel="Sending…"
                          onClick={() => void resendInvitation(invitation)}
                        >
                          <RefreshCcw aria-hidden="true" /> Resend
                        </Button>
                        {invitation.status === "pending" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={busyInvitation === invitation.id}
                            onClick={() => void cancelInvitation(invitation.id)}
                          >
                            <Ban aria-hidden="true" /> Cancel
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <section className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6">
        <div className="flex items-start gap-3">
          <History className="mt-0.5 size-5 text-primary" aria-hidden="true" />
          <div>
            <h2 className="font-black text-text-primary">Team activity audit</h2>
            <p className="mt-1 text-sm text-text-secondary">Immutable invitation, permission, status, and ownership events.</p>
          </div>
        </div>

        {snapshot.audit.length === 0 ? (
          <div className="mt-5 rounded-[var(--radius-button)] bg-surface-secondary px-5 py-8 text-center text-sm text-text-secondary">
            Team activity will appear here.
          </div>
        ) : (
          <div className="mt-5 space-y-2">
            {snapshot.audit.map((event) => (
              <article key={String(event.id)} className="flex items-start gap-3 rounded-[var(--radius-button)] bg-surface-secondary px-4 py-3">
                <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <ChevronRight className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-text-primary">{auditLabel(event.action)}</p>
                  <p className="mt-0.5 text-xs leading-5 text-text-secondary">
                    {event.actor_name ?? "System"}
                    {event.target_name ? ` → ${event.target_name}` : ""} · {displayDate(event.created_at, true)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function PermissionGrid({
  groups,
  selected,
  onToggle,
  disabled,
  canGrantSensitivePermissions,
}: {
  groups: readonly BusinessPermissionGroup[];
  selected: string[];
  onToggle: (permission: string) => void;
  disabled: boolean;
  canGrantSensitivePermissions: boolean;
}) {
  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {groups.map((group) => (
        <fieldset key={group.label} className="space-y-2">
          <legend className="text-xs font-black uppercase tracking-[0.08em] text-text-secondary">{group.label}</legend>
          {group.permissions.map(([permission, label]) => {
            const protectedPermission =
              isSensitiveBusinessPermission(permission) && !canGrantSensitivePermissions;
            const checked = selected.includes(permission);
            return (
              <label
                key={permission}
                className={`flex min-h-10 items-center gap-2 rounded-[var(--radius-button)] px-3 text-sm transition-colors ${
                  checked ? "bg-primary-soft text-primary" : "bg-surface text-text-secondary"
                } ${protectedPermission ? "opacity-45" : "cursor-pointer"}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(permission)}
                  disabled={disabled || protectedPermission}
                  className="size-4 accent-current"
                />
                <span className="font-bold">{label}</span>
              </label>
            );
          })}
        </fieldset>
      ))}
    </div>
  );
}

function MemberEditor({
  businessId,
  businessSlug,
  workspaceMode,
  currentUserId,
  isPrimaryOwner,
  canManage,
  member,
  groups,
  permissionCatalog,
}: {
  businessId: string;
  businessSlug: string;
  workspaceMode: WorkspaceMode;
  currentUserId: string;
  isPrimaryOwner: boolean;
  canManage: boolean;
  member: TeamMember;
  groups: readonly BusinessPermissionGroup[];
  permissionCatalog: string[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [role, setRole] = useState(member.role);
  const [status, setStatus] = useState(member.status);
  const [permissions, setPermissions] = useState(member.permissions.filter((value) => value !== "*"));
  const [saving, setSaving] = useState(false);
  const [transferStep, setTransferStep] = useState(false);
  const isSelf = member.user_id === currentUserId;
  const editable = canManage && !member.is_primary_owner;

  useEffect(() => {
    setRole(member.role);
    setStatus(member.status);
    setPermissions(member.permissions.filter((value) => value !== "*"));
  }, [member.permissions, member.role, member.status]);

  function toggle(permission: string) {
    if (!permissionCatalog.includes(permission)) return;
    setPermissions((current) =>
      current.includes(permission)
        ? current.filter((value) => value !== permission)
        : [...current, permission],
    );
  }

  async function saveMember() {
    if (!editable || saving) return;
    if (isSelf && status !== "active") {
      toast.error("Another owner or admin must suspend or remove your own access.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.rpc("update_business_team_member", {
      p_business_id: businessId,
      p_user_id: member.user_id,
      p_role: role,
      p_status: status,
      p_permissions: permissions,
    });
    setSaving(false);

    if (error) {
      console.error("Business team member update failed", { code: error.code });
      toast.error(
        error.code === "42501"
          ? "This access change is protected or requires the primary owner."
          : "Team access could not be updated.",
      );
      return;
    }

    toast.success("Team member access updated.");
    router.refresh();
  }

  async function transferOwnership() {
    if (!isPrimaryOwner || member.status !== "active" || saving) return;
    if (!transferStep) {
      setTransferStep(true);
      return;
    }

    setSaving(true);
    const { error } = await supabase.rpc("transfer_business_ownership", {
      p_business_id: businessId,
      p_new_owner_user_id: member.user_id,
    });
    setSaving(false);

    if (error) {
      console.error("Business ownership transfer failed", { code: error.code });
      toast.error("Ownership was not transferred. No role was changed.");
      return;
    }

    toast.success(`${member.name} is now the primary owner.`);
    router.replace(`/business/${businessSlug}${workspaceMode === "simple_shop" ? "/shop" : "/team"}`);
    router.refresh();
  }

  return (
    <article className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-button)] ${
              member.is_primary_owner ? "bg-primary-soft text-primary" : "bg-surface-secondary text-text-secondary"
            }`}
          >
            {member.is_primary_owner ? <Crown className="size-5" aria-hidden="true" /> : <UserCog className="size-5" aria-hidden="true" />}
          </span>
          <div className="min-w-0">
            <h3 className="truncate font-black text-text-primary">{member.name}</h3>
            <p className="mt-0.5 truncate text-xs text-text-secondary">{member.email ?? "Email unavailable"}</p>
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${statusTone(member.status)}`}>
          {member.status}
        </span>
      </div>

      {member.is_primary_owner ? (
        <div className="mt-5 rounded-[var(--radius-button)] bg-primary-soft px-4 py-4 text-primary">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-sm font-black">Primary owner · full access</p>
              <p className="mt-1 text-xs leading-5 opacity-80">
                This member cannot be suspended, removed, or downgraded. Ownership must be transferred atomically first.
              </p>
            </div>
          </div>
        </div>
      ) : editable ? (
        <div className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-bold text-text-secondary">Role</span>
              <select
                value={role}
                onChange={(event) => {
                  const nextRole = event.target.value;
                  setRole(nextRole);
                  setPermissions(suggestedBusinessPermissions(nextRole, workspaceMode));
                }}
                className="field-input min-h-11 w-full"
                disabled={saving}
              >
                {BUSINESS_TEAM_ASSIGNABLE_ROLES.filter((option) => isPrimaryOwner || !isPrivilegedBusinessRole(option.value)).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-xs font-bold text-text-secondary">Status</span>
              <select value={status} onChange={(event) => setStatus(event.target.value as TeamMember["status"])} className="field-input min-h-11 w-full" disabled={saving || isSelf}>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="revoked">Removed</option>
              </select>
            </label>
          </div>

          <details className="rounded-[var(--radius-button)] bg-surface-secondary px-4 py-3">
            <summary className="finance-focus cursor-pointer text-sm font-black text-text-primary">
              Custom permissions · {permissions.length}
            </summary>
            <PermissionGrid
              groups={groups}
              selected={permissions}
              onToggle={toggle}
              disabled={saving}
              canGrantSensitivePermissions={isPrimaryOwner}
            />
          </details>

          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" loading={saving} loadingLabel="Saving…" onClick={() => void saveMember()}>
              <Save aria-hidden="true" /> Save access
            </Button>
            {isPrimaryOwner && member.status === "active" ? (
              <Button
                type="button"
                size="sm"
                variant={transferStep ? "destructive" : "secondary"}
                disabled={saving}
                onClick={() => void transferOwnership()}
              >
                <Crown aria-hidden="true" /> {transferStep ? "Confirm ownership transfer" : "Transfer ownership"}
              </Button>
            ) : null}
          </div>

          {transferStep ? (
            <p className="rounded-[var(--radius-button)] bg-warning-soft px-3 py-2 text-xs leading-5 text-warning">
              You will become Admin. {member.name} will receive primary ownership and unrestricted access.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[var(--radius-button)] bg-surface-secondary px-4 py-3">
            <span className="text-xs font-bold text-text-secondary">Role</span>
            <strong className="mt-1 block text-sm text-text-primary">{businessRoleLabel(member.role)}</strong>
          </div>
          <div className="rounded-[var(--radius-button)] bg-surface-secondary px-4 py-3">
            <span className="text-xs font-bold text-text-secondary">Joined</span>
            <strong className="mt-1 block text-sm text-text-primary">{displayDate(member.joined_at)}</strong>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-text-tertiary">
        {member.status === "active" ? <UserRoundCheck className="size-4 text-success" aria-hidden="true" /> : <UserRoundX className="size-4 text-warning" aria-hidden="true" />}
        <span>{businessRoleLabel(member.role)}</span>
        <span>·</span>
        <span>{member.permissions.includes("*") ? "Full access" : `${member.permissions.length} custom permissions`}</span>
      </div>
    </article>
  );
}
