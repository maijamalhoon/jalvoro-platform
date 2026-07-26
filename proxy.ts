import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

const PUBLIC_SELF_PROTECTED_API_ROUTES = new Set([
  "/api/security/password-check",
]);

const COMMAND_CENTER_RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  Pragma: "no-cache",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "Referrer-Policy": "no-referrer",
} as const;

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
  destination.search = "";
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

function hardenCommandCenterResponse(response: NextResponse) {
  Object.entries(COMMAND_CENTER_RESPONSE_HEADERS).forEach(([name, value]) =>
    response.headers.set(name, value),
  );
  return response;
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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const canonicalPath = canonicalCommandCenterPath(pathname);
  if (canonicalPath) {
    return hardenCommandCenterResponse(
      NextResponse.redirect(commandCenterDestination(request, canonicalPath)),
    );
  }

  if (isRetiredControlPlanePath(pathname)) {
    return hardenCommandCenterResponse(
      NextResponse.redirect(commandCenterDestination(request)),
    );
  }

  if (isCommandCenterPath(pathname)) {
    // `/commandcenter` owns its dedicated authentication flow. Do not send this
    // request through normal website middleware because cookies from the two
    // Supabase projects must coexist and the page performs the bounded bridge.
    return hardenCommandCenterResponse(NextResponse.next({ request }));
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
