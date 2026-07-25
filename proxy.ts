import { NextResponse, type NextRequest } from "next/server";
import {
  isAdminControlPlanePath,
  isControlPlaneOnlyPath,
} from "@/lib/control-plane/config";
import {
  mergeControlPlaneResponseState,
  updateControlPlaneSession,
} from "@/lib/control-plane/proxy";
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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isControlPlaneOnlyPath(pathname)) {
    return updateControlPlaneSession(request);
  }

  if (isAdminControlPlanePath(pathname)) {
    const controlResponse = await updateControlPlaneSession(request);
    if (controlResponse.headers.get("x-middleware-next") !== "1") {
      return controlResponse;
    }

    const applicationResponse = await updateSession(request);
    return mergeControlPlaneResponseState(controlResponse, applicationResponse);
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
