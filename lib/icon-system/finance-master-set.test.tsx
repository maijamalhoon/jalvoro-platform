import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { JalvoroIcon } from "@/components/icons/jalvoro/JalvoroIcon";
import { FINANCE_ICON_DEFINITIONS } from "@/components/icons/jalvoro/definitions/finance";
import {
  JALVORO_FINANCE_MASTER_NAMES,
  JALVORO_FINANCE_MASTER_SPEC,
  JALVORO_FINANCE_NAMING_STANDARD,
} from "@/lib/icon-system/finance-master-set";

function geometrySignature(
  definition: (typeof FINANCE_ICON_DEFINITIONS)[number],
) {
  return JSON.stringify(definition.body);
}

describe("JALVORO finance master set", () => {
  it("contains the complete canonical finance set", () => {
    expect(FINANCE_ICON_DEFINITIONS.map((definition) => definition.name)).toEqual(
      JALVORO_FINANCE_MASTER_NAMES,
    );
    expect(JALVORO_FINANCE_MASTER_NAMES).toHaveLength(16);
  });

  it("keeps every finance silhouette unique and restrained", () => {
    const signatures = FINANCE_ICON_DEFINITIONS.map(geometrySignature);
    expect(new Set(signatures).size).toBe(signatures.length);

    for (const definition of FINANCE_ICON_DEFINITIONS) {
      expect(definition.body.length).toBeGreaterThan(0);
      expect(definition.body.length).toBeLessThanOrEqual(5);
      expect(definition.objects).toBeLessThanOrEqual(2);
    }
  });

  it("forbids decorative micro-accents in mastered finance geometry", () => {
    for (const definition of FINANCE_ICON_DEFINITIONS) {
      expect(definition.defaultAccent).toBe("none");
      expect("accent" in definition).toBe(false);

      const markup = renderToStaticMarkup(
        <JalvoroIcon name={definition.name} accent="wave" size={24} />,
      );
      expect(markup).not.toContain("data-jalvoro-micro-accent");
    }
  });

  it("renders cleanly at every approved interface size", () => {
    for (const name of JALVORO_FINANCE_MASTER_NAMES) {
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

  it("documents one semantic cue and rejection list per finance icon", () => {
    for (const name of JALVORO_FINANCE_MASTER_NAMES) {
      const spec = JALVORO_FINANCE_MASTER_SPEC[name];
      expect(spec.status).toBe("master");
      expect(spec.semanticIntent.length).toBeGreaterThan(20);
      expect(spec.silhouette.length).toBeGreaterThan(20);
      expect(spec.primaryCue.length).toBeGreaterThan(3);
      expect(spec.avoid.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps important finance relationships explicitly separated", () => {
    for (const pair of [
      ["trend-up", "trend-down"],
      ["receipt", "invoice"],
      ["transfer", "exchange"],
    ] as const) {
      expect(JALVORO_FINANCE_MASTER_SPEC[pair[0]].relationship).toContain(pair[1]);
      expect(JALVORO_FINANCE_MASTER_SPEC[pair[1]].relationship).toContain(pair[0]);
    }
  });

  it("locks stable finance naming and category boundaries", () => {
    expect(JALVORO_FINANCE_NAMING_STANDARD.sourceId).toContain("kebab-case");
    expect(JALVORO_FINANCE_NAMING_STANDARD.component).toContain("Jalvoro");
    expect(JALVORO_FINANCE_NAMING_STANDARD.aliases).toContain("Search-only");
    expect(JALVORO_FINANCE_NAMING_STANDARD.categoryBoundary).toContain("Finance");
    expect(JALVORO_FINANCE_NAMING_STANDARD.categoryBoundary).toContain("Actions");
  });
});
