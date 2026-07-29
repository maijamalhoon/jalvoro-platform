import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const landing = read("../components/landing/PremiumLandingPage.tsx");
const startPage = read("../app/start/page.tsx");
const businessRegistration = read("../app/business/register/page.tsx");
const productAuth = read("../components/auth/ProductRealmAuth.tsx");
const invitationHelpers = read("../lib/business/invitations.ts");
const realmSetup = read("../app/auth/realm-setup/page.tsx");
const proxy = read("../proxy.ts");
const businessForm = read("../components/business/CreateBusinessWorkspaceForm.tsx");
const migration = read(
  "../supabase/migrations/20260726181500_business_product_tier_foundation.sql",
);

describe("product entry and Business registration contract", () => {
  it("routes landing authentication through product selection", () => {
    expect(landing).toContain('href="/start"');
    expect(landing).toContain('href="/start?mode=login"');
    expect(landing).toContain('prefetch={false}');
    expect(landing).toContain("with {APP_NAME}");
    expect(landing).not.toContain('href="/login?mode=signup"');
  });

  it("keeps Individual and Business entry paths explicit", () => {
    expect(startPage).toContain("Individual and Business stay separate.");
    expect(startPage).toContain('"/individual/login"');
    expect(startPage).toContain('"/individual/signup"');
    expect(startPage).toContain('href="/business/login"');
    expect(startPage).toContain('href="/business/register"');
  });

  it("offers the four approved Business products", () => {
    expect(businessRegistration).toContain('key: "solo_business"');
    expect(businessRegistration).toContain('key: "retail_pos"');
    expect(businessRegistration).toContain('key: "growing_business"');
    expect(businessRegistration).toContain('key: "enterprise"');
    expect(businessRegistration).toContain("Authorized representative only");
    expect(businessRegistration).toContain(
      "Employees do not create public Business memberships.",
    );
    expect(businessRegistration).toContain("/business/signup?");
  });

  it("keeps Business employee login organization-controlled", () => {
    expect(productAuth).toContain('type ProductRealm = "individual" | "business"');
    expect(productAuth).toContain('.from("business_members")');
    expect(productAuth).toContain('.select("business_id, status")');
    expect(productAuth).toContain(
      "This account has no active Business organization access.",
    );
    expect(productAuth).toContain("Staff are invited from inside the organization.");
    expect(productAuth).toContain('href="/business/register"');
    expect(invitationHelpers).toContain(
      'parsed.pathname !== "/business/invitations/accept"',
    );
    expect(invitationHelpers).toContain("BUSINESS_INVITATION_TOKEN_PATTERN");
    expect(productAuth).toContain("if (acceptingInvitation)");
    expect(productAuth).toContain('membershipState === "inactive"');
    expect(productAuth).toContain('membershipState === "none"');
    expect(productAuth).toContain('router.replace("/business?setup=1")');
  });

  it("seeds the selected realm before existing onboarding can show a workspace chooser", () => {
    expect(productAuth).toContain('.from("business_workspace_preferences")');
    expect(productAuth).toContain('default_workspace: choice');
    expect(productAuth).toContain('onboarding_choice: choice');
    expect(realmSetup).toContain('.from("business_workspace_preferences")');
    expect(realmSetup).toContain('router.replace(`/onboarding?next=');
    expect(realmSetup).toContain('router.replace(`/business?');
  });

  it("routes legacy login entry to dedicated product access while preserving recovery", () => {
    expect(proxy).toContain('if (request.nextUrl.pathname !== "/login") return null;');
    expect(proxy).toContain('if (mode === "forgot") return null;');
    expect(proxy).toContain('destination.pathname = "/business/login";');
    expect(proxy).toContain('destination.pathname = "/individual/login";');
    expect(proxy).toContain('destination.pathname = "/start";');
  });

  it("persists Business product tier through the creation RPC", () => {
    expect(businessForm).toContain("create_business_organization");
    expect(businessForm).toContain("p_product_tier: productTier");
    expect(businessForm).toContain('key: "solo_business"');
    expect(businessForm).toContain('key: "retail_pos"');
    expect(businessForm).toContain('key: "growing_business"');
    expect(businessForm).toContain('key: "enterprise"');

    expect(migration).toContain("add column if not exists product_tier text");
    expect(migration).toContain("businesses_product_tier_check");
    expect(migration).toContain("create or replace function public.create_business_organization");
    expect(migration).toContain("p_product_tier text default 'growing_business'");
    expect(migration).toContain("normalized_tier='retail_pos'");
    expect(migration).toContain("text,text,text,text,text,text,text");
  });
});
