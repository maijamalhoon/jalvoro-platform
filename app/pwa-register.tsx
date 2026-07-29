"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { APP_NAME } from "@/lib/brand";

// Keep route-irrelevant runtime authorities outside the initial page bundle.
const GlobalAccountAmountMaxAuthority = dynamic(
  () => import("@/components/forms/GlobalAccountAmountMaxAuthority"),
);
const GlobalFormActionAuthority = dynamic(
  () => import("@/components/forms/GlobalFormActionAuthority"),
);
const GlobalFormAuditAuthority = dynamic(
  () => import("@/components/forms/GlobalFormAuditAuthority"),
);
const GlobalFormDialogAuthority = dynamic(
  () => import("@/components/forms/GlobalFormDialogAuthority"),
);
const GlobalFormFieldAuthority = dynamic(
  () => import("@/components/forms/GlobalFormFieldAuthority"),
);
const AndroidAppManager = dynamic(
  () => import("@/components/pwa/AndroidAppManager"),
);
const AppUpdateManager = dynamic(
  () => import("@/components/pwa/AppUpdateManager"),
);
const WindowsAppManager = dynamic(
  () => import("@/components/pwa/WindowsAppManager"),
);
const AcceleratedMotionPerformance = dynamic(
  () => import("@/components/performance/AcceleratedMotionPerformance"),
);

declare global {
  interface Window {
    __jamalsFinancePwaRegistered?: boolean;
  }
}

function canUseServiceWorker() {
  if (!("serviceWorker" in navigator)) return false;

  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  return window.location.protocol === "https:" || isLocalhost;
}

function needsFinanceFormRuntime(pathname: string) {
  return pathname.startsWith("/dashboard") || pathname.startsWith("/business");
}

export default function PWARegister() {
  const pathname = usePathname();
  const [motionRuntimeReady, setMotionRuntimeReady] = useState(false);
  const [installRuntime, setInstallRuntime] = useState<
    "android" | "windows" | "other" | null
  >(null);
  const needsFormRuntime = needsFinanceFormRuntime(pathname);

  useEffect(() => {
    let cancelled = false;
    let idleHandle: number | null = null;
    let fallbackHandle: number | null = null;

    const enableDeferredRuntime = () => {
      idleHandle = null;
      fallbackHandle = null;
      if (!cancelled) setMotionRuntimeReady(true);
    };

    const scheduleDeferredRuntime = () => {
      if (typeof window.requestIdleCallback === "function") {
        idleHandle = window.requestIdleCallback(enableDeferredRuntime, {
          timeout: 1_500,
        });
        return;
      }

      fallbackHandle = window.setTimeout(enableDeferredRuntime, 250);
    };

    if (document.readyState === "complete") {
      scheduleDeferredRuntime();
    } else {
      window.addEventListener("load", scheduleDeferredRuntime, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", scheduleDeferredRuntime);
      if (idleHandle !== null && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleHandle);
      }
      if (fallbackHandle !== null) window.clearTimeout(fallbackHandle);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let delayHandle: number | null = null;
    let idleHandle: number | null = null;

    const resolveInstallRuntime = () => {
      idleHandle = null;
      if (cancelled) return;

      const navigatorWithData = window.navigator as Navigator & {
        userAgentData?: { platform?: string };
      };
      const platform =
        navigatorWithData.userAgentData?.platform ??
        window.navigator.userAgent;

      if (/Android/i.test(platform)) setInstallRuntime("android");
      else if (/Windows/i.test(platform)) setInstallRuntime("windows");
      else setInstallRuntime("other");
    };

    const scheduleInstallRuntime = () => {
      delayHandle = window.setTimeout(() => {
        delayHandle = null;
        if (typeof window.requestIdleCallback === "function") {
          idleHandle = window.requestIdleCallback(resolveInstallRuntime, {
            timeout: 4_000,
          });
        } else {
          resolveInstallRuntime();
        }
      }, 8_000);
    };

    if (document.readyState === "complete") scheduleInstallRuntime();
    else window.addEventListener("load", scheduleInstallRuntime, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener("load", scheduleInstallRuntime);
      if (delayHandle !== null) window.clearTimeout(delayHandle);
      if (
        idleHandle !== null &&
        typeof window.cancelIdleCallback === "function"
      ) {
        window.cancelIdleCallback(idleHandle);
      }
    };
  }, []);

  useEffect(() => {
    if (!canUseServiceWorker()) return;
    if (window.__jamalsFinancePwaRegistered) return;

    let cancelled = false;
    let refreshing = false;
    let idleHandle: number | null = null;
    let fallbackHandle: number | null = null;
    const hadController = Boolean(navigator.serviceWorker.controller);

    const onControllerChange = () => {
      // A first-time install may claim this page. Reloading at that point can
      // erase in-progress signup or finance form input; only existing clients
      // need a reload when an updated worker takes control.
      if (!hadController) return;
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    const registerServiceWorker = async () => {
      idleHandle = null;
      fallbackHandle = null;
      if (cancelled || window.__jamalsFinancePwaRegistered) return;

      window.__jamalsFinancePwaRegistered = true;

      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              toast.info(`New ${APP_NAME} update is ready.`, {
                description: "Update to use the latest version.",
                action: {
                  label: "Update",
                  onClick: () => window.location.reload(),
                },
              });
            }
          });
        });

        navigator.serviceWorker.addEventListener(
          "controllerchange",
          onControllerChange,
        );
      } catch (error) {
        window.__jamalsFinancePwaRegistered = false;
        console.warn("PWA service worker registration failed:", error);
      }
    };

    const scheduleRegistration = () => {
      if (typeof window.requestIdleCallback === "function") {
        idleHandle = window.requestIdleCallback(
          () => void registerServiceWorker(),
          { timeout: 3_000 },
        );
        return;
      }

      fallbackHandle = window.setTimeout(
        () => void registerServiceWorker(),
        500,
      );
    };

    if (document.readyState === "complete") scheduleRegistration();
    else window.addEventListener("load", scheduleRegistration, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener("load", scheduleRegistration);
      if (idleHandle !== null && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleHandle);
      }
      if (fallbackHandle !== null) window.clearTimeout(fallbackHandle);
      navigator.serviceWorker?.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
    };
  }, []);

  return (
    <>
      {needsFormRuntime ? (
        <>
          <GlobalFormAuditAuthority />
          <GlobalFormDialogAuthority />
          <GlobalFormFieldAuthority />
          <GlobalFormActionAuthority />
          <GlobalAccountAmountMaxAuthority />
        </>
      ) : null}
      {motionRuntimeReady ? <AcceleratedMotionPerformance /> : null}
      {installRuntime === "android" ? <AndroidAppManager /> : null}
      {installRuntime === "windows" ? <WindowsAppManager /> : null}
      {installRuntime !== null ? <AppUpdateManager /> : null}
    </>
  );
}
