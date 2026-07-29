import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { SUPABASE_BROWSER_AUTH_OPTIONS } from "./client";
import {
  classifyAuthFailure,
  classifyPasswordUpdateException,
  classifyRecoveryLinkError,
  classifyUserLookupFailure,
  collectSupabaseSessionCookieNames,
  createRecoveryMarker,
  getAuthOnlyRedirectDestination,
  getOrCreateKeyedRecoveryAttempt,
  getPasswordUpdateExceptionMessage,
  getRecoveryRetryOperation,
  hasSupabaseSessionCookies,
  isConfirmedRecoveryAuthEvent,
  isSupabaseAuthCookie,
  isSupabaseCodeVerifierCookie,
  isSupabaseSessionCookie,
  mergePreservedResponseHeaders,
  normalizeLoginReason,
  normalizeRecoveryCode,
  parseValidRecoveryMarker,
  sanitizeInternalRedirect,
  shouldClearRecoveryMarkerAfterPasswordUpdate,
} from "./session";

const browserClientSource = readFileSync(new URL("./client.ts", import.meta.url), "utf8");
const resetPasswordSource = readFileSync(
  new URL("../../app/reset-password/page.tsx", import.meta.url),
  "utf8",
);
const installedSsrBrowserClientSource = readFileSync(
  new URL(
    "../../node_modules/@supabase/ssr/src/createBrowserClient.ts",
    import.meta.url,
  ),
  "utf8",
);
const installedAuthClientSource = readFileSync(
  new URL(
    "../../node_modules/@supabase/auth-js/src/GoTrueClient.ts",
    import.meta.url,
  ),
  "utf8",
);

describe("sanitizeInternalRedirect", () => {
  it("accepts /dashboard", () => expect(sanitizeInternalRedirect("/dashboard")).toBe("/dashboard"));
  it("accepts a nested path", () => expect(sanitizeInternalRedirect("/dashboard/accounts/1")).toBe("/dashboard/accounts/1"));
  it("preserves a query string", () => expect(sanitizeInternalRedirect("/dashboard?tab=goals")).toBe("/dashboard?tab=goals"));
  it("preserves a hash", () => expect(sanitizeInternalRedirect("/dashboard#summary")).toBe("/dashboard#summary"));
  it("rejects an absolute https URL", () => expect(sanitizeInternalRedirect("https://evil.test/x")).toBe("/dashboard"));
  it("rejects an absolute http URL", () => expect(sanitizeInternalRedirect("http://evil.test/x")).toBe("/dashboard"));
  it("rejects a protocol-relative URL", () => expect(sanitizeInternalRedirect("//evil.test/x")).toBe("/dashboard"));
  it("rejects a backslash redirect", () => expect(sanitizeInternalRedirect("/\\evil.test")).toBe("/dashboard"));
  it("rejects an encoded backslash redirect", () => expect(sanitizeInternalRedirect("/%5cevil.test")).toBe("/dashboard"));
  it("rejects javascript", () => expect(sanitizeInternalRedirect("javascript:alert(1)")).toBe("/dashboard"));
  it("rejects data", () => expect(sanitizeInternalRedirect("data:text/html,test")).toBe("/dashboard"));
  it("rejects control characters", () => expect(sanitizeInternalRedirect("/dashboard\nnext")).toBe("/dashboard"));
  it("rejects malformed encoding", () => expect(sanitizeInternalRedirect("/dashboard/%E0%A4%A")).toBe("/dashboard"));
  it("rejects an auth callback loop", () => expect(sanitizeInternalRedirect("/auth/callback?code=x")).toBe("/dashboard"));
  it("rejects a reset-password loop", () => expect(sanitizeInternalRedirect("/reset-password")).toBe("/dashboard"));
  it("rejects a login loop", () => expect(sanitizeInternalRedirect("/login?next=/login")).toBe("/dashboard"));
  it("rejects a percent-encoded login loop", () => expect(sanitizeInternalRedirect("/%6cogin")).toBe("/dashboard"));
  it("rejects a double-encoded login loop", () => expect(sanitizeInternalRedirect("/%256cogin")).toBe("/dashboard"));
  it("rejects an encoded auth callback loop", () => expect(sanitizeInternalRedirect("/auth/%63allback")).toBe("/dashboard"));
  it("rejects an encoded reset-password loop", () => expect(sanitizeInternalRedirect("/reset%2Dpassword")).toBe("/dashboard"));
  it("rejects a mixed-case encoded auth route", () => expect(sanitizeInternalRedirect("/%4CoGiN")).toBe("/dashboard"));
  it("preserves a legitimate encoded query value", () => expect(sanitizeInternalRedirect("/dashboard?next=%2Faccounts%2Fcash#summary")).toBe("/dashboard?next=%2Faccounts%2Fcash#summary"));
});

