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

  it("routes every Admin source RPC through the gateway client", () => {
    const sourceFiles = [
      "app/admin/page.tsx",
      "app/admin/access-actions.ts",
      "app/admin/billing-actions.ts",
      "app/admin/privacy-actions.ts",
      "app/admin/compliance-actions.ts",
      "app/admin/incident-actions.ts",
      "app/admin/release-actions.ts",
      "app/admin/organizations/page.tsx",
      "app/admin/organizations/actions.ts",
      "components/admin/AdminCommandCenterShell.tsx",
      "components/admin/AdminSectionNav.tsx",
    ];

    for (const path of sourceFiles) {
      const source = read(path);
      expect(source).toContain("command-center-client");
      expect(source).not.toContain('from "@/lib/supabase/server"');
    }
  });
});
