import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { sanitizeInternalRedirect } from "@/lib/supabase/session";
import { getProductExperience } from "@/lib/product-experiences";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Preparing workspace setup",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
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

  const [profileResult, preferenceResult] = await Promise.all([
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
      },
    });
  }

  if (profileResult.data?.onboarding_completed) {
    redirect(destination);
  }

  const onboardingParams = new URLSearchParams({
    next: destination,
    prepared: experience.slug,
  });
  redirect(`/onboarding?${onboardingParams.toString()}`);
}
