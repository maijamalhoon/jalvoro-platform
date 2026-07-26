// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
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
});
