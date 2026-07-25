import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

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
  const destination = sanitizeInternalRedirect(requestedNext ?? experience.destination);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const returnPath = `${experience.onboardingPath}?next=${encodeURIComponent(destination)}`;
    redirect(`${experience.loginPath}?next=${encodeURIComponent(returnPath)}`);
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

  const selectedWorkspace = experience.workspaceKind;
  const preferenceWrite = await supabase.from("business_workspace_preferences").upsert({
    user_id: user.id,
    default_workspace: selectedWorkspace,
    active_business_id: preferenceResult.data?.active_business_id ?? null,
    onboarding_choice: selectedWorkspace,
    updated_at: new Date().toISOString(),
  });

  if (!preferenceWrite.error) {
    await supabase.auth.updateUser({
      data: {
        jalvoro_start_experience: experience.slug,
        jalvoro_onboarding_session:
          typeof sessionResult.data === "string" ? sessionResult.data : null,
      },
    });
  }

  const sessionId =
    !sessionResult.error && typeof sessionResult.data === "string"
      ? sessionResult.data
      : null;
  const resumableDestination = appendOnboardingSession(destination, sessionId);

  if (profileResult.data?.onboarding_completed) {
    if (experience.workspaceKind === "personal" && sessionId) {
      await supabase.rpc("update_workspace_onboarding_progress", {
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
      redirect(destination);
    }

    redirect(resumableDestination);
  }

  const genericOnboardingDestination =
    experience.workspaceKind === "personal" && sessionId
      ? personalCompletionDestination(sessionId, destination)
      : resumableDestination;
  const onboardingParams = new URLSearchParams({
    next: genericOnboardingDestination,
    prepared: experience.slug,
  });
  if (sessionId) onboardingParams.set("session", sessionId);

  redirect(`/onboarding?${onboardingParams.toString()}`);
}
