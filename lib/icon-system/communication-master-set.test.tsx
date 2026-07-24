import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { JalvoroIcon } from "@/components/icons/jalvoro/JalvoroIcon";
import { COMMUNICATION_ICON_DEFINITIONS } from "@/components/icons/jalvoro/definitions/communication";
import {
  JALVORO_COMMUNICATION_MASTER_NAMES,
  JALVORO_COMMUNICATION_MASTER_SPEC,
  JALVORO_COMMUNICATION_NAMING_STANDARD,
} from "@/lib/icon-system/communication-master-set";

function geometrySignature(
  definition: (typeof COMMUNICATION_ICON_DEFINITIONS)[number],
) {
  return JSON.stringify(definition.body);
}

describe("JALVORO communication master set", () => {
  it("contains the complete canonical communication set", () => {
    expect(
      COMMUNICATION_ICON_DEFINITIONS.map((definition) => definition.name),
    ).toEqual(JALVORO_COMMUNICATION_MASTER_NAMES);
    expect(JALVORO_COMMUNICATION_MASTER_NAMES).toHaveLength(5);
  });

  it("keeps every communication silhouette unique and restrained", () => {
    const signatures = COMMUNICATION_ICON_DEFINITIONS.map(geometrySignature);
    expect(new Set(signatures).size).toBe(signatures.length);

    for (const definition of COMMUNICATION_ICON_DEFINITIONS) {
      expect(definition.body.length).toBeGreaterThan(0);
      expect(definition.body.length).toBeLessThanOrEqual(4);
      expect(definition.objects).toBeLessThanOrEqual(2);
    }
  });

  it("forbids decorative micro-accents in mastered communication geometry", () => {
    for (const definition of COMMUNICATION_ICON_DEFINITIONS) {
      expect(definition.defaultAccent).toBe("none");
      expect("accent" in definition).toBe(false);

      const markup = renderToStaticMarkup(
        <JalvoroIcon name={definition.name} accent="subtle" size={24} />,
      );
      expect(markup).not.toContain("data-jalvoro-micro-accent");
    }
  });

  it("renders cleanly at every approved interface size", () => {
    for (const name of JALVORO_COMMUNICATION_MASTER_NAMES) {
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

  it("documents one semantic cue and rejection list per communication icon", () => {
    for (const name of JALVORO_COMMUNICATION_MASTER_NAMES) {
      const spec = JALVORO_COMMUNICATION_MASTER_SPEC[name];
      expect(spec.status).toBe("master");
      expect(spec.semanticIntent.length).toBeGreaterThan(20);
      expect(spec.silhouette.length).toBeGreaterThan(20);
      expect(spec.primaryCue.length).toBeGreaterThan(3);
      expect(spec.relationship?.length).toBeGreaterThan(20);
      expect(spec.avoid.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps written channels and communication delivery explicitly separated", () => {
    expect(JALVORO_COMMUNICATION_MASTER_SPEC.mail.relationship).toContain("chat");
    expect(JALVORO_COMMUNICATION_MASTER_SPEC.chat.relationship).toContain("mail");
    expect(JALVORO_COMMUNICATION_MASTER_SPEC.send.relationship).toContain("share");
    expect(JALVORO_COMMUNICATION_MASTER_SPEC.send.relationship).toContain("export");
    expect(JALVORO_COMMUNICATION_MASTER_SPEC.globe.relationship).toContain("worldwide");
  });

  it("locks stable communication naming and category boundaries", () => {
    expect(JALVORO_COMMUNICATION_NAMING_STANDARD.sourceId).toContain("kebab-case");
    expect(JALVORO_COMMUNICATION_NAMING_STANDARD.component).toContain("Jalvoro");
    expect(JALVORO_COMMUNICATION_NAMING_STANDARD.aliases).toContain("Search-only");
    expect(JALVORO_COMMUNICATION_NAMING_STANDARD.channelBoundary).toContain("Actions");
    expect(JALVORO_COMMUNICATION_NAMING_STANDARD.channelBoundary).toContain("Objects");
  });
});
