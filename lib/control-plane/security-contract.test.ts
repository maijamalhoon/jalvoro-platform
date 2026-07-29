import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("zero-trust Command Center source contracts", () => {
  it("gates every admin route only with the isolated administrator realm", () => {
    const source = read("proxy.ts");
    const adminGate = source.indexOf(
      "isControlPlaneOnlyPath(pathname) || isAdminControlPlanePath(pathname)",
    );
    const applicationGate = source.indexOf("updateSession(request)", adminGate);

    expect(adminGate).toBeGreaterThan(-1);
    expect(source.slice(adminGate, applicationGate)).not.toContain(
      "updateSession(request)",
    );
    expect(source).not.toContain("mergeControlPlaneResponseState");
    expect(source).toContain("getLegacyCommandCenterRedirect");
    expect(source).toContain('destination.pathname = "/admin"');
  });

  it("requires AAL2 and bounded access before rendering /admin", () => {
    const middleware = read("lib/control-plane/proxy.ts");
    const page = read("app/admin/page.tsx");
    const session = read("lib/admin/command-center-session.ts");
    const shell = read("components/admin/AdminCommandCenterShell.tsx");

    expect(middleware).toContain('currentLevel !== "aal2"');
    expect(middleware).toContain('rpc("get_my_control_plane_access")');
    expect(session).toContain('currentLevel !== "aal2"');
    expect(session).toContain('rpc("get_my_control_plane_access")');
    expect(page).toContain("getCommandCenterSession");
    expect(page).toContain("<ControlPlaneLogin />");
    expect(shell).toContain('rpc("get_command_center_navigation"');
  });

  it("uses only a publishable browser credential for the isolated project", () => {
    const config = read("lib/control-plane/config.ts");
    const client = read("lib/control-plane/client.ts");
    const server = read("lib/control-plane/server.ts");

    expect(config).toContain("zzvpovvuybfihwgjrder");
    expect(config).toContain("sb_publishable_");
    expect(client).toContain("isSingleton: false");
    expect(`${config}\n${client}\n${server}`).not.toMatch(
      /SUPABASE_SERVICE_ROLE_KEY|sb_secret_|service_role/,
    );
  });

  it("allows browser auth and RPC traffic to the isolated project in CSP", () => {
    const nextConfig = read("next.config.ts");

    expect(nextConfig).toContain("controlPlaneSupabaseOrigin");
    expect(nextConfig).toContain("controlPlaneSupabaseWebSocketOrigin");
    expect(nextConfig).toContain("https://zzvpovvuybfihwgjrder.supabase.co");
    expect(nextConfig).toMatch(
      /connect-src 'self'[\s\S]*controlPlaneSupabaseOrigin[\s\S]*controlPlaneSupabaseWebSocketOrigin/,
    );
  });

  it("does not offer public signup or OAuth in the Command Center login", () => {
    const login = read("components/control-plane/ControlPlaneLogin.tsx");

    expect(login).toContain("signInWithPassword");
    expect(login).toContain("mfa.enroll");
    expect(login).toContain("mfa.challenge");
    expect(login).toContain("mfa.verify");
    expect(login).not.toContain("signUp(");
    expect(login).not.toContain("signInWithOAuth");
  });
});
