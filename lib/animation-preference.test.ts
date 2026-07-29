import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  ANIMATION_BOOTSTRAP_SCRIPT,
  ANIMATION_COOKIE_KEY,
  ANIMATION_MODE_CHANGE_EVENT,
  ANIMATION_STORAGE_KEY,
  applyAnimationMode,
  getAnimationDurationScale,
  getAnimationPlaybackRate,
  getDocumentAnimationMode,
  getStoredAnimationMode,
  normalizeAnimationMode,
  scaleAnimationMilliseconds,
  scaleAnimationSeconds,
} from "./animation-preference";

const animationCssSource = readFileSync(
  new URL("../app/animation-preference.css", import.meta.url),
  "utf8",
);

const motionProviderSource = readFileSync(
  new URL("../components/motion/MotionProvider.tsx", import.meta.url),
  "utf8",
);

const routeMotionProviderSource = readFileSync(
  new URL("../components/motion/RouteMotionProvider.tsx", import.meta.url),
  "utf8",
);

const motionConfigSource = readFileSync(
  new URL("../components/motion/animation-config.ts", import.meta.url),
  "utf8",
);

const dashboardContentSource = readFileSync(
  new URL("../components/layout/DashboardContentScope.tsx", import.meta.url),
  "utf8",
);

const performanceModeSource = readFileSync(
  new URL(
    "../components/performance/NoAnimationPerformanceMode.tsx",
    import.meta.url,
  ),
  "utf8",
);

const standardPerformanceSource = readFileSync(
  new URL(
    "../components/performance/StandardMotionPerformance.tsx",
    import.meta.url,
  ),
  "utf8",
);

const acceleratedPerformanceSource = readFileSync(
  new URL(
    "../components/performance/AcceleratedMotionPerformance.tsx",
    import.meta.url,
  ),
  "utf8",
);

const pwaRuntimeSource = readFileSync(
  new URL("../app/pwa-register.tsx", import.meta.url),
  "utf8",
);

const routeLoadingSource = readFileSync(
  new URL(
    "../components/loading/AnimationAwareDashboardRouteLoading.tsx",
    import.meta.url,
  ),
  "utf8",
);

