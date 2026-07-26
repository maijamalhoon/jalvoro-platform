import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(
  readFileSync(resolve(root, "package.json"), "utf8"),
) as { scripts?: Record<string, string> };
const gate = readFileSync(
  resolve(root, "scripts/check-release-environment.mjs"),
  "utf8",
);

describe("production environment identity gate", () => {
  it("is part of the blocking check sequence", () => {
    expect(packageJson.scripts?.check).toContain("check:release-env");
  });

  it("requires an owned canonical host, support sender, and exact Sentry SHA", () => {
    expect(gate).toContain('endsWith(".vercel.app")');
    expect(gate).toContain("NEXT_PUBLIC_SUPPORT_EMAIL");
    expect(gate).toContain("SENTRY_RELEASE must equal VERCEL_GIT_COMMIT_SHA");
  });
});
