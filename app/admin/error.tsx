"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

import {
  JalvoroRefreshIcon,
} from "@/components/icons/jalvoro/components/actions";
import {
  JalvoroArrowLeftIcon,
} from "@/components/icons/jalvoro/components/interface";
import {
  JalvoroWarningIcon,
} from "@/components/icons/jalvoro/components/status";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.withScope((scope) => {
      scope.setTag("jalvoro.surface", "command-center");
      scope.setTag("jalvoro.boundary", "admin-error");
      scope.setLevel("error");
      if (error.digest) {
        scope.setExtra("next_error_digest", error.digest);
      }
      Sentry.captureException(error);
    });

    console.error("Admin Control Center failed", {
      digest: error.digest,
      name: error.name,
    });
  }, [error]);

  return (
    <section className="mx-auto grid min-h-[65dvh] w-full max-w-2xl place-items-center">
      <div className="w-full rounded-[2rem] border border-destructive/20 bg-card p-6 text-center shadow-sm sm:p-9">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-destructive/20 bg-destructive/5 text-destructive">
          <JalvoroWarningIcon
            size={26}
            context="hero"
            aria-hidden="true"
          />
        </span>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-destructive">
          Control center unavailable
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          The private snapshot could not be loaded.
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
          No finance action was affected. Retry the aggregate request or return
          to the normal workspace.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="finance-focus inline-flex items-center justify-center gap-2 rounded-xl bg-info px-4 py-2.5 text-sm font-semibold text-info-foreground transition hover:opacity-90"
          >
            <JalvoroRefreshIcon
              size={17}
              context="compact"
              aria-hidden="true"
            />
            Retry snapshot
          </button>
          <Link
            href="/dashboard"
            className="finance-focus inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface-secondary"
          >
            <JalvoroArrowLeftIcon
              size={17}
              context="compact"
              aria-hidden="true"
            />
            Finance workspace
          </Link>
        </div>
      </div>
    </section>
  );
}