describe("normalizeRecoveryCode", () => {
  it("accepts a URL-safe one-time code", () => {
    expect(normalizeRecoveryCode("pkce_code-123.~")).toBe("pkce_code-123.~");
  });

  it("rejects whitespace and decoded delimiter injection", () => {
    expect(normalizeRecoveryCode("code with space")).toBeNull();
    expect(normalizeRecoveryCode("code/next")).toBeNull();
  });

  it("rejects empty and oversized codes", () => {
    expect(normalizeRecoveryCode("")).toBeNull();
    expect(normalizeRecoveryCode("a".repeat(2_049))).toBeNull();
  });
});

describe("Supabase auth cookies", () => {
  it("identifies a normal auth cookie", () => expect(isSupabaseAuthCookie("sb-project-auth-token")).toBe(true));
  it("identifies auth cookie chunk zero", () => expect(isSupabaseAuthCookie("sb-project-auth-token.0")).toBe(true));
  it("identifies auth cookie chunk one", () => expect(isSupabaseAuthCookie("sb-project-auth-token.1")).toBe(true));
  it("identifies a code verifier cookie", () => expect(isSupabaseAuthCookie("sb-project-auth-token-code-verifier")).toBe(true));
  it("rejects an unrelated cookie", () => expect(isSupabaseAuthCookie("theme")).toBe(false));
  it("identifies the code verifier separately", () => expect(isSupabaseCodeVerifierCookie("sb-project-auth-token-code-verifier")).toBe(true));
  it("does not treat a code verifier as a session cookie", () => expect(isSupabaseSessionCookie("sb-project-auth-token-code-verifier")).toBe(false));
  it("keeps verifier-only requests signed out", () => {
    const cookies = [{ name: "sb-project-auth-token-code-verifier" }];
    expect(hasSupabaseSessionCookies(cookies)).toBe(false);
    expect(classifyAuthFailure(undefined, hasSupabaseSessionCookies(cookies))).toBe("signed_out");
  });
  it("does not treat a verifier-only onboarding cookie as a session", () => {
    const onboardingCookies = [{ name: "sb-project-auth-token-code-verifier" }];
    expect(hasSupabaseSessionCookies(onboardingCookies)).toBe(false);
  });
  it("identifies a normal token as a session cookie", () => expect(isSupabaseSessionCookie("sb-project-auth-token")).toBe(true));
  it("identifies a numeric token chunk as a session cookie", () => expect(isSupabaseSessionCookie("sb-project-auth-token.12")).toBe(true));
  it("detects a session cookie in a collection", () => expect(hasSupabaseSessionCookies([{ name: "theme" }, { name: "sb-ref-auth-token.0" }])).toBe(true));
});

