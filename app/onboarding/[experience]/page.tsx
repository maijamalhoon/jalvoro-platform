import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, RotateCcw } from "lucide-react";

import AuthShell from "@/components/auth/AuthShell";
import { getProductExperience } from "@/lib/product-experiences";
import { createClient } from "@/lib/supabase/server";
import { sanitizeInternalRedirect } from "@/lib/supabase/session";
import { appendOnboardingSession } from "@/lib/workspaces/domain";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Preparing workspace setup",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function personalCompletionDestination(sessionId: string, destination: string) {
  const params = new URLSearchParams({
    session: sessionId,
    next: destination,
  });
  return `/workspaces/onboarding/complete?${params.toString()}`;
}

function PreparationError({
  experienceName,
  retryHref,
  fallbackHref,
  fallbackLabel = "Choose another workspace",
}: {
  experienceName: string;
  retryHref: string;
  fallbackHref: string;
  fallbackLabel?: string;
}) {
  return (
    <AuthShell
      compact
      minimal
      eyebrow="Workspace setup"
      progress="Preparation paused"
      title={`We could not prepare ${experienceName}`}
      description="No workspace records were merged or deleted. Retry when your connection is stable, or use the safe fallback below."
    >
      <div className="space-y-4 text-center" role="alert" aria-live="assertive">
        <p className="text-sm leading-6 text-text-secondary">
          JALVORO could not safely confirm your profile, workspace preference, or resumable setup
          session. Setup has stopped before continuing so your current workspace remains unchanged.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Link
            href={retryHref}
            className="finance-focus inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-button)] bg-primary px-4 text-sm font-black text-white"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Retry preparation
          </Link>
          <Link
            href={fallbackHref}
            className="finance-focus inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-button)] bg-surface-secondary px-4 text-sm font-black text-text-primary"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {fallbackLabel}
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}

export default async function ExperienceOnboardingBridge({
  params,
  searchParams,
}: {
  params: Promise<{ experience: string }>;
  searchParams: SearchParams;
}) {
  const [{ experience: slug }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const experience = getProductExperience(slug);
  if (!experience) notFound();

  const requestedNext = firstValue(resolvedSearchParams.next);
  const destination = sanitizeInternalRedirect(
    requestedNext ?? experience.destination,
    experience.destination,
  );
  const retryHref = `${experience.onboardingPath}?next=${encodeURIComponent(destination)}`;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`${experience.loginPath}?next=${encodeURIComponent(retryHref)}`);
  }

  const [profileResult, preferenceResult, sessionResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("business_workspace_preferences")
      .select("active_business_id")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.rpc("begin_workspace_onboarding", {
      p_experience: experience.slug,
      p_next_path: destination,
    }),
  ]);

  if (profileResult.error || preferenceResult.error || sessionResult.error) {
    console.error("Workspace onboarding preparation failed", {
      profileCode: profileResult.error?.code,
      preferenceCode: preferenceResult.error?.code,
      sessionCode: sessionResult.error?.code,
      experience: experience.slug,
    });

    return (
      <PreparationError
        experienceName={experience.productName}
        retryHref={retryHref}
        fallbackHref="/start"
      />
    );
  }

  const sessionId =
    typeof sessionResult.data === "string" ? sessionResult.data : null;

  if (!sessionId) {
    console.error("Workspace onboarding session returned no identifier", {
      experience: experience.slug,
    });

    return (
      <PreparationError
        experienceName={experience.productName}
        retryHref={retryHref}
        fallbackHref="/start"
      />
    );
  }

  const profileCompleted = Boolean(profileResult.data?.onboarding_completed);

  if (profileCompleted && experience.workspaceKind === "personal") {
    const progressResult = await supabase.rpc("update_workspace_onboarding_progress", {
      p_session_id: sessionId,
      p_current_step: 3,
      p_completed_steps: [
        "identity_verified",
        "profile_ready",
        "personal_workspace_ready",
      ],
      p_draft_data: {},
      p_status: "completed",
    });

    if (progressResult.error) {
      console.error("Completed Personal onboarding could not be finalized", {
        code: progressResult.error.code,
      });

      return (
        <PreparationError
          experienceName={experience.productName}
          retryHref={retryHref}
          fallbackHref="/dashboard"
          fallbackLabel="Open Personal Finance"
        />
      );
    }
  }

  const selectedWorkspace = experience.workspaceKind;
  const preferenceWrite = await supabase.from("business_workspace_preferences").upsert({
    user_id: user.id,
    default_workspace: selectedWorkspace,
    active_business_id: preferenceResult.data?.active_business_id ?? null,
    onboarding_choice: selectedWorkspace,
    updated_at: new Date().toISOString(),
  });

  if (preferenceWrite.error) {
    console.error("Workspace onboarding preference write failed", {
      code: preferenceWrite.error.code,
      experience: experience.slug,
    });

    return (
      <PreparationError
        experienceName={experience.productName}
        retryHref={retryHref}
        fallbackHref="/start"
      />
    );
  }

  const metadataWrite = await supabase.auth.updateUser({
    data: {
      jalvoro_start_experience: experience.slug,
      jalvoro_onboarding_session: sessionId,
    },
  });

  if (metadataWrite.error) {
    console.error("Non-authoritative onboarding metadata could not be updated", {
      code: metadataWrite.error.code,
      experience: experience.slug,
    });
  }

  const resumableDestination = appendOnboardingSession(destination, sessionId);

  if (profileCompleted) {
    redirect(
      experience.workspaceKind === "personal" ? destination : resumableDestination,
    );
  }

  const genericOnboardingDestination =
    experience.workspaceKind === "personal"
      ? personalCompletionDestination(sessionId, destination)
      : resumableDestination;
  const onboardingParams = new URLSearchParams({
    next: genericOnboardingDestination,
    prepared: experience.slug,
    session: sessionId,
  });

  redirect(`/onboarding?${onboardingParams.toString()}`);
}
