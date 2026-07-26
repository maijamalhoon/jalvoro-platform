import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const brandSource = readFileSync(resolve(root, "lib/brand.ts"), "utf8");
const packageSource = readFileSync(resolve(root, "package.json"), "utf8");

describe("canonical host ownership gate", () => {
  it("uses explicit or platform production environment identity", () => {
    expect(brandSource).toContain("NEXT_PUBLIC_APP_URL");
    expect(brandSource).toContain("VERCEL_PROJECT_PRODUCTION_URL");
    expect(brandSource).not.toContain("jalvoro.com");
  });

  it("does not publish an unowned homepage", () => {
    expect(packageSource).not.toContain("https://jalvoro.com");
  });
});