describe("stale session cookie cleanup plan", () => {
  it("includes a request-only session cookie", () => {
    expect(collectSupabaseSessionCookieNames([{ name: "sb-ref-auth-token" }], [])).toEqual(["sb-ref-auth-token"]);
  });
  it("includes a response-only session cookie", () => {
    expect(collectSupabaseSessionCookieNames([], [{ name: "sb-ref-auth-token.0" }])).toEqual(["sb-ref-auth-token.0"]);
  });
  it("includes response chunks after the chunk count changes", () => {
    expect(
      collectSupabaseSessionCookieNames(
        [{ name: "sb-ref-auth-token.0" }],
        [{ name: "sb-ref-auth-token.0" }, { name: "sb-ref-auth-token.1" }],
      ),
    ).toEqual(["sb-ref-auth-token.0", "sb-ref-auth-token.1"]);
  });
  it("deduplicates session cookie names", () => {
    expect(collectSupabaseSessionCookieNames([{ name: "sb-ref-auth-token" }], [{ name: "sb-ref-auth-token" }])).toEqual(["sb-ref-auth-token"]);
  });
  it("excludes the verifier from stale deletion", () => {
    expect(collectSupabaseSessionCookieNames([{ name: "sb-ref-auth-token-code-verifier" }])).toEqual([]);
  });
  it("excludes unrelated cookies", () => {
    expect(collectSupabaseSessionCookieNames([{ name: "theme" }, { name: "csrf" }])).toEqual([]);
  });
  it("includes every stale session chunk in the deletion plan", () => {
    expect(
      collectSupabaseSessionCookieNames(
        [{ name: "sb-ref-auth-token" }, { name: "sb-ref-auth-token.0" }],
        [{ name: "sb-ref-auth-token.1" }, { name: "sb-ref-auth-token.2" }],
      ),
    ).toEqual([
      "sb-ref-auth-token",
      "sb-ref-auth-token.0",
      "sb-ref-auth-token.1",
      "sb-ref-auth-token.2",
    ]);
  });
});

describe("classifyAuthFailure", () => {
  it("classifies no-cookie missing session as signed out", () => expect(classifyAuthFailure(undefined, false)).toBe("signed_out"));
  it("classifies refresh_token_not_found as stale", () => expect(classifyAuthFailure({ code: "refresh_token_not_found" }, true)).toBe("stale_session"));
  it("classifies invalid_refresh_token as stale", () => expect(classifyAuthFailure({ code: "invalid_refresh_token" }, true)).toBe("stale_session"));
  it("classifies an already-used refresh token as stale", () => expect(classifyAuthFailure({ message: "Refresh token already used" }, true)).toBe("stale_session"));
  it("classifies session_not_found as stale", () => expect(classifyAuthFailure({ code: "session_not_found" }, true)).toBe("stale_session"));
  it("classifies a revoked session as stale", () => expect(classifyAuthFailure({ message: "Session has been revoked" }, true)).toBe("stale_session"));
  it("classifies fetch failure as transient", () => expect(classifyAuthFailure({ name: "TypeError", message: "Failed to fetch" }, true)).toBe("transient_failure"));
  it("classifies timeout as transient", () => expect(classifyAuthFailure({ name: "TimeoutError" }, true)).toBe("transient_failure"));
  it("classifies a 5xx response as transient", () => expect(classifyAuthFailure({ status: 503 }, true)).toBe("transient_failure"));
  it("classifies an unknown destructive-risk error as transient", () => expect(classifyAuthFailure({ message: "Unexpected auth response" }, true)).toBe("transient_failure"));
  it("lets a structured stale code beat network wording", () => {
    expect(
      classifyAuthFailure(
        { code: "refresh_token_not_found", message: "Network connection failed" },
        true,
      ),
    ).toBe("stale_session");
  });
  it("keeps a real server error transient", () => {
    expect(
      classifyAuthFailure(
        { code: "refresh_token_not_found", status: 503 },
        true,
      ),
    ).toBe("transient_failure");
  });
  it("maps a thrown getUser network error to a temporary state", () => {
    const thrownByGetUser = new TypeError("Failed to fetch");
    expect(classifyUserLookupFailure(thrownByGetUser)).toBe("temporarily_unavailable");
  });
});

