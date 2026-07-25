import { NextResponse, type NextRequest } from "next/server";

import {
  getBusinessWorkspaceHref,
  isPathWithinRoute,
} from "@/lib/workspaces/domain";
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

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function sameOriginRequest(request: NextRequest) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") return false;

  const origin = request.headers.get("origin");
  if (origin) return origin === request.nextUrl.origin;

  const referer = request.headers.get("referer");
  if (!referer) return false;

  try {
    return new URL(referer).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

function switchFailure(request: NextRequest, reason: string) {
  const failure = new URL("/business", request.url);
  failure.searchParams.set("switch_error", reason);
  return NextResponse.redirect(failure, 303);
}

export async function POST(request: NextRequest) {
  if (!sameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const form = await request.formData();
  const kind = form.get("kind");
  const requestedNext = form.get("next");
  const rawBusinessId = form.get("business_id");
  const businessId =
    typeof rawBusinessId === "string" ? rawBusinessId.trim() : "";
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

  if (preferenceResult.error) {
    return switchFailure(request, "preference");
  }

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
      return switchFailure(request, "preference");
    }

    const requestedDestination =
      typeof requestedNext === "string"
        ? sanitizeInternalRedirect(requestedNext, "/dashboard")
        : "/dashboard";
    const destination = isPathWithinRoute(requestedDestination, "/dashboard")
      ? requestedDestination
      : "/dashboard";

    return NextResponse.redirect(new URL(destination, request.url), 303);
  }

  if (kind !== "business" || !UUID_PATTERN.test(businessId)) {
    return switchFailure(request, "invalid");
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

  if (
    membershipResult.error ||
    membership?.business_id !== businessId ||
    !business?.slug
  ) {
    return switchFailure(request, "access");
  }

  const canonicalDestination = getBusinessWorkspaceHref(
    business.slug,
    business.workspace_mode,
  );
  const requestedDestination =
    typeof requestedNext === "string"
      ? sanitizeInternalRedirect(requestedNext, canonicalDestination)
      : canonicalDestination;
  const workspaceRoot = `/business/${business.slug}`;
  const destination = isPathWithinRoute(requestedDestination, workspaceRoot)
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
    return switchFailure(request, "preference");
  }

  return NextResponse.redirect(new URL(destination, request.url), 303);
}
