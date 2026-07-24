import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { COMMAND_CENTER_PLATFORM_MANIFEST } from "./command-center-registry";
import {
  buildCommandCenterNavigation,
  type ProductManifestV1,
  validateProductManifest,
} from "./product-registry";

function cloneManifest(): ProductManifestV1 {
  return structuredClone(COMMAND_CENTER_PLATFORM_MANIFEST) as ProductManifestV1;
}

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("JALVORO Command Center product registry", () => {
  it("accepts the controlled platform manifest", () => {
    const result = validateProductManifest(COMMAND_CENTER_PLATFORM_MANIFEST);

    expect(result).toEqual({
      ok: true,
      manifest: COMMAND_CENTER_PLATFORM_MANIFEST,
    });
  });

  it("rejects external, query-bearing and unregistered admin routes", () => {
    for (const href of [
      "https://example.com/admin",
      "/admin?token=secret",
      "/dashboard",
    ]) {
      const manifest = cloneManifest();
      manifest.admin.navigation[0].href = href;

      const result = validateProductManifest(manifest);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ code: "unsafe_route" }),
          ]),
        );
      }
    }
  });

  it("rejects duplicate identities and navigation to unknown modules", () => {
    const duplicate = cloneManifest();
    duplicate.modules.push({ ...duplicate.modules[0] });
    expect(validateProductManifest(duplicate)).toMatchObject({ ok: false });

    const unknownModule = cloneManifest();
    unknownModule.admin.navigation[0].moduleKey = "not-registered";
    const result = validateProductManifest(unknownModule);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: "unknown_module" }),
        ]),
      );
    }
  });

  it("exposes only active, released, environment-safe and permitted modules", () => {
    expect(
      buildCommandCenterNavigation([COMMAND_CENTER_PLATFORM_MANIFEST], {
        environment: "production",
        permissions: new Set([
          "command-center:platform:view",
          "command-center:overview:view",
          "command-center:organizations:view",
        ]),
      }).map((item) => item.href),
    ).toEqual([
      "/admin",
      "/admin/global-operations",
      "/admin/organizations",
    ]);

    expect(
      buildCommandCenterNavigation([COMMAND_CENTER_PLATFORM_MANIFEST], {
        environment: "production",
        permissions: new Set(["*"]),
      }).map((item) => item.href),
    ).toEqual([
      "/admin",
      "/admin/global-operations",
      "/admin/organizations",
      "/admin/icon-system",
    ]);

    expect(
      buildCommandCenterNavigation([COMMAND_CENTER_PLATFORM_MANIFEST], {
        environment: "production",
        permissions: new Set(["command-center:platform:view"]),
      }),
    ).toEqual([]);

    const inactive = cloneManifest();
    inactive.registrationStatus = "approved";
    expect(
      buildCommandCenterNavigation([inactive], {
        environment: "production",
        permissions: new Set(["*"]),
      }),
    ).toEqual([]);

    const internal = cloneManifest();
    internal.lifecycleStatus = "internal_testing";
    expect(
      buildCommandCenterNavigation([internal], {
        environment: "production",
        permissions: new Set(["*"]),
      }),
    ).toEqual([]);
    expect(
      buildCommandCenterNavigation([internal], {
        environment: "production",
        permissions: new Set(["*"]),
        includeUnreleased: true,
      }),
    ).toHaveLength(4);
  });

  it("keeps the shell officially named, server-resolved and future-ready", () => {
    const shell = read("components/admin/AdminCommandCenterShell.tsx");
    const shellClient = read("components/admin/AdminCommandCenterShellClient.tsx");
    const layout = read("app/admin/layout.tsx");
    const registry = read("lib/admin/command-center-registry.ts");
    const validator = read("lib/admin/product-registry.ts");

    expect(shell).toContain('rpc("get_command_center_navigation"');
    expect(shell).not.toContain('"use client"');
    expect(shellClient).toContain('"use client"');
    expect(shellClient).toContain("CommandPalette");
    expect(shellClient).toContain("MobileModuleSheet");
    expect(shellClient).not.toContain("COMMAND_CENTER_COMPATIBILITY_PERMISSIONS");
    expect(registry).not.toContain("COMMAND_CENTER_COMPATIBILITY_PERMISSIONS");
    expect(registry).not.toContain("getRegisteredCommandCenterNavigation");
    expect(registry).toContain('href: "/admin/organizations"');
    expect(layout).toContain("JALVORO Command Center");
    expect(layout).toContain("Global Admin & Operations Control Center");
    expect(validator).toContain("const productModule = modules.get");
    expect(validator).not.toContain("const module = modules.get");
  });
});
