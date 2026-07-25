import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { parseAuditedAdminGlobalOperationsSnapshot } from "./global-operations-audit";

const validBase = {
  generatedAt: "2026-07-26T09:00:00.000Z",
  adminRole: "owner",
  products: {
    total: 1,
    active: 1,
    suspended: 0,
    families: 1,
    applications: 1,
    enabledApplications: 1,
    modules: 4,
    enabledModules: 4,
    services: 3,
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
        modules: 4,
        enabledModules: 4,
        services: 3,
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
  subscriptions: {
    total: 10,
    free: 7,
    trialing: 1,
    activePaid: 2,
    pastDue: 0,
    cancelled: 0,
    cancelAtPeriodEnd: 0,
  },
  regionalOperations: {
    configuredRegions: [
      { regionKey: "global", name: "Global", active: true, products: 1 },
    ],
    countries30d: [],
    regionCodes30d: [],
    rawIpStored: false,
  },
  platformAnalytics: {
    devices30d: [],
    operatingSystems30d: [],
    browsers30d: [],
    applicationVersions30d: [],
    sessionReplayEnabled: false,
  },
};

const registeredOrganizations = {
  sourceStatus: "registered",
  total: 3,
  draft: 1,
  active: 1,
  suspended: 1,
  closed: 0,
  memberships: 7,
  activeMemberships: 5,
  activeAdminGrants: 2,
  identityFieldsIncluded: false,
};

describe("audited Global Operations organization activation", () => {
  it("accepts the registered aggregate organization summary", () => {
    expect(
      parseAuditedAdminGlobalOperationsSnapshot({
        ...validBase,
        organizations: registeredOrganizations,
      }),
    ).toMatchObject({
      organizations: registeredOrganizations,
      products: { total: 1 },
      subscriptions: { total: 10 },
    });
  });

  it("keeps the deferred contract compatible during rollout", () => {
    expect(
      parseAuditedAdminGlobalOperationsSnapshot({
        ...validBase,
        organizations: {
          sourceStatus: "not_registered",
          reason: "organization_data_source_not_registered",
          total: 0,
          active: 0,
          suspended: 0,
        },
      }),
    ).toMatchObject({ organizations: { sourceStatus: "not_registered" } });
  });

  it("rejects inconsistent or identity-bearing organization summaries", () => {
    expect(
      parseAuditedAdminGlobalOperationsSnapshot({
        ...validBase,
        organizations: { ...registeredOrganizations, total: 4 },
      }),
    ).toBeNull();

    expect(
      parseAuditedAdminGlobalOperationsSnapshot({
        ...validBase,
        organizations: {
          ...registeredOrganizations,
          email: "owner@example.com",
        },
      }),
    ).toBeNull();

    expect(
      parseAuditedAdminGlobalOperationsSnapshot({
        ...validBase,
        organizations: {
          ...registeredOrganizations,
          identityFieldsIncluded: true,
        },
      }),
    ).toBeNull();
  });

  it("activates the existing private summary without weakening execution grants", () => {
    const migration = readFileSync(
      resolve(
        process.cwd(),
        "supabase/migrations/20260726090000_activate_global_organization_summary.sql",
      ),
      "utf8",
    );

    expect(migration).toContain(
      "'organizations', private.get_command_center_organization_summary()",
    );
    expect(migration).toContain(
      "revoke all on function private.get_platform_admin_snapshot() from public, anon",
    );
    expect(migration).toContain(
      "grant execute on function private.get_platform_admin_snapshot() to authenticated, service_role",
    );
    expect(migration).not.toContain("from public, anon, authenticated");
  });

  it("wires the route to the audited parser and organization-aware UI", () => {
    const page = readFileSync(
      resolve(process.cwd(), "app/admin/global-operations/page.tsx"),
      "utf8",
    );
    const panel = readFileSync(
      resolve(
        process.cwd(),
        "components/admin/AdminGlobalOperationsDecisionPanel.tsx",
      ),
      "utf8",
    );

    expect(page).toContain("parseAuditedAdminGlobalOperationsSnapshot");
    expect(page).toContain("AdminGlobalOperationsDecisionPanel");
    expect(page).not.toContain("parseAdminGlobalOperationsSnapshot");
    expect(page).not.toContain("AdminGlobalOperationsPanel");
    expect(panel).toContain('href="/admin/organizations"');
    expect(panel).not.toContain(
      "No organization or membership model is registered in this data plane.",
    );
    expect(panel).not.toContain("Organization source pending");
  });
});
