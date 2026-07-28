import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  classifyAuthFailure,
  collectSupabaseSessionCookieNames,
  getAuthOnlyRedirectDestination,
  hasSupabaseSessionCookies,
  mergePreservedResponseHeaders,
  sanitizeInternalRedirect,
} from "@/lib/supabase/session";

const PUBLIC_PAGE_ROUTES = [
  "/",
  "/login",
  "/reset-password",
  "/auth/callback",
  "/pos",
  "/privacy",
  "/terms",
  "/disclosures",
  "/support",
];
const AUTH_ONLY_PAGE_ROUTES = ["/", "/login"];
const PUBLIC_ASSET_ROUTES = [
  "/manifest.webmanifest",
  "/manifest.json",
  "/sw.js",
  "/offline.html",
  "/favicon.ico",
  "/apple-touch-icon.png",
  "/robots.txt",
  "/sitemap.xml",
  "/opengraph-image",
  "/twitter-image",
];
const PUBLIC_ASSET_PREFIXES = ["/icons/"];
const PUBLIC_API_ROUTES = [
  "/api/exchange-rate",
  "/api/market/crypto-prices",
];
const BLOCKED_PRODUCTION_API_ROUTES = ["/api/sentry-example-api"];
const CACHE_HEADER_NAMES = ["cache-control", "expires", "pragma", "vary"];
const JSON_PROTECTED_API_PREFIXES = ["/api/ai-insights"];
const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const MAX_PROTECTED_JSON_BYTES = 64 * 1024;

const EXPENSIVE_API_LIMITS = [
  {
    prefix: "/api/ai-insights/chat",
    scope: "api:ai-insights:chat",
    limit: 20,
    windowSeconds: 60,
  },
  {
    prefix: "/api/ai-insights",
    scope: "api:ai-insights",
    limit: 30,
    windowSeconds: 60,
  },
] as const;

function matchesPath(pathname: string, routes: string[]) {
  return routes.some((route) =>
    route === "/"
      ? pathname === "/"
      : pathname === route || pathname.startsWith(`${route}/`),
  );
}

function matchesPrefix(pathname: string, prefixes: readonly string[]) {
  return prefixes.some((prefix) => pathname.startsWith(prefix));
}

function copySupabaseResponseState(source: NextResponse, target: NextResponse) {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie);
  }

  for (const name of CACHE_HEADER_NAMES) {
    const value = source.headers.get(name);
    if (value !== null) target.headers.set(name, value);
  }

  return target;
}

function expireSupabaseSessionCookies(
  request: NextRequest,
  response: NextResponse,
  cookieNames: string[],
) {
  for (const name of cookieNames) {
    response.cookies.set(name, "", {
      path: "/",
      expires: new Date(0),
      maxAge: 0,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
    });
  }

  return response;
}

function loginRedirect(
  request: NextRequest,
  next: string,
  reason?: "session_expired" | "auth_unavailable",
) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", sanitizeInternalRedirect(next));
  if (reason) url.searchParams.set("reason", reason);
  return NextResponse.redirect(url);
}

function safeApiResponse(
  status: number,
  error: string,
  code: string,
  retryAfterSeconds?: number,
) {
  const response = NextResponse.json(
    { error, code },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );

  if (retryAfterSeconds) {
    response.headers.set("Retry-After", String(retryAfterSeconds));
  }

  return response;
}

function protectedApiResponse(
  status: 401 | 503,
  code: "authentication_required" | "session_expired" | "auth_temporarily_unavailable",
) {
  return safeApiResponse(
    status,
    status === 503
      ? "Authentication temporarily unavailable"
      : "Authentication required",
    code,
  );
}

function validateProtectedJsonRequest(request: NextRequest, pathname: string) {
  if (!STATE_CHANGING_METHODS.has(request.method)) return null;
  if (!matchesPrefix(pathname, JSON_PROTECTED_API_PREFIXES)) return null;

  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return safeApiResponse(403, "Request origin is not allowed", "invalid_origin");
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return safeApiResponse(403, "Cross-site request blocked", "cross_site_request_blocked");
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    return safeApiResponse(415, "JSON content is required", "unsupported_media_type");
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_PROTECTED_JSON_BYTES) {
    return safeApiResponse(413, "Request is too large", "payload_too_large");
  }

  return null;
}

