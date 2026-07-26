import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const landing = read("../components/landing/PremiumLandingPage.tsx");
const startPage = read("../app/start/page.tsx");
const businessRegistration = read("../app/business/register/page.tsx");
const login = read("../app/login/page.tsx");
const onboarding = read("../app/onboarding/page.tsx");
const businessForm = read("../components/business/CreateBusinessWorkspaceForm.tsx");
const migration = read(
  "../supabase/migrations/20260726181500_business_product_tier_foundation.sql",
);

describe("product entry and Business registration contract", () => {
  it("routes landing authentication through product selection", () => {
    expect(landing).toContain('href="/start"');
    expect(landing).toContain('href="/start?mode=login"');
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
  });

  it("does not expose public Business signup from the employee login path", () => {
    expect(login).toContain(
      'mode === "signup" && authRealm === "business" && !organizationRegistration',
    );
    expect(login).toContain("Register through the Business products page");
    expect(login).toContain(
      "Staff access is created from inside the organization.",
    );
  });

  it("removes the legacy one-account-two-workspaces onboarding promise", () => {
    expect(onboarding).not.toContain("One account · two workspaces");
    expect(onboarding).not.toContain(
      "You can use both workspaces and switch between them later.",
    );
    expect(onboarding).toContain('pageParams.get("realm") === "business"');
    expect(onboarding).toContain("setForcedWorkspaceChoice(requestedChoice)");
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
    expect(migration).not.toContain("create or replace function public.create_business_workspace_with_mode(\n  p_name text,\n  p_business_type text,\n  p_workspace_mode text default 'advanced_company',\n  p_country_code text default null,\n  p_base_currency text default 'PKR',\n  p_timezone text default 'UTC',\n  p_product_tier text");
  });
});
