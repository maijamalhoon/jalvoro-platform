"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import {
  Ban,
  Check,
  Clipboard,
  KeyRound,
  RotateCcw,
  ShieldPlus,
  Trash2,
  UserPlus,
} from "lucide-react";

import styles from "@/components/control-plane/control-plane-owner-management.module.css";
import { createControlPlaneBrowserClient } from "@/lib/control-plane/client";
import type {
  ControlPlaneDirectory,
  ControlPlaneRole,
} from "@/lib/control-plane/config";

type DelegatedRole = Exclude<ControlPlaneRole, "owner">;
type OneTimeAccess = {
  invitationLink: string;
  maskedEmail: string;
  role: DelegatedRole;
  expiresAt: string | null;
  accountCreated: boolean;
};

type FunctionResult = {
  invitation?: {
    maskedEmail?: unknown;
    role?: unknown;
    expiresAt?: unknown;
  };
  invitationToken?: unknown;
  accountCreated?: unknown;
  authTokenHash?: unknown;
};

const roles: DelegatedRole[] = ["admin", "analyst", "support"];
const permissionPattern = /^[a-z][a-z0-9-]*(:[a-z][a-z0-9-]*){2,4}$/;

function readableFailure() {
  return "The secure owner action could not be completed. Re-authenticate and try again.";
}

function formatDate(value: string | null) {
  if (!value) return "No expiry";
  const parsed = Date.parse(value);
  return Number.isFinite(parsed)
    ? new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(parsed))
    : "Unknown";
}

