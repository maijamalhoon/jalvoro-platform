import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { JalvoroIcon } from "@/components/icons/jalvoro/JalvoroIcon";
import { IDENTITY_ICON_DEFINITIONS } from "@/components/icons/jalvoro/definitions/identity";
import {
  JALVORO_IDENTITY_MASTER_NAMES,
  JALVORO_IDENTITY_MASTER_SPEC,
  JALVORO_IDENTITY_NAMING_STANDARD,
} from "@/lib/icon-system/identity-master-set";

function geometrySignature(
  definition: (typeof IDENTITY_ICON_DEFINITIONS)[number],
) {
  return JSON.stringify(definition.body);
}

describe("JALVORO identity master set", () => {
  it("contains the complete canonical identity set", () => {
    expect(IDENTITY_ICON_DEFINITIONS.map((definition) => definition.name)).toEqual(
      JALVORO_IDENTITY_MASTER_NAMES,
    );
    expect(JALVORO_IDENTITY_MASTER_NAMES).toHaveLength(3);
  });

  it("keeps every identity silhouette unique and restrained", () => {
    const signatures = IDENTITY_ICON_DEFINITIONS.map(geometrySignature);
    expect(new Set(signatures).size).toBe(signatures.length);

    for (const definition of IDENTITY_ICON_DEFINITIONS) {
      expect(definition.body.length).toBeGreaterThan(0);
      expect(definition.body.length).toBeLessThanOrEqual(4);
      expect(definition.objects).toBeLessThanOrEqual(2);
    }
  });

  it("forbids decorative micro-accents in mastered identity geometry", () => {
    for (const definition of IDENTITY_ICON_DEFINITIONS) {
      expect(definition.defaultAccent).toBe("none");
      expect("accent" in definition).toBe(false);

      const markup = renderToStaticMarkup(
        <JalvoroIcon name={definition.name} accent="subtle" size={24} />,
      );
      expect(markup).not.toContain("data-jalvoro-micro-accent");
    }
  });

  it("renders cleanly at every approved interface size", () => {
    for (const name of JALVORO_IDENTITY_MASTER_NAMES) {
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

  it("documents one semantic cue and rejection list per identity icon", () => {
    for (const name of JALVORO_IDENTITY_MASTER_NAMES) {
      const spec = JALVORO_IDENTITY_MASTER_SPEC[name];
      expect(spec.status).toBe("master");
      expect(spec.semanticIntent.length).toBeGreaterThan(20);
      expect(spec.silhouette.length).toBeGreaterThan(20);
      expect(spec.primaryCue.length).toBeGreaterThan(3);
      expect(spec.avoid.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps singular, plural and person-add meanings explicitly separated", () => {
    expect(JALVORO_IDENTITY_MASTER_SPEC.user.relationship).toContain("users");
    expect(JALVORO_IDENTITY_MASTER_SPEC.users.relationship).toContain("user");
    expect(JALVORO_IDENTITY_MASTER_SPEC["user-plus"].relationship).toContain(
      "Add action",
    );
    expect(JALVORO_IDENTITY_MASTER_SPEC["user-plus"].avoid).toContain(
      "generic add usage without a person context",
    );
  });

  it("locks neutral naming and category boundaries", () => {
    expect(JALVORO_IDENTITY_NAMING_STANDARD.sourceId).toContain("kebab-case");
    expect(JALVORO_IDENTITY_NAMING_STANDARD.component).toContain("Jalvoro");
    expect(JALVORO_IDENTITY_NAMING_STANDARD.aliases).toContain("Search-only");
    expect(JALVORO_IDENTITY_NAMING_STANDARD.neutrality).toContain("gender");
    expect(JALVORO_IDENTITY_NAMING_STANDARD.categoryBoundary).toContain("Identity");
    expect(JALVORO_IDENTITY_NAMING_STANDARD.categoryBoundary).toContain("Actions");
  });
});