describe("animation preference contracts", () => {
  it("accepts only standard, fast, and none", () => {
    expect(normalizeAnimationMode("standard")).toBe("standard");
    expect(normalizeAnimationMode("fast")).toBe("fast");
    expect(normalizeAnimationMode("none")).toBe("none");
    expect(normalizeAnimationMode("slow")).toBe("standard");
    expect(normalizeAnimationMode(null)).toBe("standard");
  });

  it("keeps default playback, accelerates fast, and resolves none instantly", () => {
    expect(getAnimationDurationScale("standard")).toBe(1);
    expect(getAnimationPlaybackRate("standard")).toBe(1);

    expect(getAnimationDurationScale("fast")).toBe(0.58);
    expect(getAnimationPlaybackRate("fast")).toBe(1.7);

    expect(getAnimationDurationScale("none")).toBe(0);
    expect(getAnimationPlaybackRate("none")).toBe(1);
  });

  it("scales authored durations consistently", () => {
    expect(scaleAnimationSeconds(1, "standard")).toBe(1);
    expect(scaleAnimationSeconds(1, "fast")).toBe(0.58);
    expect(scaleAnimationSeconds(1, "none")).toBe(0);

    expect(scaleAnimationMilliseconds(220, "standard")).toBe(220);
    expect(scaleAnimationMilliseconds(220, "fast")).toBe(128);
    expect(scaleAnimationMilliseconds(220, "none")).toBe(0);
  });

  it("uses one shared storage, cookie, and broadcast contract", () => {
    expect(ANIMATION_STORAGE_KEY).toBe("jamal-animation-mode");
    expect(ANIMATION_COOKIE_KEY).toBe(ANIMATION_STORAGE_KEY);
    expect(ANIMATION_MODE_CHANGE_EVENT).toBe("jamal-animation-mode-change");

    expect(ANIMATION_BOOTSTRAP_SCRIPT).toContain(
      "window.localStorage.getItem(key)",
    );
    expect(ANIMATION_BOOTSTRAP_SCRIPT).toContain(
      "root.dataset.animationMode = mode",
    );
    expect(ANIMATION_BOOTSTRAP_SCRIPT).toContain(
      "document.cookie = key +",
    );
  });

  it("is safe during server rendering", () => {
    expect(getDocumentAnimationMode()).toBe("standard");
    expect(getStoredAnimationMode()).toBe("standard");
    expect(applyAnimationMode("fast", { persist: false })).toBe("fast");
  });

  it("keeps the three CSS modes isolated", () => {
    expect(animationCssSource).toContain(
      'html[data-animation-mode="standard"]',
    );
    expect(animationCssSource).toContain(
      'data-standard-motion-tier="balanced"',
    );
    expect(animationCssSource).toContain('data-standard-motion-tier="lite"');
    expect(animationCssSource).toContain("jf-standard-route-loader-slide");
    expect(animationCssSource).toContain(
      'html[data-animation-mode="fast"] {',
    );
    expect(animationCssSource).toContain("--motion-duration-base: 118ms;");
    expect(animationCssSource).toContain(
      'html[data-animation-mode="none"] *',
    );
    expect(animationCssSource).toContain("animation: none !important;");
    expect(animationCssSource).toContain("transition: none !important;");
    expect(animationCssSource).not.toContain(
      'html[data-animation-mode="standard"] * {',
    );
  });

  it("keeps accelerated-mode tuning detached from standard", () => {
    expect(motionProviderSource).toContain(
      'if (activeMode !== "fast") return;',
    );
    expect(motionProviderSource).toContain(
      'if (mode === "fast") attachRuntimeTuning();',
    );
    expect(motionProviderSource).toContain("else detachRuntimeTuning();");
    expect(motionProviderSource).toContain(
      "target.getAnimations({ subtree })",
    );
    expect(motionProviderSource).toContain(
      'previousMode === "none" || mode === "none"',
    );
    expect(acceleratedPerformanceSource).toContain(
      'if (activeMode === "fast")',
    );
    expect(acceleratedPerformanceSource).toContain(
      'if (activeMode === "none")',
    );
    expect(acceleratedPerformanceSource).not.toContain(
      'if (activeMode === "standard") attachFastRuntime()',
    );
  });

  it("reveals standard pages without waiting for window load or fonts", () => {
    expect(dashboardContentSource).toContain("window.requestAnimationFrame");
    expect(dashboardContentSource).not.toContain("document.fonts?.ready");
    expect(dashboardContentSource).not.toContain(
      'window.addEventListener("load"',
    );
    expect(animationCssSource).toContain(
      '.jf-dashboard-content-frame[data-jf-initial-reveal="pending"]',
    );
    expect(animationCssSource).toContain("visibility: visible !important;");
  });

  it("keeps standard motion smooth while shortening long queues", () => {
    expect(motionConfigSource).toContain(
      "standardSeconds(0.21, 0.28)",
    );
    expect(motionConfigSource).toContain(
      "standardSeconds(0.012, 0.035)",
    );
    expect(motionConfigSource).toContain(
      "standardMilliseconds(540, 850)",
    );
  });

  it("keeps the adaptive standard controller independent", () => {
    expect(motionProviderSource).toContain("<StandardMotionPerformance />");
    expect(standardPerformanceSource).toContain("standardMotionTier");
    expect(standardPerformanceSource).toContain("connection?.saveData");
    expect(standardPerformanceSource).toContain("runtimeNavigator.deviceMemory");
    expect(standardPerformanceSource).toContain("runtimeNavigator.hardwareConcurrency");
    expect(standardPerformanceSource).toContain(
      "root.dataset.standardMotionTier = resolveStandardMotionTier()",
    );
    expect(standardPerformanceSource).toContain(
      "root.dataset.standardPageVisibility = document.visibilityState",
    );
    expect(standardPerformanceSource).toContain(
      "window.addEventListener(ANIMATION_MODE_CHANGE_EVENT",
    );
    expect(acceleratedPerformanceSource).not.toContain("standardMotionTier");
  });

  it("keeps the public landing route off the full Framer Motion runtime", () => {
    expect(routeMotionProviderSource).toContain('if (pathname === "/")');
    expect(routeMotionProviderSource).toContain("<StandardMotionPerformance />");
    expect(routeMotionProviderSource).toContain(
      '() => import("@/components/motion/MotionProvider")',
    );
  });

  it("adapts fast motion and pauses non-visible continuous work", () => {
    expect(acceleratedPerformanceSource).toContain("fastMotionTier");
    expect(acceleratedPerformanceSource).toContain(
      "connection?.saveData === true",
    );
    expect(acceleratedPerformanceSource).toContain(
      "runtimeNavigator.deviceMemory",
    );
    expect(acceleratedPerformanceSource).toContain("IntersectionObserver");
    expect(acceleratedPerformanceSource).toContain("requestIdleCallback");
    expect(acceleratedPerformanceSource).toContain("CONTINUOUS_SVG_SELECTOR");
    expect(acceleratedPerformanceSource).toContain("animation.pause()");
    expect(acceleratedPerformanceSource).toContain("animation.play()");
    expect(animationCssSource).toContain('data-fast-motion-tier="balanced"');
    expect(animationCssSource).toContain('data-fast-motion-tier="lite"');
    expect(animationCssSource).toContain("jf-fast-route-loader-slide");
    expect(animationCssSource).not.toContain("jf-fast-route-loader-pulse");
  });

  it("keeps none static with no reveal or compositor reservations", () => {
    expect(acceleratedPerformanceSource).toContain("resolveNoAnimationState");
    expect(acceleratedPerformanceSource).toContain(
      'root.dataset.noneMotionRuntime = "static"',
    );
    expect(animationCssSource).toContain("will-change: auto !important;");
    expect(animationCssSource).toContain("view-transition-name: none !important;");
    expect(animationCssSource).toContain("opacity: 1 !important;");
    expect(animationCssSource).toContain("transform: none !important;");
  });

  it("mounts accelerated performance globally without changing UI", () => {
    expect(pwaRuntimeSource).toContain("const AcceleratedMotionPerformance = dynamic(");
    expect(pwaRuntimeSource).toContain(
      'import("@/components/performance/AcceleratedMotionPerformance")',
    );
    expect(pwaRuntimeSource).toContain("motionRuntimeReady");
    expect(pwaRuntimeSource).toContain("<AcceleratedMotionPerformance />");
    expect(pwaRuntimeSource).toContain('installRuntime === "android"');
    expect(pwaRuntimeSource).toContain('installRuntime === "windows"');
  });

  it("bounds automatic preloading and keeps standard intent-only", () => {
    expect(performanceModeSource).toContain("connection?.saveData === true");
    expect(performanceModeSource).toContain("runtimeNavigator.deviceMemory");
    expect(performanceModeSource).toContain("routeLimit:");
    expect(performanceModeSource).toContain("attachIntentListeners");
    expect(performanceModeSource).toContain("detachIntentListeners");
    expect(performanceModeSource).toContain(
      'mode === "none" ? (moderateNetwork ? 2 : 5)',
    );
    expect(performanceModeSource).toContain(
      "if (!isPerformanceAnimationMode(mode)) return;",
    );
  });

  it("keeps loading behavior distinct for all three modes", () => {
    expect(routeLoadingSource).toContain('animationMode === "none"');
    expect(routeLoadingSource).toContain('animationMode === "fast"');
    expect(routeLoadingSource).toContain('animationMode === "standard"');
    expect(routeLoadingSource).toContain(
      'data-standard-animation-route-loading="true"',
    );
  });
});
