import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());

function read(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

describe("Command Center Next", () => {
  it("loads the immersive operating-system visual layer last", () => {
    const layout = read("app/admin/layout.tsx");
    const nextIndex = layout.indexOf('import "./command-center-next.css"');
    const legacyIndex = layout.indexOf('import "./global-command-center-workspace.css"');

    expect(nextIndex).toBeGreaterThan(legacyIndex);
    expect(read("app/admin/command-center-next.css")).toContain(".cc-next-world");
  });

  it("keeps every primary workspace available from the isolated shell", () => {
    const shell = read("components/admin/AdminCommandCenterShellClient.tsx");

    for (const route of [
      "/admin?view=users",
      "/admin?view=organizations",
      "/admin?view=reliability",
      "/admin?view=operations",
      "/admin?view=finance",
      "/admin?view=security",
      "/admin?view=governance",
      "/admin?view=releases",
    ]) {
      expect(shell).toContain(route);
    }

    expect(shell).toContain('href="#admin-main"');
    expect(shell).toContain('id="admin-main"');
    expect(shell).not.toContain("Exit to workspace");
    expect(shell).not.toContain('href="/dashboard"');
  });

  it("replaces the overview card gallery with operational surfaces", () => {
    const overview = read("components/admin/AdminExecutiveOverview.tsx");

    expect(overview).toContain("Action Center");
    expect(overview).toContain("Live systems");
    expect(overview).toContain("Recent activity");
    expect(overview).toContain("cc-next-metric-strip");
    expect(overview).not.toContain("cc-exec-actions");
  });

  it("renders User 360 as a split investigation workspace", () => {
    const user360 = read("components/admin/AdminUser360Panel.tsx");
    const directory = read("components/admin/AdminUserOperationsPanel.tsx");

    expect(user360).toContain("cc360-next-layout");
    expect(user360).toContain("SIGNAL RAIL");
    expect(user360).toContain("Recent sessions");
    expect(user360).toContain("Privacy boundary");
    expect(directory).toContain("cc-directory-table");
    expect(directory).toContain("Open");
  });
});
