import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("canonical Command Center authentication", () => {
  it("uses /commandcenter as the single entry and retires split Control Plane routes", () => {
    const proxy = read("proxy.ts");

    expect(proxy).toContain('pathname === "/commandcenter"');
    expect(proxy).toContain('pathname === "/control-login"');
    expect(proxy).toContain('pathname === "/control-invite"');
    expect(proxy).toContain("isRetiredControlPlanePath");
    expect(proxy).toContain("NextResponse.redirect(commandCenterDestination(request))");
    expect(proxy).not.toContain("updateControlPlaneSession");
  });

  it("authenticates on the dedicated screen with the authorized JALVORO Supabase user", () => {
    const login = read("components/admin/CommandCenterLogin.tsx");
    const page = read("app/commandcenter/page.tsx");

    expect(login).toContain('from "@/lib/supabase/client"');
    expect(login).toContain("auth.signInWithPassword");
    expect(login).toContain('rpc("get_platform_admin_snapshot")');
    expect(login).toContain('router.replace("/commandcenter")');
    expect(login).not.toContain("createControlPlaneBrowserClient");
    expect(login).not.toContain("mfa.enroll");
    expect(login).not.toContain("mfa.verify");

    expect(page).toContain("<CommandCenterLogin />");
    expect(page).toContain("get_command_center_navigation");
    expect(page).toContain("return AdminPage(props)");
    expect(page).not.toContain("createControlPlaneServerClient");
  });

  it("keeps Command Center pages private and canonicalizes legacy Admin navigation", () => {
    const nextConfig = read("next.config.ts");
    const experience = read("lib/admin/command-center-experience.ts");
    const workflow = read(".github/workflows/command-center-exact-head.yml");

    expect(nextConfig).toContain(
      '{ source: "/commandcenter/:path*", headers: privateNoStoreHeaders }',
    );
    expect(experience).toContain(
      'export const COMMAND_CENTER_BASE_PATH = "/commandcenter"',
    );
    expect(experience).toContain("canonicalCommandCenterHref");
    expect(workflow).toContain('"app/commandcenter/**"');
    expect(workflow).toContain('"proxy.ts"');
  });

  it("exposes the existing masterpiece modules under the canonical route", () => {
    const layout = read("app/commandcenter/layout.tsx");
    const globalOperations = read(
      "app/commandcenter/global-operations/page.tsx",
    );
    const organizations = read("app/commandcenter/organizations/page.tsx");
    const iconSystem = read("app/commandcenter/icon-system/page.tsx");

    expect(layout).toContain("AdminCommandCenterShell");
    expect(layout).toContain("AdminCommandCenterOperatorAssist");
    expect(globalOperations).toContain("AdminGlobalOperationsPage");
    expect(organizations).toContain("AdminOrganizationsPage");
    expect(iconSystem).toContain("AdminIconSystemPage");
  });
});
