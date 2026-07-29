import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Command Center isolated authorization gateway", () => {
  it("requires the dedicated AAL2 session without a customer application login", () => {
    const client = read("lib/admin/command-center-client.ts");
    const edge = read(
      "supabase/functions/command-center-gateway/index.ts",
    );

    expect(client).toContain("x-control-plane-authorization");
    expect(client).toContain('currentLevel !== "aal2"');
    expect(client).toContain("parseControlPlaneAccess");
    expect(client).not.toContain("application.auth.getSession");
    expect(edge).toContain("resolve_command_center_actor_by_email");
    expect(edge).toContain('sessionAssurance !== "aal2"');
    expect(edge).not.toContain("mainEmail !== controlEmail");
    expect(edge).not.toContain("mainUserClient");
    expect(edge).toContain('Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")');
    expect(edge).not.toContain("console.log");
  });

  it("maps the isolated verified email to an active platform administrator", () => {
    const migration = read(
      "supabase/migrations/20260729204500_command_center_isolated_admin_entry.sql",
    );

    expect(migration).toContain("resolve_command_center_actor_by_email");
    expect(migration).toContain("private.platform_admins");
    expect(migration).toContain("pa.disabled_at is null");
    expect(migration).toContain("email_confirmed_at is not null");
    expect(migration).toContain("auth.jwt()->>'role'");
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
  });

  it("intercepts only the bounded Command Center RPC allowlist", () => {
    const server = read("lib/supabase/server.ts");
    const client = read("lib/admin/command-center-client.ts");

    expect(server).toContain("x-jalvoro-command-center");
    expect(server).toContain("isCommandCenterOperation(operation)");
    expect(server).toContain("invokeCommandCenterRpc(client, operation, args)");
    expect(server).toContain("return directRpc(operation, args, options)");
    expect(client).toContain('"get_platform_admin_snapshot"');
    expect(client).toContain('"approve_admin_release"');
    expect(client).toContain('"accept_platform_admin_invitation"');
  });
});
