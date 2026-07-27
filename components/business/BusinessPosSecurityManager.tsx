"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  KeyRound,
  Laptop2,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UserRoundCog,
  XCircle,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Capabilities = {
  view: boolean;
  manage: boolean;
  approve: boolean;
  cash_adjust: boolean;
  discount_override: boolean;
};

type Branch = {
  id: string;
  code: string;
  name: string;
  status: string;
  is_primary: boolean;
  timezone: string;
};

type Member = {
  user_id: string;
  name: string;
  email: string | null;
  role: string;
  status: "active" | "suspended";
  staff_code: string | null;
  credential_status: "active" | "revoked" | null;
  must_change_pin: boolean | null;
  failed_attempts: number | null;
  locked_until: string | null;
  changed_at: string | null;
};

type Device = {
  id: string;
  branch_id: string;
  device_code: string;
  device_name: string;
  status: "active" | "revoked";
  last_seen_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

type PosSession = {
  id: string;
  branch_id: string;
  device_id: string;
  user_id: string;
  token_prefix: string;
  must_change_pin: boolean;
  expires_at: string;
  last_activity_at: string;
  revoked_at: string | null;
  revoke_reason: string | null;
  created_at: string;
};

type Approval = {
  id: string;
  branch_id: string;
  device_id: string;
  session_id: string;
  requested_by: string;
  operation_type: "refund" | "void" | "high_discount" | "cash_adjustment";
  reason: string;
  amount: number | null;
  discount_percent: number | null;
  status: "pending" | "approved" | "denied" | "expired" | "consumed";
  decided_by: string | null;
  decision_reason: string | null;
  expires_at: string;
  created_at: string;
};

type EventRow = {
  id: number | string;
  branch_id: string | null;
  device_id: string | null;
  session_id: string | null;
  actor_user_id: string | null;
  target_user_id: string | null;
  approval_id: string | null;
  event_type: string;
  outcome: "success" | "failure" | "blocked";
  metadata: Record<string, unknown>;
  created_at: string;
};

type Snapshot = {
  capabilities: Capabilities;
  branches: Branch[];
  members: Member[];
  devices: Device[];
  sessions: PosSession[];
  approvals: Approval[];
  events: EventRow[];
};

type OneTimeCredential =
  | {
      kind: "device";
      title: string;
      values: Array<{ label: string; value: string }>;
    }
  | {
      kind: "staff";
      title: string;
      values: Array<{ label: string; value: string }>;
    };

type FunctionPayload = Record<string, unknown>;

function dateTime(value: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString();
}

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function memberName(members: Member[], userId: string) {
  return members.find((member) => member.user_id === userId)?.name ?? "Team member";
}

function branchName(branches: Branch[], branchId: string) {
  return branches.find((branch) => branch.id === branchId)?.name ?? "Branch";
}

function deviceName(devices: Device[], deviceId: string) {
  return devices.find((device) => device.id === deviceId)?.device_name ?? "POS device";
}

export default function BusinessPosSecurityManager({
  businessId,
  businessName,
}: {
  businessId: string;
  businessName: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState<string | null>("snapshot");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deviceNameInput, setDeviceNameInput] = useState("");
  const [branchId, setBranchId] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [oneTimeCredential, setOneTimeCredential] = useState<OneTimeCredential | null>(null);
  const [decisionReasons, setDecisionReasons] = useState<Record<string, string>>({});

  const invoke = useCallback(
    async (payload: FunctionPayload) => {
      const { data, error: invokeError } = await supabase.functions.invoke(
        "business-pos-security",
        { body: payload },
      );
      if (invokeError) throw new Error("pos_security_unavailable");
      const result = data as { ok?: boolean; error?: string } & Record<string, unknown>;
      if (!result?.ok) throw new Error(result?.error ?? "pos_security_operation_failed");
      return result;
    },
    [supabase],
  );

  const load = useCallback(async () => {
    setBusy("snapshot");
    setError("");
    try {
      const result = await invoke({ action: "snapshot", businessId });
      const next = result.snapshot as Snapshot;
      setSnapshot(next);
      if (!branchId && next.branches[0]) setBranchId(next.branches[0].id);
      if (!selectedMemberId && next.members[0]) setSelectedMemberId(next.members[0].user_id);
    } catch {
      setError("POS security information could not be loaded. No access or credential was changed.");
    } finally {
      setBusy(null);
    }
  }, [branchId, businessId, invoke, selectedMemberId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function perform(key: string, payload: FunctionPayload, success: string) {
    if (busy) return;
    setBusy(key);
    setError("");
    setNotice("");
    try {
      const result = await invoke(payload);
      if (result.device && typeof result.device === "object") {
        const device = result.device as {
          deviceCode: string;
          deviceSecret: string;
        };
        setOneTimeCredential({
          kind: "device",
          title: "Save these device credentials now",
          values: [
            { label: "Device code", value: device.deviceCode },
            { label: "Device secret", value: device.deviceSecret },
          ],
        });
      }
      if (result.credential && typeof result.credential === "object") {
        const credential = result.credential as {
          staffCode: string;
          temporaryPin: string;
        };
        setOneTimeCredential({
          kind: "staff",
          title: "Give this temporary credential to the employee securely",
          values: [
            { label: "Staff code", value: credential.staffCode },
            { label: "Temporary PIN", value: credential.temporaryPin },
          ],
        });
      }
      setNotice(success);
      await load();
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "unknown";
      setError(
        code === "permission_denied"
          ? "Your role cannot perform this POS security operation."
          : code === "already_exists"
            ? "A matching POS credential already exists. Refresh and try again."
            : "The POS security operation failed safely. No secret was exposed.",
      );
    } finally {
      setBusy(null);
    }
  }

  if (!snapshot && busy === "snapshot") {
    return (
      <section className="rounded-[var(--radius-card)] bg-surface p-6 shadow-[var(--shadow-sm)]">
        <div className="flex items-center gap-3 text-sm font-bold text-text-secondary" role="status">
          <LoaderCircle className="size-5 animate-spin text-primary" aria-hidden="true" />
          Loading POS workforce security…
        </div>
      </section>
    );
  }

  if (!snapshot) {
    return (
      <section className="rounded-[var(--radius-card)] bg-danger-soft p-5 text-sm text-danger">
        {error || "POS security information is unavailable."}
      </section>
    );
  }

  const activeSessions = snapshot.sessions.filter(
    (session) => !session.revoked_at && new Date(session.expires_at).getTime() > Date.now(),
  );
  const pendingApprovals = snapshot.approvals.filter((approval) => approval.status === "pending");

  return (
    <div className="space-y-6">
      <section className="rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-sm)] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Retail & POS controls</p>
            <h2 className="mt-1 text-xl font-black text-text-primary">{businessName} workforce security</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
              Register trusted devices, issue one-time temporary PINs, revoke active sessions, and approve sensitive cashier operations. Plaintext secrets are shown once and never stored.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={Boolean(busy)}
            className="finance-focus inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-button)] bg-surface-secondary px-3 text-sm font-black text-text-primary disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${busy === "snapshot" ? "animate-spin" : ""}`} aria-hidden="true" />
            Refresh
          </button>
        </div>

        {error ? (
          <div className="mt-4 flex items-start gap-2 rounded-[var(--radius-button)] bg-danger-soft p-3 text-sm font-bold text-danger">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {error}
          </div>
        ) : null}
        {notice ? (
          <div className="mt-4 flex items-start gap-2 rounded-[var(--radius-button)] bg-success-soft p-3 text-sm font-bold text-success">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {notice}
          </div>
        ) : null}

        {oneTimeCredential ? (
          <div className="mt-5 rounded-[var(--radius-card)] border border-warning/30 bg-warning-soft p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black text-text-primary">{oneTimeCredential.title}</p>
                <p className="mt-1 text-xs leading-5 text-text-secondary">
                  Closing this card removes the only application copy. Store it through your approved secure channel.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOneTimeCredential(null)}
                className="finance-focus rounded-full p-2 text-text-secondary hover:bg-surface"
                aria-label="Close one-time credential"
              >
                <XCircle className="size-5" aria-hidden="true" />
              </button>
            </div>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {oneTimeCredential.values.map((item) => (
                <div key={item.label} className="rounded-[var(--radius-button)] bg-surface p-3">
                  <dt className="text-xs font-bold text-text-secondary">{item.label}</dt>
                  <dd className="mt-1 break-all font-mono text-sm font-black text-text-primary">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-sm)] sm:p-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
              <Laptop2 className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-black text-text-primary">Registered devices</h3>
              <p className="text-xs text-text-secondary">Each terminal is locked to one active branch.</p>
            </div>
          </div>

          {snapshot.capabilities.manage ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <label className="text-xs font-bold text-text-secondary">
                Branch
                <select
                  value={branchId}
                  onChange={(event) => setBranchId(event.target.value)}
                  className="finance-focus mt-1 min-h-11 w-full rounded-[var(--radius-button)] bg-surface-secondary px-3 text-sm text-text-primary"
                >
                  {snapshot.branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold text-text-secondary">
                Device name
                <input
                  value={deviceNameInput}
                  onChange={(event) => setDeviceNameInput(event.target.value)}
                  placeholder="Front counter"
                  maxLength={80}
                  className="finance-focus mt-1 min-h-11 w-full rounded-[var(--radius-button)] bg-surface-secondary px-3 text-sm text-text-primary"
                />
              </label>
              <button
                type="button"
                disabled={Boolean(busy) || !branchId || deviceNameInput.trim().length < 2}
                onClick={() => void perform(
                  "enroll_device",
                  { action: "enroll_device", businessId, branchId, deviceName: deviceNameInput },
                  "POS device enrolled. Save the one-time secret before closing it.",
                )}
                className="finance-focus mt-auto min-h-11 rounded-[var(--radius-button)] bg-primary px-4 text-sm font-black text-primary-foreground disabled:opacity-50"
              >
                Enroll
              </button>
            </div>
          ) : null}

          <div className="mt-5 space-y-3">
            {snapshot.devices.length === 0 ? (
              <p className="rounded-[var(--radius-button)] bg-surface-secondary p-4 text-sm text-text-secondary">No POS device is registered.</p>
            ) : snapshot.devices.map((device) => (
              <div key={device.id} className="rounded-[var(--radius-button)] bg-surface-secondary p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-text-primary">{device.device_name}</p>
                    <p className="mt-1 text-xs text-text-secondary">
                      {branchName(snapshot.branches, device.branch_id)} · {device.device_code} · Last seen {dateTime(device.last_seen_at)}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-black ${device.status === "active" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
                    {label(device.status)}
                  </span>
                </div>
                {snapshot.capabilities.manage && device.status === "active" ? (
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => void perform(
                      `device:${device.id}`,
                      { action: "revoke_device", businessId, deviceId: device.id, reason: "Revoked from POS security console" },
                      "Device and its active sessions were revoked.",
                    )}
                    className="finance-focus mt-3 min-h-9 rounded-[var(--radius-button)] bg-danger-soft px-3 text-xs font-black text-danger disabled:opacity-50"
                  >
                    Revoke device
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-sm)] sm:p-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
              <KeyRound className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-black text-text-primary">Staff PIN credentials</h3>
              <p className="text-xs text-text-secondary">Temporary PINs must change on first device login.</p>
            </div>
          </div>

          {snapshot.capabilities.manage && snapshot.members.length > 0 ? (
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <select
                value={selectedMemberId}
                onChange={(event) => setSelectedMemberId(event.target.value)}
                className="finance-focus min-h-11 flex-1 rounded-[var(--radius-button)] bg-surface-secondary px-3 text-sm text-text-primary"
              >
                {snapshot.members.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.name} · {label(member.role)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={Boolean(busy) || !selectedMemberId}
                onClick={() => void perform(
                  "issue_temporary_pin",
                  { action: "issue_temporary_pin", businessId, targetUserId: selectedMemberId },
                  "Temporary POS credential issued. Existing sessions for that employee were revoked.",
                )}
                className="finance-focus min-h-11 rounded-[var(--radius-button)] bg-primary px-4 text-sm font-black text-primary-foreground disabled:opacity-50"
              >
                Issue temporary PIN
              </button>
            </div>
          ) : null}

          <div className="mt-5 space-y-3">
            {snapshot.members.map((member) => (
              <div key={member.user_id} className="rounded-[var(--radius-button)] bg-surface-secondary p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-text-primary">{member.name}</p>
                    <p className="mt-1 text-xs text-text-secondary">
                      {label(member.role)} · {member.staff_code ?? "No POS credential"}
                    </p>
                    {member.locked_until ? (
                      <p className="mt-1 text-xs font-bold text-danger">Locked until {dateTime(member.locked_until)}</p>
                    ) : null}
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-black ${member.credential_status === "active" ? "bg-success-soft text-success" : "bg-surface text-text-secondary"}`}>
                    {member.credential_status === "active"
                      ? member.must_change_pin ? "Temporary PIN" : "Active PIN"
                      : "Not active"}
                  </span>
                </div>
                {snapshot.capabilities.manage && member.credential_status === "active" ? (
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => void perform(
                      `credential:${member.user_id}`,
                      { action: "revoke_credential", businessId, targetUserId: member.user_id, reason: "Revoked from POS security console" },
                      "Staff POS credential and active sessions were revoked.",
                    )}
                    className="finance-focus mt-3 min-h-9 rounded-[var(--radius-button)] bg-danger-soft px-3 text-xs font-black text-danger disabled:opacity-50"
                  >
                    Revoke credential
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-sm)] sm:p-6">
          <h3 className="font-black text-text-primary">Active POS sessions</h3>
          <p className="mt-1 text-xs text-text-secondary">Idle sessions expire after 30 minutes; all sessions have an 8-hour maximum.</p>
          <div className="mt-4 space-y-3">
            {activeSessions.length === 0 ? (
              <p className="rounded-[var(--radius-button)] bg-surface-secondary p-4 text-sm text-text-secondary">No active POS session.</p>
            ) : activeSessions.map((session) => (
              <div key={session.id} className="rounded-[var(--radius-button)] bg-surface-secondary p-4">
                <p className="font-black text-text-primary">{memberName(snapshot.members, session.user_id)}</p>
                <p className="mt-1 text-xs leading-5 text-text-secondary">
                  {deviceName(snapshot.devices, session.device_id)} · token {session.token_prefix}… · last active {dateTime(session.last_activity_at)}
                </p>
                {snapshot.capabilities.manage ? (
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => void perform(
                      `session:${session.id}`,
                      { action: "revoke_session", businessId, sessionId: session.id, reason: "Revoked from POS security console" },
                      "POS session revoked.",
                    )}
                    className="finance-focus mt-3 min-h-9 rounded-[var(--radius-button)] bg-danger-soft px-3 text-xs font-black text-danger disabled:opacity-50"
                  >
                    Revoke session
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-sm)] sm:p-6">
          <div className="flex items-center gap-3">
            <UserRoundCog className="size-5 text-primary" aria-hidden="true" />
            <h3 className="font-black text-text-primary">Sensitive operation approvals</h3>
          </div>
          <p className="mt-2 text-xs leading-5 text-text-secondary">
            Requests are bound to one cashier session and payload digest, expire after five minutes, and cannot be self-approved.
          </p>
          <div className="mt-4 space-y-3">
            {pendingApprovals.length === 0 ? (
              <p className="rounded-[var(--radius-button)] bg-surface-secondary p-4 text-sm text-text-secondary">No pending approval.</p>
            ) : pendingApprovals.map((approval) => (
              <div key={approval.id} className="rounded-[var(--radius-button)] bg-surface-secondary p-4">
                <p className="font-black text-text-primary">{label(approval.operation_type)}</p>
                <p className="mt-1 text-xs leading-5 text-text-secondary">
                  Requested by {memberName(snapshot.members, approval.requested_by)} · expires {dateTime(approval.expires_at)}
                </p>
                <p className="mt-2 text-sm text-text-primary">{approval.reason}</p>
                {snapshot.capabilities.approve ? (
                  <div className="mt-3">
                    <input
                      value={decisionReasons[approval.id] ?? ""}
                      onChange={(event) => setDecisionReasons((current) => ({ ...current, [approval.id]: event.target.value }))}
                      placeholder="Decision reason"
                      maxLength={300}
                      className="finance-focus min-h-10 w-full rounded-[var(--radius-button)] bg-surface px-3 text-sm text-text-primary"
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        disabled={Boolean(busy) || (decisionReasons[approval.id] ?? "").trim().length < 3}
                        onClick={() => void perform(
                          `approve:${approval.id}`,
                          { action: "decide_approval", businessId, approvalId: approval.id, decision: "approved", reason: decisionReasons[approval.id] },
                          "Sensitive POS operation approved for one payload and one use.",
                        )}
                        className="finance-focus min-h-9 rounded-[var(--radius-button)] bg-success-soft px-3 text-xs font-black text-success disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={Boolean(busy) || (decisionReasons[approval.id] ?? "").trim().length < 3}
                        onClick={() => void perform(
                          `deny:${approval.id}`,
                          { action: "decide_approval", businessId, approvalId: approval.id, decision: "denied", reason: decisionReasons[approval.id] },
                          "Sensitive POS operation denied.",
                        )}
                        className="finance-focus min-h-9 rounded-[var(--radius-button)] bg-danger-soft px-3 text-xs font-black text-danger disabled:opacity-50"
                      >
                        Deny
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-sm)] sm:p-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
          <h3 className="font-black text-text-primary">POS security audit</h3>
        </div>
        <div className="mt-4 divide-y divide-border-subtle">
          {snapshot.events.length === 0 ? (
            <p className="py-4 text-sm text-text-secondary">No POS security event yet.</p>
          ) : snapshot.events.slice(0, 40).map((event) => (
            <div key={String(event.id)} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <div>
                <p className="font-bold text-text-primary">{label(event.event_type)}</p>
                <p className="mt-0.5 text-xs text-text-secondary">{dateTime(event.created_at)}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-black ${event.outcome === "success" ? "bg-success-soft text-success" : event.outcome === "blocked" ? "bg-warning-soft text-warning" : "bg-danger-soft text-danger"}`}>
                {label(event.outcome)}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
