import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  resolve(
    import.meta.dirname,
    "../.github/workflows/command-center-exact-head.yml",
  ),
  "utf8",
);

describe("exact-head runner reliability", () => {
  it("uses an ephemeral GitHub-hosted Node 24 runner", () => {
    expect(workflow).toContain("runs-on: ubuntu-latest");
    expect(workflow).toContain("node-version: 24");
    expect(workflow).not.toContain("self-hosted");
    expect(workflow).not.toContain("shell: cmd");
  });
});
