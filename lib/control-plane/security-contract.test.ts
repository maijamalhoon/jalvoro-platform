import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("zero-trust Control Plane source contracts", () => {
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