describe("recovery auth-event provenance", () => {
  it("accepts PASSWORD_RECOVERY", () => {
    expect(isConfirmedRecoveryAuthEvent("PASSWORD_RECOVERY")).toBe(true);
  });
  it("rejects SIGNED_IN", () => {
    expect(isConfirmedRecoveryAuthEvent("SIGNED_IN")).toBe(false);
  });
  it("rejects INITIAL_SESSION", () => {
    expect(isConfirmedRecoveryAuthEvent("INITIAL_SESSION")).toBe(false);
  });
  it("rejects TOKEN_REFRESHED", () => {
    expect(isConfirmedRecoveryAuthEvent("TOKEN_REFRESHED")).toBe(false);
  });
  it("rejects USER_UPDATED", () => {
    expect(isConfirmedRecoveryAuthEvent("USER_UPDATED")).toBe(false);
  });
  it("rejects SIGNED_OUT", () => {
    expect(isConfirmedRecoveryAuthEvent("SIGNED_OUT")).toBe(false);
  });
  it("rejects an arbitrary event", () => {
    expect(isConfirmedRecoveryAuthEvent("RECOVERY_LOOKING_EVENT")).toBe(false);
  });
  it("does not treat type=recovery as provenance", () => {
    expect(isConfirmedRecoveryAuthEvent("type=recovery")).toBe(false);
  });
  it("does not treat an access_token key as provenance", () => {
    expect(isConfirmedRecoveryAuthEvent("access_token")).toBe(false);
  });
});

describe("recovery retry and Strict Mode attempts", () => {
  it("allows retry_exchange to request another exchange", () => {
    expect(getRecoveryRetryOperation("retry_exchange")).toBe("exchange");
  });
  it("keeps retry_marker_binding from requesting a code exchange", () => {
    expect(getRecoveryRetryOperation("retry_marker_binding")).toBe("marker_binding");
    expect(getRecoveryRetryOperation("retry_marker_binding")).not.toBe("exchange");
  });
  it("maps no retry intent to no operation", () => {
    expect(getRecoveryRetryOperation("none")).toBeNull();
  });
  it("shares one Strict Mode attempt for the same recovery code", async () => {
    const attempts = new Map<string, Promise<string>>();
    let exchangeCount = 0;
    const createAttempt = async () => {
      exchangeCount += 1;
      return "complete";
    };

    const first = getOrCreateKeyedRecoveryAttempt(attempts, "same-code", createAttempt);
    const second = getOrCreateKeyedRecoveryAttempt(attempts, "same-code", createAttempt);

    expect(first).toBe(second);
    await expect(first).resolves.toBe("complete");
    expect(exchangeCount).toBe(1);
    expect(attempts.size).toBe(0);
  });
  it("never shares attempts between different recovery codes", async () => {
    const attempts = new Map<string, Promise<string>>();
    let exchangeCount = 0;
    const createAttempt = async () => {
      exchangeCount += 1;
      return "complete";
    };

    const first = getOrCreateKeyedRecoveryAttempt(attempts, "code-one", createAttempt);
    const second = getOrCreateKeyedRecoveryAttempt(attempts, "code-two", createAttempt);

    expect(first).not.toBe(second);
    await Promise.all([first, second]);
    expect(exchangeCount).toBe(2);
    expect(attempts.size).toBe(0);
  });
});

