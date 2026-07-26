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

  it("keeps Business MFA recovery owner-authorized, audited, and server-only", () => {
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
    expect(migration).toContain("Primary owner access required.");
    expect(migration).toContain("Owner MFA verification is required.");
    expect(migration).toContain("auth.jwt()->>'aal'");
    expect(migration).toContain("mfa_recovery_completed");
    expect(panel).toContain("supabase.functions.invoke(");
    expect(panel).toContain('"business-identity-recovery"');
    expect(panel).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
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
