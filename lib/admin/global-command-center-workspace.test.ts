import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("global Command Center workspace", () => {
  it("renders one focused operating workspace instead of the legacy endless stack", () => {
    const page = read("app/admin/page.tsx");

    expect(page).toContain("AdminWorkspaceNavigation");
    expect(page).toContain('view === "overview"');
    expect(page).toContain('view === "users"');
    expect(page).toContain('view === "organizations"');
    expect(page).toContain('view === "security"');
    expect(page).toContain('view === "reliability"');
    expect(page).toContain('view === "finance"');
    expect(page).toContain('view === "governance"');
    expect(page).toContain('view === "releases"');
    expect(page).toContain('view === "operations"');
    expect(page).not.toContain("<AdminControlCenter");
  });

  it("provides a real audited User 360 operation across every gateway boundary", () => {
    const client = read("lib/admin/command-center-client.ts");
    const edge = read("supabase/functions/command-center-gateway/index.ts");
    const migration = read(
      "supabase/migrations/20260729223000_command_center_user_360_workspace.sql",
    );
    const panel = read("components/admin/AdminUser360Panel.tsx");

    expect(client).toContain('"get_command_center_user_360"');
    expect(edge).toContain('"get_command_center_user_360"');
    expect(migration).toContain("public.get_command_center_user_360");
    expect(migration).toContain("'user_360_viewed'");
    expect(migration).toContain("'rawIpReturned', false");
    expect(migration).toContain("'exactGpsReturned', false");
    expect(migration).toContain("'financeValuesReturned', false");
    expect(migration).toContain("'sessionReplayReturned', false");
    expect(panel).toContain("No placeholder data was inserted");
    expect(panel).toContain("Audited");
    expect(panel).toContain("Privacy boundary");
  });

  it("keeps the isolated Command Center inside /admin and removes workspace exit UI", () => {
    const styles = read("app/admin/global-command-center-workspace.css");
    const globalRedirect = read("app/admin/global-operations/page.tsx");
    const organizationRedirect = read("app/admin/organizations/page.tsx");

    expect(styles).toContain(".cc-exit-link");
    expect(styles).toContain("display: none !important");
    expect(globalRedirect).toContain('redirect("/admin?view=operations")');
    expect(organizationRedirect).toContain('view: "organizations"');
  });

  it("enables privacy-minimised telemetry in production without enabling geolocation APIs", () => {
    const config = read("next.config.ts");
    const telemetryClient = read("lib/telemetry/client.ts");
    const telemetryRoute = read("app/api/telemetry/route.ts");

    expect(config).toContain('process.env.NODE_ENV === "production" ? "true" : "false"');
    expect(config).toContain("geolocation=()");
    expect(telemetryClient).toContain("globalPrivacyControl");
    expect(telemetryClient).toContain('navigator.doNotTrack !== "1"');
    expect(telemetryRoute).not.toContain("x-forwarded-for");
  });
});
