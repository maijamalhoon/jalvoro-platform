import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  CONTROL_PLANE_LOGIN_PATH,
  CONTROL_PLANE_SUPABASE_PUBLISHABLE_KEY,
  CONTROL_PLANE_SUPABASE_URL,
  parseControlPlaneAccess,
  sanitizeControlDestination,
} from "@/lib/control-plane/config";

const CONTROL_RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "Referrer-Policy": "no-referrer",
} as const;

function harden(response: NextResponse) {
  Object.entries(CONTROL_RESPONSE_HEADERS).forEach(([name, value]) =>
    response.headers.set(name, value),
  );
  return response;
}

function copyControlState(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  Object.keys(CONTROL_RESPONSE_HEADERS).forEach((name) => {
    const value = source.headers.get(name);
    if (value) target.headers.set(name, value);
  });
  return target;
}

function controlLoginRedirect(
  request: NextRequest,
  response: NextResponse,
  reason: "authentication_required" | "mfa_required" | "access_denied",
) {
  const destination = request.nextUrl.clone();
  destination.pathname = CONTROL_PLANE_LOGIN_PATH;
  destination.search = "";
  destination.searchParams.set(
    "next",
    sanitizeControlDestination(`${request.nextUrl.pathname}${request.nextUrl.search}`),
  );
  destination.searchParams.set("reason", reason);
  return copyControlState(response, harden(NextResponse.redirect(destination)));
}

export function mergeControlPlaneResponseState(
  source: NextResponse,
  target: NextResponse,
) {
  return copyControlState(source, target);
}

export async function updateControlPlaneSession(request: NextRequest) {
  let response = harden(NextResponse.next({ request }));
  const isLoginRoute = request.nextUrl.pathname === CONTROL_PLANE_LOGIN_PATH;

  const supabase = createServerClient(
    CONTROL_PLANE_SUPABASE_URL,
    CONTROL_PLANE_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          const refreshed = harden(NextResponse.next({ request }));
          response.cookies.getAll().forEach((cookie) =>
            refreshed.cookies.set(cookie),
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            refreshed.cookies.set(name, value, options),
          );
          response = refreshed;
        },
      },
    },
  );

  let user = null;
  try {
    const claims = await supabase.auth.getClaims();
    if (!claims.error && claims.data?.claims) {
      const userResult = await supabase.auth.getUser();
      if (!userResult.error) user = userResult.data.user;
    }
  } catch {
    user = null;
  }

  if (!user) {
    return isLoginRoute
      ? response
      : controlLoginRedirect(request, response, "authentication_required");
  }

  if (isLoginRoute) return response;

  const assurance = await supabase.auth.mfa
    .getAuthenticatorAssuranceLevel()
    .catch(() => ({ data: null, error: new Error("assurance_unavailable") }));

  if (assurance.error || assurance.data?.currentLevel !== "aal2") {
    return controlLoginRedirect(request, response, "mfa_required");
  }

  const accessResult = await supabase.rpc("get_my_control_plane_access");
  if (accessResult.error || !parseControlPlaneAccess(accessResult.data)) {
    return controlLoginRedirect(request, response, "access_denied");
  }

  return response;
}
