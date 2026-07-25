import { notFound, redirect } from "next/navigation";

import LoginPage from "@/app/login/page";
import { getProductExperience } from "@/lib/product-experiences";

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

function appendSafeSearchParams(target: URLSearchParams, source: SearchParams) {
  for (const [key, value] of Object.entries(source)) {
    const first = firstValue(value);
    if (typeof first === "string" && first) target.set(key, first);
  }
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

  const next = firstValue(resolvedSearchParams.next);
  const requestedMode = firstValue(resolvedSearchParams.mode);
  const needsDestination = !next;
  const needsSignupMode = mode === "signup" && requestedMode !== "signup";

  if (needsDestination || needsSignupMode) {
    const nextSearchParams = new URLSearchParams();
    appendSafeSearchParams(nextSearchParams, resolvedSearchParams);
    if (needsDestination) nextSearchParams.set("next", experience.destination);
    if (mode === "signup") nextSearchParams.set("mode", "signup");

    const route = mode === "signup" ? experience.signupPath : experience.loginPath;
    redirect(`${route}?${nextSearchParams.toString()}`);
  }

  return <LoginPage />;
}