describe("browser recovery exchange contract", () => {
  it("disables automatic URL session detection", () => {
    expect(SUPABASE_BROWSER_AUTH_OPTIONS.detectSessionInUrl).toBe(false);
  });
  it("keeps the browser auth configuration immutable", () => {
    expect(Object.isFrozen(SUPABASE_BROWSER_AUTH_OPTIONS)).toBe(true);
  });
  it("preserves the installed SSR client's PKCE defaults", () => {
    expect(Object.keys(SUPABASE_BROWSER_AUTH_OPTIONS)).toEqual([
      "detectSessionInUrl",
    ]);
    expect(installedSsrBrowserClientSource).toMatch(/flowType:\s*"pkce"/);
    expect(SUPABASE_BROWSER_AUTH_OPTIONS).not.toHaveProperty("flowType");
    expect(SUPABASE_BROWSER_AUTH_OPTIONS).not.toHaveProperty("persistSession");
    expect(SUPABASE_BROWSER_AUTH_OPTIONS).not.toHaveProperty("autoRefreshToken");
  });
  it("overrides the installed browser URL-detection default", () => {
    expect(installedSsrBrowserClientSource).toContain(
      "detectSessionInUrl: options?.auth?.detectSessionInUrl ?? isBrowser()",
    );
    expect(browserClientSource).toContain(
      "auth: SUPABASE_BROWSER_AUTH_OPTIONS",
    );
    expect(browserClientSource).not.toContain("isSingleton: false");
  });
  it("keeps one explicit recovery-code exchange owner", () => {
    expect(
      resetPasswordSource.match(/\.exchangeCodeForSession\(/g) ?? [],
    ).toHaveLength(1);
    expect(resetPasswordSource).not.toContain("createBrowserClient");
  });
  it("keeps manual recovery exchange tied to PASSWORD_RECOVERY", () => {
    expect(installedAuthClientSource).toContain(
      "redirectType === 'recovery' ? 'PASSWORD_RECOVERY' : 'SIGNED_IN'",
    );
    expect(isConfirmedRecoveryAuthEvent("PASSWORD_RECOVERY")).toBe(true);
    expect(isConfirmedRecoveryAuthEvent("SIGNED_IN")).toBe(false);
  });
});

describe("password-update exception policy", () => {
  it("maps a thrown fetch failure to a retryable safe outcome", () => {
    const failure = new TypeError("Failed to fetch");
    expect(classifyPasswordUpdateException(failure)).toBe("retryable");
    expect(getPasswordUpdateExceptionMessage(failure)).toBe(
      "We could not reach the authentication service. Check your connection and try again.",
    );
  });
  it("maps a thrown timeout to a retryable safe outcome", () => {
    expect(
      classifyPasswordUpdateException({ name: "TimeoutError" }),
    ).toBe("retryable");
  });
  it("maps a thrown service error to a retryable safe outcome", () => {
    expect(classifyPasswordUpdateException({ status: 503 })).toBe("retryable");
  });
  it("maps an unknown thrown error to a generic safe outcome", () => {
    const raw = "Unexpected provider implementation detail";
    const message = getPasswordUpdateExceptionMessage(new Error(raw));
    expect(classifyPasswordUpdateException(new Error(raw))).toBe("unknown");
    expect(message).toBe("We could not update your password. Please try again.");
    expect(message).not.toContain(raw);
  });
  it("clears the marker only after successful password update", () => {
    expect(shouldClearRecoveryMarkerAfterPasswordUpdate("success")).toBe(true);
    expect(
      shouldClearRecoveryMarkerAfterPasswordUpdate("returned_error"),
    ).toBe(false);
    expect(
      shouldClearRecoveryMarkerAfterPasswordUpdate("thrown_error"),
    ).toBe(false);
    expect(resetPasswordSource).toContain(
      "shouldClearRecoveryMarkerAfterPasswordUpdate(updateOutcome)",
    );
  });
  it("catches thrown updateUser failures through the safe classifier", () => {
    expect(resetPasswordSource.match(/\.updateUser\(/g) ?? []).toHaveLength(1);
    expect(resetPasswordSource).toContain(
      "getPasswordUpdateExceptionMessage(updateException)",
    );
  });
});

describe("safe response metadata", () => {
  it("normalizes allowed login reasons", () => expect(normalizeLoginReason("session_expired")).toBe("session_expired"));
  it("rejects arbitrary login reasons", () => expect(normalizeLoginReason("raw backend error")).toBeNull());
  it("merges only cache headers without overwriting unrelated headers", () => {
    expect(
      mergePreservedResponseHeaders(
        { Location: "/login", "Content-Type": "application/json" },
        { "Cache-Control": "private, no-store", Expires: "0", Location: "/evil" },
      ),
    ).toEqual({
      Location: "/login",
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store",
      Expires: "0",
    });
  });
});

describe("auth-only destination restoration", () => {
  it("restores a safe deep link", () => {
    expect(getAuthOnlyRedirectDestination("/dashboard/transactions/123")).toBe("/dashboard/transactions/123");
  });
  it("falls back for an unsafe destination", () => {
    expect(getAuthOnlyRedirectDestination("https://evil.test/account")).toBe("/dashboard");
  });
});

describe("recovery marker validation", () => {
  const sessionHash = "a".repeat(64);
  const now = 1_800_000_000_000;

  it("accepts a valid marker before expiry", () => {
    const marker = createRecoveryMarker(sessionHash, now);
    expect(parseValidRecoveryMarker(JSON.stringify(marker), sessionHash, now + 1_000)).toEqual(marker);
  });
  it("rejects an expired marker", () => {
    const marker = createRecoveryMarker(sessionHash, now);
    expect(parseValidRecoveryMarker(JSON.stringify(marker), sessionHash, marker.expiresAt)).toBeNull();
  });
  it("rejects malformed marker JSON", () => {
    expect(parseValidRecoveryMarker("{not-json", sessionHash, now)).toBeNull();
  });
  it("rejects an unsupported marker version", () => {
    const marker = { ...createRecoveryMarker(sessionHash, now), version: 2 };
    expect(parseValidRecoveryMarker(JSON.stringify(marker), sessionHash, now)).toBeNull();
  });
  it("rejects a session-hash mismatch", () => {
    const marker = createRecoveryMarker(sessionHash, now);
    expect(parseValidRecoveryMarker(JSON.stringify(marker), "b".repeat(64), now)).toBeNull();
  });
  it("rejects a marker with an excessive future expiry", () => {
    const marker = { ...createRecoveryMarker(sessionHash, now), expiresAt: now + 60 * 60 * 1000 };
    expect(parseValidRecoveryMarker(JSON.stringify(marker), sessionHash, now)).toBeNull();
  });
});

describe("recovery error-link classification", () => {
  it("maps an expired recovery error to invalid", () => {
    expect(classifyRecoveryLinkError({ errorCode: "otp_expired" })).toBe("invalid");
  });
  it("maps a temporary server error to temporary", () => {
    expect(classifyRecoveryLinkError({ error: "server_error", errorDescription: "Service temporarily unavailable" })).toBe("temporarily_unavailable");
  });
  it("lets access_denied beat connection wording", () => {
    expect(
      classifyRecoveryLinkError({
        error: "access_denied",
        errorDescription: "User denied the network connection",
      }),
    ).toBe("invalid");
  });
  it("lets an expired indicator beat temporary wording", () => {
    expect(
      classifyRecoveryLinkError({
        errorCode: "otp_expired",
        errorDescription: "Service temporarily unavailable",
      }),
    ).toBe("invalid");
  });
  it("keeps a real 5xx recovery error temporary", () => {
    expect(
      classifyRecoveryLinkError({
        error: "server_error",
        errorDescription: "HTTP 503 service unavailable",
      }),
    ).toBe("temporarily_unavailable");
  });
  it("maps an unknown raw description without returning it", () => {
    const raw = "Internal provider details that must stay private";
    const result = classifyRecoveryLinkError({ errorDescription: raw });
    expect(result).toBe("invalid");
    expect(result).not.toBe(raw);
  });
  it("returns null when no error indicator exists", () => {
    expect(classifyRecoveryLinkError({})).toBeNull();
  });
});
