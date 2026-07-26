import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("zero-trust Control Plane source contracts", () => {
  it("tracks the exact applied Control Plane foundation migration", () => {
    const migration = read(
      "supabase/control-plane/migrations/20260725131116_zero_trust_control_plane_foundation.sql",
    );
    const appliedStatement = migration.endsWith("\n")
      ? migration.slice(0, -1)
      : migration;

    expect(
      createHash("sha256").update(appliedStatement).digest("hex"),
    ).toBe("ec2bf014754d0c500afb9968ab1b51f4c28da77702c5892e1768deb815066ae9");
    expect(migration).toContain(
      "create schema if not exists private",
    );
    expect(migration).toContain(
      "create or replace function private.require_control_plane_operator",
    );
    expect(migration).toContain("v_user_id uuid := auth.uid()");
    expect(migration).toContain("if v_aal <> 'aal2'");
    expect(migration).toContain(
      "revoke all on private.control_plane_operators",
    );
  });

  it("gates every admin route with Control Plane authority before app auth", () => {
    const source = read("proxy.ts");
    const controlGate = source.indexOf("updateControlPlaneSession(request)");
    const applicationGate = source.indexOf("updateSession(request)", controlGate);

    expect(source).toContain("isAdminControlPlanePath(pathname)");
    expect(controlGate).toBeGreaterThan(-1);
    expect(applicationGate).toBeGreaterThan(controlGate);
    expect(source).toContain("mergeControlPlaneResponseState");
  });

  it("requires AAL2 and the bounded access RPC in middleware and SSR", () => {
    const middleware = read("lib/control-plane/proxy.ts");
    const page = read("app/control/page.tsx");

    expect(middleware).toContain('currentLevel !== "aal2"');
    expect(middleware).toContain('rpc("get_my_control_plane_access")');
    expect(page).toContain('currentLevel !== "aal2"');
    expect(page).toContain('rpc("get_my_control_plane_access")');
    expect(page).toContain('rpc("get_control_plane_directory")');
  });

  it("uses only a publishable browser credential for the isolated project", () => {
    const config = read("lib/control-plane/config.ts");
    const client = read("lib/control-plane/client.ts");
    const server = read("lib/control-plane/server.ts");

    expect(config).toContain("zzvpovvuybfihwgjrder");
    expect(config).toContain("sb_publishable_");
    expect(`${config}\n${client}\n${server}`).not.toMatch(
      /SUPABASE_SERVICE_ROLE_KEY|sb_secret_|service_role/,
    );
  });

  it("does not offer public signup or OAuth in the Control Plane login", () => {
    const login = read("components/control-plane/ControlPlaneLogin.tsx");

    expect(login).toContain("signInWithPassword");
    expect(login).toContain("mfa.enroll");
    expect(login).toContain("mfa.challenge");
    expect(login).toContain("mfa.verify");
    expect(login).not.toContain("signUp(");
    expect(login).not.toContain("signInWithOAuth");
  });
});
