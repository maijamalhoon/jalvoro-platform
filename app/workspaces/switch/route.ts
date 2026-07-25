import { NextResponse, type NextRequest } from "next/server";

import { getBusinessWorkspaceHref } from "@/lib/workspaces/domain";
import { createClient } from "@/lib/supabase/server";
import { sanitizeInternalRedirect } from "@/lib/supabase/session";

type BusinessRelation = {
  slug: string;
  workspace_mode: "simple_shop" | "advanced_company";
};

type MembershipResult = {
  business_id: string;
  businesses: BusinessRelation | BusinessRelation[] | null;
};

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function sameOriginRequest(request: NextRequest) {
  const origin = request.headers.get("origin");
  return !origin || origin === request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  if (!sameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const form = await request.formData();
  const kind = form.get("kind");
  const requestedNext = form.get("next");
  const businessId = form.get("business_id");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", "/business");
    return NextResponse.redirect(login, 303);
  }

  const preferenceResult = await supabase
    .from("business_workspace_preferences")
    .select("active_business_id, onboarding_choice")
    .eq("user_id", user.id)
    .maybeSingle();
  const currentPreference = preferenceResult.data;
  const onboardingChoice =
    currentPreference?.onboarding_choice === "business" ||
    currentPreference?.onboarding_choice === "personal"
      ? currentPreference.onboarding_choice
      : kind === "business"
        ? "business"
        : "personal";

  if (kind === "personal") {
    const writeResult = await supabase.from("business_workspace_preferences").upsert({
      user_id: user.id,
      default_workspace: "personal",
      active_business_id: currentPreference?.active_business_id ?? null,
      onboarding_choice: onboardingChoice,
      updated_at: new Date().toISOString(),
    });

    if (writeResult.error) {
      const failure = new URL("/business", request.url);
      failure.searchParams.set("switch_error", "preference");
      return NextResponse.redirect(failure, 303);
    }

    const next =
      typeof requestedNext === "string"
        ? sanitizeInternalRedirect(requestedNext)
        : "/dashboard";
    const destination = next.startsWith("/dashboard") ? next : "/dashboard";
    return NextResponse.redirect(new URL(destination, request.url), 303);
  }

  if (kind !== "business" || typeof businessId !== "string" || !businessId) {
    return NextResponse.redirect(new URL("/business?switch_error=invalid", request.url), 303);
  }

  const membershipResult = await supabase
    .from("business_members")
    .select("business_id, businesses(slug, workspace_mode)")
    .eq("user_id", user.id)
    .eq("business_id", businessId)
    .eq("status", "active")
    .maybeSingle();

  const membership = membershipResult.data as unknown as MembershipResult | null;
  const business = membership ? firstRelation(membership.businesses) : null;

  if (membershipResult.error || !business?.slug) {
    return NextResponse.redirect(new URL("/business?switch_error=access", request.url), 303);
  }

  const canonicalDestination = getBusinessWorkspaceHref(
    business.slug,
    business.workspace_mode,
  );
  const requestedDestination =
    typeof requestedNext === "string"
      ? sanitizeInternalRedirect(requestedNext)
      : canonicalDestination;
  const destination = requestedDestination.startsWith(`/business/${business.slug}`)
    ? requestedDestination
    : canonicalDestination;

  const writeResult = await supabase.from("business_workspace_preferences").upsert({
    user_id: user.id,
    default_workspace: "business",
    active_business_id: businessId,
    onboarding_choice: onboardingChoice,
    updated_at: new Date().toISOString(),
  });

  if (writeResult.error) {
    return NextResponse.redirect(
      new URL("/business?switch_error=preference", request.url),
      303,
    );
  }

  return NextResponse.redirect(new URL(destination, request.url), 303);
}
