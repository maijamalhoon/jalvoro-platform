import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const proxySource = readFileSync(resolve(root, "lib/supabase/proxy.ts"), "utf8");
const nextConfig = readFileSync(resolve(root, "next.config.ts"), "utf8");

describe("complete mutation perimeter", () => {
  it.each([
    "/api/ai-insights",
    "/api/native/ai-insights",
    "/api/business/team/invite",
    "/api/categories",
    "/api/profile/avatar",
    "/api/telemetry",
  ])("rate limits %s mutations", (prefix) => {
    expect(proxySource).toContain(`prefix: "${prefix}"`);
  });

  it("applies limits to all state-changing methods", () => {
    expect(proxySource).toContain(
      "STATE_CHANGING_METHODS.has(request.method.toUpperCase())",
    );
  });

  it("bounds Server Action bodies without adding trusted origins", () => {
    expect(nextConfig).toContain('bodySizeLimit: "128kb"');
    expect(nextConfig).not.toContain("allowedOrigins:");
  });
});
