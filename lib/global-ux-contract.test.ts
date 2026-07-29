import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());

function read(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

const authStyles = [
  "auth-clean.css",
  "auth-clean-fixes.css",
  "auth-control-alignment.css",
  "auth-responsive-architecture.css",
  "auth-adornment-alignment-fix.css",
] as const;

const authRouteLayouts = [
  "app/login/layout.tsx",
  "app/onboarding/layout.tsx",
  "app/reset-password/layout.tsx",
  "app/individual/layout.tsx",
  "app/business/login/layout.tsx",
  "app/business/signup/layout.tsx",
  "app/business/invitations/register/layout.tsx",
  "app/auth/realm-setup/layout.tsx",
] as const;

describe("global UI/UX and performance contracts", () => {
  it("does not globally block native text selection or context menus", () => {
    const layout = read("app/layout.tsx");

    expect(layout).not.toContain("INTERACTION_LOCK_SCRIPT");
    expect(layout).not.toContain('addEventListener("contextmenu"');
    expect(layout).not.toContain('addEventListener("selectstart"');
  });

  it("keeps authentication CSS out of unrelated route bundles", () => {
    const rootLayout = read("app/layout.tsx");

    for (const style of authStyles) {
      expect(rootLayout).not.toContain(style);
    }

    for (const routeLayout of authRouteLayouts) {
      const source = read(routeLayout);
      for (const style of authStyles) {
        expect(source).toContain(style);
      }
    }
  });

  it("provides keyboard skip navigation for private workspace shells", () => {
    const dashboard = read("app/dashboard/layout.tsx");
    const adminShell = read(
      "components/admin/AdminCommandCenterShellClient.tsx",
    );

    expect(dashboard).toContain('href="#dashboard-main"');
    expect(dashboard).toContain('id="dashboard-main"');
    expect(dashboard).toContain("tabIndex={-1}");

    expect(adminShell).toContain('href="#admin-main"');
    expect(adminShell).toContain('id="admin-main"');
    expect(adminShell).toContain("tabIndex={-1}");
  });

  it("batches tooltip cleanup and preserves semantic SVG titles", () => {
    const layout = read("app/layout.tsx");

    expect(layout).toContain("window.requestAnimationFrame(flush)");
    expect(layout).toContain("pendingRoots");
    expect(layout).not.toContain('querySelectorAll("svg > title")');
    expect(layout).not.toContain("SVGTitleElement");
  });

  it("keeps the shared viewport foundation active", () => {
    const layout = read("app/layout.tsx");
    const styles = read("app/global-ux-foundation.css");

    expect(layout).toContain('import "./global-ux-foundation.css"');
    expect(styles).toContain("scrollbar-gutter: stable");
    expect(styles).toContain(":focus-visible");
    expect(styles).toContain("prefers-reduced-motion: reduce");
  });
});
