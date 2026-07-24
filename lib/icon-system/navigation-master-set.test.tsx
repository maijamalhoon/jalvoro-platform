import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { JalvoroIcon } from "@/components/icons/jalvoro/JalvoroIcon";
import { NAVIGATION_ICON_DEFINITIONS } from "@/components/icons/jalvoro/definitions/navigation";
import {
  JALVORO_NAVIGATION_MASTER_NAMES,
  JALVORO_NAVIGATION_MASTER_SPEC,
  JALVORO_NAVIGATION_NAMING_STANDARD,
} from "@/lib/icon-system/navigation-master-set";

function geometrySignature(
  definition: (typeof NAVIGATION_ICON_DEFINITIONS)[number],
) {
  return JSON.stringify(definition.body);
}

describe("JALVORO navigation master set", () => {
  it("contains the complete canonical navigation set", () => {
    expect(NAVIGATION_ICON_DEFINITIONS.map((definition) => definition.name)).toEqual(
      JALVORO_NAVIGATION_MASTER_NAMES,
    );
    expect(JALVORO_NAVIGATION_MASTER_NAMES).toHaveLength(12);
  });

  it("keeps every navigation silhouette unique and intentionally simple", () => {
    const signatures = NAVIGATION_ICON_DEFINITIONS.map(geometrySignature);
    expect(new Set(signatures).size).toBe(signatures.length);

    for (const definition of NAVIGATION_ICON_DEFINITIONS) {
      expect(definition.body.length).toBeGreaterThan(0);
      expect(definition.body.length).toBeLessThanOrEqual(6);
      expect(definition.objects).toBeLessThanOrEqual(2);
    }
  });

  it("forbids decorative micro-accents in the navigation master geometry", () => {
    for (const definition of NAVIGATION_ICON_DEFINITIONS) {
      expect(definition.defaultAccent).toBe("none");
      expect("accent" in definition).toBe(false);

      const markup = renderToStaticMarkup(
        <JalvoroIcon name={definition.name} accent="zigzag" size={24} />,
      );
      expect(markup).not.toContain("data-jalvoro-micro-accent");
    }
  });

  it("renders cleanly at every approved interface size", () => {
    for (const name of JALVORO_NAVIGATION_MASTER_NAMES) {
      for (const size of [16, 20, 24, 32]) {
        const markup = renderToStaticMarkup(
          <JalvoroIcon name={name} size={size} title={name} />,
        );
        expect(markup).toContain(`width=\"${size}\"`);
        expect(markup).toContain(`height=\"${size}\"`);
        expect(markup).toContain(`data-jalvoro-icon=\"${name}\"`);
        expect(markup).not.toMatch(/(?:stroke|fill)=\"#[0-9a-f]{3,8}\"/i);
      }
    }
  });

  it("documents one semantic cue and explicit rejection list per icon", () => {
    for (const name of JALVORO_NAVIGATION_MASTER_NAMES) {
      const spec = JALVORO_NAVIGATION_MASTER_SPEC[name];
      expect(spec.status).toBe("master");
      expect(spec.semanticIntent.length).toBeGreaterThan(20);
      expect(spec.silhouette.length).toBeGreaterThan(20);
      expect(spec.primaryCue.length).toBeGreaterThan(3);
      expect(spec.avoid.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("locks stable naming conventions for future agents", () => {
    expect(JALVORO_NAVIGATION_NAMING_STANDARD.sourceId).toContain("kebab-case");
    expect(JALVORO_NAVIGATION_NAMING_STANDARD.component).toContain("Jalvoro");
    expect(JALVORO_NAVIGATION_NAMING_STANDARD.aliases).toContain("Search-only");
  });
});
