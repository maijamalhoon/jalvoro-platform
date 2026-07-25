import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  getProductExperience,
  getProductExperienceFromPathname,
  inferProductExperienceFromDestination,
  listProductExperiences,
} from "./product-experiences";

const startSource = readFileSync(new URL("../app/start/page.tsx", import.meta.url), "utf8");
const previewSource = readFileSync(
  new URL("../app/start/[experience]/page.tsx", import.meta.url),
  "utf8",
);
const loginRouteSource = readFileSync(
  new URL("../app/login/[experience]/page.tsx", import.meta.url),
  "utf8",
);
const signupRouteSource = readFileSync(
  new URL("../app/signup/[experience]/page.tsx", import.meta.url),
  "utf8",
);
const productAuthRouteSource = readFileSync(
  new URL("../components/auth/ProductAuthRoute.tsx", import.meta.url),
  "utf8",
);
const authShellSource = readFileSync(
  new URL("../components/auth/AuthShell.tsx", import.meta.url),
  "utf8",
);
const onboardingBridgeSource = readFileSync(
  new URL("../app/onboarding/[experience]/page.tsx", import.meta.url),
  "utf8",
);
const proxySource = readFileSync(new URL("../proxy.ts", import.meta.url), "utf8");
const sessionProxySource = readFileSync(
  new URL("./supabase/proxy.ts", import.meta.url),
  "utf8",
);

const expectedSlugs = [
  "personal",
  "freelancer",
  "small-business",
  "retail-pos",
  "enterprise",
];

describe("JALVORO product experience architecture", () => {
  it("defines the five global entry experiences with unique public and auth routes", () => {
    const experiences = listProductExperiences();

    expect(experiences.map(({ slug }) => slug)).toEqual(expectedSlugs);
    expect(new Set(experiences.map(({ previewPath }) => previewPath)).size).toBe(5);
    expect(new Set(experiences.map(({ loginPath }) => loginPath)).size).toBe(5);
    expect(new Set(experiences.map(({ signupPath }) => signupPath)).size).toBe(5);
    expect(new Set(experiences.map(({ onboardingPath }) => onboardingPath)).size).toBe(5);
    expect(experiences.filter(({ workspaceKind }) => workspaceKind === "personal")).toHaveLength(1);
    expect(experiences.filter(({ workspaceKind }) => workspaceKind === "business")).toHaveLength(4);
  });

  it("uses improved global-standard audience names", () => {
    const labels = listProductExperiences().map(({ label }) => label);

    expect(labels).toEqual([
      "For Individuals",
      "For Freelancers & Self-Employed",
      "For Small Businesses",
      "Retail & Point of Sale",
      "Enterprise Operations",
    ]);
    expect(labels.join(" ")).not.toMatch(/large company|for you/i);
  });

  it("resolves path and legacy destination context without mixing modules", () => {
    expect(getProductExperienceFromPathname("/login/personal")?.slug).toBe("personal");
    expect(getProductExperienceFromPathname("/signup/enterprise")?.slug).toBe("enterprise");
    expect(inferProductExperienceFromDestination("/dashboard")?.slug).toBe("personal");
    expect(inferProductExperienceFromDestination("/business")?.slug).toBe("small-business");
    expect(
      inferProductExperienceFromDestination(
        "/business?setup=1&experience=retail-pos",
      )?.slug,
    ).toBe("retail-pos");
    expect(
      inferProductExperienceFromDestination(
        "/onboarding/enterprise?next=%2Fbusiness%3Fsetup%3D1",
      )?.slug,
    ).toBe("enterprise");
    expect(getProductExperience("unknown")).toBeNull();
  });

  it("presents selector, preview, sign-in, and signup as explicit separate steps", () => {
    expect(startSource).toContain("Choose your JALVORO experience");
    expect(startSource).toContain("Explore this workspace");
    expect(startSource).toContain("One email creates one identity");
    expect(startSource).toContain("Switching is always an explicit action");
    expect(previewSource).toContain("Create {experience.productName} account");
    expect(previewSource).toContain("Sign in to this workspace");
    expect(previewSource).toContain("A second identity will not be created");
  });

  it("keeps public and auth metadata single-branded under the root title template", () => {
    expect(startSource).toContain(
      "title: { absolute: `Choose your workspace | ${APP_NAME}` }",
    );
    expect(previewSource).toContain(
      "title: { absolute: `${experience.productName} | ${APP_NAME}` }",
    );
    expect(loginRouteSource).toContain("title: `Sign in to ${experience.productName}`");
    expect(signupRouteSource).toContain(
      "title: `Create ${experience.productName} account`",
    );
    expect(loginRouteSource).not.toContain("| ${APP_NAME}");
    expect(signupRouteSource).not.toContain("| ${APP_NAME}");
  });

  it("keeps every dedicated page on the existing shared authentication engine", () => {
    expect(loginRouteSource).toContain('mode="login"');
    expect(signupRouteSource).toContain('mode="signup"');
    expect(productAuthRouteSource).toContain('import LoginPage from "@/app/login/page"');
    expect(productAuthRouteSource).toContain("return <LoginPage />");
    expect(productAuthRouteSource).not.toMatch(/createClient|signInWithPassword|signUp\(/);
    expect(authShellSource).toContain("getProductExperienceFromPathname");
    expect(authShellSource).toContain("One account · separate workspaces");
    expect(authShellSource).toContain("displayTitle");
    expect(authShellSource).toContain("displayDescription");
    expect(authShellSource).toContain("Create your ${experience.productName} account");
    expect(authShellSource).toContain("Sign in to ${experience.productName}");
  });

  it("preserves selected onboarding context without clearing an active business", () => {
    expect(onboardingBridgeSource).toContain('.select("active_business_id")');
    expect(onboardingBridgeSource).toContain(
      "active_business_id: preferenceResult.data?.active_business_id ?? null",
    );
    expect(onboardingBridgeSource).toContain("jalvoro_start_experience");
    expect(onboardingBridgeSource).toContain("onboarding_choice: selectedWorkspace");
    expect(onboardingBridgeSource).toContain("profileResult.data?.onboarding_completed");
    expect(onboardingBridgeSource).toContain("redirect(destination)");
    expect(onboardingBridgeSource).not.toContain("service_role");
  });

  it("normalizes legacy public signup and callback onboarding routes", () => {
    expect(proxySource).toContain("getLegacyEntryRedirect");
    expect(proxySource).toContain("getOnboardingRedirect");
    expect(proxySource).toContain("selectedExperience.signupPath");
    expect(proxySource).toContain('destination.pathname = "/start"');
    expect(sessionProxySource).toContain('"/start"');
    expect(sessionProxySource).toContain('"/signup"');
    expect(sessionProxySource).toContain(
      'const AUTH_ONLY_PAGE_ROUTES = ["/", "/login", "/signup"]',
    );
  });
});
