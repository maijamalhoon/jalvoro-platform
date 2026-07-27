import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const migration = read(
  "../supabase/migrations/20260727043000_pos_workforce_security.sql",
);
const edgeFunction = read(
  "../supabase/functions/business-pos-security/index.ts",
);
const manager = read(
  "../components/business/BusinessPosSecurityManager.tsx",
);
const page = read("../app/business/[businessSlug]/pos-security/page.tsx");
const regression = read("../supabase/tests/business_pos_security.sql");
const ci = read("../.github/workflows/ci.yml");

describe("Retail POS workforce security contract", () => {
  it("stores only hashes for device, PIN, and session credentials", () => {
    expect(migration).toContain("create table if not exists public.business_pos_devices");
    expect(migration).toContain("create table if not exists public.business_pos_staff_credentials");
    expect(migration).toContain("create table if not exists public.business_pos_sessions");
    expect(migration).toContain("secret_hash text not null");
    expect(migration).toContain("pin_hash text not null");
    expect(migration).toContain("token_hash text not null unique");
    expect(migration).toContain("extensions.crypt(p_pin,extensions.gen_salt('bf',12))");
    expect(migration).not.toContain("device_secret text");
    expect(migration).not.toContain("pin text not null");
    expect(migration).not.toContain("session_token text");
  });

  it("keeps POS security tables inaccessible to browser roles", () => {
    for (const table of [
      "business_pos_devices",
      "business_pos_staff_credentials",
      "business_pos_sessions",
      "business_pos_approval_requests",
      "business_pos_security_events",
    ]) {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
      expect(migration).toContain(
        `revoke all on table public.${table} from public,anon,authenticated`,
      );
    }
    expect(migration).toContain("create or replace function public.get_business_pos_security_snapshot");
    expect(migration).toContain("security definer");
    expect(migration).not.toContain("auditor,viewer");
    expect(manager).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(manager).not.toContain("pin_hash");
    expect(manager).not.toContain("secret_hash");
    expect(manager).not.toContain("token_hash");
  });

  it("enforces branch-bound staff operation and durable PIN lockout", () => {
    expect(migration).toContain("private.business_pos_member_has_branch_access");
    expect(migration).toContain("failed_attempts+1>=5");
    expect(migration).toContain("interval '15 minutes'");
    expect(migration).toContain("return jsonb_build_object('ok',false,'error','authentication_failed')");
    expect(migration).toContain("last_activity_at>now()-interval '30 minutes'");
    expect(migration).toContain("now()+interval '8 hours'");
    expect(regression).toContain("Wrong PIN attempts did not persist a lockout");
    expect(migration).toContain("revoke_business_pos_access_on_membership_change");
    expect(regression).toContain("Suspended member retained an active POS PIN");
    expect(regression).toContain("Suspended member retained an active POS session");
  });

  it("binds approvals to operation, session, payload, expiry, and one-time consumption", () => {
    expect(migration).toContain("operation_type in ('refund','void','high_discount','cash_adjustment')");
    expect(migration).toContain("payload_hash text not null");
    expect(migration).toContain("now()+interval '5 minutes'");
    expect(migration).toContain("approval.requested_by=p_actor_user_id");
    expect(migration).toContain("approval.payload_hash<>p_payload_hash");
    expect(migration).toContain("set status='consumed',consumed_at=now()");
    expect(regression).toContain("Cashier self-approved a sensitive POS operation");
    expect(regression).toContain("Approval was consumed with a different payload");
    expect(regression).toContain("Approval was consumed more than once");
  });

  it("uses one server-only Edge Function for management and opaque kiosk sessions", () => {
    expect(edgeFunction).toContain('Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")');
    expect(edgeFunction).toContain("APP_ALLOWED_ORIGINS");
    expect(edgeFunction).toContain("auth.getUser(token)");
    expect(edgeFunction).toContain('action === "start_session"');
    expect(edgeFunction).toContain("base64Url(randomBytes(32))");
    expect(edgeFunction).toContain("await sha256(sessionToken)");
    expect(edgeFunction).toContain("temporaryPin: pin");
    expect(edgeFunction).not.toContain("auth.sessions");
    expect(edgeFunction).not.toContain("mfa_factors");
  });

  it("ships a tenant-authorized management page without exposing secrets after issuance", () => {
    expect(page).toContain('business.workspace_mode !== "simple_shop"');
    expect(page).toContain('["pos.view", "pos.manage", "pos.approve"].includes(permission)');
    expect(page).not.toContain('permission.startsWith("pos.")');
    expect(page).toContain("BusinessPosSecurityManager");
    expect(manager).toContain('"business-pos-security"');
    expect(manager).toContain("shown once");
    expect(manager).toContain("Temporary PINs must change on first device login");
    expect(manager).toContain("cannot be self-approved");
  });

  it("typechecks the POS Edge Function and ships rollback-only DB regression", () => {
    expect(ci).toContain("supabase/functions/business-pos-security/index.ts");
    expect(regression).toContain("Raw device secret was stored");
    expect(regression).toContain("Raw POS PIN was stored");
    expect(regression).toContain("Raw POS session token was stored");
    expect(regression).toContain("approval_consumed");
    expect(regression).toContain("rollback;");
  });
});
