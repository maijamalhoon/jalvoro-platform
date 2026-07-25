import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const layout = read("../../app/admin/layout.tsx");
const layer = read(
  "../../components/admin/AdminCommandCenterGlobalOperatorLayer.tsx",
);
const styles = read("../../app/admin/command-center-global-operator.css");

describe("Command Center global operator layer", () => {
  it("mounts one additive client layer without replacing the server shell", () => {
    expect(layout).toContain("AdminCommandCenterGlobalOperatorLayer");
    expect(layout).toContain("<AdminCommandCenterGlobalOperatorLayer />");
    expect(layout).toContain(
      "<AdminCommandCenterShell>{children}</AdminCommandCenterShell>",
    );
    expect(layout).toContain(
      'import "./command-center-global-operator.css"',
    );
  });

  it("derives navigation only from the rendered authorized sidebar", () => {
    expect(layer).toContain(
      'document.querySelectorAll<HTMLAnchorElement>(".cc-sidebar-nav a[href]")',
    );
    expect(layer).toContain("normalizeAuthorizedOperatorModules");
    expect(layer).toContain("No authorized module is assigned");
    expect(layer).not.toContain('router.push("/admin/');
  });

  it("keeps operational feedback truthful and non-telemetric", () => {
    expect(layer).toContain("Browser network connection restored.");
    expect(layer).toContain("Server view refresh requested.");
    expect(layer).toContain(
      "Existing data remains visible while it revalidates.",
    );
    expect(layer).not.toContain("System healthy");
    expect(layer).not.toContain("All services operational");
  });

  it("ships keyboard, focus, contrast and motion safeguards", () => {
    expect(layer).toContain('aria-keyshortcuts="?"');
    expect(layer).toContain("handleDialogKeyDown");
    expect(layer).toContain('aria-live="polite"');
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toContain("@media (forced-colors: active)");
    expect(styles).toContain("env(safe-area-inset-bottom)");
  });
});
