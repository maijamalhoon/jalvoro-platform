import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Command Center dual authorization gateway", () => {
  it("verifies two project sessions, binds email, and requires Control Plane AAL2", () => {
    const client = read("lib/admin/command-center-client.ts");
    const edge = read(
      "supabase/functions/command-center-gateway/index.ts",
    );

    expect(client).toContain("x-control-plane-authorization");
    expect(client).toContain('currentLevel !== "aal2"');
    expect(client).toContain("parseControlPlaneAccess");
    expect(edge).toContain("mainEmail !== controlEmail");
    expect(edge).toContain('sessionAssurance !== "aal2"');
    expect(edge).toContain('Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")');
    expect(edge).not.toContain("console.log");
  });

  it("removes authenticated direct execution and preserves the verified actor", () => {
    const migration = read(
      "supabase/migrations/20260728110000_command_center_dual_auth_gateway.sql",
    );

    expect(migration).toContain("execute_command_center_operation");
    expect(migration).toContain("auth.role() <> 'service_role'");
    expect(migration).toContain("set_config('request.jwt.claims'");
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
    expect(migration).toContain("email_confirmed_at is not null");
  });

  it("intercepts only the bounded Command Center RPC allowlist", () => {
    const server = read("lib/supabase/server.ts");
    const client = read("lib/admin/command-center-client.ts");

    expect(server).toContain("isCommandCenterOperation(operation)");
    expect(server).toContain("invokeCommandCenterRpc(client, operation, args)");
    expect(server).toContain("return directRpc(operation, args, options)");
    expect(client).toContain('"get_platform_admin_snapshot"');
    expect(client).toContain('"approve_admin_release"');
    expect(client).toContain('"accept_platform_admin_invitation"');
  });
});
