import { notFound, redirect } from "next/navigation";

import LoginPage from "@/app/login/page";
import { getProductExperience } from "@/lib/product-experiences";
import {
  normalizeLoginReason,
  sanitizeInternalRedirect,
} from "@/lib/supabase/session";

type SearchParamValue = string | string[] | undefined;
type SearchParams = Record<string, SearchParamValue>;

type ProductAuthRouteProps = {
  mode: "login" | "signup";
  params: Promise<{ experience: string }>;
  searchParams: Promise<SearchParams>;
};

function firstValue(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function receivedSearchParams(source: SearchParams) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(source)) {
    const first = firstValue(value);
    if (typeof first === "string" && first) params.set(key, first);
  }

  return params;
}

export default async function ProductAuthRoute({
  mode,
  params,
  searchParams,
}: ProductAuthRouteProps) {
  const [{ experience: slug }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const experience = getProductExperience(slug);
  if (!experience) notFound();

  const requestedNext = firstValue(resolvedSearchParams.next);
  const requestedMode = firstValue(resolvedSearchParams.mode);
  const requestedReason = firstValue(resolvedSearchParams.reason);
  const safeNext = sanitizeInternalRedirect(requestedNext, experience.destination);
  const safeReason = normalizeLoginReason(requestedReason);
  const canonicalMode =
    mode === "signup" ? "signup" : requestedMode === "forgot" ? "forgot" : null;
  const canonicalSearchParams = new URLSearchParams({ next: safeNext });

  if (canonicalMode) canonicalSearchParams.set("mode", canonicalMode);
  if (safeReason) canonicalSearchParams.set("reason", safeReason);

  if (
    receivedSearchParams(resolvedSearchParams).toString() !==
    canonicalSearchParams.toString()
  ) {
    const route = mode === "signup" ? experience.signupPath : experience.loginPath;
    redirect(`${route}?${canonicalSearchParams.toString()}`);
  }

  return <LoginPage />;
}
