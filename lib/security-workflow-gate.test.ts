import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const security = readFileSync(
  resolve(root, ".github/workflows/security.yml"),
  "utf8",
);

describe("security workflow release gate", () => {
  it("does not bypass dependency review failures", () => {
    expect(security).toContain("actions/dependency-review-action");
    expect(security).not.toContain("continue-on-error");
  });

  it("runs CodeQL for private release candidates", () => {
    expect(security).toContain("github/codeql-action/analyze");
    expect(security).not.toContain("repository.private == false");
  });
});
