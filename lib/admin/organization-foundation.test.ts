import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { COMMAND_CENTER_PLATFORM_MANIFEST } from "./command-center-registry";
import { parseAdminOrganizationFoundationSnapshot } from "./organization-foundation";

const foundationMigration =
  "supabase/migrations/20260724171000_command_center_organization_foundation.sql";
const rpcMigration =
  "supabase/migrations/20260724171500_organization_rpc_execution_and_scoped_grant.sql";
const summaryMigration =
  "supabase/migrations/20260724172000_register_organization_summary.sql";
const deferredUiMigration =
  "supabase/migrations/20260724172100_defer_organization_summary_ui_activation.sql";

const validSnapshot = {
  generatedAt: "2026-07-24T17:20:00.000Z",
  adminRole: "owner",
  totals: {
    total: 2,
    draft: 0,
    active: 1,
    suspended: 1,
    closed: 0,
    memberships: 5,
    activeMemberships: 4,
    activeAdminGrants: 1,
  },
  items: [
    {
      organizationCode: "ORG-A1B2C3D4E5F6",
      organizationKey: "north-star-trading",
      displayName: "North Star Trading",
      status: "active",
      primaryCountryCode: "PK",
      regionKey: "global",
      dataClassification: "confidential",
      version: 2,
      memberships: 3,
      activeMemberships: 3,
      activeOwners: 1,
      activeAdminGrants: 1,
    },
    {
      organizationCode: "ORG-112233AABBCC",
      organizationKey: "atlas-services",
      displayName: "Atlas Services",
      status: "suspended",
      primaryCountryCode: null,
      regionKey: null,
      dataClassification: "internal",
      version: 4,
      memberships: 2,
      activeMemberships: 1,
      activeOwners: 1,
      activeAdminGrants: 0,
    },
  ],
  identityFieldsIncluded: false,
  directTableAccessEnabled: false,
};

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Command Center organization foundation", () => {
  it("accepts the aggregate, identity-free organization contract", () => {
    expect(parseAdminOrganizationFoundationSnapshot(validSnapshot)).toEqual(
      validSnapshot,
    );
  });

  it("rejects inconsistent totals and unsafe item counts", () => {
    expect(
      parseAdminOrganizationFoundationSnapshot({
        ...validSnapshot,
        totals: { ...validSnapshot.totals, total: 3 },
      }),
    ).toBeNull();

    expect(
      parseAdminOrganizationFoundationSnapshot({
        ...validSnapshot,
        items: [
          {
            ...validSnapshot.items[0],
            memberships: 1,
            activeMemberships: 2,
          },
        ],
      }),
    ).toBeNull();

    expect(
      parseAdminOrganizationFoundationSnapshot({
        ...validSnapshot,
        items: [
          {
            ...validSnapshot.items[0],
            activeOwners: 4,
            activeMemberships: 3,
          },
        ],
      }),
    ).toBeNull();
  });

  it("rejects malformed organization identities and duplicate keys", () => {
    expect(
      parseAdminOrganizationFoundationSnapshot({
        ...validSnapshot,
        items: [
          {
            ...validSnapshot.items[0],
            organizationCode: "unsafe-code",
          },
        ],
      }),
    ).toBeNull();

    expect(
      parseAdminOrganizationFoundationSnapshot({
        ...validSnapshot,
        items: [validSnapshot.items[0], { ...validSnapshot.items[0] }],
      }),
    ).toBeNull();
  });

  it("fails closed on identity-bearing and protected fields", () => {
    for (const unsafeField of [
      { email: "person@example.com" },
      { userId: "00000000-0000-0000-0000-000000000001" },
      { providerCustomerId: "cus_secret" },
      { rawIp: "192.0.2.1" },
      { city: "Karachi" },
      { taxId: "secret" },
      { metadata: { note: "unsafe" } },
    ]) {
      expect(
        parseAdminOrganizationFoundationSnapshot({
          ...validSnapshot,
          items: [{ ...validSnapshot.items[0], ...unsafeField }],
        }),
      ).toBeNull();
    }

    expect(
      parseAdminOrganizationFoundationSnapshot({
        ...validSnapshot,
        identityFieldsIncluded: true,
      }),
    ).toBeNull();

    expect(
      parseAdminOrganizationFoundationSnapshot({
        ...validSnapshot,
        directTableAccessEnabled: true,
      }),
    ).toBeNull();
  });

  it("creates private, deny-direct, indexed and append-only tables", () => {
    const migration = read(foundationMigration);

    for (const table of [
      "command_center_organizations",
      "command_center_organization_memberships",
      "command_center_organization_audit",
    ]) {
      expect(migration).toContain(`create table private.${table}`);
      expect(migration).toContain(
        `alter table private.${table} enable row level security`,
      );
      expect(migration).toContain(`create policy ${table}_deny_direct`);
      expect(migration).toContain(
        `revoke all on table private.${table} from public, anon, authenticated`,
      );
    }

    expect(migration).toContain(
      "command_center_organization_audit_append_only",
    );
    expect(migration).toContain("reject_platform_audit_update");
    expect(migration).toContain(
      "command_center_admin_grants_organization_id_fkey",
    );
    expect(migration).toContain(
      "references private.command_center_organizations(id)",
    );
    expect(migration).toContain(
      "command_center_admin_grants_organization_idx",
    );
  });

  it("enforces Owner-only lifecycle, last-owner protection and closure revocation", () => {
    const migration = read(foundationMigration);

    expect(migration).toContain(
      "command_center_organization_owner_required",
    );
    expect(migration).toContain(
      "command_center_organization_last_owner_required",
    );
    expect(migration).toContain("v_action in ('suspend', 'revoke')");
    expect(migration).toContain("where organization_id = v_organization.id");
    expect(migration).toContain("set revoked_at = now(), revoked_by = v_actor");
    expect(migration).toContain("'organization_status_changed'");
    expect(migration).toContain("'membership_revoked'");
    expect(migration).not.toContain("delete from private.command_center_organizations");
    expect(migration).not.toContain(
      "delete from private.command_center_organization_memberships",
    );
  });

  it("validates tenant-scoped grants against live organization boundaries", () => {
    const migration = read(foundationMigration);
    const rpc = read(rpcMigration);

    expect(migration).toContain("p_organization_id is not null");
    expect(migration).toContain("v_organization.status <> 'active'");
    expect(migration).toContain(
      "command_center_organization_region_scope_invalid",
    );
    expect(migration).toContain(
      "command_center_organization_classification_scope_invalid",
    );
    expect(migration).toContain(
      "organization_admin_permission_granted",
    );
    expect(migration).toContain(
      "organization_admin_permission_revoked",
    );

    expect(rpc).toContain(
      "private.grant_command_center_organization_permission",
    );
    expect(rpc).toContain("'command-center'");
    expect(rpc).toContain("'organizations'");
    expect(rpc).toContain("v_organization.region_key");
    expect(rpc).toContain("v_organization.data_classification");
  });

  it("keeps public RPCs authenticated while private functions retain authorization checks", () => {
    const migration = read(foundationMigration);
    const rpc = read(rpcMigration);

    for (const functionName of [
      "create_command_center_organization",
      "transition_command_center_organization",
      "create_command_center_organization_membership",
      "transition_command_center_organization_membership",
      "get_command_center_organization_foundation_snapshot",
    ]) {
      expect(migration).toContain(`public.${functionName}`);
    }

    expect(rpc).toContain("to authenticated");
    expect(rpc).toContain("from public, anon");
    expect(migration).toContain("v_actor uuid := auth.uid()");
    expect(migration).toContain("private.command_center_admin_role()");
    expect(migration).not.toContain("grant select on private.command_center_");
  });

  it("registers a hidden internal module without adding navigation", () => {
    const organizationModule = COMMAND_CENTER_PLATFORM_MANIFEST.modules.find(
      (entry) => entry.moduleKey === "organizations",
    );

    expect(organizationModule).toMatchObject({
      moduleId: "mod_organizations",
      lifecycleStatus: "internal_testing",
      enabled: true,
      requiredPermissions: ["command-center:organizations:view"],
    });
    expect(
      COMMAND_CENTER_PLATFORM_MANIFEST.admin.navigation.some(
        (entry) => entry.moduleKey === "organizations",
      ),
    ).toBe(false);
  });

  it("keeps the current Global Operations parser stable until its UI cycle", () => {
    const summary = read(summaryMigration);
    const deferred = read(deferredUiMigration);

    expect(summary).toContain("get_command_center_organization_summary");
    expect(summary).toContain("'sourceStatus', 'registered'");
    expect(summary).toContain("'identityFieldsIncluded', false");
    expect(deferred).toContain(
      "private.get_command_center_global_operations_snapshot()",
    );
    expect(deferred).not.toContain(
      "private.get_command_center_organization_summary()",
    );
  });
});
