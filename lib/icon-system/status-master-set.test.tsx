import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { JalvoroIcon } from "@/components/icons/jalvoro/JalvoroIcon";
import { STATUS_ICON_DEFINITIONS } from "@/components/icons/jalvoro/definitions/status";
import {
  JALVORO_STATUS_MASTER_NAMES,
  JALVORO_STATUS_MASTER_SPEC,
  JALVORO_STATUS_NAMING_STANDARD,
} from "@/lib/icon-system/status-master-set";

function geometrySignature(
  definition: (typeof STATUS_ICON_DEFINITIONS)[number],
) {
  return JSON.stringify(definition.body);
}

describe("JALVORO status master set", () => {
  it("contains the complete canonical status set", () => {
    expect(STATUS_ICON_DEFINITIONS.map((definition) => definition.name)).toEqual(
      JALVORO_STATUS_MASTER_NAMES,
    );
    expect(JALVORO_STATUS_MASTER_NAMES).toHaveLength(6);
  });

  it("keeps every status silhouette unique and restrained", () => {
    const signatures = STATUS_ICON_DEFINITIONS.map(geometrySignature);
    expect(new Set(signatures).size).toBe(signatures.length);

    for (const definition of STATUS_ICON_DEFINITIONS) {
      expect(definition.body.length).toBeGreaterThan(0);
      expect(definition.body.length).toBeLessThanOrEqual(3);
      expect(definition.objects).toBe(1);
    }
  });

  it("forbids decorative micro-accents in mastered status geometry", () => {
    for (const definition of STATUS_ICON_DEFINITIONS) {
      expect(definition.defaultAccent).toBe("none");
      expect("accent" in definition).toBe(false);

      const markup = renderToStaticMarkup(
        <JalvoroIcon name={definition.name} accent="wave" size={24} />,
      );
      expect(markup).not.toContain("data-jalvoro-micro-accent");
    }
  });

  it("renders cleanly without hard-coded severity colors at approved sizes", () => {
    for (const name of JALVORO_STATUS_MASTER_NAMES) {
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

  it("documents semantic intent, geometry and rejection rules for every status", () => {
    for (const name of JALVORO_STATUS_MASTER_NAMES) {
      const spec = JALVORO_STATUS_MASTER_SPEC[name];
      expect(spec.status).toBe("master");
      expect(spec.semanticIntent.length).toBeGreaterThan(20);
      expect(spec.silhouette.length).toBeGreaterThan(20);
      expect(spec.primaryCue.length).toBeGreaterThan(3);
      expect(spec.relationship?.length).toBeGreaterThan(20);
      expect(spec.avoid.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps resulting states separate from actions and reusable objects", () => {
    expect(JALVORO_STATUS_MASTER_SPEC.success.relationship).toContain("Check action");
    expect(JALVORO_STATUS_MASTER_SPEC.error.relationship).toContain("Close action");
    expect(JALVORO_STATUS_MASTER_SPEC.pending.relationship).toContain("Clock object");
    expect(JALVORO_STATUS_MASTER_SPEC.pending.relationship).toContain("Refresh action");
  });

  it("allows spark only as an explicit semantic concept", () => {
    expect(JALVORO_STATUS_MASTER_SPEC.spark.relationship).toContain("never a generic");
    expect(STATUS_ICON_DEFINITIONS.find((definition) => definition.name === "spark")?.body).toHaveLength(1);
    expect(JALVORO_STATUS_NAMING_STANDARD.sparkBoundary).toContain("never automatic");
  });

  it("locks stable status naming, state and color boundaries", () => {
    expect(JALVORO_STATUS_NAMING_STANDARD.sourceId).toContain("kebab-case");
    expect(JALVORO_STATUS_NAMING_STANDARD.component).toContain("Jalvoro");
    expect(JALVORO_STATUS_NAMING_STANDARD.aliases).toContain("Search-only");
    expect(JALVORO_STATUS_NAMING_STANDARD.stateBoundary).toContain("Actions");
    expect(JALVORO_STATUS_NAMING_STANDARD.colorBoundary).toContain("without relying");
  });
});
