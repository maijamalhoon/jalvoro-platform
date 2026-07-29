import {
  normalizeTelemetryRoute,
  type TelemetryFeature,
  type TelemetryMetricName,
  type TelemetryMetricRating,
  type TelemetryNavigationType,
  type TelemetryResult,
} from "./schema";

const TELEMETRY_ENDPOINT = "/api/telemetry";
const TELEMETRY_SESSION_KEY = "jalvoro-telemetry-session-v1";
const PERFORMANCE_SAMPLE_RATE = 0.1;
const LONG_TASK_MINIMUM_MS = 200;
const MAX_CLIENT_PAYLOAD_BYTES = 4 * 1024;

let initialized = false;
let performanceSampled = false;
let latestLcp = 0;
let cumulativeLayoutShift = 0;
let longestInteraction = 0;
let finalMetricsFlushed = false;

type TelemetryClientPayload = {
  sessionId: string;
  eventName:
    | "page_view"
    | "page_navigation"
    | "web_vital"
    | "long_task"
    | "feature_used"
    | "operation_started"
    | "operation_completed"
    | "operation_failed";
  route: string;
  feature?: TelemetryFeature;
  result?: TelemetryResult;
  navigationType?: TelemetryNavigationType;
  metricName?: TelemetryMetricName;
  metricValue?: number;
  metricRating?: TelemetryMetricRating;
};

type IdleWindow = Window & {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout: number },
  ) => number;
};

type PrivacyAwareNavigator = Navigator & {
  globalPrivacyControl?: boolean;
};

type LayoutShiftEntry = PerformanceEntry & {
  value: number;
  hadRecentInput: boolean;
};

type EventTimingEntry = PerformanceEntry & {
  duration: number;
  interactionId?: number;
};

function telemetryEnabled() {
  return process.env.NEXT_PUBLIC_TELEMETRY_ENABLED === "true";
}

function privacySignalsAllowTelemetry() {
  if (typeof navigator === "undefined") return false;

  const privacyNavigator = navigator as PrivacyAwareNavigator;
  return (
    privacyNavigator.globalPrivacyControl !== true &&
    navigator.doNotTrack !== "1"
  );
}

function isProtectedProductRoute(route: string) {
  return (
    route === "/onboarding" ||
    route.startsWith("/dashboard") ||
    route.startsWith("/business")
  );
}

function currentRoute() {
  return normalizeTelemetryRoute(window.location.pathname);
}

function getSessionId() {
  try {
    const existing = window.sessionStorage.getItem(TELEMETRY_SESSION_KEY);
    if (existing) return existing;

    const created = window.crypto.randomUUID();
    window.sessionStorage.setItem(TELEMETRY_SESSION_KEY, created);
    return created;
  } catch {
    return window.crypto.randomUUID();
  }
}

function scheduleTelemetryWork(work: () => void) {
  const idleWindow = window as IdleWindow;

  if (idleWindow.requestIdleCallback) {
    idleWindow.requestIdleCallback(work, { timeout: 1500 });
    return;
  }

  window.setTimeout(work, 0);
}

function transmit(payload: TelemetryClientPayload) {
  if (
    !telemetryEnabled() ||
    !privacySignalsAllowTelemetry() ||
    !isProtectedProductRoute(payload.route)
  ) {
    return;
  }

  scheduleTelemetryWork(() => {
    try {
      const body = JSON.stringify(payload);
      if (new TextEncoder().encode(body).byteLength > MAX_CLIENT_PAYLOAD_BYTES) {
        return;
      }

      const blob = new Blob([body], { type: "application/json" });

      if (navigator.sendBeacon?.(TELEMETRY_ENDPOINT, blob)) return;

      void fetch(TELEMETRY_ENDPOINT, {
        method: "POST",
        body,
        credentials: "same-origin",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
      }).catch(() => undefined);
    } catch {}
  });
}

function send(
  payload: Omit<TelemetryClientPayload, "sessionId" | "route"> & {
    route?: string;
  },
) {
  const route = normalizeTelemetryRoute(payload.route ?? currentRoute());
  if (!route) return;

  transmit({
    ...payload,
    route,
    sessionId: getSessionId(),
  });
}

function metricRating(
  name: TelemetryMetricName,
  value: number,
): TelemetryMetricRating {
  if (name === "TTFB") {
    return value <= 800 ? "good" : value <= 1800 ? "needs-improvement" : "poor";
  }

  if (name === "FCP") {
    return value <= 1800 ? "good" : value <= 3000 ? "needs-improvement" : "poor";
  }

  if (name === "LCP") {
    return value <= 2500 ? "good" : value <= 4000 ? "needs-improvement" : "poor";
  }

  if (name === "CLS") {
    return value <= 0.1 ? "good" : value <= 0.25 ? "needs-improvement" : "poor";
  }

  if (name === "INP") {
    return value <= 200 ? "good" : value <= 500 ? "needs-improvement" : "poor";
  }

  return "unrated";
}

