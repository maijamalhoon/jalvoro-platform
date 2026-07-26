import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const nextConfig = readFileSync(resolve(process.cwd(), "next.config.ts"), "utf8");

describe("Control Plane browser security policy", () => {
  it("allows only the two configured Supabase realms in connect-src", () => {
    expect(nextConfig).toContain("commandCenterSupabaseOrigin");
    expect(nextConfig).toContain("commandCenterSupabaseWebSocketOrigin");
    expect(nextConfig).toContain("https://zzvpovvuybfihwgjrder.supabase.co");
    expect(nextConfig).toContain("supabaseOrigin");
    expect(nextConfig).toContain("supabaseWebSocketOrigin");
    expect(nextConfig).not.toContain('"connect-src *"');
  });

  it("prevents shared caches from storing private operator surfaces", () => {
    expect(nextConfig).toContain('{ source: "/admin/:path*", headers: privateNoStoreHeaders }');
    expect(nextConfig).toContain('{ source: "/control", headers: privateNoStoreHeaders }');
    expect(nextConfig).toContain('{ source: "/control-login", headers: privateNoStoreHeaders }');
    expect(nextConfig).toContain('{ source: "/control-invite", headers: privateNoStoreHeaders }');
    expect(nextConfig).toContain('"Vercel-CDN-Cache-Control", value: "no-store"');
  });
});
