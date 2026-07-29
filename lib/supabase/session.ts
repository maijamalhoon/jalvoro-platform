export type AuthFailureKind =
  | "signed_out"
  | "stale_session"
  | "transient_failure";

export type SafeLoginReason =
  | "session_expired"
  | "auth_unavailable"
  | "callback_failed";

export type RecoveryLinkFailure = "invalid" | "temporarily_unavailable";
export type UserLookupFailure = "signed_out" | "temporarily_unavailable";
export type PasswordUpdateExceptionKind = "retryable" | "unknown";
export type PasswordUpdateOutcome =
  | "success"
  | "returned_error"
  | "thrown_error";
export type RecoveryRetryIntent =
  | "retry_exchange"
  | "retry_marker_binding"
  | "none";

export type RecoveryMarker = {
  version: 1;
  expiresAt: number;
  sessionHash: string;
};

type AuthErrorLike = {
  code?: unknown;
  status?: unknown;
  name?: unknown;
  message?: unknown;
};

const AUTH_LOOP_PATHS = ["/auth/callback", "/login", "/reset-password"];
const CACHE_HEADER_NAMES = ["cache-control", "expires", "pragma", "vary"];
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;
const STALE_ERROR_MARKERS = [
  "refresh_token_not_found",
  "invalid_refresh_token",
  "refresh_token_already_used",
  "session_not_found",
  "invalid refresh token",
  "refresh token not found",
  "refresh token already used",
  "already used refresh token",
  "session revoked",
  "session has been revoked",
];
const TRANSIENT_ERROR_MARKERS = [
  "fetch",
  "network",
  "timeout",
  "timed out",
  "temporarily unavailable",
  "service unavailable",
  "connection",
];
const RECOVERY_INVALID_MARKERS = [
  "access_denied",
  "otp_expired",
  "expired",
  "invalid",
  "malformed",
  "reused",
  "already_used",
  "denied",
];
const RECOVERY_MARKER_VERSION = 1;
export const RECOVERY_MARKER_TTL_MS = 10 * 60 * 1000;
const MAX_PATHNAME_DECODE_PASSES = 3;

