import { describe, expect, it } from "vitest";

import {
  parseResolvedCommandCenterNavigation,
  resolveCommandCenterEnvironment,
} from "./command-center-navigation";

const navigation = [
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
    navigationId: "icon-system",
    moduleKey: "icon-system",
    label: "Icon System",
    href: "/admin/icon-system",
    iconKey: "grid",
    order: 900,
  },
];

describe("server-resolved Command Center navigation", () => {
  it("accepts safe internal navigation and sorts deterministically", () => {
    expect(
      parseResolvedCommandCenterNavigation([...navigation].reverse()),
    ).toEqual(navigation);
  });

  it("fails closed for unsafe routes and duplicate identities", () => {
    for (const href of [
      "https://example.com/admin",
      "/dashboard",
      "/admin?token=secret",
      "/admin#private",
      "/admin/organizations//members",
      "/admin/organizations/",
      "/admin/organizations/%2fmembers",
    ]) {
      expect(
        parseResolvedCommandCenterNavigation([
          { ...navigation[0], href },
        ]),
      ).toBeNull();
    }

    expect(
      parseResolvedCommandCenterNavigation([
        navigation[0],
        { ...navigation[0] },
      ]),
    ).toBeNull();
  });

  it("fails closed for malformed values", () => {
    expect(parseResolvedCommandCenterNavigation(null)).toBeNull();
    expect(
      parseResolvedCommandCenterNavigation([
        { ...navigation[0], order: 1.5 },
      ]),
    ).toBeNull();
    expect(
      parseResolvedCommandCenterNavigation([
        { ...navigation[0], productKey: "Command Center" },
      ]),
    ).toBeNull();
  });

  it("resolves only supported deployment environments", () => {
    const originalVercelEnvironment = process.env.VERCEL_ENV;
    const originalPublicEnvironment = process.env.NEXT_PUBLIC_VERCEL_ENV;
    const originalNodeEnvironment = process.env.NODE_ENV;

    try {
      process.env.VERCEL_ENV = "preview";
      expect(resolveCommandCenterEnvironment()).toBe("preview");

      process.env.VERCEL_ENV = "production";
      expect(resolveCommandCenterEnvironment()).toBe("production");

      delete process.env.VERCEL_ENV;
      process.env.NEXT_PUBLIC_VERCEL_ENV = "preview";
      expect(resolveCommandCenterEnvironment()).toBe("preview");
    } finally {
      if (originalVercelEnvironment === undefined) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = originalVercelEnvironment;

      if (originalPublicEnvironment === undefined) {
        delete process.env.NEXT_PUBLIC_VERCEL_ENV;
      } else {
        process.env.NEXT_PUBLIC_VERCEL_ENV = originalPublicEnvironment;
      }

      Object.defineProperty(process.env, "NODE_ENV", {
        value: originalNodeEnvironment,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
  });
});
