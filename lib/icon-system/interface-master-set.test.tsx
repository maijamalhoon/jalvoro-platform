import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { JalvoroIcon } from "@/components/icons/jalvoro/JalvoroIcon";
import { INTERFACE_ICON_DEFINITIONS } from "@/components/icons/jalvoro/definitions/interface";
import {
  JALVORO_INTERFACE_MASTER_NAMES,
  JALVORO_INTERFACE_MASTER_SPEC,
  JALVORO_INTERFACE_NAMING_STANDARD,
} from "@/lib/icon-system/interface-master-set";

function geometrySignature(
  definition: (typeof INTERFACE_ICON_DEFINITIONS)[number],
) {
  return JSON.stringify(definition.body);
}

describe("JALVORO interface master set", () => {
  it("contains the complete canonical interface set", () => {
    expect(INTERFACE_ICON_DEFINITIONS.map((definition) => definition.name)).toEqual(
      JALVORO_INTERFACE_MASTER_NAMES,
    );
    expect(JALVORO_INTERFACE_MASTER_NAMES).toHaveLength(10);
  });

  it("keeps every interface silhouette unique and restrained", () => {
    const signatures = INTERFACE_ICON_DEFINITIONS.map(geometrySignature);
    expect(new Set(signatures).size).toBe(signatures.length);

    for (const definition of INTERFACE_ICON_DEFINITIONS) {
      expect(definition.body.length).toBeGreaterThan(0);
      expect(definition.body.length).toBeLessThanOrEqual(4);
      expect(definition.objects).toBe(1);
    }
  });

  it("forbids decorative micro-accents in mastered interface geometry", () => {
    for (const definition of INTERFACE_ICON_DEFINITIONS) {
      expect(definition.defaultAccent).toBe("none");
      expect("accent" in definition).toBe(false);

      const markup = renderToStaticMarkup(
        <JalvoroIcon name={definition.name} accent="wave" size={24} />,
      );
      expect(markup).not.toContain("data-jalvoro-micro-accent");
    }
  });

  it("renders cleanly at every approved interface size", () => {
    for (const name of JALVORO_INTERFACE_MASTER_NAMES) {
      for (const size of [16, 20, 24, 32]) {
        const markup = renderToStaticMarkup(
          <JalvoroIcon name={name} size={size} title={name} />,
        );
        expect(markup).toContain(`width="${size}"`);
        expect(markup).toContain(`height="${size}"`);
        expect(markup).toContain(`data-jalvoro-icon="${name}"`);
        expect(markup).not.toMatch(/(?:stroke|fill)="#[0-9a-f]{3,8}"/i);
      }
    }
  });

  it("documents one semantic cue and rejection list per interface icon", () => {
    for (const name of JALVORO_INTERFACE_MASTER_NAMES) {
      const spec = JALVORO_INTERFACE_MASTER_SPEC[name];
      expect(spec.status).toBe("master");
      expect(spec.semanticIntent.length).toBeGreaterThan(20);
      expect(spec.silhouette.length).toBeGreaterThan(20);
      expect(spec.primaryCue.length).toBeGreaterThan(3);
      expect(spec.relationship?.length).toBeGreaterThan(20);
      expect(spec.avoid.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps layout, visibility, disclosure and directional meanings separate", () => {
    expect(JALVORO_INTERFACE_MASTER_SPEC.grid.relationship).toContain("list");
    expect(JALVORO_INTERFACE_MASTER_SPEC.list.relationship).toContain("grid");
    expect(JALVORO_INTERFACE_MASTER_SPEC.eye.relationship).toContain("eye-off");
    expect(JALVORO_INTERFACE_MASTER_SPEC["eye-off"].relationship).toContain("eye");
    expect(JALVORO_INTERFACE_MASTER_SPEC["chevron-right"].relationship).toContain(
      "arrow-right",
    );
    expect(JALVORO_INTERFACE_MASTER_SPEC["arrow-left"].relationship).toContain("undo");
    expect(JALVORO_INTERFACE_MASTER_SPEC["arrow-right"].relationship).toContain("send");
    expect(JALVORO_INTERFACE_MASTER_SPEC["arrow-right"].relationship).toContain("export");
  });

  it("locks stable interface naming and category boundaries", () => {
    expect(JALVORO_INTERFACE_NAMING_STANDARD.sourceId).toContain("kebab-case");
    expect(JALVORO_INTERFACE_NAMING_STANDARD.component).toContain("Jalvoro");
    expect(JALVORO_INTERFACE_NAMING_STANDARD.aliases).toContain("Search-only");
    expect(JALVORO_INTERFACE_NAMING_STANDARD.controlBoundary).toContain("Navigation");
    expect(JALVORO_INTERFACE_NAMING_STANDARD.controlBoundary).toContain("Actions");
    expect(JALVORO_INTERFACE_NAMING_STANDARD.directionBoundary).toContain("Chevrons");
    expect(JALVORO_INTERFACE_NAMING_STANDARD.directionBoundary).toContain("arrows");
  });
});
