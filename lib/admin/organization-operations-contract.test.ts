import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { parseAdminOrganizationOperationsSnapshot } from "./organization-operations-guard";

const createdAt = "2026-07-24T23:00:00.000Z";
const generatedAt = "2026-07-25T00:30:00.000Z";

function snapshot() {
  return {
    generatedAt,
    adminRole: "owner",
    operationsAllowed: true,
    totals: {
      total: 1,
      draft: 0,
      active: 1,
      suspended: 0,
      closed: 0,
      memberships: 1,
      activeMemberships: 1,
      activeAdminGrants: 1,
    },
    pagination: { limit: 50, offset: 0, hasMore: false },
    items: [
      {
        organizationCode: "ORG-123456789ABC",
        organizationKey: "worldwide-operations",
        displayName: "Worldwide Operations",
        status: "active",
        primaryCountryCode: "PK",
        regionKey: "global",
        dataClassification: "confidential",
        version: 2,
        createdAt,
        updatedAt: generatedAt,
        memberships: 1,
        activeMemberships: 1,
        activeOwners: 1,
        activeAdminGrants: 1,
      },
    ],
    selectedOrganization: {
      organizationCode: "ORG-123456789ABC",
      organizationKey: "worldwide-operations",
      displayName: "Worldwide Operations",
      status: "active",
      primaryCountryCode: "PK",
      regionKey: "global",
      dataClassification: "confidential",
      version: 2,
      createdAt,
      updatedAt: generatedAt,
      members: [
        {
          membershipCode: "MBR-123456789ABC",
          memberReference: "USR-123456789ABC",
          role: "organization_owner",
          status: "active",
          version: 1,
          createdAt,
          updatedAt: generatedAt,
        },
      ],
      grants: [
        {
          grantCode: "CAG-123456789ABC",
          adminReference: "ADM-123456789ABC",
          permissionKey: "command-center:organizations:view",
          status: "active",
          grantedAt: createdAt,
          expiresAt: "2026-08-24T23:00:00.000Z",
          revokedAt: null,
        },
      ],
      audit: [
        {
          eventReference: "OAE-123456789ABC",
          action: "organization_created",
          actorReference: "USR-123456789ABC",
          subjectReference: null,
          previousStatus: null,
          nextStatus: "draft",
          previousRole: null,
          nextRole: null,
          createdAt,
          expiresAt: "2028-07-24T23:00:00.000Z",
        },
      ],
    },
    availablePermissions: [
      "command-center:organizations:view",
      "command-center:organizations:manage",
      "command-center:organizations:membership-manage",
    ],
    identityFieldsIncluded: false,
    directTableAccessEnabled: false,
  };
}

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Organization Operations contract", () => {
  it("accepts the paginated identity-minimised control-plane snapshot", () => {
    expect(parseAdminOrganizationOperationsSnapshot(snapshot())).toMatchObject({
      adminRole: "owner",
      operationsAllowed: true,
      totals: { total: 1, active: 1 },
      selectedOrganization: {
        organizationCode: "ORG-123456789ABC",
        members: [{ memberReference: "USR-123456789ABC" }],
        grants: [{ adminReference: "ADM-123456789ABC" }],
        audit: [{ eventReference: "OAE-123456789ABC" }],
      },
      identityFieldsIncluded: false,
      directTableAccessEnabled: false,
    });
  });

  it("rejects malformed nullable locations and audit references", () => {
    const invalidCountry = snapshot();
    invalidCountry.items[0].primaryCountryCode = "Pakistan";
    expect(parseAdminOrganizationOperationsSnapshot(invalidCountry)).toBeNull();

    const invalidRegion = snapshot();
    invalidRegion.selectedOrganization.regionKey = "Global Region";
    expect(parseAdminOrganizationOperationsSnapshot(invalidRegion)).toBeNull();

    const invalidActor = snapshot();
    invalidActor.selectedOrganization.audit[0].actorReference = "raw-user-id";
    expect(parseAdminOrganizationOperationsSnapshot(invalidActor)).toBeNull();
  });

  it("fails closed on identity-bearing and sensitive organization fields", () => {
    for (const unsafeField of [
      { email: "person@example.com" },
      { userId: "00000000-0000-0000-0000-000000000001" },
      { rawIp: "192.0.2.1" },
      { city: "Karachi" },
      { legalName: "Registered Business Name" },
      { taxId: "secret" },
      { registrationNumber: "secret" },
    ]) {
      const value = snapshot() as ReturnType<typeof snapshot> &
        Record<string, unknown>;
      Object.assign(value.selectedOrganization, unsafeField);
      expect(parseAdminOrganizationOperationsSnapshot(value)).toBeNull();
    }
  });

  it("rejects impossible totals, role/action mismatch and unsafe flags", () => {
    const totals = snapshot();
    totals.totals.active = 2;
    expect(parseAdminOrganizationOperationsSnapshot(totals)).toBeNull();

    const role = snapshot();
    role.adminRole = "analyst";
    expect(parseAdminOrganizationOperationsSnapshot(role)).toBeNull();

    const safeReadOnly = snapshot();
    safeReadOnly.adminRole = "analyst";
    safeReadOnly.operationsAllowed = false;
    expect(parseAdminOrganizationOperationsSnapshot(safeReadOnly)).not.toBeNull();

    const direct = snapshot();
    direct.directTableAccessEnabled = true;
    expect(parseAdminOrganizationOperationsSnapshot(direct)).toBeNull();
  });

  it("keeps email lookup input-only and every operation server-authorized", () => {
    const migration = read(
      "supabase/migrations/20260725003000_command_center_organization_operations_ui.sql",
    );
    const actions = read("app/admin/organizations/actions.ts");
    const page = read("app/admin/organizations/page.tsx");

    expect(migration).toContain("security definer");
    expect(migration).toContain("v_user_id uuid := auth.uid()");
    expect(migration).toContain("v_role <> 'owner'");
    expect(migration).toContain("identityFieldsIncluded', false");
    expect(migration).toContain("directTableAccessEnabled', false");
    expect(migration).toContain("private.resolve_command_center_user_by_email");
    expect(migration).not.toMatch(/'email'\s*,/i);
    expect(migration).not.toMatch(/'userId'\s*,/i);
    expect(actions).toContain('"use server"');
    expect(actions).not.toContain("service_role");
    expect(page).toContain(
      '"get_command_center_organization_operations_snapshot"',
    );
    expect(page).toContain("organization-operations-guard");
    expect(page).not.toContain("createBrowserClient");
  });
});
