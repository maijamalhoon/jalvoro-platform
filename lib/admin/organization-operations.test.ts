import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { parseAdminOrganizationOperationsSnapshot } from "./organization-operations";

const generatedAt = "2026-07-25T00:30:00.000Z";
const createdAt = "2026-07-24T23:00:00.000Z";
const expiresAt = "2028-07-24T23:00:00.000Z";

const validSnapshot = {
  generatedAt,
  adminRole: "owner",
  operationsAllowed: true,
  totals: {
    total: 1,
    draft: 0,
    active: 1,
    suspended: 0,
    closed: 0,
    memberships: 2,
    activeMemberships: 2,
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
      memberships: 2,
      activeMemberships: 2,
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
      {
        membershipCode: "MBR-ABCDEF123456",
        memberReference: "USR-ABCDEF123456",
        role: "analyst",
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
        expiresAt,
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

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Command Center Organization Operations", () => {
  it("accepts the paginated identity-minimised operations contract", () => {
    expect(parseAdminOrganizationOperationsSnapshot(validSnapshot)).toMatchObject({
      adminRole: "owner",
      operationsAllowed: true,
      totals: { total: 1, active: 1, memberships: 2 },
      pagination: { limit: 50, offset: 0, hasMore: false },
      selectedOrganization: {
        organizationCode: "ORG-123456789ABC",
        members: [
          { memberReference: "USR-123456789ABC" },
          { memberReference: "USR-ABCDEF123456" },
        ],
        grants: [{ adminReference: "ADM-123456789ABC" }],
        audit: [{ eventReference: "OAE-123456789ABC" }],
      },
      identityFieldsIncluded: false,
      directTableAccessEnabled: false,
    });
  });

  it("fails closed on identity-bearing and sensitive organization fields", () => {
    for (const unsafeField of [
      { email: "person@example.com" },
      { userId: "00000000-0000-0000-0000-000000000001" },
      { subjectId: "subject" },
      { rawIp: "192.0.2.1" },
      { city: "Karachi" },
      { legalName: "Registered Business Name" },
      { taxId: "tax-secret" },
      { registrationNumber: "registration-secret" },
    ]) {
      expect(
        parseAdminOrganizationOperationsSnapshot({
          ...validSnapshot,
          selectedOrganization: {
            ...validSnapshot.selectedOrganization,
            ...unsafeField,
          },
        }),
      ).toBeNull();
    }
  });

  it("rejects malformed codes, locations, impossible totals and unsafe flags", () => {
    expect(
      parseAdminOrganizationOperationsSnapshot({
        ...validSnapshot,
        items: [
          {
            ...validSnapshot.items[0],
            organizationCode: "ORG-unsafe",
          },
        ],
      }),
    ).toBeNull();

    expect(
      parseAdminOrganizationOperationsSnapshot({
        ...validSnapshot,
        items: [
          {
            ...validSnapshot.items[0],
            primaryCountryCode: "Pakistan",
          },
        ],
      }),
    ).toBeNull();

    expect(
      parseAdminOrganizationOperationsSnapshot({
        ...validSnapshot,
        totals: { ...validSnapshot.totals, active: 2 },
      }),
    ).toBeNull();

    expect(
      parseAdminOrganizationOperationsSnapshot({
        ...validSnapshot,
        directTableAccessEnabled: true,
      }),
    ).toBeNull();
  });

  it("requires Owner operations state to match the resolved admin role", () => {
    expect(
      parseAdminOrganizationOperationsSnapshot({
        ...validSnapshot,
        adminRole: "analyst",
        operationsAllowed: true,
      }),
    ).toBeNull();

    expect(
      parseAdminOrganizationOperationsSnapshot({
        ...validSnapshot,
        adminRole: "analyst",
        operationsAllowed: false,
      }),
    ).not.toBeNull();
  });

  it("keeps organization data private and email resolution input-only", () => {
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
    expect(migration).not.toMatch(/'legalName'\s*,/i);
    expect(migration).not.toMatch(/'taxId'\s*,/i);
    expect(migration).toContain(
      "revoke all on function public.get_command_center_organization_operations_snapshot",
    );

    expect(actions).toContain('"use server"');
    expect(actions).toContain("create_command_center_organization_by_email");
    expect(actions).not.toContain("service_role");
    expect(page).toContain(
      'rpc(\n    "get_command_center_organization_operations_snapshot"',
    );
    expect(page).toContain("parseAdminOrganizationOperationsSnapshot");
    expect(page).not.toContain("createBrowserClient");
  });
});
