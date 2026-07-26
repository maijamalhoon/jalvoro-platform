"use client";

import { useMemo, useState } from "react";
import { KeyRound, LoaderCircle, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type RecoverableMember = {
  user_id: string;
  name: string;
  email: string | null;
  role: string;
  status: "active" | "suspended" | "revoked";
  is_primary_owner: boolean;
};

type FactorSummary = {
  type: string;
  status: string;
  friendlyName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type InspectionState = {
  factors: FactorSummary[];
  inspectedAt: number;
};

export default function BusinessIdentityRecoveryPanel({
  businessId,
  isPrimaryOwner,
  members,
}: {
  businessId: string;
  isPrimaryOwner: boolean;
  members: RecoverableMember[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [confirmUserId, setConfirmUserId] = useState<string | null>(null);
  const [inspection, setInspection] = useState<Record<string, InspectionState>>({});

  if (!isPrimaryOwner) return null;

  const recoverableMembers = members.filter(
    (member) => !member.is_primary_owner && ["active", "suspended"].includes(member.status),
  );

  async function invoke(
    action: "inspect_mfa" | "reset_mfa",
    targetUserId: string,
  ) {
    setBusyUserId(targetUserId);
    const { data, error } = await supabase.functions.invoke(
      "business-identity-recovery",
      { body: { businessId, targetUserId, action } },
    );
    setBusyUserId(null);

    const errorCode = (data as { error?: unknown } | null)?.error;
    if (error || typeof errorCode === "string") {
      const message =
        errorCode === "owner_aal2_required"
          ? "Verify your own MFA first, then repeat this sensitive recovery action."
          : errorCode === "factor_directory_unavailable"
            ? "Supabase MFA information is temporarily unavailable."
            : errorCode === "factor_delete_failed"
              ? "MFA reset was incomplete. The audit log contains the result; retry only after review."
              : "Identity recovery is not available for this member.";
      toast.error(message);
      return null;
    }
    return data as Record<string, unknown>;
  }

  async function inspectMember(targetUserId: string) {
    const data = await invoke("inspect_mfa", targetUserId);
    if (!data) return;
    const factors = Array.isArray(data.factors) ? (data.factors as FactorSummary[]) : [];
    setInspection((current) => ({
      ...current,
      [targetUserId]: { factors, inspectedAt: Date.now() },
    }));
    setConfirmUserId(null);
    toast.success(factors.length ? `${factors.length} MFA factor(s) found.` : "No MFA factors are enrolled.");
  }

  async function resetMember(targetUserId: string) {
    if (confirmUserId !== targetUserId) {
      setConfirmUserId(targetUserId);
      return;
    }
    const data = await invoke("reset_mfa", targetUserId);
    if (!data) return;
    const deletedCount = typeof data.deletedCount === "number" ? data.deletedCount : 0;
    setConfirmUserId(null);
    setInspection((current) => ({
      ...current,
      [targetUserId]: { factors: [], inspectedAt: Date.now() },
    }));
    toast.success(
      deletedCount
        ? `${deletedCount} MFA factor(s) removed. Supabase invalidated sessions tied to verified factors.`
        : "No MFA factor required removal.",
    );
  }

  return (
    <section className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-warning-soft text-warning">
          <KeyRound className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-black text-text-primary">Identity recovery</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-text-secondary">
            Primary-owner-only MFA inspection and reset. Factor identifiers and the service-role key remain server-side. Reset requires your own AAL2 session and every attempt is audited.
          </p>
        </div>
      </div>

      {recoverableMembers.length === 0 ? (
        <div className="mt-5 rounded-[var(--radius-button)] bg-surface-secondary px-5 py-7 text-center text-sm text-text-secondary">
          No non-owner active or suspended member is eligible for identity recovery.
        </div>
      ) : (
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {recoverableMembers.map((member) => {
            const current = inspection[member.user_id];
            const verified = current?.factors.filter((factor) => factor.status === "verified").length ?? 0;
            const busy = busyUserId === member.user_id;
            const confirming = confirmUserId === member.user_id;
            return (
              <article key={member.user_id} className="rounded-[var(--radius-button)] bg-surface-secondary px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-black text-text-primary">{member.name}</h3>
                    <p className="mt-1 truncate text-xs text-text-secondary">{member.email ?? "Email unavailable"}</p>
                  </div>
                  <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-black text-text-secondary">
                    {member.status}
                  </span>
                </div>

                {current ? (
                  <div className="mt-4 flex items-start gap-2 rounded-[var(--radius-button)] bg-surface px-3 py-3 text-xs text-text-secondary">
                    {current.factors.length ? (
                      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                    ) : (
                      <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
                    )}
                    <span>
                      {current.factors.length} factor(s), {verified} verified. No factor ID is exposed to this page.
                    </span>
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void inspectMember(member.user_id)}
                  >
                    {busy ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
                    Check MFA
                  </Button>
                  {current?.factors.length ? (
                    <Button
                      type="button"
                      size="sm"
                      variant={confirming ? "destructive" : "ghost"}
                      disabled={busy}
                      onClick={() => void resetMember(member.user_id)}
                    >
                      <KeyRound aria-hidden="true" />
                      {confirming ? "Confirm MFA reset" : "Reset MFA"}
                    </Button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
