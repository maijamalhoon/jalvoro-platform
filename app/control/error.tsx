"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";
import { LockKeyhole, RefreshCcw, ShieldAlert } from "lucide-react";

export default function ControlPlaneError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.withScope((scope) => {
      scope.setTag("jalvoro.surface", "control-plane");
      scope.setTag("jalvoro.boundary", "control-error");
      scope.setLevel("error");
      if (error.digest) scope.setExtra("next_error_digest", error.digest);
      Sentry.captureException(error);
    });
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-5 py-10 text-foreground">
      <section className="w-full max-w-xl rounded-[1.75rem] border border-destructive/25 bg-card p-6 text-center shadow-2xl sm:p-9">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-destructive/25 bg-destructive/8 text-destructive">
          <ShieldAlert size={27} aria-hidden="true" />
        </span>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-destructive">
          Control Plane unavailable
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          The authority snapshot could not be verified.
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          No operator, invitation, grant, or production Admin action was completed.
          Retry the protected request or lock this browser session.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="finance-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-info px-4 py-2.5 text-sm font-semibold text-info-foreground transition hover:opacity-90"
          >
            <RefreshCcw size={17} aria-hidden="true" />
            Retry verification
          </button>
          <Link
            href="/control-login"
            className="finance-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold transition hover:bg-surface-secondary"
          >
            <LockKeyhole size={17} aria-hidden="true" />
            Lock and sign in again
          </Link>
        </div>
      </section>
    </main>
  );
}