export default function ControlPlaneOwnerManagement({
  directory,
}: {
  directory: ControlPlaneDirectory;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createControlPlaneBrowserClient(), []);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState("");
  const [oneTimeAccess, setOneTimeAccess] = useState<OneTimeAccess | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<DelegatedRole>("admin");
  const [inviteExpiry, setInviteExpiry] = useState("72");

  const [grantUserReference, setGrantUserReference] = useState("");
  const [permissionKey, setPermissionKey] = useState("control:overview:read");
  const [productKey, setProductKey] = useState("jalvoro");
  const [moduleKey, setModuleKey] = useState("");
  const [environmentKey, setEnvironmentKey] = useState("production");
  const [regionKey, setRegionKey] = useState("global");
  const [dataClassification, setDataClassification] = useState("restricted");
  const [grantExpiry, setGrantExpiry] = useState("");

  function begin(action: string) {
    if (busyAction) return false;
    setBusyAction(action);
    setError("");
    setNotice("");
    return true;
  }

  function end() {
    setBusyAction("");
  }

  function refresh(message: string) {
    setNotice(message);
    router.refresh();
  }

  async function copyValue(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      setError("Copy was blocked by the browser. Select and copy the value manually.");
    }
  }

  async function createOperator(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!begin("create-operator")) return;
    setOneTimeAccess(null);

    try {
      const email = inviteEmail.trim().toLowerCase();
      const expiresInHours = Number(inviteExpiry);
      if (!email || !Number.isInteger(expiresInHours)) {
        setError("Enter a valid email and invitation lifetime.");
        return;
      }

      const result = await supabase.functions.invoke("control-plane-create-operator", {
        body: { email, role: inviteRole, expiresInHours },
      });
      const data = result.data as FunctionResult | null;
      const token = typeof data?.invitationToken === "string" ? data.invitationToken : "";
      const maskedEmail =
        typeof data?.invitation?.maskedEmail === "string"
          ? data.invitation.maskedEmail
          : "hidden";
      const role = data?.invitation?.role;
      const expiresAt =
        typeof data?.invitation?.expiresAt === "string"
          ? data.invitation.expiresAt
          : null;
      const authTokenHash =
        typeof data?.authTokenHash === "string" ? data.authTokenHash : "";
      const accountCreated = data?.accountCreated === true;

      if (
        result.error ||
        !token ||
        !roles.includes(role as DelegatedRole) ||
        (accountCreated && !authTokenHash)
      ) {
        setError(readableFailure());
        return;
      }

      const authFragment = accountCreated
        ? `&auth=${encodeURIComponent(authTokenHash)}`
        : "";
      const invitationLink = `${window.location.origin}/control-invite#invite=${encodeURIComponent(token)}${authFragment}`;
      setOneTimeAccess({
        invitationLink,
        maskedEmail,
        role: role as DelegatedRole,
        expiresAt,
        accountCreated,
      });
      setInviteEmail("");
      refresh("Operator account and expiring invitation created. Share the one-time values securely.");
    } catch {
      setError(readableFailure());
    } finally {
      end();
    }
  }

  async function grantPermission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!begin("grant-permission")) return;

    try {
      const reference = grantUserReference.trim().toUpperCase();
      const permission = permissionKey.trim().toLowerCase();
      if (!/^CPU-[A-F0-9]{12}$/.test(reference) || !permissionPattern.test(permission)) {
        setError("Enter a valid operator reference and permission key.");
        return;
      }

      const expiresAt = grantExpiry
        ? new Date(grantExpiry).toISOString()
        : null;
      const { error: rpcError } = await supabase.rpc(
        "grant_control_plane_permission_by_reference",
        {
          p_user_reference: reference,
          p_permission_key: permission,
          p_product_key: productKey.trim() || null,
          p_module_key: moduleKey.trim() || null,
          p_environment_key: environmentKey || null,
          p_region_key: regionKey.trim() || null,
          p_organization_id: null,
          p_data_classification: dataClassification || null,
          p_expires_at: expiresAt,
        },
      );

      if (rpcError) {
        setError(readableFailure());
        return;
      }

      setGrantUserReference("");
      refresh("Scoped permission granted.");
    } catch {
      setError(readableFailure());
    } finally {
      end();
    }
  }

  async function changeRole(userReference: string, role: DelegatedRole) {
    const action = `role-${userReference}`;
    if (!begin(action)) return;
    try {
      const { error: rpcError } = await supabase.rpc(
        "change_control_plane_operator_role_by_reference",
        { p_user_reference: userReference, p_role: role },
      );
      if (rpcError) setError(readableFailure());
      else refresh("Operator role updated.");
    } finally {
      end();
    }
  }

  async function setOperatorStatus(userReference: string, disabled: boolean) {
    const verb = disabled ? "disable" : "restore";
    if (
      disabled &&
      !window.confirm("Disable this operator and revoke all of their active grants?")
    ) {
      return;
    }
    const action = `${verb}-${userReference}`;
    if (!begin(action)) return;
    try {
      const rpc = disabled
        ? "disable_control_plane_operator_by_reference"
        : "restore_control_plane_operator_by_reference";
      const { error: rpcError } = await supabase.rpc(rpc, {
        p_user_reference: userReference,
      });
      if (rpcError) setError(readableFailure());
      else refresh(disabled ? "Operator disabled." : "Operator restored.");
    } finally {
      end();
    }
  }

  async function revokeInvitation(invitationCode: string) {
    if (!window.confirm("Revoke this pending invitation?")) return;
    const action = `invite-${invitationCode}`;
    if (!begin(action)) return;
    try {
      const { error: rpcError } = await supabase.rpc(
        "revoke_control_plane_invitation",
        { p_invitation_code: invitationCode },
      );
      if (rpcError) setError(readableFailure());
      else refresh("Invitation revoked.");
    } finally {
      end();
    }
  }

  async function revokeGrant(grantCode: string) {
    if (!window.confirm("Revoke this permission grant?")) return;
    const action = `grant-${grantCode}`;
    if (!begin(action)) return;
    try {
      const { error: rpcError } = await supabase.rpc(
        "revoke_control_plane_permission",
        { p_grant_code: grantCode },
      );
      if (rpcError) setError(readableFailure());
      else refresh("Permission revoked.");
    } finally {
      end();
    }
  }

  return (
    <section className={styles.root} aria-labelledby="owner-management-title">
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Root Owner operations</p>
            <h2 id="owner-management-title">Delegated access management</h2>
            <p>
              Create operators, assign minimum required scopes, and revoke access without exposing database identifiers.
            </p>
          </div>
          <span className={styles.ownerBadge}><KeyRound size={15} /> Recent MFA required</span>
        </header>

        {error ? <div className={styles.error} role="alert">{error}</div> : null}
        {notice ? <div className={styles.notice} role="status">{notice}</div> : null}

        {oneTimeAccess ? (
          <article className={styles.secretPanel} aria-label="One-time operator access">
            <div>
              <p className={styles.eyebrow}>Show once</p>
              <h3>{oneTimeAccess.maskedEmail} · {oneTimeAccess.role}</h3>
              <p>Expires {formatDate(oneTimeAccess.expiresAt)}. Send these values through a trusted private channel.</p>
            </div>
            <SecretRow
              label="Invitation link"
              value={oneTimeAccess.invitationLink}
              copied={copied === "link"}
              onCopy={() => copyValue("link", oneTimeAccess.invitationLink)}
            />
            <p className={styles.inlineNote}>
              {oneTimeAccess.accountCreated
                ? "This link contains one-time Supabase identity verification. The operator will create a permanent password; no temporary password exists."
                : "This email already has a Control Plane identity. The operator will use the existing password."}
            </p>
            <button className={styles.textButton} type="button" onClick={() => setOneTimeAccess(null)}>
              Clear one-time values
            </button>
          </article>
        ) : null}

        <div className={styles.grid}>
          <form className={styles.card} onSubmit={createOperator}>
            <div className={styles.cardTitle}><UserPlus size={19} /><h3>Add operator</h3></div>
            <Field label="Email">
              <input type="email" autoComplete="off" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} required />
            </Field>
            <Field label="Role">
              <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as DelegatedRole)}>
                {roles.map((role) => <option value={role} key={role}>{role}</option>)}
              </select>
            </Field>
            <Field label="Invitation lifetime">
              <select value={inviteExpiry} onChange={(event) => setInviteExpiry(event.target.value)}>
                <option value="24">24 hours</option>
                <option value="72">72 hours</option>
                <option value="168">7 days</option>
              </select>
            </Field>
            <button className={styles.primaryButton} disabled={Boolean(busyAction)} type="submit">
              <ShieldPlus size={17} /> {busyAction === "create-operator" ? "Creating…" : "Create secure invitation"}
            </button>
          </form>

          <form className={styles.card} onSubmit={grantPermission}>
            <div className={styles.cardTitle}><KeyRound size={19} /><h3>Grant scoped permission</h3></div>
            <Field label="Operator reference">
              <select value={grantUserReference} onChange={(event) => setGrantUserReference(event.target.value)} required>
                <option value="">Select operator</option>
                {directory.operators.filter((operator) => !operator.isRootOwner && operator.status === "active").map((operator) => (
                  <option value={operator.userReference} key={operator.userReference}>{operator.userReference} · {operator.role}</option>
                ))}
              </select>
            </Field>
            <Field label="Permission key">
              <input value={permissionKey} onChange={(event) => setPermissionKey(event.target.value)} placeholder="control:overview:read" required />
            </Field>
            <div className={styles.twoColumn}>
              <Field label="Product"><input value={productKey} onChange={(event) => setProductKey(event.target.value)} /></Field>
              <Field label="Module"><input value={moduleKey} onChange={(event) => setModuleKey(event.target.value)} /></Field>
              <Field label="Environment">
                <select value={environmentKey} onChange={(event) => setEnvironmentKey(event.target.value)}>
                  <option value="development">Development</option><option value="preview">Preview</option><option value="production">Production</option>
                </select>
              </Field>
              <Field label="Region"><input value={regionKey} onChange={(event) => setRegionKey(event.target.value)} /></Field>
              <Field label="Data classification">
                <select value={dataClassification} onChange={(event) => setDataClassification(event.target.value)}>
                  <option value="public">Public</option><option value="internal">Internal</option><option value="confidential">Confidential</option><option value="restricted">Restricted</option>
                </select>
              </Field>
              <Field label="Expires (optional)"><input type="datetime-local" value={grantExpiry} onChange={(event) => setGrantExpiry(event.target.value)} /></Field>
            </div>
            <button className={styles.primaryButton} disabled={Boolean(busyAction)} type="submit">
              <KeyRound size={17} /> {busyAction === "grant-permission" ? "Granting…" : "Grant permission"}
            </button>
          </form>
        </div>

        <div className={styles.grid}>
          <article className={styles.card}>
            <div className={styles.cardTitle}><UserPlus size={19} /><h3>Operators</h3></div>
            <div className={styles.list}>
              {directory.operators.map((operator) => (
                <div className={styles.listRow} key={operator.userReference}>
                  <div><strong>{operator.userReference}</strong><span>{operator.isRootOwner ? "Root Owner" : operator.status}</span></div>
                  {operator.isRootOwner ? <span className={styles.locked}>Immutable</span> : (
                    <div className={styles.rowActions}>
                      <select
                        aria-label={`Role for ${operator.userReference}`}
                        value={operator.role}
                        disabled={Boolean(busyAction) || operator.status === "disabled"}
                        onChange={(event) => void changeRole(operator.userReference, event.target.value as DelegatedRole)}
                      >
                        {roles.map((role) => <option value={role} key={role}>{role}</option>)}
                      </select>
                      <button
                        className={operator.status === "active" ? styles.dangerButton : styles.secondaryButton}
                        type="button"
                        disabled={Boolean(busyAction)}
                        onClick={() => void setOperatorStatus(operator.userReference, operator.status === "active")}
                      >
                        {operator.status === "active" ? <Ban size={15} /> : <RotateCcw size={15} />}
                        {operator.status === "active" ? "Disable" : "Restore"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </article>

          <article className={styles.card}>
            <div className={styles.cardTitle}><ShieldPlus size={19} /><h3>Pending invitations</h3></div>
            <div className={styles.list}>
              {directory.pendingInvitations.length ? directory.pendingInvitations.map((invitation) => (
                <div className={styles.listRow} key={invitation.invitationCode}>
                  <div><strong>{invitation.maskedEmail}</strong><span>{invitation.role} · {formatDate(invitation.expiresAt)}</span></div>
                  <button className={styles.dangerButton} type="button" disabled={Boolean(busyAction)} onClick={() => void revokeInvitation(invitation.invitationCode)}>
                    <Trash2 size={15} /> Revoke
                  </button>
                </div>
              )) : <p className={styles.empty}>No pending invitations.</p>}
            </div>
          </article>
        </div>

        <article className={styles.card}>
          <div className={styles.cardTitle}><KeyRound size={19} /><h3>Active grants</h3></div>
          <div className={styles.list}>
            {directory.activeGrants.length ? directory.activeGrants.map((grant) => (
              <div className={styles.listRow} key={grant.grantCode}>
                <div><strong>{grant.permissionKey}</strong><span>{grant.userReference} · {grant.productKey || "all products"} · {grant.environmentKey || "all environments"} · {formatDate(grant.expiresAt)}</span></div>
                <button className={styles.dangerButton} type="button" disabled={Boolean(busyAction)} onClick={() => void revokeGrant(grant.grantCode)}>
                  <Trash2 size={15} /> Revoke
                </button>
              </div>
            )) : <p className={styles.empty}>No delegated grants are active.</p>}
          </div>
        </article>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className={styles.field}><span>{label}</span>{children}</label>;
}

function SecretRow({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className={styles.secretRow}>
      <div><span>{label}</span><code>{value}</code></div>
      <button type="button" onClick={onCopy}>{copied ? <Check size={16} /> : <Clipboard size={16} />}{copied ? "Copied" : "Copy"}</button>
    </div>
  );
}
