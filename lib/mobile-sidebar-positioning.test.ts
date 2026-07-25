import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());

function read(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

describe("mobile sidebar positioning contracts", () => {
  it("pins the Personal dashboard drawer to the physical left edge", () => {
    const css = read("app/dashboard/mobile-sidebar-edge-lock.css");

    expect(css).toContain("position: absolute !important;");
    expect(css).toContain("inset: 0 auto 0 0 !important;");
    expect(css).toContain("left: 0 !important;");
    expect(css).toContain("right: auto !important;");
    expect(css).toContain("transform-origin: left center !important;");
  });

  it("keeps the dashboard edge lock as the final dashboard CSS authority", () => {
    const layout = read("app/dashboard/layout.tsx");
    const edgeLockImport = 'import "./mobile-sidebar-edge-lock.css";';

    expect(layout).toContain(edgeLockImport);
    expect(layout.lastIndexOf(edgeLockImport)).toBeGreaterThan(
      layout.lastIndexOf('import "./mobile-sidebar-reference.css";'),
    );
  });

  it("renders Command Center mobile navigation as a left drawer", () => {
    const css = read("app/admin/command-center-launch-mobile.css");

    expect(css).toContain(".cc-overlay-mobile {");
    expect(css).toContain("display: flex;");
    expect(css).toContain("justify-content: flex-start;");
    expect(css).toContain("margin: 0 auto 0 0;");
    expect(css).toContain("transform-origin: left center;");
    expect(css).toContain("transform: translate3d(-100%, 0, 0);");
  });

  it("loads the Command Center mobile override after the base shell CSS", () => {
    const layout = read("app/admin/layout.tsx");
    const baseImport = 'import "./command-center-world.css";';
    const mobileImport = 'import "./command-center-launch-mobile.css";';

    expect(layout.indexOf(mobileImport)).toBeGreaterThan(layout.indexOf(baseImport));
  });
});