function normalizedString(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function canonicalizeInternalPathname(pathname: string) {
  let current = pathname;

  for (let pass = 0; pass < MAX_PATHNAME_DECODE_PASSES; pass += 1) {
    if (CONTROL_CHARACTER_PATTERN.test(current) || current.includes("\\")) {
      return null;
    }

    let decoded: string;

    try {
      decoded = decodeURIComponent(current);
    } catch {
      return null;
    }

    current = decoded;
    if (!current.includes("%")) break;
  }

  if (
    CONTROL_CHARACTER_PATTERN.test(current) ||
    current.includes("\\") ||
    !current.startsWith("/") ||
    current.startsWith("//")
  ) {
    return null;
  }

  return current.toLowerCase().replace(/\/$/, "") || "/";
}

export function sanitizeInternalRedirect(
  value: string | null | undefined,
  fallback = "/dashboard",
) {
  if (
    !value ||
    CONTROL_CHARACTER_PATTERN.test(value) ||
    value.includes("\\") ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return fallback;
  }

  let parsed: URL;

  try {
    parsed = new URL(value, "https://jamals-finance.invalid");
  } catch {
    return fallback;
  }

  if (parsed.origin !== "https://jamals-finance.invalid") {
    return fallback;
  }

  const pathname = canonicalizeInternalPathname(parsed.pathname);
  if (!pathname) return fallback;

  const createsAuthLoop = AUTH_LOOP_PATHS.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  return createsAuthLoop ? fallback : value;
}

export function normalizeRecoveryCode(value: string | null | undefined) {
  if (!value || value.length > 2_048) return null;
  return /^[A-Za-z0-9._~-]+$/.test(value) ? value : null;
}

export function isSupabaseSessionCookie(name: string) {
  return /^sb-[a-z0-9_-]+-auth-token(?:\.\d+)?$/i.test(name);
}

export function isSupabaseCodeVerifierCookie(name: string) {
  return /^sb-[a-z0-9_-]+-auth-token-code-verifier$/i.test(name);
}

export function isSupabaseAuthCookie(name: string) {
  return isSupabaseSessionCookie(name) || isSupabaseCodeVerifierCookie(name);
}

export function hasSupabaseSessionCookies(
  cookies: Iterable<{ name: string }> | ArrayLike<{ name: string }>,
) {
  return Array.from(cookies).some(({ name }) => isSupabaseSessionCookie(name));
}

export function collectSupabaseSessionCookieNames(
  ...cookieCollections: Array<
    Iterable<{ name: string }> | ArrayLike<{ name: string }>
  >
) {
  const names = new Set<string>();

  for (const cookies of cookieCollections) {
    for (const { name } of Array.from(cookies)) {
      if (isSupabaseSessionCookie(name)) names.add(name);
    }
  }

  return [...names];
}

export function getAuthOnlyRedirectDestination(
  value: string | null | undefined,
) {
  return sanitizeInternalRedirect(value, "/dashboard");
}

export function classifyAuthFailure(
  error: unknown,
  hasAuthCookies: boolean,
): AuthFailureKind {
  if (!error) {
    return hasAuthCookies ? "stale_session" : "signed_out";
  }

  const details: AuthErrorLike =
    typeof error === "object" && error !== null ? error : { message: error };

  const code = normalizedString(details.code);
  const name = normalizedString(details.name);
  const message = normalizedString(details.message);
  const combined = `${code} ${name} ${message}`;
  const status = typeof details.status === "number" ? details.status : undefined;

  if (status !== undefined && status >= 500) {
    return "transient_failure";
  }

  if (
    hasAuthCookies &&
    STALE_ERROR_MARKERS.some((marker) => combined.includes(marker))
  ) {
    return "stale_session";
  }

  if (TRANSIENT_ERROR_MARKERS.some((marker) => combined.includes(marker))) {
    return "transient_failure";
  }

  if (
    hasAuthCookies &&
    (status === 400 || status === 401 || status === 403)
  ) {
    return "stale_session";
  }

  if (!hasAuthCookies && (name.includes("sessionmissing") || code.includes("session_missing"))) {
    return "signed_out";
  }

  return "transient_failure";
}

export function classifyUserLookupFailure(error: unknown): UserLookupFailure {
  return classifyAuthFailure(error, false) === "transient_failure"
    ? "temporarily_unavailable"
    : "signed_out";
}

export function classifyPasswordUpdateException(
  error: unknown,
): PasswordUpdateExceptionKind {
  const details: AuthErrorLike =
    typeof error === "object" && error !== null ? error : { message: error };
  const status = typeof details.status === "number" ? details.status : undefined;
  const combined = [details.code, details.name, details.message]
    .map(normalizedString)
    .join(" ");

  return (status !== undefined && status >= 500) ||
    TRANSIENT_ERROR_MARKERS.some((marker) => combined.includes(marker))
    ? "retryable"
    : "unknown";
}

export function getPasswordUpdateExceptionMessage(error: unknown) {
  return classifyPasswordUpdateException(error) === "retryable"
    ? "We could not reach the authentication service. Check your connection and try again."
    : "We could not update your password. Please try again.";
}

export function shouldClearRecoveryMarkerAfterPasswordUpdate(
  outcome: PasswordUpdateOutcome,
) {
  return outcome === "success";
}

export function normalizeLoginReason(
  value: string | null | undefined,
): SafeLoginReason | null {
  return value === "session_expired" ||
    value === "auth_unavailable" ||
    value === "callback_failed"
    ? value
    : null;
}

export function createRecoveryMarker(
  sessionHash: string,
  now = Date.now(),
): RecoveryMarker {
  return {
    version: RECOVERY_MARKER_VERSION,
    expiresAt: now + RECOVERY_MARKER_TTL_MS,
    sessionHash,
  };
}

export function isConfirmedRecoveryAuthEvent(event: unknown) {
  return event === "PASSWORD_RECOVERY";
}

export function getRecoveryRetryOperation(intent: RecoveryRetryIntent) {
  if (intent === "retry_exchange") return "exchange" as const;
  if (intent === "retry_marker_binding") return "marker_binding" as const;
  return null;
}

export function getOrCreateKeyedRecoveryAttempt<T>(
  attempts: Map<string, Promise<T>>,
  code: string,
  createAttempt: () => Promise<T>,
) {
  const existing = attempts.get(code);
  if (existing) return existing;

  const attempt = Promise.resolve().then(createAttempt);
  attempts.set(code, attempt);

  const cleanup = () => {
    if (attempts.get(code) === attempt) attempts.delete(code);
  };
  void attempt.then(cleanup, cleanup);

  return attempt;
}

export function parseValidRecoveryMarker(
  rawMarker: string | null | undefined,
  currentSessionHash: string,
  now = Date.now(),
): RecoveryMarker | null {
  if (!rawMarker || !currentSessionHash) return null;

  let parsed: unknown;

  try {
    parsed = JSON.parse(rawMarker);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;

  const marker = parsed as Record<string, unknown>;
  if (
    marker.version !== RECOVERY_MARKER_VERSION ||
    typeof marker.expiresAt !== "number" ||
    !Number.isFinite(marker.expiresAt) ||
    marker.expiresAt <= now ||
    marker.expiresAt > now + RECOVERY_MARKER_TTL_MS ||
    typeof marker.sessionHash !== "string" ||
    marker.sessionHash.length < 32 ||
    marker.sessionHash !== currentSessionHash
  ) {
    return null;
  }

  return marker as RecoveryMarker;
}

export function classifyRecoveryLinkError(input: {
  error?: string | null;
  errorCode?: string | null;
  errorDescription?: string | null;
}): RecoveryLinkFailure | null {
  const values = [input.error, input.errorCode, input.errorDescription].filter(
    (value): value is string => Boolean(value),
  );
  if (values.length === 0) return null;

  const normalized = values.join(" ").toLowerCase();
  if (RECOVERY_INVALID_MARKERS.some((marker) => normalized.includes(marker))) {
    return "invalid";
  }

  return TRANSIENT_ERROR_MARKERS.some((marker) => normalized.includes(marker)) ||
    /(?:^|\D)5\d\d(?:\D|$)/.test(normalized) ||
    normalized.includes("server_error")
    ? "temporarily_unavailable"
    : "invalid";
}

export function mergePreservedResponseHeaders(
  existing: Record<string, string>,
  supplied: Record<string, string>,
) {
  const merged = { ...existing };

  for (const [name, value] of Object.entries(supplied)) {
    if (CACHE_HEADER_NAMES.includes(name.toLowerCase())) {
      merged[name] = value;
    }
  }

  return merged;
}
