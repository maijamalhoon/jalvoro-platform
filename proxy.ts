import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

const PUBLIC_SELF_PROTECTED_API_ROUTES = new Set([
  "/api/security/password-check",
]);

function getAIRewritePath(request: NextRequest) {
  if (request.nextUrl.pathname !== "/api/ai-insights") return null;
  if (request.method === "POST") return "/api/ai-insights/advanced";
  if (request.method === "GET") return "/api/ai-insights/overview";
  return null;
}

function commandCenterDestination(request: NextRequest, pathname = "/commandcenter") {
  const destination = request.nextUrl.clone();
  destination.pathname = pathname;
  return destination;
}

function canonicalCommandCenterPath(pathname: string) {
  if (pathname === "/admin") return "/commandcenter";
  if (pathname.startsWith("/admin/")) {
    return `/commandcenter${pathname.slice("/admin".length)}`;
  }
  return null;
}

function isCommandCenterPath(pathname: string) {
  return pathname === "/commandcenter" || pathname.startsWith("/commandcenter/");
}

function isRetiredControlPlanePath(pathname: string) {
  return (
    pathname === "/control" ||
    pathname.startsWith("/control/") ||
    pathname === "/control-login" ||
    pathname === "/control-invite"
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const canonicalPath = canonicalCommandCenterPath(pathname);
  if (canonicalPath) {
    return NextResponse.redirect(commandCenterDestination(request, canonicalPath));
  }

  if (isRetiredControlPlanePath(pathname)) {
    return NextResponse.redirect(commandCenterDestination(request));
  }

  if (isCommandCenterPath(pathname)) {
    return updateSession(request);
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
