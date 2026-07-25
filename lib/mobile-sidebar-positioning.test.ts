import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());

function read(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

describe("mobile sidebar positioning contracts", () => {
  it("anchors the Personal dashboard drawer as a left viewport child", () => {
    const css = read("app/dashboard/mobile-sidebar-edge-lock.css");

    expect(css).toContain("display: flex !important;");
    expect(css).toContain("justify-content: flex-start !important;");
    expect(css).toContain("position: relative !important;");
    expect(css).toContain("flex: 0 0 auto !important;");
    expect(css).toContain("margin: 0 auto 0 0 !important;");
    expect(css).toContain("height: 100dvh !important;");
    expect(css).toContain("transform-origin: left center !important;");
    expect(css).not.toContain("position: absolute !important;");
  });

  it("uses explicit side alignment in the shared Sheet viewport", () => {
    const sheet = read("components/ui/sheet.tsx");

    expect(sheet).toContain('side === "left"');
    expect(sheet).toContain('"items-stretch justify-start"');
    expect(sheet).toContain('data-slot="sheet-viewport"');
    expect(sheet).toContain('data-side={side}');
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
    expect(css).toContain("height: 100dvh;");
    expect(css).toContain("max-height: 100dvh;");
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
