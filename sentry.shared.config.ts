import type { ErrorEvent } from "@sentry/core";

const SENSITIVE_KEY_PATTERN =
  /(account|amount|auth|balance|card|cookie|credit|cvv|debit|email|financial|iban|password|phone|secret|ssn|token|transaction|transfer|user)/i;

const SENSITIVE_STRING_PATTERNS = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  /\b(?:Bearer|Basic)\s+[A-Z0-9._~+/-]+=*/gi,
];
const ALLOWED_BREADCRUMB_CATEGORIES = new Set([
  "navigation",
  "sentry.transaction",
  "ui.lifecycle",
]);
const ALLOWED_BREADCRUMB_MESSAGES = new Set([
  "navigation",
  "online",
  "offline",
  "route transition started",
]);
const EXPECTED_ERROR_CODES = new Set([
  "authentication_required",
  "session_expired",
  "question_required",
  "invalid_origin",
  "cross_site_request_blocked",
  "payload_too_large",
  "unsupported_media_type",
]);

function scrubValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(scrubValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        SENSITIVE_KEY_PATTERN.test(key) ? "[Filtered]" : scrubValue(nestedValue),
      ]),
    );
  }

  if (typeof value === "string") {
    return SENSITIVE_STRING_PATTERNS.reduce(
      (scrubbedValue, pattern) => scrubbedValue.replace(pattern, "[Filtered]"),
      value,
    );
  }

  return value;
}

export const tracesSampleRate =
  process.env.NODE_ENV === "development" ? 1.0 : 0.1;
export const sentryRelease =
  process.env.NEXT_PUBLIC_SENTRY_RELEASE ??
  process.env.SENTRY_RELEASE ??
  process.env.VERCEL_GIT_COMMIT_SHA;
export const sentryEnvironment =
  process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ??
  process.env.VERCEL_ENV ??
  process.env.NODE_ENV;

export function beforeSend(event: ErrorEvent): ErrorEvent | null {
  const errorCode =
    typeof event.tags?.["jalvoro.error_code"] === "string"
      ? event.tags["jalvoro.error_code"]
      : null;
  if (errorCode && EXPECTED_ERROR_CODES.has(errorCode)) return null;

  delete event.user;

  if (event.request) {
    delete event.request.cookies;
    delete event.request.data;
    delete event.request.headers;
    delete event.request.query_string;
    delete event.request.url;
  }

  event.contexts = scrubValue(event.contexts) as ErrorEvent["contexts"];
  delete event.extra;
  event.tags = scrubValue(event.tags) as ErrorEvent["tags"];
  event.breadcrumbs = event.breadcrumbs
    ?.filter(
      (breadcrumb) =>
        typeof breadcrumb.category === "string" &&
        ALLOWED_BREADCRUMB_CATEGORIES.has(breadcrumb.category),
    )
    .map((breadcrumb) => {
      const normalizedMessage = breadcrumb.message?.trim().toLowerCase();
      return {
        ...breadcrumb,
        data: scrubValue(breadcrumb.data) as typeof breadcrumb.data,
        message:
          normalizedMessage && ALLOWED_BREADCRUMB_MESSAGES.has(normalizedMessage)
            ? normalizedMessage
            : undefined,
      };
    });

  return event;
}
