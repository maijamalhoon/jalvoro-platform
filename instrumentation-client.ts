// This file configures client monitoring before React hydration.
// Keep all initialization lightweight and fail-open so observability can never
// block the finance experience.

import * as Sentry from "@sentry/nextjs";

import {
  initializePrivacyTelemetry,
  reportTelemetryRouterTransition,
} from "./lib/telemetry/client";
import {
  beforeSend,
  sentryEnvironment,
  sentryRelease,
  tracesSampleRate,
} from "./sentry.shared.config";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate,
  beforeSend,
  release: sentryRelease,
  environment: sentryEnvironment,
  enableLogs: process.env.NODE_ENV === "development",
  sendDefaultPii: false,
  integrations: [],
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
});

initializePrivacyTelemetry();

export function onRouterTransitionStart(
  url: string,
  navigationType: "push" | "replace" | "traverse",
) {
  Sentry.captureRouterTransitionStart(url, navigationType);
  reportTelemetryRouterTransition(url, navigationType);
}
