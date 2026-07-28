import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const edgeFunction = read(
  "../supabase/functions/business-identity-recovery/index.ts",
);
const migration = read(
  "../supabase/migrations/20260726223000_business_identity_recovery.sql",
);
const panel = read("../components/business/BusinessIdentityRecoveryPanel.tsx");
const teamPage = read("../app/business/[businessSlug]/team/page.tsx");
const ci = read("../.github/workflows/ci.yml");
const regression = read("../supabase/tests/business_identity_recovery.sql");

describe("Business identity recovery contract", () => {
  it("keeps the service role and factor identifiers inside the Edge Function", () => {
    expect(edgeFunction).toContain('Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")');
    expect(edgeFunction).toContain("auth.admin.mfa.listFactors");
    expect(edgeFunction).toContain("auth.admin.mfa.deleteFactor");
    expect(edgeFunction).toContain("validFactors.map(cleanFactor)");
    expect(panel).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(panel).not.toContain("factor.id");
  });

  it("requires tenant ownership and AAL2 before reset", () => {
    expect(migration).toContain("owner_id<>actor_id");
    expect(migration).toContain("p_target_user_id=owner_id");
    expect(migration).toContain("membership.status in ('active','suspended')");
    expect(migration).toContain("normalized_action='reset_mfa'");
    expect(migration).toContain("auth.jwt()->>'aal'");
    expect(migration).toContain("errcode='MFA02'");
    expect(migration).toContain("interval '5 minutes'");
  });

  it("records a durable start before reset, then inspection, success, or failure without secrets", () => {
    expect(migration).toContain("mfa_recovery_started");
    expect(migration).toContain("mfa_recovery_inspected");
    expect(migration).toContain("mfa_recovery_completed");
    expect(migration).toContain("mfa_recovery_failed");
    expect(migration).toContain("verified_factor_count");
    expect(migration).toContain("deleted_factor_count");
    expect(migration).not.toContain("factor_id");
    expect(edgeFunction).toContain('p_outcome: "started"');
    expect(edgeFunction).toContain("identity_recovery_audit_unavailable");
    expect(edgeFunction).toContain("record_business_identity_recovery_result");
  });

  it("makes the owner confirm reset and explains the AAL2 requirement", () => {
    expect(teamPage).toContain("BusinessIdentityRecoveryPanel");
    expect(teamPage).toContain("isPrimaryOwner={business.owner_user_id === user.id}");
    expect(panel).toContain("Confirm MFA reset");
    expect(panel).toContain("Verify your own MFA first");
    expect(panel).toContain("No factor ID is exposed to this page.");
  });

  it("typechecks the production Edge Function in CI", () => {
    expect(ci).toContain("supabase/functions/business-identity-recovery/index.ts");
    expect(ci).toContain("supabase/functions/deno.json");
  });

  it("ships a rollback-only authorization and audit regression", () => {
    expect(regression).toContain("Non-owner inspected another member''s MFA context");
    expect(regression).toContain("AAL1 owner obtained reset authorization");
    expect(regression).toContain("'reset_mfa','started'");
    expect(regression).toContain("mfa_recovery_started");
    expect(regression).toContain("mfa_recovery_completed");
    expect(regression).toContain("rollback;");
  });
});
