import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const config = readFileSync(
  resolve(import.meta.dirname, "../next.config.ts"),
  "utf8",
);

describe("Sentry source-map release gate", () => {
  it("uploads only with complete credentials and an exact release", () => {
    expect(config).toContain("SENTRY_AUTH_TOKEN");
    expect(config).toContain("SENTRY_ORG");
    expect(config).toContain("SENTRY_PROJECT");
    expect(config).toContain("SENTRY_RELEASE");
    expect(config).toContain("VERCEL_GIT_COMMIT_SHA");
    expect(config).toContain("withSentryConfig(nextConfig");
  });
});
