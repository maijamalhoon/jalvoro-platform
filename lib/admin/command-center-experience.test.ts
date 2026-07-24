import { describe, expect, it } from "vitest";

import {
  enrichCommandCenterNavigation,
  filterCommandCenterNavigation,
  groupCommandCenterNavigation,
  resolveActiveCommandCenterItem,
} from "./command-center-experience";
import type { ResolvedCommandCenterNavigationItem } from "./command-center-navigation";

const navigation: ResolvedCommandCenterNavigationItem[] = [
  {
    productKey: "command-center",
    productName: "JALVORO Command Center",
    navigationId: "global-overview",
    moduleKey: "global-overview",
    label: "Global Overview",
    href: "/admin",
    iconKey: "dashboard",
    order: 10,
  },
  {
    productKey: "command-center",
    productName: "JALVORO Command Center",
    navigationId: "organizations",
    moduleKey: "organizations",
    label: "Organizations",
    href: "/admin/organizations",
    iconKey: "organizations",
    order: 30,
  },
  {
    productKey: "future-product",
    productName: "Future Product",
    navigationId: "future-module",
    moduleKey: "future-module",
    label: "Future Module",
    href: "/admin/future-module",
    iconKey: "grid",
    order: 650,
  },
];

describe("Command Center experience model", () => {
  it("enriches known modules and gives future modules a deterministic home", () => {
    const items = enrichCommandCenterNavigation(navigation);

    expect(items[0]).toMatchObject({
      group: "command",
      compactLabel: "Overview",
    });
    expect(items[1]).toMatchObject({
      group: "operations",
      compactLabel: "Orgs",
    });
    expect(items[2]).toMatchObject({
      group: "infrastructure",
      compactLabel: "Future Module",
    });
  });

  it("groups modules without hard-coding the number of future sections", () => {
    const groups = groupCommandCenterNavigation(
      enrichCommandCenterNavigation(navigation),
    );

    expect(groups.map((group) => group.label)).toEqual([
      "Command",
      "Global operations",
      "Infrastructure",
    ]);
    expect(groups.flatMap((group) => group.items)).toHaveLength(3);
  });

  it("searches labels, descriptions, module keys and operational keywords", () => {
    const items = enrichCommandCenterNavigation(navigation);

    expect(filterCommandCenterNavigation(items, "tenant")).toHaveLength(1);
    expect(filterCommandCenterNavigation(items, "future-module")).toHaveLength(1);
    expect(filterCommandCenterNavigation(items, "health")[0]?.moduleKey).toBe(
      "global-overview",
    );
    expect(filterCommandCenterNavigation(items, "")).toHaveLength(3);
  });

  it("resolves the most specific active route", () => {
    const items = enrichCommandCenterNavigation(navigation);

    expect(resolveActiveCommandCenterItem(items, "/admin")?.moduleKey).toBe(
      "global-overview",
    );
    expect(
      resolveActiveCommandCenterItem(
        items,
        "/admin/organizations/ORG-123456789ABC",
      )?.moduleKey,
    ).toBe("organizations");
  });
});
