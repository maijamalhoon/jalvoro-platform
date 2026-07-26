import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { parseAdminGlobalOperationsSnapshot } from "./global-operations";

const migrationPath =
  "supabase/migrations/20260724160000_command_center_global_operations_overview.sql";
const accessMigrationPath =
  "supabase/migrations/20260724163500_scope_global_operations_role_access.sql";

const validSnapshot = {
  generatedAt: "2026-07-24T16:00:00.000Z",
  adminRole: "owner",
  products: {
    total: 1,
    active: 1,
    suspended: 0,
    families: 1,
    applications: 1,
    enabledApplications: 1,
    modules: 3,
    enabledModules: 3,
    services: 1,
    items: [
      {
        productKey: "command-center",
        name: "JALVORO Command Center",
        familyName: "JALVORO Platform",
        categoryKey: "internal-operations",
        lifecycleStatus: "public_release",
        registrationStatus: "active",
        dataClassification: "restricted",
        retentionDays: 730,
        applications: 1,
        enabledApplications: 1,
        modules: 3,
        enabledModules: 3,
        services: 1,
        environments: ["development", "preview", "production"],
        regions: ["global"],
        platforms: ["web"],
      },
    ],
    environments: [
      {
        environmentKey: "production",
        name: "Production",
        active: true,
        products: 1,
      },
    ],
  },
  organizations: {
    sourceStatus: "not_registered",
    reason: "organization_data_source_not_registered",
    total: 0,
    active: 0,
    suspended: 0,
  },
  subscriptions: {
    total: 12,
    free: 8,
    trialing: 1,
    activePaid: 2,
    pastDue: 1,
    cancelled: 0,
    cancelAtPeriodEnd: 1,
  },
  regionalOperations: {
    configuredRegions: [
      {
        regionKey: "global",
        name: "Global",
        active: true,
        products: 1,
      },
    ],
    countries30d: [{ countryCode: "PK", activeUsers: 7, events: 42 }],
    regionCodes30d: [{ regionCode: "PK-SD", activeUsers: 4, events: 19 }],
    rawIpStored: false,
  },
  platformAnalytics: {
    devices30d: [{ key: "desktop", activeUsers: 6, events: 30 }],
    operatingSystems30d: [{ key: "Windows", activeUsers: 5, events: 26 }],
    browsers30d: [{ key: "Chrome", activeUsers: 5, events: 24 }],
    applicationVersions30d: [{ key: "web-current", activeUsers: 6, events: 30 }],
    sessionReplayEnabled: false,
  },
};

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Command Center global operations", () => {
  it("accepts the aggregate registry, subscription, region and platform contract", () => {
    expect(parseAdminGlobalOperationsSnapshot(validSnapshot)).toMatchObject({
      adminRole: "owner",
      products: {
        total: 1,
        active: 1,
        items: [
          {
            productKey: "command-center",
            registrationStatus: "active",
            environments: ["development", "preview", "production"],
          },
        ],
      },
      organizations: { sourceStatus: "not_registered", total: 0 },
      subscriptions: { total: 12, activePaid: 2 },
      regionalOperations: { rawIpStored: false },
      platformAnalytics: { sessionReplayEnabled: false },
    });
  });

  it("rejects malformed topology, impossible enabled counts and unsafe locations", () => {
    expect(
      parseAdminGlobalOperationsSnapshot({
        ...validSnapshot,
        products: {
          ...validSnapshot.products,
          items: [
            {
              ...validSnapshot.products.items[0],
              productKey: "Unsafe Product Key",
            },
          ],
        },
      }),
    ).toBeNull();

    expect(
      parseAdminGlobalOperationsSnapshot({
        ...validSnapshot,
        products: {
          ...validSnapshot.products,
          enabledModules: 4,
          modules: 3,
        },
      }),
    ).toBeNull();

    expect(
      parseAdminGlobalOperationsSnapshot({
        ...validSnapshot,
        regionalOperations: {
          ...validSnapshot.regionalOperations,
          countries30d: [{ countryCode: "Pakistan", activeUsers: 1, events: 1 }],
        },
      }),
    ).toBeNull();
  });

  it("fails closed on identity-bearing fields and protected telemetry boundaries", () => {
    for (const unsafeField of [
      { email: "person@example.com" },
      { userId: "00000000-0000-0000-0000-000000000001" },
      { providerSubscriptionId: "provider-secret" },
      { rawIp: "192.0.2.1" },
      { city: "Karachi" },
    ]) {
      expect(
        parseAdminGlobalOperationsSnapshot({
          ...validSnapshot,
          products: { ...validSnapshot.products, ...unsafeField },
        }),
      ).toBeNull();
    }

    expect(
      parseAdminGlobalOperationsSnapshot({
        ...validSnapshot,
        regionalOperations: {
          ...validSnapshot.regionalOperations,
          rawIpStored: true,
        },
      }),
    ).toBeNull();

    expect(
      parseAdminGlobalOperationsSnapshot({
        ...validSnapshot,
        platformAnalytics: {
          ...validSnapshot.platformAnalytics,
          sessionReplayEnabled: true,
        },
      }),
    ).toBeNull();
  });

  it("does not represent an unavailable organization source as real adoption", () => {
    expect(
      parseAdminGlobalOperationsSnapshot({
        ...validSnapshot,
        organizations: {
          ...validSnapshot.organizations,
          sourceStatus: "connected",
          total: 10,
          active: 8,
        },
      }),
    ).toBeNull();
  });

  it("maps overview access only to the Global Operations module", () => {
    const accessMigration = read(accessMigrationPath);

    for (const role of ["owner", "admin", "analyst", "support"]) {
      expect(accessMigration).toContain(
        `('${role}', 'command-center:overview:view', 'command-center', 'global-operations', null)`,
      );
    }

    expect(accessMigration).toContain("on conflict do nothing");
    expect(accessMigration).not.toContain(
      "'command-center:overview:view', null, null, null",
    );
    expect(accessMigration).not.toContain("command-center:operations:manage");
  });

  it("keeps the SQL surface private, aggregate-only and server-authorized", () => {
    const migration = read(migrationPath);
    const page = read("app/admin/global-operations/page.tsx");

    expect(migration).toContain(
      "private.get_command_center_global_operations_snapshot()",
    );
    expect(migration).toContain("security definer");
    expect(migration).toContain("v_admin_user_id uuid := auth.uid()");
    expect(migration).toContain("raise exception 'admin_access_required'");
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("count(distinct subject_id)");
    expect(migration).toContain("'rawIpStored', false");
    expect(migration).toContain("'sessionReplayEnabled', false");
    expect(migration).not.toMatch(/jsonb_build_object\([\s\S]*'email'/i);
    expect(migration).not.toMatch(/'userId'\s*,/i);
    expect(migration).not.toMatch(/'subjectId'\s*,/i);
    expect(migration).not.toMatch(/'sessionId'\s*,/i);
    expect(migration).not.toMatch(/'providerSubscriptionId'\s*,/i);
    expect(migration).not.toMatch(/'city'\s*,/i);

    expect(page).toContain('rpc("get_platform_admin_snapshot"');
    expect(page).toContain("parseAuditedAdminGlobalOperationsSnapshot");
    expect(page).toContain("AdminGlobalOperationsDecisionPanel");
    expect(page).not.toContain("createBrowserClient");
  });
});
