import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Control Plane owner management contracts", () => {
  it("keeps operator creation in an authenticated server-side Edge Function", () => {
    const source = read(
      "supabase/control-plane/functions/control-plane-create-operator/index.ts",
    );
    expect(source).toContain('rpc("get_my_control_plane_access")');
    expect(source).toContain("auth.admin.listUsers");
    expect(source).toContain("auth.admin.generateLink");
    expect(source).toContain('Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")');
    expect(source).toContain("create_control_plane_invitation");
    expect(source).not.toMatch(/sb_secret_[A-Za-z0-9_-]+/);
  });

  it("gives the Root Owner usable role, status, invitation and grant actions", () => {
    const source = read(
      "components/control-plane/ControlPlaneOwnerManagement.tsx",
    );
    expect(source).toContain('functions.invoke("control-plane-create-operator"');
    expect(source).toContain("grant_control_plane_permission_by_reference");
    expect(source).toContain("change_control_plane_operator_role_by_reference");
    expect(source).toContain("disable_control_plane_operator_by_reference");
    expect(source).toContain("restore_control_plane_operator_by_reference");
    expect(source).toContain("revoke_control_plane_invitation");
    expect(source).toContain("revoke_control_plane_permission");
  });

  it("prevents duplicate invitations for established operators", () => {
    const migration = read(
      "supabase/control-plane/migrations/20260725214500_prevent_duplicate_operator_invitations.sql",
    );
    expect(migration).toContain("control_plane_operator_already_exists");
    expect(migration).toContain("join private.control_plane_operators");
  });

  it("enforces recent password and TOTP for invitation acceptance", () => {
    const migration = read(
      "supabase/control-plane/migrations/20260725213000_harden_invitation_reauthentication.sql",
    );
    expect(migration).toContain("require_recent_control_plane_authentication");
    expect(migration).toContain("12 * 60 * 60");
    expect(migration).toContain("20 * 60");
    expect(migration).toContain("accept_control_plane_invitation");
  });

  it("accepts invitations only after password replacement and MFA", () => {
    const source = read(
      "components/control-plane/ControlPlaneInvitationAcceptance.tsx",
    );
    expect(source).toContain("window.location.hash");
    expect(source).toContain("window.history.replaceState");
    expect(source).toContain("window.sessionStorage.setItem");
    expect(source).toContain("auth.verifyOtp");
    expect(source).toContain("checkPasswordProtection");
    expect(source).toContain("auth.updateUser");
    expect(source).toContain("auth.signInWithPassword");
    expect(source).toContain("mfa.enroll");
    expect(source).toContain("mfa.challenge");
    expect(source).toContain("mfa.verify");
    expect(source).toContain('rpc("accept_control_plane_invitation"');
    expect(source).not.toContain("signUp(");
    expect(source).not.toContain("signInWithOAuth");
  });

  it("keeps invitation onboarding outside normal customer authentication", () => {
    const source = read("proxy.ts");
    const inviteRoute = source.indexOf('pathname === "/control-invite"');
    const normalAuth = source.indexOf("updateSession(request)", inviteRoute);
    expect(inviteRoute).toBeGreaterThan(-1);
    expect(normalAuth).toBeGreaterThan(inviteRoute);
    expect(source).toContain('"X-Robots-Tag", "noindex, nofollow, noarchive"');
    expect(source).toContain('"Referrer-Policy", "no-referrer"');
  });
});
