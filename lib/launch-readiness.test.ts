import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());

function read(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

describe("launch readiness contracts", () => {
  it("publishes the required public trust pages", () => {
    for (const path of [
      "app/privacy/page.tsx",
      "app/terms/page.tsx",
      "app/disclosures/page.tsx",
      "app/support/page.tsx",
    ]) {
      expect(existsSync(resolve(root, path)), `${path} should exist`).toBe(true);
    }
  });

  it("keeps public trust pages outside the authentication wall", () => {
    const proxy = read("lib/supabase/proxy.ts");
    for (const route of ["/privacy", "/terms", "/disclosures", "/support"]) {
      expect(proxy).toContain(`\"${route}\"`);
    }
  });

  it("links account access to the full privacy notice", () => {
    const authShell = read("components/auth/AuthShell.tsx");
    expect(authShell).toContain('href="/privacy"');
    expect(authShell).not.toContain('href="/#privacy"');
  });

  it("keeps legal routes discoverable", () => {
    const sitemap = read("app/sitemap.ts");
    for (const route of ["/privacy", "/terms", "/disclosures", "/support"]) {
      expect(sitemap).toContain(route);
    }
  });

  it("keeps lint, tests, typecheck, and production build blocking in CI", () => {
    const workflow = read(".github/workflows/ci.yml");
    expect(workflow).toContain("npm run lint");
    expect(workflow).toContain("npm run typecheck");
    expect(workflow).toContain("npm test");
    expect(workflow).toContain("npm run build");
    expect(workflow).not.toContain("continue-on-error: true");
  });

  it("keeps workflow dependencies pinned and prevents direct source pushes", () => {
    const workflowDirectory = resolve(root, ".github/workflows");
    const workflowPaths = readdirSync(workflowDirectory)
      .filter((name) => /\.ya?ml$/i.test(name))
      .map((name) => resolve(workflowDirectory, name));

    for (const path of workflowPaths) {
      const workflow = readFileSync(path, "utf8");
      expect(workflow).not.toMatch(/contents:\s*write/);
      expect(workflow).not.toMatch(/\bgit\s+push\b/);

      for (const match of workflow.matchAll(/uses:\s*\S+@(\S+)/g)) {
        expect(match[1], `${path} should pin actions by commit SHA`).toMatch(
          /^[0-9a-f]{40}$/,
        );
      }
    }
  });

  it("monitors the public service and authentication boundary", () => {
    const workflow = read(".github/workflows/production-smoke-monitor.yml");
    expect(workflow).toContain("PRODUCTION_BASE_URL");
    expect(workflow).toContain("/privacy");
    expect(workflow).toContain("/dashboard");
    expect(workflow).toContain("/api/ai-insights");
    expect(workflow).toContain('"401"');
  });
});
