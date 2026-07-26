import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const legacyHost = ["jamals-finance-sable", "vercel.app"].join(".");
const legacyRepository = ["maijamalhoon", "Jamals-finance"].join("/");

describe("public repository and host identity", () => {
  it.each([
    "README.md",
    "CONTRIBUTING.md",
    "public/.well-known/security.txt",
    ".github/ISSUE_TEMPLATE/config.yml",
    ".github/workflows/production-smoke-monitor.yml",
    "android-twa/twa-manifest.json",
  ])("%s does not publish the legacy host or repository", (path) => {
    const content = read(path);
    expect(content).not.toContain(legacyHost);
    expect(content).not.toContain(legacyRepository);
  });

  it("requires an owned production smoke host", () => {
    const workflow = read(".github/workflows/production-smoke-monitor.yml");
    expect(workflow).toContain("vars.PRODUCTION_BASE_URL");
    expect(workflow).toContain("*.vercel.app");
  });
});