function jsonNotFound() {
  return NextResponse.json(
    { error: "Not found", message: "This endpoint is not available in production." },
    {
      status: 404,
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    },
  );
}

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith("/api/");
  const isPublicApiRoute = matchesPath(pathname, PUBLIC_API_ROUTES);
  const isPublicPageRoute = matchesPath(pathname, PUBLIC_PAGE_ROUTES);
  const isPublicAssetRoute =
    matchesPath(pathname, PUBLIC_ASSET_ROUTES) ||
    matchesPrefix(pathname, PUBLIC_ASSET_PREFIXES);

  if (
    process.env.NODE_ENV === "production" &&
    matchesPath(pathname, BLOCKED_PRODUCTION_API_ROUTES)
  ) {
    return jsonNotFound();
  }

  if (isPublicApiRoute || isPublicAssetRoute) return NextResponse.next();

  const invalidProtectedRequest = validateProtectedJsonRequest(request, pathname);
  if (invalidProtectedRequest) return invalidProtectedRequest;

  // PKCE exchanges need their code-verifier cookie intact until the callback or
  // recovery page consumes the one-time authorization code.
  if (
    pathname === "/auth/callback" ||
    (pathname === "/reset-password" && request.nextUrl.searchParams.has("code"))
  ) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

          const refreshedResponse = NextResponse.next({ request });
          copySupabaseResponseState(supabaseResponse, refreshedResponse);
          cookiesToSet.forEach(({ name, value, options }) =>
            refreshedResponse.cookies.set(name, value, options),
          );
          const cacheHeaders = mergePreservedResponseHeaders({}, headers);
          Object.entries(cacheHeaders).forEach(([name, value]) =>
            refreshedResponse.headers.set(name, value),
          );
          supabaseResponse = refreshedResponse;
        },
      },
    },
  );

  let user = null;
  let authError: unknown = null;

  try {
    const claimsResult = await supabase.auth.getClaims();
    authError = claimsResult.error;

    if (!claimsResult.error && claimsResult.data?.claims) {
      const userResult = await supabase.auth.getUser();
      user = userResult.data.user;
      authError = userResult.error;
    }
  } catch (error) {
    authError = error;
  }

  if (user) {
    if (matchesPath(pathname, AUTH_ONLY_PAGE_ROUTES)) {
      const destination = getAuthOnlyRedirectDestination(
        request.nextUrl.searchParams.get("next"),
      );
      const url = new URL(destination, request.nextUrl.origin);
      return copySupabaseResponseState(supabaseResponse, NextResponse.redirect(url));
    }

    const rateLimit = EXPENSIVE_API_LIMITS.find(({ prefix }) =>
      pathname.startsWith(prefix),
    );
    if (rateLimit && request.method === "POST") {
      const { data: allowed, error: rateLimitError } = await supabase.rpc(
        "consume_api_rate_limit",
        {
          p_scope: rateLimit.scope,
          p_limit: rateLimit.limit,
          p_window_seconds: rateLimit.windowSeconds,
        },
      );

      if (rateLimitError) {
        return copySupabaseResponseState(
          supabaseResponse,
          safeApiResponse(
            503,
            "Security control temporarily unavailable",
            "rate_limit_unavailable",
          ),
        );
      }

      if (allowed !== true) {
        return copySupabaseResponseState(
          supabaseResponse,
          safeApiResponse(
            429,
            "Too many requests. Please try again shortly.",
            "rate_limit_exceeded",
            rateLimit.windowSeconds,
          ),
        );
      }
    }

    return supabaseResponse;
  }

  const hasSessionCookies = hasSupabaseSessionCookies(request.cookies.getAll());
  const failure = classifyAuthFailure(authError, hasSessionCookies);
  const originalPath = sanitizeInternalRedirect(`${pathname}${request.nextUrl.search}`);

  if (failure === "transient_failure") {
    if (isPublicPageRoute || pathname === "/onboarding") return supabaseResponse;

    const finalResponse = isApiRoute
      ? protectedApiResponse(503, "auth_temporarily_unavailable")
      : loginRedirect(request, originalPath, "auth_unavailable");
    return copySupabaseResponseState(supabaseResponse, finalResponse);
  }

  if (failure === "stale_session") {
    const finalResponse = isApiRoute
      ? protectedApiResponse(401, "session_expired")
      : isPublicPageRoute
        ? supabaseResponse
        : loginRedirect(request, originalPath, "session_expired");
    const staleSessionCookieNames = collectSupabaseSessionCookieNames(
      request.cookies.getAll(),
      supabaseResponse.cookies.getAll(),
    );
    copySupabaseResponseState(supabaseResponse, finalResponse);
    return expireSupabaseSessionCookies(
      request,
      finalResponse,
      staleSessionCookieNames,
    );
  }

  if (isApiRoute) {
    return copySupabaseResponseState(
      supabaseResponse,
      protectedApiResponse(401, "authentication_required"),
    );
  }

  if (!isPublicPageRoute) {
    return copySupabaseResponseState(
      supabaseResponse,
      loginRedirect(request, originalPath),
    );
  }

  return supabaseResponse;
}
