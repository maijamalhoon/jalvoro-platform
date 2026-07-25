import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { JalvoroIcon } from "@/components/icons/jalvoro/JalvoroIcon";
import { editIconDefinition } from "@/components/icons/jalvoro/definitions/actions";
import {
  calendarMoneyIconDefinition,
  invoiceIconDefinition,
  shieldMoneyIconDefinition,
} from "@/components/icons/jalvoro/definitions/finance";
import { reportsIconDefinition } from "@/components/icons/jalvoro/definitions/navigation";
import { OBJECTS_ICON_DEFINITIONS } from "@/components/icons/jalvoro/definitions/objects";
import {
  JALVORO_OBJECTS_MASTER_NAMES,
  JALVORO_OBJECTS_MASTER_SPEC,
  JALVORO_OBJECTS_NAMING_STANDARD,
} from "@/lib/icon-system/objects-master-set";

function geometrySignature(definition: { body: readonly unknown[] }) {
  return JSON.stringify(definition.body);
}

function objectDefinition(name: (typeof JALVORO_OBJECTS_MASTER_NAMES)[number]) {
  const definition = OBJECTS_ICON_DEFINITIONS.find((item) => item.name === name);
  if (!definition) throw new Error(`Missing object definition: ${name}`);
  return definition;
}

describe("JALVORO objects master set", () => {
  it("contains the complete canonical objects set", () => {
    expect(OBJECTS_ICON_DEFINITIONS.map((definition) => definition.name)).toEqual(
      JALVORO_OBJECTS_MASTER_NAMES,
    );
    expect(JALVORO_OBJECTS_MASTER_NAMES).toHaveLength(12);
  });

  it("keeps every object silhouette unique and restrained", () => {
    const signatures = OBJECTS_ICON_DEFINITIONS.map(geometrySignature);
    expect(new Set(signatures).size).toBe(signatures.length);

    for (const definition of OBJECTS_ICON_DEFINITIONS) {
      expect(definition.body.length).toBeGreaterThan(0);
      expect(definition.body.length).toBeLessThanOrEqual(5);
      expect(definition.objects).toBeLessThanOrEqual(2);
    }
  });

  it("forbids decorative micro-accents in mastered object geometry", () => {
    for (const definition of OBJECTS_ICON_DEFINITIONS) {
      expect(definition.defaultAccent).toBe("none");
      expect("accent" in definition).toBe(false);

      const markup = renderToStaticMarkup(
        <JalvoroIcon name={definition.name} accent="subtle" size={24} />,
      );
      expect(markup).not.toContain("data-jalvoro-micro-accent");
    }
  });

  it("renders cleanly at every approved interface size", () => {
    for (const name of JALVORO_OBJECTS_MASTER_NAMES) {
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

  it("documents one semantic cue and rejection list per object icon", () => {
    for (const name of JALVORO_OBJECTS_MASTER_NAMES) {
      const spec = JALVORO_OBJECTS_MASTER_SPEC[name];
      expect(spec.status).toBe("master");
      expect(spec.semanticIntent.length).toBeGreaterThan(20);
      expect(spec.silhouette.length).toBeGreaterThan(20);
      expect(spec.primaryCue.length).toBeGreaterThan(3);
      expect(spec.avoid.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps generic objects distinct from actions and domain-specific derivatives", () => {
    const pairs = [
      [objectDefinition("pencil"), editIconDefinition],
      [objectDefinition("calendar"), calendarMoneyIconDefinition],
      [objectDefinition("file"), invoiceIconDefinition],
      [objectDefinition("file"), reportsIconDefinition],
      [objectDefinition("lock"), shieldMoneyIconDefinition],
      [objectDefinition("image"), objectDefinition("camera")],
    ] as const;

    for (const [left, right] of pairs) {
      expect(geometrySignature(left)).not.toBe(geometrySignature(right));
    }
  });

  it("locks stable object naming and category boundaries", () => {
    expect(JALVORO_OBJECTS_NAMING_STANDARD.sourceId).toContain("kebab-case");
    expect(JALVORO_OBJECTS_NAMING_STANDARD.component).toContain("Jalvoro");
    expect(JALVORO_OBJECTS_NAMING_STANDARD.aliases).toContain("Search-only");
    expect(JALVORO_OBJECTS_NAMING_STANDARD.stateBoundary).toContain("actions");
    expect(JALVORO_OBJECTS_NAMING_STANDARD.specialization).toContain("Generic");
  });
});