function roundMetric(name: TelemetryMetricName, value: number) {
  const precision = name === "CLS" ? 10000 : 100;
  return Math.round(value * precision) / precision;
}

function reportMetric(name: TelemetryMetricName, value: number) {
  if (!Number.isFinite(value) || value < 0) return;

  const rounded = roundMetric(name, value);
  send({
    eventName: name === "LONG_TASK" ? "long_task" : "web_vital",
    metricName: name,
    metricValue: rounded,
    metricRating: metricRating(name, rounded),
  });
}

function reportNavigationMetrics() {
  const navigation = performance.getEntriesByType(
    "navigation",
  )[0] as PerformanceNavigationTiming | undefined;

  if (navigation) {
    reportMetric("TTFB", navigation.responseStart);
    if (navigation.loadEventEnd > 0) reportMetric("LOAD", navigation.loadEventEnd);
  }

  const firstContentfulPaint = performance.getEntriesByName(
    "first-contentful-paint",
  )[0];
  if (firstContentfulPaint) reportMetric("FCP", firstContentfulPaint.startTime);
}

function installPerformanceObservers() {
  const supported = PerformanceObserver.supportedEntryTypes ?? [];

  if (supported.includes("largest-contentful-paint")) {
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries.at(-1);
        if (lastEntry) latestLcp = lastEntry.startTime;
      });
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
    } catch {}
  }

  if (supported.includes("layout-shift")) {
    try {
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as LayoutShiftEntry[]) {
          if (!entry.hadRecentInput) cumulativeLayoutShift += entry.value;
        }
      });
      clsObserver.observe({ type: "layout-shift", buffered: true });
    } catch {}
  }

  if (supported.includes("event")) {
    try {
      const inpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as EventTimingEntry[]) {
          if ((entry.interactionId ?? 0) > 0) {
            longestInteraction = Math.max(longestInteraction, entry.duration);
          }
        }
      });
      inpObserver.observe({ type: "event", buffered: true });
    } catch {}
  }

  if (supported.includes("longtask")) {
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration >= LONG_TASK_MINIMUM_MS) {
            reportMetric("LONG_TASK", entry.duration);
          }
        }
      });
      longTaskObserver.observe({ type: "longtask", buffered: true });
    } catch {}
  }
}

function flushFinalMetrics() {
  if (finalMetricsFlushed || !performanceSampled) return;
  finalMetricsFlushed = true;

  if (latestLcp > 0) reportMetric("LCP", latestLcp);
  reportMetric("CLS", cumulativeLayoutShift);
  if (longestInteraction > 0) reportMetric("INP", longestInteraction);
}

function startTelemetryAfterLoad() {
  const route = currentRoute();
  if (!route || !isProtectedProductRoute(route)) return;

  send({ eventName: "page_view", route });

  performanceSampled = Math.random() < PERFORMANCE_SAMPLE_RATE;
  if (!performanceSampled) return;

  reportNavigationMetrics();
  installPerformanceObservers();

  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.visibilityState === "hidden") flushFinalMetrics();
    },
    { passive: true },
  );
  window.addEventListener("pagehide", flushFinalMetrics, { passive: true });
}

export function initializePrivacyTelemetry() {
  if (
    initialized ||
    typeof window === "undefined" ||
    !telemetryEnabled() ||
    !privacySignalsAllowTelemetry()
  ) {
    return;
  }
  initialized = true;

  queueMicrotask(() => {
    if (document.readyState === "complete") {
      startTelemetryAfterLoad();
      return;
    }

    window.addEventListener("load", startTelemetryAfterLoad, { once: true });
  });
}

export function reportTelemetryRouterTransition(
  url: string,
  navigationType: TelemetryNavigationType,
) {
  if (
    typeof window === "undefined" ||
    !telemetryEnabled() ||
    !privacySignalsAllowTelemetry()
  ) {
    return;
  }

  let route: string | null = null;
  try {
    route = normalizeTelemetryRoute(new URL(url, window.location.origin).pathname);
  } catch {
    route = normalizeTelemetryRoute(url);
  }

  if (!route || !isProtectedProductRoute(route)) return;

  send({
    eventName: "page_navigation",
    route,
    navigationType,
  });
}

export function trackTelemetryFeature(
  feature: TelemetryFeature,
  options: {
    eventName?:
      | "feature_used"
      | "operation_started"
      | "operation_completed"
      | "operation_failed";
    result?: TelemetryResult;
  } = {},
) {
  if (!privacySignalsAllowTelemetry()) return;

  send({
    eventName: options.eventName ?? "feature_used",
    feature,
    result: options.result,
  });
}
