"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LoaderCircle, ShieldAlert, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  getBusinessInvitationAcceptancePath,
  normalizeBusinessInvitationToken,
} from "@/lib/business/invitations";
import { createClient } from "@/lib/supabase/client";

type AcceptBusinessInvitationProps = {
  token: string;
};

type AcceptanceResult = {
  business_id: string;
  business_slug: string;
  role: string;
};

type State =
  | { status: "accepting"; message: string }
  | { status: "accepted"; message: string; businessSlug: string }
  | { status: "error"; message: string; code?: string };

function acceptanceMessage(code: string | undefined) {
  if (code === "42501") {
    return "Use the exact invited Business email. An existing Individual identity cannot be reused for Business access.";
  }
  if (code === "22008") return "This invitation has expired. Ask the business owner to resend it.";
  if (code === "55000") return "This invitation has already been accepted or cancelled.";
  if (code === "P0002") return "This invitation link is invalid or was replaced by a newer one.";
  return "The invitation could not be accepted. No team access was changed.";
}

export default function AcceptBusinessInvitation({ token }: AcceptBusinessInvitationProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const started = useRef(false);
  const normalizedToken = normalizeBusinessInvitationToken(token);
  const nextPath = normalizedToken
    ? getBusinessInvitationAcceptancePath(normalizedToken)
    : "/business/invitations/accept";
  const [state, setState] = useState<State>({
    status: "accepting",
    message: "Verifying the invitation, invited email, and account realm…",
  });

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (!normalizedToken) {
      setState({ status: "error", message: "This invitation link is malformed." });
      return;
    }

    void (async () => {
      const { data, error } = await supabase.rpc("accept_business_invitation", {
        p_token: normalizedToken,
      });

      if (error || !data) {
        console.error("Business invitation acceptance failed", { code: error?.code });
        setState({
          status: "error",
          code: error?.code,
          message: acceptanceMessage(error?.code),
        });
        return;
      }

      const result = data as AcceptanceResult;
      setState({
        status: "accepted",
        businessSlug: result.business_slug,
        message: `Access accepted as ${result.role.replace(/_/g, " ")}.`,
      });

      window.setTimeout(() => {
        router.replace(`/business/${result.business_slug}`);
        router.refresh();
      }, 650);
    })();
  }, [normalizedToken, router, supabase]);

  const Icon =
    state.status === "accepting"
      ? LoaderCircle
      : state.status === "accepted"
        ? CheckCircle2
        : ShieldAlert;

  return (
    <section className="w-full max-w-lg rounded-[var(--radius-card)] bg-surface px-5 py-7 text-center shadow-[var(--shadow-sm)] sm:px-8 sm:py-9">
      <span
        className={`mx-auto inline-flex size-14 items-center justify-center rounded-[var(--radius-button)] ${
          state.status === "accepted"
            ? "bg-success-soft text-success"
            : state.status === "error"
              ? "bg-danger-soft text-danger"
              : "bg-primary-soft text-primary"
        }`}
      >
        <Icon
          className={`size-7 ${state.status === "accepting" ? "animate-spin" : ""}`}
          aria-hidden="true"
        />
      </span>

      <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-primary">
        Business team invitation
      </p>
      <h1 className="mt-2 text-2xl font-black tracking-tight text-text-primary">
        {state.status === "accepting"
          ? "Accepting access"
          : state.status === "accepted"
            ? "Welcome to the team"
            : "Invitation unavailable"}
      </h1>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-text-secondary">
        {state.message}
      </p>

      {state.status === "accepted" ? (
        <Button
          type="button"
          className="mt-6 w-full"
          onClick={() => {
            router.replace(`/business/${state.businessSlug}`);
            router.refresh();
          }}
        >
          <UsersRound aria-hidden="true" /> Open workspace
        </Button>
      ) : null}

      {state.status === "error" && normalizedToken ? (
        <div className="mt-6 grid gap-3">
          <Link
            href={`/business/login?next=${encodeURIComponent(nextPath)}`}
            className="finance-focus inline-flex min-h-11 items-center justify-center rounded-[var(--radius-button)] bg-primary px-4 text-sm font-black text-primary-foreground"
          >
            Sign in with invited account
          </Link>
          <Link
            href={`/business/invitations/register?token=${encodeURIComponent(normalizedToken)}`}
            className="finance-focus inline-flex min-h-11 items-center justify-center rounded-[var(--radius-button)] bg-surface-secondary px-4 text-sm font-black text-text-primary"
          >
            Create invited Business account
          </Link>
        </div>
      ) : null}
    </section>
  );
}
