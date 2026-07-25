import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("public launch surface", () => {
  it("publishes the current JALVORO origin across discovery files", () => {
    const brand = read("lib/brand.ts");
    const sitemap = read("app/sitemap.ts");
    const robots = read("app/robots.ts");
    const securityText = read("public/.well-known/security.txt");

    expect(brand).toContain("https://jalvoro-app.vercel.app");
    expect(sitemap).toContain('import { APP_URL } from "@/lib/brand"');
    expect(robots).toContain('import { APP_URL } from "@/lib/brand"');
    expect(securityText).toContain(
      "Canonical: https://jalvoro-app.vercel.app/.well-known/security.txt",
    );
    expect(securityText).toContain(
      "Contact: https://jalvoro-app.vercel.app/support#security",
    );
    expect(securityText).toContain(
      "Policy: https://jalvoro-app.vercel.app/support#security",
    );

    expect(sitemap).not.toContain("jamals-finance-sable.vercel.app");
    expect(robots).not.toContain("jamals-finance-sable.vercel.app");
    expect(securityText).not.toContain("jamals-finance-sable.vercel.app");
    expect(securityText).not.toContain("github.com/maijamalhoon");
  });

  it("exposes truthful free access, separate onboarding, and trust routes", () => {
    const page = read("app/page.tsx");
    const rail = read("components/landing/LaunchAccessRail.tsx");

    expect(page).toContain("<LaunchAccessRail />");
    expect(page).toContain("<LaunchLegalRail />");
    expect(rail).toContain("Free access.");
    expect(rail).toContain("No payment required.");
    expect(rail).toContain("Homepage figures are illustrative.");
    expect(rail).toContain("/login?mode=signup&next=/dashboard");
    expect(rail).toContain("/login?mode=signup&next=/business");

    for (const route of ["/privacy", "/terms", "/disclosures", "/support"]) {
      expect(rail).toContain(`href=\"${route}\"`);
    }
  });

  it("removes the misleading live badge from the illustrative preview", () => {
    const page = read("app/page.tsx");
    const trustStyles = read("app/landing-launch-trust.css");

    expect(page).toContain('import "./landing-launch-trust.css"');
    expect(trustStyles).toContain(".jf-node4-landing .jf-live-pill");
    expect(trustStyles).toContain("display: none !important");
  });

  it("does not invent paid pricing or a support inbox", () => {
    const rail = read("components/landing/LaunchAccessRail.tsx");

    expect(rail).toContain("Paid pricing and payment");
    expect(rail).toContain("collection are not advertised.");
    expect(rail).not.toMatch(/free trial/i);
    expect(rail).not.toMatch(/credit card/i);
    expect(rail).not.toMatch(/support@/i);
  });

  it("keeps private workspaces out of crawler discovery", () => {
    const robots = read("app/robots.ts");
    const sitemap = read("app/sitemap.ts");

    for (const route of ["/api", "/admin", "/onboarding", "/business", "/dashboard"]) {
      expect(robots).toContain(`\"${route}\"`);
    }

    expect(sitemap).not.toContain("/business");
    expect(sitemap).not.toContain("/dashboard");
    expect(sitemap).not.toContain("/onboarding");
  });
});
