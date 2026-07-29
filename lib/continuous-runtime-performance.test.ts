import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());

function read(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

describe("continuous runtime performance contracts", () => {
  it("loads the desktop overscroll runtime only through the deferred gate", () => {
    const rootLayout = read("app/layout.tsx");
    const gate = read(
      "components/motion/DeferredDesktopOverscrollBounce.tsx",
    );

    expect(rootLayout).toContain("DeferredDesktopOverscrollBounce");
    expect(rootLayout).not.toContain(
      'from "@/components/motion/DesktopOverscrollBounce"',
    );
    expect(gate).toContain("requestIdleCallback");
    expect(gate).toContain("(any-hover: hover) and (any-pointer: fine)");
    expect(gate).toContain("prefers-reduced-motion: reduce");
  });

  it("keeps finance form observers out of public, auth and admin routes", () => {
    const runtime = read("app/pwa-register.tsx");

    expect(runtime).toContain('pathname.startsWith("/dashboard")');
    expect(runtime).toContain('pathname.startsWith("/business")');
    expect(runtime).not.toContain('pathname !== "/"');
    expect(runtime).not.toContain('addEventListener("selectstart"');
    expect(runtime).not.toContain('addEventListener("contextmenu"');
  });

  it("defers service-worker registration until the browser is idle", () => {
    const runtime = read("app/pwa-register.tsx");

    expect(runtime).toContain("scheduleRegistration");
    expect(runtime).toContain("requestIdleCallback");
    expect(runtime).toContain('navigator.serviceWorker.register("/sw.js"');
    expect(runtime).toContain('document.readyState === "complete"');
    expect(runtime).toContain(
      "const hadController = Boolean(navigator.serviceWorker.controller)",
    );
    expect(runtime).toContain("if (!hadController) return");
  });

  it("preserves auth action presentation without global observers", () => {
    const authStyles = read("app/auth-action-runtime.css");

    for (const layout of [
      "app/login/layout.tsx",
      "app/onboarding/layout.tsx",
      "app/reset-password/layout.tsx",
    ]) {
      expect(read(layout)).toContain('import "../auth-action-runtime.css"');
    }

    expect(authStyles).toContain(".auth-primary-action");
    expect(authStyles).toContain("--jf-auth-action-width: 88%");
    expect(authStyles).toContain("--jf-auth-action-radius: 1.3rem");
  });
});
