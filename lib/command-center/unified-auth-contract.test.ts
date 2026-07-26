import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("unified Command Center authentication", () => {
  it("uses one canonical route and retires the old Admin and Control Plane entry points", () => {
    const proxy = read("proxy.ts");

    expect(proxy).toContain('pathname === "/admin"');
    expect(proxy).toContain('pathname === "/control"');
    expect(proxy).toContain('pathname === "/control-login"');
    expect(proxy).toContain('pathname === "/control-invite"');
    expect(proxy).toContain('pathname = "/commandcenter"');
    expect(proxy).toContain(
      "return hardenCommandCenterResponse(NextResponse.next({ request }))",
    );
    expect(proxy).not.toContain("updateControlPlaneSession");
  });

  it("authenticates the dedicated Command Center account with email and password only", () => {
    const login = read("components/admin/CommandCenterLogin.tsx");
    const page = read("app/commandcenter/page.tsx");

    expect(login).toContain("createCommandCenterBrowserClient");
    expect(login).toContain("signInWithPassword");
    expect(login).toContain('rpc("get_my_command_center_access")');
    expect(login).toContain("command-center-session-bridge");
    expect(login).toContain('type: "magiclink"');
    expect(login).not.toContain("mfa.enroll");
    expect(login).not.toContain("mfa.challenge");
    expect(login).not.toContain("mfa.verify");
    expect(page).toContain("createCommandCenterServerClient");
    expect(page).toContain("syncRequired");
  });

  it("bridges only the same active owner into the production Admin session", () => {
    const edgeFunction = read(
      "supabase/functions/command-center-session-bridge/index.ts",
    );
    const resolver = read(
      "supabase/migrations/20260726084000_add_command_center_session_bridge.sql",
    );
    const alignment = read(
      "supabase/migrations/20260726083500_align_command_center_owner_identity.sql",
    );

    expect(edgeFunction).toContain("commandUser?.email?.trim().toLowerCase()");
    expect(edgeFunction).toContain("get_my_command_center_access");
    expect(edgeFunction).toContain("resolve_command_center_bridge_target");
    expect(edgeFunction).toContain('type: "magiclink"');
    expect(edgeFunction).not.toContain("signInWithPassword");
    expect(edgeFunction).not.toContain("password:");
    expect(resolver).toContain("auth.role() <> 'service_role'");
    expect(resolver).toContain("pa.disabled_at is null");
    expect(resolver).toContain("pa.role = 'owner'");
    expect(resolver).toContain("from public, anon, authenticated");
    expect(alignment).toContain("jamalarain186@gmail.com");
    expect(alignment).toContain("jamalarain681@gmail.com");
    expect(alignment).toContain("'access_disabled'");
  });

  it("mounts the masterpiece shell only after both bounded sessions match", () => {
    const layout = read("app/commandcenter/layout.tsx");
    const serverAccess = read("lib/command-center/server-access.ts");

    expect(layout).toContain("readUnifiedCommandCenterSession");
    expect(layout).toContain("if (!session) return <>{children}</>");
    expect(serverAccess).toContain("get_my_command_center_access");
    expect(serverAccess).toContain("websiteEmail !== commandEmail");
  });
});
