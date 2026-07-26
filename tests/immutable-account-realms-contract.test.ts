import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const migration = [
  read("../supabase/migrations/20260726193000_immutable_account_realms.sql"),
  read("../supabase/migrations/20260726193100_immutable_account_realm_enforcement.sql"),
].join("\n");
const productAuth = read("../components/auth/ProductRealmAuth.tsx");
const realmSetup = read("../app/auth/realm-setup/page.tsx");
const dashboardLayout = read("../app/dashboard/layout.tsx");
const businessIndex = read("../app/business/page.tsx");
const businessLayout = read("../app/business/[businessSlug]/layout.tsx");
const invitationPage = read("../app/business/invitations/accept/page.tsx");
const invitationRegister = read(
  "../app/business/invitations/register/page.tsx",
);
const invitationHelpers = read("../lib/business/invitations.ts");
const onboardingLayout = read("../app/onboarding/layout.tsx");
const databaseRegression = read(
  "../supabase/tests/immutable_account_realms.sql",
);

function position(source: string, needle: string) {
  const index = source.indexOf(needle);
  expect(index).toBeGreaterThanOrEqual(0);
  return index;
}

describe("immutable account realm contract", () => {
  it("stores the realm in a private immutable server-authoritative table", () => {
    expect(migration).toContain("create table if not exists private.account_realms");
    expect(migration).toContain("realm in ('individual','business','legacy_dual')");
    expect(migration).toContain("create table if not exists private.account_realm_audit");
    expect(migration).toContain(
      "revoke all on table private.account_realms from public, anon, authenticated",
    );
    expect(migration).not.toContain("raw_user_meta_data");
    expect(migration).not.toContain("user_metadata");
  });

  it("allows new identities to claim only one supported realm", () => {
    expect(migration).toContain("normalized_realm not in ('individual','business')");
    expect(migration).toContain(
      "if existing_realm = normalized_realm or existing_realm = 'legacy_dual'",
    );
    expect(migration).toContain(
      "This identity belongs to the % account realm.",
    );
    expect(migration).toContain("when personal.user_id is not null and business.user_id is not null then 'legacy_dual'");
    expect(migration).toContain("union select user_id from public.notification_preferences");
    expect(migration).toContain("union select user_id from public.category_mutation_requests");
    expect(productAuth).toContain('supabase.rpc("claim_account_realm"');
    expect(productAuth).toContain('supabase.rpc("get_my_account_realm"');
    expect(productAuth).not.toContain("requested_account_realm");
    expect(productAuth).not.toContain("requested_business_product");
  });

  it("keeps private helpers private behind constrained public RPCs", () => {
    expect(migration).toContain(
      "revoke all on function private.get_account_realm(uuid) from public, anon, authenticated",
    );
    expect(migration).toContain(
      "revoke all on function private.claim_account_realm_internal(text,text) from public, anon, authenticated",
    );
    expect(migration).toContain("create or replace function public.claim_account_realm");
    expect(migration).toContain("create or replace function public.get_my_account_realm");
    expect(migration).toContain("security definer");
  });

  it("adds restrictive realm policies to personal and every Business tenant table", () => {
    expect(migration).toContain("account_realm_individual_restriction");
    expect(migration).toContain("as restrictive for all to authenticated");
    expect(migration).toContain("private.current_account_allows(''individual'')");
    expect(migration).toContain("columns.column_name='business_id'");
    expect(migration).toContain("alter table public.%I enable row level security");
    expect(migration).toContain("account_realm_business_restriction");
    expect(migration).toContain("private.current_account_allows(''business'')");
    expect(migration).toContain("Business realm policy verification failed for:");
    expect(migration).toContain("Individual realm policy verification failed for:");
  });

  it("enforces writes while preserving service and cascade maintenance", () => {
    expect(migration).toContain("create or replace function private.enforce_record_account_realm");
    expect(migration).toContain("if auth.uid() is null then");
    expect(migration).toContain("Account realm does not permit this record.");
    expect(migration).toContain("enforce_individual_account_realm");
    expect(migration).toContain("enforce_business_owner_account_realm");
    expect(migration).toContain("enforce_business_member_account_realm");
  });

  it("claims Business realm only after invitation token and email validation", () => {
    const tokenLookup = position(migration, "where token_hash = token_digest");
    const expiryCheck = position(migration, "if invite.expires_at <= now()");
    const emailCheck = position(migration, "if current_email <> invite.email");
    const realmClaim = position(
      migration,
      "'business_invitation_acceptance'",
    );
    const membershipInsert = position(
      migration,
      "insert into public.business_members(",
    );

    expect(tokenLookup).toBeLessThan(expiryCheck);
    expect(expiryCheck).toBeLessThan(emailCheck);
    expect(emailCheck).toBeLessThan(realmClaim);
    expect(realmClaim).toBeLessThan(membershipInsert);
    expect(migration).toContain(
      "This email belongs to an Individual account. Use a separate Business identity.",
    );
  });

  it("provides a secure invited-employee account creation path", () => {
    expect(invitationHelpers).toContain("BUSINESS_INVITATION_TOKEN_PATTERN");
    expect(invitationRegister).toContain('realm="business"');
    expect(invitationRegister).toContain('mode="signup"');
    expect(invitationRegister).toContain("getBusinessInvitationAcceptancePath(token)");
    expect(invitationPage).toContain(
      'redirect(`/business/login?next=${encodeURIComponent(nextPath)}`)',
    );
    expect(productAuth).toContain("Create your invited team account");
    expect(productAuth).toContain("if (acceptingInvitation)");
    expect(realmSetup).toContain("if (acceptingInvitation)");
    expect(productAuth).toContain('membershipState === "inactive"');
    expect(productAuth).toContain('membershipState === "none"');
    expect(realmSetup).toContain("memberships.length > 0");
    expect(realmSetup).toContain('router.replace("/business?setup=1")');
    expect(realmSetup).toContain('currentRealm === null && realm === "individual"');
    expect(realmSetup).toContain('p_realm: "individual"');
    expect(realmSetup).toContain("shouldPrepareNewIdentity = true");
  });

  it("ships a disposable database regression for cross-realm denial", () => {
    expect(databaseRegression).toContain("public.claim_account_realm('individual')");
    expect(databaseRegression).toContain("Individual identity created a Business organization");
    expect(databaseRegression).toContain("Business identity created a personal account");
    expect(databaseRegression).toContain("immutable realm was changed");
    expect(databaseRegression).toContain("public.accept_business_invitation(invitation_token)");
    expect(databaseRegression).toContain("rollback;");
  });

  it("guards both product route trees on the server", () => {
    expect(dashboardLayout).toContain('accountRealmAllows(realm, "individual")');
    expect(dashboardLayout).toContain('redirect("/business")');
    expect(businessIndex).toContain('accountRealmAllows(realm, "business")');
    expect(businessIndex).toContain('redirect("/dashboard")');
    expect(businessLayout).toContain('accountRealmAllows(realm, "business")');
    expect(businessLayout).toContain('redirect("/dashboard")');
    expect(onboardingLayout).toContain('accountRealmAllows(realm, "individual")');
    expect(onboardingLayout).toContain('redirect("/business")');
  });
});
