import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { JalvoroIcon } from "@/components/icons/jalvoro/JalvoroIcon";
import { ACTIONS_ICON_DEFINITIONS } from "@/components/icons/jalvoro/definitions/actions";
import {
  JALVORO_ACTIONS_MASTER_NAMES,
  JALVORO_ACTIONS_MASTER_SPEC,
  JALVORO_ACTIONS_NAMING_STANDARD,
} from "@/lib/icon-system/actions-master-set";

function geometrySignature(
  definition: (typeof ACTIONS_ICON_DEFINITIONS)[number],
) {
  return JSON.stringify(definition.body);
}

describe("JALVORO actions master set", () => {
  it("contains the complete canonical actions set", () => {
    expect(ACTIONS_ICON_DEFINITIONS.map((definition) => definition.name)).toEqual(
      JALVORO_ACTIONS_MASTER_NAMES,
    );
    expect(JALVORO_ACTIONS_MASTER_NAMES).toHaveLength(18);
  });

  it("keeps every action silhouette unique and compact", () => {
    const signatures = ACTIONS_ICON_DEFINITIONS.map(geometrySignature);
    expect(new Set(signatures).size).toBe(signatures.length);

    for (const definition of ACTIONS_ICON_DEFINITIONS) {
      expect(definition.body.length).toBeGreaterThan(0);
      expect(definition.body.length).toBeLessThanOrEqual(5);
      expect(definition.objects).toBeLessThanOrEqual(2);
    }
  });

  it("forbids decorative micro-accents in mastered action geometry", () => {
    for (const definition of ACTIONS_ICON_DEFINITIONS) {
      expect(definition.defaultAccent).toBe("none");
      expect("accent" in definition).toBe(false);

      const markup = renderToStaticMarkup(
        <JalvoroIcon name={definition.name} accent="zigzag" size={24} />,
      );
      expect(markup).not.toContain("data-jalvoro-micro-accent");
    }
  });

  it("renders cleanly at every approved interface size", () => {
    for (const name of JALVORO_ACTIONS_MASTER_NAMES) {
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

  it("documents one semantic cue and explicit rejection list per action", () => {
    for (const name of JALVORO_ACTIONS_MASTER_NAMES) {
      const spec = JALVORO_ACTIONS_MASTER_SPEC[name];
      expect(spec.status).toBe("master");
      expect(spec.semanticIntent.length).toBeGreaterThan(20);
      expect(spec.silhouette.length).toBeGreaterThan(20);
      expect(spec.primaryCue.length).toBeGreaterThan(3);
      expect(spec.avoid.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps true opposite actions explicitly paired", () => {
    for (const pair of [
      ["export", "import"],
      ["download", "upload"],
      ["undo", "redo"],
    ] as const) {
      expect(JALVORO_ACTIONS_MASTER_SPEC[pair[0]].relationship).toContain(pair[1]);
      expect(JALVORO_ACTIONS_MASTER_SPEC[pair[1]].relationship).toContain(pair[0]);
    }
  });

  it("locks stable action naming conventions for future agents", () => {
    expect(JALVORO_ACTIONS_NAMING_STANDARD.sourceId).toContain("kebab-case");
    expect(JALVORO_ACTIONS_NAMING_STANDARD.component).toContain("Jalvoro");
    expect(JALVORO_ACTIONS_NAMING_STANDARD.aliases).toContain("Search-only");
    expect(JALVORO_ACTIONS_NAMING_STANDARD.statusBoundary).toContain("status");
  });
});
