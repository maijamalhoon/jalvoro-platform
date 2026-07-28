import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());
const applicationSourceDirectories = ["app", "components", "lib", "public"];
const thisTestFile = join(root, "lib/security-hardening.test.ts");

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function collectSourceFiles(directory: string): string[] {
  const absolute = join(root, directory);
  return readdirSync(absolute).flatMap((entry) => {
    const path = join(absolute, entry);
    if (statSync(path).isDirectory()) {
      return collectSourceFiles(path.slice(root.length + 1));
    }
    return /\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(path) &&
      !/\.(?:test|spec)\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(path)
      ? [path]
      : [];
  });
}

describe("security hardening contracts", () => {
  it("enforces user ownership and cross-record isolation below the UI", () => {
    const migration = read(
      "supabase/migrations/20260721015230_security_hardening_data_isolation.sql",
    );

    expect(migration).toContain("private.enforce_user_id_ownership");
    expect(migration).toContain("accounts_select_own");
    expect(migration).toContain("accounts_insert_own");
    expect(migration).toContain("accounts_update_own");
    expect(migration).toContain("accounts_delete_own");
    expect(migration).toContain("foreign key (account_id, user_id)");
    expect(migration).toContain("foreign key (investment_id, user_id)");
    expect(migration).toContain("transactions_amount_positive");
  });

  it("keeps privileged RPC implementations out of the exposed schema", () => {
    const migration = read(
      "supabase/migrations/20260721015314_hide_privileged_rpc_implementations.sql",
    );

    expect(migration).toContain("set schema private");
    expect(migration).toContain("security invoker");
    expect(migration).toContain("from public, anon");
    expect(migration).toContain("to authenticated, service_role");
  });

  it("rejects cross-site and oversized authenticated API requests", () => {
    const proxy = read("lib/supabase/proxy.ts");

    expect(proxy).toContain('request.headers.get("origin")');
    expect(proxy).toContain('request.headers.get("sec-fetch-site")');
    expect(proxy).toContain('startsWith("application/json")');
    expect(proxy).toContain("MAX_PROTECTED_JSON_BYTES");
    expect(proxy).toContain('"consume_api_rate_limit"');
    expect(proxy).toContain('"rate_limit_unavailable"');
  });

  it("keeps profile avatars private and owner-scoped", () => {
    const route = read("app/api/profile/avatar/route.ts");
    const migration = read(
      "supabase/migrations/20260721024000_private_profile_avatars.sql",
    );

    expect(route).toContain("supabase.auth.getUser()");
    expect(route).toContain("validateOwnedAvatarPath");
    expect(route).toContain('"Cache-Control": "private, no-store');
    expect(route).toContain('"Cross-Origin-Resource-Policy": "same-origin"');
    expect(migration).toContain("public = false");
    expect(migration).toContain("auth.uid()");
  });

  it("keeps scripts and framing restricted by policy", () => {
    const config = read("next.config.ts");

    expect(config).toContain('"frame-ancestors \'none\'"');
    expect(config).toContain('"object-src \'none\'"');
    expect(config).toContain("productionScriptSources");
    expect(config).not.toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval' https:");
    expect(config).toContain('"Vercel-CDN-Cache-Control"');
  });

  it("keeps Business MFA recovery owner-authorized, pre-audited, and server-only", () => {
    const edgeFunction = read(
      "supabase/functions/business-identity-recovery/index.ts",
    );
    const migration = read(
      "supabase/migrations/20260726223000_business_identity_recovery.sql",
    );
    const panel = read("components/business/BusinessIdentityRecoveryPanel.tsx");

    expect(edgeFunction).toContain('Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")');
    expect(edgeFunction).toContain("auth.admin.mfa.listFactors");
    expect(edgeFunction).toContain("auth.admin.mfa.deleteFactor");
    expect(edgeFunction).not.toContain("auth.sessions");
    expect(edgeFunction).not.toContain("mfa_factors");
    expect(edgeFunction).toContain('p_outcome: "started"');
    expect(edgeFunction).toContain("identity_recovery_audit_unavailable");
    expect(migration).toContain("Primary owner access required.");
    expect(migration).toContain("Owner MFA verification is required.");
    expect(migration).toContain("auth.jwt()->>'aal'");
    expect(migration).toContain("mfa_recovery_started");
    expect(migration).toContain("mfa_recovery_completed");
    expect(panel).toContain("supabase.functions.invoke(");
    expect(panel).toContain('"business-identity-recovery"');
    expect(panel).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("keeps POS device, PIN, session, and approval security server-only", () => {
    const edgeFunction = read(
      "supabase/functions/business-pos-security/index.ts",
    );
    const migration = read(
      "supabase/migrations/20260727043000_pos_workforce_security.sql",
    );
    const manager = read("components/business/BusinessPosSecurityManager.tsx");

    expect(edgeFunction).toContain('Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")');
    expect(edgeFunction).toContain("APP_ALLOWED_ORIGINS");
    expect(edgeFunction).toContain("await sha256(sessionToken)");
    expect(edgeFunction).not.toContain("auth.sessions");
    expect(edgeFunction).not.toContain("mfa_factors");
    expect(migration).toContain("extensions.crypt(p_pin,extensions.gen_salt('bf',12))");
    expect(migration).toContain("revoke all on table public.business_pos_staff_credentials from public,anon,authenticated");
    expect(migration).toContain("approval.requested_by=p_actor_user_id");
    expect(manager).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(manager).not.toContain("pin_hash");
    expect(manager).not.toContain("secret_hash");
    expect(manager).not.toContain("token_hash");
  });

  it("keeps POS sale posting session-bound, idempotent, and catalog-priced", () => {
    const edgeFunction = read(
      "supabase/functions/business-pos-security/index.ts",
    );
    const migration = read(
      "supabase/migrations/20260727060000_pos_sale_transaction_bridge.sql",
    );

    expect(edgeFunction).toContain('"post_sale"');
    expect(edgeFunction).toContain('serviceClient.rpc("post_business_pos_sale"');
    expect(edgeFunction).not.toContain("unit_price:");
    expect(edgeFunction).not.toContain("warehouse_id:");
    expect(migration).toContain("private.get_business_pos_session_internal");
    expect(migration).toContain("private.normalize_business_pos_sale_lines");
    expect(migration).toContain("target_product.sales_price");
    expect(migration).toContain("unique (business_id, request_key)");
    expect(migration).toContain("public.consume_business_pos_approval(");
    expect(migration).toContain("private.create_business_simple_shop_sale_internal(");
    expect(migration).toContain("set_config('request.jwt.claim.sub',target_session.user_id::text,true)");
    expect(migration).not.toContain("auth.sessions");
  });

  it("keeps POS terminal operations session-bound, approval-gated, and server-only", () => {
    const edgeFunction = read(
      "supabase/functions/business-pos-security/index.ts",
    );
    const migration = read(
      "supabase/migrations/20260727070000_pos_operations_transaction_bridge.sql",
    );
    const terminal = read("components/business/BusinessPosTerminal.tsx");
    const proxy = read("lib/supabase/proxy.ts");

    expect(edgeFunction).toContain('"end_session"');
    expect(edgeFunction).toContain('"terminal_snapshot"');
    expect(edgeFunction).toContain('"post_operation"');
    expect(edgeFunction).toContain('serviceClient.rpc("post_business_pos_operation"');
    expect(migration).toContain("private.get_business_pos_session_internal");
    expect(migration).toContain("public.end_business_pos_session");
    expect(migration).toContain("public.consume_business_pos_approval(");
    expect(migration).toContain("private.create_business_simple_shop_purchase_internal(");
    expect(migration).toContain("private.create_business_simple_shop_expense_internal(");
    expect(migration).toContain("private.create_business_sales_return_internal(");
    expect(migration).not.toContain("auth.sessions");
    expect(proxy).toContain('"/pos"');
    expect(terminal).toContain("sessionStorage.setItem(storageKey, token)");
    expect(terminal).not.toContain("localStorage");
    expect(terminal).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("does not place administrative Supabase secrets in application source", () => {
    const source = applicationSourceDirectories
      .flatMap(collectSourceFiles)
      .filter((path) => path !== thisTestFile)
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");

    expect(source).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(source).not.toMatch(/sb_secret_[A-Za-z0-9_-]+/);
  });
});
