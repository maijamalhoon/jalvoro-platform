import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationSource = readFileSync(
  new URL(
    "../../supabase/migrations/20260725173000_workspace_domain_foundation.sql",
    import.meta.url,
  ),
  "utf8",
);
const atomicCreationMigrationSource = readFileSync(
  new URL(
    "../../supabase/migrations/20260725214500_atomic_experience_workspace_creation.sql",
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
    expect(atomicCreationMigrationSource).not.toMatch(/drop table|truncate table/i);
  });

  it("keeps the creation request ledger private and ownership-bound", () => {
    expect(atomicCreationMigrationSource).toContain(
      "create table if not exists public.workspace_creation_requests",
    );
    expect(atomicCreationMigrationSource).toContain(
      "primary key (user_id, request_id)",
    );
    expect(atomicCreationMigrationSource).toContain(
      "business_id uuid references public.businesses(id) on delete cascade",
    );
    expect(atomicCreationMigrationSource).toContain(
      "alter table public.workspace_creation_requests enable row level security",
    );
    expect(atomicCreationMigrationSource).toContain(
      "revoke all on public.workspace_creation_requests from public, anon, authenticated",
    );
    expect(atomicCreationMigrationSource).toContain(
      "grant all on public.workspace_creation_requests to postgres, service_role",
    );
    expect(atomicCreationMigrationSource).not.toMatch(
      /grant\s+(select|insert|update|delete|all).*workspace_creation_requests.*authenticated/is,
    );
  });

  it("uses explicit auth checks and fixed search paths for privileged transitions", () => {
    expect(migrationSource).toContain("revoke execute on function");
    expect(atomicCreationMigrationSource).toContain("security definer");
    expect(atomicCreationMigrationSource).toContain(
      "set search_path = pg_catalog, public, private",
    );
    expect(atomicCreationMigrationSource).toContain(
      "set search_path = pg_catalog, public",
    );
    expect(atomicCreationMigrationSource).toContain("current_user_id uuid := auth.uid()");
    expect(atomicCreationMigrationSource).toContain("if current_user_id is null then");
    expect(atomicCreationMigrationSource).toContain("from public, anon");
    expect(atomicCreationMigrationSource).toContain("to authenticated, service_role");
    expect(atomicCreationMigrationSource).not.toMatch(
      /raw_user_meta_data|user_metadata|auth\.jwt/i,
    );
  });

  it("fails closed when onboarding preparation cannot be confirmed", () => {
    expect(onboardingBridgeSource).toContain("PreparationError");
    expect(onboardingBridgeSource).toContain(
      "profileResult.error || preferenceResult.error || sessionResult.error",
    );
    expect(onboardingBridgeSource).toContain("preferenceWrite.error");
    expect(onboardingBridgeSource).toContain("Retry preparation");
    expect(onboardingBridgeSource).toContain("current workspace remains unchanged");
    expect(onboardingBridgeSource).toContain(
      'supabase.rpc("complete_personal_workspace_onboarding"',
    );
  });

  it("provides bounded and atomic Personal completion recovery", () => {
    expect(onboardingBridgeSource).toContain('supabase.rpc("begin_workspace_onboarding"');
    expect(onboardingBridgeSource).toContain("personalCompletionDestination");
    expect(onboardingCompletionPageSource).toContain("CompleteWorkspaceOnboarding");
    expect(onboardingCompletionClientSource).toContain(
      'supabase.rpc("complete_personal_workspace_onboarding"',
    );
    expect(onboardingCompletionClientSource).not.toContain(
      'supabase.rpc("update_workspace_onboarding_progress"',
    );
    expect(onboardingCompletionClientSource).toContain("COMPLETION_TIMEOUT_MS");
    expect(onboardingCompletionClientSource).toContain("Promise.race");
    expect(onboardingCompletionClientSource).toContain("Open Personal Finance");
    expect(atomicCreationMigrationSource).toContain(
      "create or replace function public.complete_personal_workspace_onboarding",
    );
    expect(atomicCreationMigrationSource).toContain(
      "perform public.update_workspace_onboarding_progress",
    );
    expect(atomicCreationMigrationSource).toContain(
      "on conflict (user_id) do update",
    );
    expect(atomicCreationMigrationSource).not.toContain(
      "active_business_id = null",
    );
  });

  it("creates organizations and tailored defaults in one retry-safe transaction", () => {
    expect(atomicCreationMigrationSource).toContain(
      "create or replace function public.create_business_workspace_for_experience",
    );
    expect(atomicCreationMigrationSource).toContain("p_creation_request_id uuid");
    expect(atomicCreationMigrationSource).toContain("pg_advisory_xact_lock");
    expect(atomicCreationMigrationSource).toContain(
      "created_business_id := public.create_business_workspace_with_mode",
    );
    expect(atomicCreationMigrationSource).toContain(
      "perform public.apply_business_entry_experience",
    );
    expect(atomicCreationMigrationSource).toContain(
      "return existing_business_id",
    );
    expect(atomicCreationMigrationSource).toContain(
      "Active onboarding session not found",
    );
    expect(atomicCreationMigrationSource).toContain(
      "Onboarding session completion could not be confirmed",
    );
    expect(atomicCreationMigrationSource).toContain(
      "when normalized_experience = 'retail-pos' then 'simple_shop'",
    );
    expect(atomicCreationMigrationSource).toContain("else 'advanced_company'");
    expect(workspaceCreatorSource).toContain(
      'supabase.rpc("create_business_workspace_for_experience"',
    );
    expect(workspaceCreatorSource).toContain("p_creation_request_id");
    expect(workspaceCreatorSource).toContain("submissionLockRef");
    expect(workspaceCreatorSource).toContain("window.sessionStorage");
    expect(workspaceCreatorSource).toContain("window.localStorage");
    expect(workspaceCreatorSource).toContain("requestPersistenceError");
    expect(workspaceCreatorSource).not.toContain(
      'supabase.rpc("create_business_workspace_with_mode"',
    );
    expect(workspaceCreatorSource).not.toContain(
      'supabase.rpc("apply_business_entry_experience"',
    );
  });

  it("keeps creation defaults compatible with the selected experience", () => {
    expect(workspaceCreatorSource).toContain("Starting workflow:");
    expect(workspaceCreatorSource).toContain(
      "const workspaceMode = setupDefaults.workspaceMode",
    );
    expect(workspaceCreatorSource).toContain("setBusinessType(setupDefaults.businessType)");
    expect(workspaceCreatorSource).not.toContain(
      'onClick={() => setWorkspaceMode("simple_shop")}',
    );
    expect(workspaceCreatorSource).not.toContain(
      'onClick={() => setWorkspaceMode("advanced_company")}',
    );
    expect(workspaceCreatorSource).not.toContain("will finish the next time you open it");
  });

  it("makes workspace switching explicit, role-aware, tenant-bound, and honest", () => {
    expect(workspaceHubSource).toContain('action="/workspaces/switch"');
    expect(workspaceHubSource).toContain('method="post"');
    expect(workspaceHubSource).toContain("getMembershipRoleLabel");
    expect(workspaceHubSource).toContain("currentStateKnown");
    expect(workspaceHubSource).toContain("onboardingResult.error");
    expect(workspaceHubSource).toContain("SWITCH_ERROR_MESSAGES");
    expect(workspaceHubSource).toContain("Join an existing workspace");
    expect(switchRouteSource).toContain("getBusinessWorkspaceHref");
    expect(switchRouteSource).toContain("isPathWithinRoute");
    expect(switchRouteSource).toContain("workspaceRoot");
    expect(switchRouteSource).toContain("preferenceResult.error");
    expect(switchRouteSource).not.toContain(
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
