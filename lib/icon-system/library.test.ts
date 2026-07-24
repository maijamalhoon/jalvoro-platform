import { describe, expect, it } from "vitest";

import { JALVORO_ICON_NAMES } from "@/components/icons/jalvoro/manifest";
import { JALVORO_ACTIONS_MASTER_NAMES } from "@/lib/icon-system/actions-master-set";
import { JALVORO_COMMUNICATION_MASTER_NAMES } from "@/lib/icon-system/communication-master-set";
import { JALVORO_FINANCE_MASTER_NAMES } from "@/lib/icon-system/finance-master-set";
import { JALVORO_IDENTITY_MASTER_NAMES } from "@/lib/icon-system/identity-master-set";
import { JALVORO_INTERFACE_MASTER_NAMES } from "@/lib/icon-system/interface-master-set";
import { JALVORO_NAVIGATION_MASTER_NAMES } from "@/lib/icon-system/navigation-master-set";
import { JALVORO_OBJECTS_MASTER_NAMES } from "@/lib/icon-system/objects-master-set";
import { JALVORO_STATUS_MASTER_NAMES } from "@/lib/icon-system/status-master-set";
import {
  JALVORO_ICON_CATEGORY_META,
  JALVORO_ICON_CATEGORY_ORDER,
  JALVORO_ICON_LIBRARY,
  JALVORO_ICON_LIBRARY_ENTRIES,
  buildJalvoroIconFullSnippet,
  toJalvoroIconComponentName,
} from "./library";

const MASTERED_ICON_NAMES = [
  ...JALVORO_NAVIGATION_MASTER_NAMES,
  ...JALVORO_ACTIONS_MASTER_NAMES,
  ...JALVORO_FINANCE_MASTER_NAMES,
  ...JALVORO_OBJECTS_MASTER_NAMES,
  ...JALVORO_IDENTITY_MASTER_NAMES,
  ...JALVORO_COMMUNICATION_MASTER_NAMES,
  ...JALVORO_INTERFACE_MASTER_NAMES,
  ...JALVORO_STATUS_MASTER_NAMES,
];

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

  it("marks every canonical category as internally mastered", () => {
    expect(JALVORO_ICON_CATEGORY_ORDER).toHaveLength(8);
    for (const category of JALVORO_ICON_CATEGORY_ORDER) {
      expect(JALVORO_ICON_CATEGORY_META[category].label.length).toBeGreaterThan(0);
      expect(JALVORO_ICON_CATEGORY_META[category].description.length).toBeGreaterThan(0);
      expect(JALVORO_ICON_CATEGORY_META[category].importPath).toContain(
        `/components/${category}`,
      );
      expect(JALVORO_ICON_CATEGORY_META[category].designStatus).toBe("master");
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

  it("exposes master metadata for all 82 icons without approving product rollout", () => {
    const masteredEntries = JALVORO_ICON_LIBRARY_ENTRIES.filter(
      (entry) => entry.designStatus === "master",
    );

    expect(JALVORO_ICON_LIBRARY.iconCount).toBe(82);
    expect(JALVORO_ICON_LIBRARY.masteredIconCount).toBe(MASTERED_ICON_NAMES.length);
    expect(JALVORO_ICON_LIBRARY.masteredIconCount).toBe(JALVORO_ICON_LIBRARY.iconCount);
    expect(JALVORO_ICON_LIBRARY.masteredCategoryCount).toBe(8);
    expect(masteredEntries.map((entry) => entry.name)).toEqual(MASTERED_ICON_NAMES);
    expect(JALVORO_ICON_LIBRARY.status).toBe("master");
    expect(JALVORO_ICON_LIBRARY.productRolloutStatus).toBe("not-approved");

    for (const entry of masteredEntries) {
      expect(entry.semanticIntent).not.toBeNull();
      expect(entry.silhouette).not.toBeNull();
      expect(entry.primaryCue).not.toBeNull();
      expect(entry.avoid.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps the core library versioned for future package extraction", () => {
    expect(JALVORO_ICON_LIBRARY.id).toBe("jalvoro-core");
    expect(JALVORO_ICON_LIBRARY.version).toMatch(/^\d+\.\d+\.\d+(?:-[a-z0-9.]+)?$/i);
    expect(JALVORO_ICON_LIBRARY.categoryCount).toBe(
      JALVORO_ICON_CATEGORY_ORDER.length,
    );
  });
});
