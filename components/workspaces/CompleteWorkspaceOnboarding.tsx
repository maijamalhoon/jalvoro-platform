"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { sanitizeInternalRedirect } from "@/lib/supabase/session";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CompletionState = "saving" | "ready" | "error";

export default function CompleteWorkspaceOnboarding({
  sessionId,
  nextPath,
}: {
  sessionId: string;
  nextPath: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const destination = sanitizeInternalRedirect(nextPath);
  const validSessionId = UUID_PATTERN.test(sessionId) ? sessionId : null;
  const [state, setState] = useState<CompletionState>("saving");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    async function complete() {
      setState("saving");

      if (!validSessionId) {
        if (active) setState("error");
        return;
      }

      const result = await supabase.rpc("update_workspace_onboarding_progress", {
        p_session_id: validSessionId,
        p_current_step: 3,
        p_completed_steps: [
          "identity_verified",
          "profile_ready",
          "personal_workspace_ready",
        ],
        p_draft_data: {},
        p_status: "completed",
      });

      if (!active) return;

      if (result.error) {
        console.error("Personal onboarding session completion failed", {
          code: result.error.code,
        });
        setState("error");
        return;
      }

      setState("ready");
      router.replace(destination.startsWith("/dashboard") ? destination : "/dashboard");
      router.refresh();
    }

    void complete();
    return () => {
      active = false;
    };
  }, [attempt, destination, router, supabase, validSessionId]);

  if (state === "error") {
    return (
      <div className="space-y-4">
        <span className="mx-auto grid size-12 place-items-center rounded-[var(--radius-button)] bg-danger-soft text-danger">
          <AlertTriangle className="size-6" aria-hidden="true" />
        </span>
        <p className="text-sm leading-6 text-text-secondary">
          Your profile is saved, but the workspace setup marker could not be finalized. Retrying
          will not duplicate any Personal data.
        </p>
        <Button type="button" size="lg" className="w-full" onClick={() => setAttempt((value) => value + 1)}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center" aria-live="polite" aria-busy={state === "saving"}>
      <span className="mx-auto grid size-12 place-items-center rounded-[var(--radius-button)] bg-success-soft text-success">
        {state === "saving" ? (
          <LoaderCircle className="size-6 animate-spin" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="size-6" aria-hidden="true" />
        )}
      </span>
      <p className="text-sm leading-6 text-text-secondary">
        {state === "saving"
          ? "Saving your resumable setup state before opening Personal Finance."
          : "Personal Finance is ready."}
      </p>
    </div>
  );
}
