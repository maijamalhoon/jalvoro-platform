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

function commandCenterDestination(
  request: NextRequest,
  pathname = "/commandcenter",
) {
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

function copyResponseState(source: NextResponse, target: NextResponse) {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie);
  }
  for (const headerName of ["cache-control", "expires", "pragma", "vary"]) {
    const value = source.headers.get(headerName);
    if (value !== null) target.headers.set(headerName, value);
  }
  return target;
}

function isLoginRedirect(response: NextResponse) {
  if (response.status < 300 || response.status >= 400) return false;
  const location = response.headers.get("location");
  if (!location) return false;
  try {
    return new URL(location).pathname === "/login";
  } catch {
    return location.startsWith("/login");
  }
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
    const sessionResponse = await updateSession(request);

    // `/commandcenter` is the one canonical sign-in entry. The page renders its
    // own email/password form when no normal JALVORO session exists. Nested
    // Command Center routes remain protected and still redirect to sign-in.
    if (pathname === "/commandcenter" && isLoginRedirect(sessionResponse)) {
      return copyResponseState(
        sessionResponse,
        NextResponse.next({ request }),
      );
    }

    return sessionResponse;
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
  copyResponseState(sessionResponse, rewriteResponse);

  return rewriteResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|android-release\\.json|api/app-icon(?:/|$)|api/app-release(?:/|$)|api/app-version(?:/|$)|\\.well-known(?:/|$)|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
