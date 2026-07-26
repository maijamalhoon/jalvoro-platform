import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../package.json"), "utf8"),
) as { scripts?: Record<string, string> };

describe("release formatting gate", () => {
  it("runs before lint, typecheck, and tests", () => {
    const check = packageJson.scripts?.check ?? "";
    expect(packageJson.scripts?.["format:check"]).toBe(
      "node scripts/format-check.mjs",
    );
    expect(check.indexOf("format:check")).toBeGreaterThan(-1);
    expect(check.indexOf("format:check")).toBeLessThan(check.indexOf("lint"));
  });
});
