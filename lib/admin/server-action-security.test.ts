import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const helper = readFileSync(
  resolve(root, "lib/admin/server-action-security.ts"),
  "utf8",
);
const actionFiles = [
  "app/admin/access-actions.ts",
  "app/admin/compliance-actions.ts",
  "app/admin/privacy-actions.ts",
  "app/admin/incident-actions.ts",
  "app/admin/release-actions.ts",
  "app/admin/organizations/actions.ts",
];

describe("admin Server Action security contract", () => {
  it("authenticates and rate limits through the database control", () => {
    expect(helper).toContain("supabase.auth.getUser()");
    expect(helper).toContain('"consume_api_rate_limit"');
    expect(helper).toContain("rateLimitError || allowed !== true");
  });

  it.each(actionFiles)("%s uses the shared guard", (path) => {
    expect(readFileSync(resolve(root, path), "utf8")).toContain(
      "requireRateLimitedAdminClient",
    );
  });
});
