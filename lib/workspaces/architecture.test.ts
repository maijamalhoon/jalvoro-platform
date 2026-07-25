import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationSource = readFileSync(
  new URL(
    "../../supabase/migrations/20260725173000_workspace_domain_foundation.sql",
    import.meta.url,
  ),
  "utf8",
);
const onboardingBridgeSource = readFileSync(
  new URL("../../app/onboarding/[experience]/page.tsx", import.meta.url),
  "utf8",
);
const onboardingCompletionPageSource = readFileSync(
  new URL("../../app/workspaces/onboarding/complete/page.tsx", import.meta.url),
  "utf8",
);
const onboardingCompletionClientSource = readFileSync(
  new URL(
    "../../components/workspaces/CompleteWorkspaceOnboarding.tsx",
    import.meta.url,
  ),
  "utf8",
);
const switchRouteSource = readFileSync(
  new URL("../../app/workspaces/switch/route.ts", import.meta.url),
  "utf8",
);
const workspaceHubSource = readFileSync(
  new URL("../../app/business/page.tsx", import.meta.url),
  "utf8",
);
const workspaceCreatorSource = readFileSync(
  new URL("../../components/business/CreateBusinessWorkspaceForm.tsx", import.meta.url),
  "utf8",
);
const authShellSource = readFileSync(
  new URL("../../components/auth/AuthShell.tsx", import.meta.url),
  "utf8",
);

describe("workspace foundation architecture", () => {
  it("adds resumable onboarding and normalized module entitlements additively", () => {
    expect(migrationSource).toContain(
      "create table if not exists public.workspace_onboarding_sessions",
    );
    expect(migrationSource).toContain(
      "create table if not exists public.business_module_entitlements",
    );
    expect(migrationSource).toContain("add column if not exists entry_experience text");
    expect(migrationSource).toContain("Legacy module_config remains during gradual migration");
    expect(migrationSource).not.toMatch(/drop table.*businesses|drop table.*business_members/is);
  });

  it("uses RLS, explicit grants, ownership checks, and indexed membership paths", () => {
    expect(migrationSource).toContain(
      "alter table public.workspace_onboarding_sessions enable row level security",
    );
    expect(migrationSource).toContain(
      "alter table public.business_module_entitlements enable row level security",
    );
    expect(migrationSource).toContain("to authenticated");
    expect(migrationSource).toContain("(select auth.uid())");
    expect(migrationSource).toContain("membership.status = 'active'");
    expect(migrationSource).toContain(
      "workspace_onboarding_sessions_user_status_idx",
    );
    expect(migrationSource).toContain("business_module_entitlements_active_idx");
    expect(migrationSource).toContain("revoke execute on function");
  });

  it("does not use user metadata as an authorization source", () => {
    expect(migrationSource).not.toMatch(/raw_user_meta_data|user_metadata|auth\.jwt/i);
    expect(switchRouteSource).not.toMatch(/user_metadata|jalvoro_start_experience/);
    expect(switchRouteSource).toContain('.eq("status", "active")');
    expect(switchRouteSource).toContain('.eq("business_id", businessId)');
    expect(switchRouteSource).toContain("sameOriginRequest");
  });

  it("starts database-backed onboarding and completes each workspace path", () => {
    expect(onboardingBridgeSource).toContain('supabase.rpc("begin_workspace_onboarding"');
    expect(onboardingBridgeSource).toContain("personalCompletionDestination");
    expect(onboardingCompletionPageSource).toContain("CompleteWorkspaceOnboarding");
    expect(onboardingCompletionClientSource).toContain(
      'supabase.rpc("update_workspace_onboarding_progress"',
    );
    expect(workspaceCreatorSource).toContain(
      'supabase.rpc("apply_business_entry_experience"',
    );
    expect(workspaceCreatorSource).toContain("onboardingSessionId");
    expect(migrationSource).toContain(
      "create or replace function public.update_workspace_onboarding_progress",
    );
  });

  it("makes workspace switching explicit, role-aware, and tenant-bound", () => {
    expect(workspaceHubSource).toContain('action="/workspaces/switch"');
    expect(workspaceHubSource).toContain('method="post"');
    expect(workspaceHubSource).toContain("getMembershipRoleLabel");
    expect(workspaceHubSource).toContain("Current");
    expect(workspaceHubSource).toContain("Join an existing workspace");
    expect(switchRouteSource).toContain("getBusinessWorkspaceHref");
    expect(switchRouteSource).toContain(
      "requestedDestination.startsWith(`/business/${business.slug}`)",
    );
  });

  it("guides an existing identity to sign in instead of creating a duplicate", () => {
    expect(authShellSource).toContain("Already have a");
    expect(authShellSource).toContain("Sign in and add this workspace");
    expect(authShellSource).toContain("A duplicate account will not be created");
    expect(authShellSource).not.toMatch(/check.*email.*exists|listUsers|admin\.listUsers/i);
  });
});
