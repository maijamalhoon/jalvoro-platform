import { describe, expect, it } from "vitest";

import { JALVORO_ICON_NAMES } from "@/components/icons/jalvoro/manifest";
import {
  JALVORO_ICON_CATEGORY_META,
  JALVORO_ICON_CATEGORY_ORDER,
  JALVORO_ICON_LIBRARY,
  JALVORO_ICON_LIBRARY_ENTRIES,
  buildJalvoroIconFullSnippet,
  toJalvoroIconComponentName,
} from "./library";

describe("JALVORO icon library catalog", () => {
  it("keeps the catalog aligned with the canonical manifest", () => {
    expect(JALVORO_ICON_LIBRARY.iconCount).toBe(JALVORO_ICON_NAMES.length);
    expect(JALVORO_ICON_LIBRARY_ENTRIES.map((entry) => entry.name)).toEqual(
      JALVORO_ICON_NAMES,
    );
    expect(new Set(JALVORO_ICON_LIBRARY_ENTRIES.map((entry) => entry.name)).size).toBe(
      JALVORO_ICON_NAMES.length,
    );
  });

  it("provides standard metadata for every category", () => {
    expect(JALVORO_ICON_CATEGORY_ORDER).toHaveLength(8);
    for (const category of JALVORO_ICON_CATEGORY_ORDER) {
      expect(JALVORO_ICON_CATEGORY_META[category].label.length).toBeGreaterThan(0);
      expect(JALVORO_ICON_CATEGORY_META[category].description.length).toBeGreaterThan(0);
      expect(JALVORO_ICON_CATEGORY_META[category].importPath).toContain(
        `/components/${category}`,
      );
    }
  });

  it("creates predictable component names and clean usage snippets", () => {
    expect(toJalvoroIconComponentName("ai-insights")).toBe(
      "JalvoroAiInsightsIcon",
    );
    expect(toJalvoroIconComponentName("calendar-money")).toBe(
      "JalvoroCalendarMoneyIcon",
    );

    const snippet = buildJalvoroIconFullSnippet("search", 20, "compact");
    expect(snippet).toContain("JalvoroSearchIcon");
    expect(snippet).toContain("components/actions");
    expect(snippet).toContain("size={20}");
    expect(snippet).toContain('context="compact"');
    expect(snippet).not.toContain("accent=");
  });

  it("keeps the core library versioned for future package extraction", () => {
    expect(JALVORO_ICON_LIBRARY.id).toBe("jalvoro-core");
    expect(JALVORO_ICON_LIBRARY.version).toMatch(/^\d+\.\d+\.\d+(?:-[a-z0-9.]+)?$/i);
    expect(JALVORO_ICON_LIBRARY.categoryCount).toBe(
      JALVORO_ICON_CATEGORY_ORDER.length,
    );
  });
});
