import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const authorization = read(
  "../supabase/migrations/20260726223000_business_identity_recovery.sql",
);
const wrapperFix = read(
  "../supabase/migrations/20260726223100_fix_business_identity_recovery_wrapper_execution.sql",
);

describe("Business identity recovery wrapper execution", () => {
  it("executes the public wrappers as their owner while retaining internal authorization", () => {
    expect(wrapperFix).toContain(
      "alter function public.get_business_identity_recovery_context(uuid,uuid,text)",
    );
    expect(wrapperFix).toContain(
      "alter function public.record_business_identity_recovery_result",
    );
    expect(wrapperFix.match(/security definer/g)).toHaveLength(2);
    expect(authorization).toContain("actor_id uuid := auth.uid()");
    expect(authorization).toContain("private.require_current_account_realm('business')");
    expect(authorization).toContain("Primary owner access required.");
    expect(authorization).toContain("auth.jwt()->>'aal'");
    expect(authorization).toContain(
      "revoke all on function private.get_business_identity_recovery_context_internal",
    );
  });
});
