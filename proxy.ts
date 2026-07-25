import { NextResponse, type NextRequest } from "next/server";
import {
  getProductExperience,
  inferProductExperienceFromDestination,
} from "@/lib/product-experiences";
import { updateSession } from "@/lib/supabase/proxy";

const PUBLIC_SELF_PROTECTED_API_ROUTES = new Set([
  "/api/security/password-check",
]);

const PRESERVED_RESPONSE_HEADERS = ["cache-control", "expires", "pragma", "vary"];

function getAIRewritePath(request: NextRequest) {
  if (request.nextUrl.pathname !== "/api/ai-insights") return null;
  if (request.method === "POST") return "/api/ai-insights/advanced";
  if (request.method === "GET") return "/api/ai-insights/overview";
  return null;
}

function getLegacyEntryRedirect(request: NextRequest) {
  if (request.nextUrl.pathname !== "/login") return null;

  const mode = request.nextUrl.searchParams.get("mode");
  const next = request.nextUrl.searchParams.get("next");
  const selectedExperience =
    getProductExperience(request.nextUrl.searchParams.get("experience")) ??
    inferProductExperienceFromDestination(next);

  if (selectedExperience) {
    const destination = request.nextUrl.clone();
    destination.pathname =
      mode === "signup"
        ? selectedExperience.signupPath
        : selectedExperience.loginPath;
    destination.searchParams.delete("experience");
    return destination;
  }

  if (mode === "signup" && !next) {
    const destination = request.nextUrl.clone();
    destination.pathname = "/start";
    destination.search = "";
    return destination;
  }

  return null;
}

function getOnboardingRedirect(request: NextRequest) {
  if (
    request.nextUrl.pathname !== "/onboarding" ||
    request.nextUrl.searchParams.has("prepared")
  ) {
    return null;
  }

  const next = request.nextUrl.searchParams.get("next");
  const experience =
    getProductExperience(request.nextUrl.searchParams.get("experience")) ??
    inferProductExperienceFromDestination(next);
  if (!experience) return null;

  const destination = request.nextUrl.clone();
  destination.pathname = experience.onboardingPath;
  destination.searchParams.set("next", next ?? experience.destination);
  destination.searchParams.delete("experience");
  return destination;
}

function copySessionResponseState(source: NextResponse, target: NextResponse) {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie);
  }

  for (const headerName of PRESERVED_RESPONSE_HEADERS) {
    const value = source.headers.get(headerName);
    if (value !== null) target.headers.set(headerName, value);
  }

  return target;
}

export async function proxy(request: NextRequest) {
  if (PUBLIC_SELF_PROTECTED_API_ROUTES.has(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const sessionResponse = await updateSession(request);
  const canContinue = sessionResponse.headers.get("x-middleware-next") === "1";
  if (!canContinue) return sessionResponse;

  const redirectDestination =
    getLegacyEntryRedirect(request) ?? getOnboardingRedirect(request);
  if (redirectDestination) {
    return copySessionResponseState(
      sessionResponse,
      NextResponse.redirect(redirectDestination),
    );
  }

  const rewritePath = getAIRewritePath(request);
  if (!rewritePath) return sessionResponse;

  const destination = request.nextUrl.clone();
  destination.pathname = rewritePath;

  return copySessionResponseState(
    sessionResponse,
    NextResponse.rewrite(destination),
  );
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|android-release\\.json|api/app-icon(?:/|$)|api/app-release(?:/|$)|api/app-version(?:/|$)|\\.well-known(?:/|$)|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
