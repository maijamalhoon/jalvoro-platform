import { NextResponse, type NextRequest } from "next/server";
import {
  isAdminControlPlanePath,
  isControlPlaneOnlyPath,
} from "@/lib/control-plane/config";
import { updateControlPlaneSession } from "@/lib/control-plane/proxy";
import { updateSession } from "@/lib/supabase/proxy";

const PUBLIC_SELF_PROTECTED_API_ROUTES = new Set([
  "/api/security/password-check",
]);

const PUBLIC_AUTH_ENTRY_ROUTES = new Set([
  "/start",
  "/individual/login",
  "/individual/signup",
  "/business/login",
  "/business/register",
  "/business/signup",
  "/business/invitations/register",
]);

function getAIRewritePath(request: NextRequest) {
  if (request.nextUrl.pathname !== "/api/ai-insights") return null;
  if (request.method === "POST") return "/api/ai-insights/advanced";
  if (request.method === "GET") return "/api/ai-insights/overview";
  return null;
}

function getLegacyCommandCenterRedirect(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname !== "/control" &&
    pathname !== "/control-login" &&
    !pathname.startsWith("/control/")
  ) {
    return null;
  }

  const destination = request.nextUrl.clone();
  destination.pathname = "/admin";
  destination.search = "";
  return destination;
}

function getLegacyLoginRedirect(request: NextRequest) {
  if (request.nextUrl.pathname !== "/login") return null;

  const mode = request.nextUrl.searchParams.get("mode");
  if (mode === "forgot") return null;

  const requestedNext = request.nextUrl.searchParams.get("next") ?? "";
  const destination = request.nextUrl.clone();
  destination.search = "";

  if (requestedNext === "/admin" || requestedNext.startsWith("/admin/")) {
    destination.pathname = "/admin";
    return destination;
  }

  if (mode === "signup") {
    destination.pathname = "/start";
    return destination;
  }

  if (requestedNext === "/business" || requestedNext.startsWith("/business/")) {
    destination.pathname = "/business/login";
    destination.searchParams.set("next", requestedNext);
    return destination;
  }

  if (requestedNext === "/dashboard" || requestedNext.startsWith("/dashboard/")) {
    destination.pathname = "/individual/login";
    destination.searchParams.set("next", requestedNext);
    return destination;
  }

  destination.pathname = "/start";
  destination.searchParams.set("mode", "login");
  return destination;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const legacyCommandCenterRedirect = getLegacyCommandCenterRedirect(request);
  if (legacyCommandCenterRedirect) {
    return NextResponse.redirect(legacyCommandCenterRedirect);
  }

  const legacyLoginRedirect = getLegacyLoginRedirect(request);
  if (legacyLoginRedirect) {
    return NextResponse.redirect(legacyLoginRedirect);
  }

  if (PUBLIC_AUTH_ENTRY_ROUTES.has(pathname)) {
    return NextResponse.next();
  }

  if (pathname === "/control-invite") {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }

  if (isControlPlaneOnlyPath(pathname) || isAdminControlPlanePath(pathname)) {
    return updateControlPlaneSession(request);
  }

  if (PUBLIC_SELF_PROTECTED_API_ROUTES.has(pathname)) {
    return NextResponse.next();
  }

  const sessionResponse = await updateSession(request);
  const rewritePath = getAIRewritePath(request);
  const canRewrite =
    rewritePath !== null &&
    sessionResponse.headers.get("x-middleware-next") === "1";

  if (!canRewrite) return sessionResponse;

  const destination = request.nextUrl.clone();
  destination.pathname = rewritePath;

  const rewriteResponse = NextResponse.rewrite(destination);

  for (const cookie of sessionResponse.cookies.getAll()) {
    rewriteResponse.cookies.set(cookie);
  }

  for (const headerName of ["cache-control", "expires", "pragma", "vary"]) {
    const value = sessionResponse.headers.get(headerName);
    if (value !== null) rewriteResponse.headers.set(headerName, value);
  }

  return rewriteResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|android-release\\.json|api/app-icon(?:/|$)|api/app-release(?:/|$)|api/app-version(?:/|$)|\\.well-known(?:/|$)|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
