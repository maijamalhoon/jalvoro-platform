import { describe, expect, it } from "vitest";

import {
  CONTROL_PLANE_PROJECT_REF,
  isAdminControlPlanePath,
  isControlPlaneOnlyPath,
  parseControlPlaneAccess,
  parseControlPlaneDirectory,
  sanitizeControlDestination,
} from "@/lib/control-plane/config";

const validOperator = {
  userReference: "CPU-ABCDEF123456",
  role: "owner",
  isRootOwner: true,
  status: "active",
  createdAt: "2026-07-25T00:00:00.000Z",
  disabledAt: null,
};

const validGrant = {
  grantCode: "CPG-ABCDEF123456",
  permissionKey: "control:overview:read",
  productKey: "jalvoro",
  moduleKey: null,
  environmentKey: "production",
  regionKey: "global",
  organizationId: null,
  dataClassification: "restricted",
  expiresAt: null,
};

describe("Control Plane configuration", () => {
  it("uses the isolated project and accepts only canonical control destinations", () => {
    expect(CONTROL_PLANE_PROJECT_REF).toBe("zzvpovvuybfihwgjrder");
    expect(sanitizeControlDestination("/control")).toBe("/control");
    expect(sanitizeControlDestination("/admin/users?state=active")).toBe(
      "/admin/users?state=active",
    );
    for (const value of [
      "https://evil.example/admin",
      "//evil.example/admin",
      "/dashboard",
      "/control-login",
      "/admin//users",
      "/admin/users/",
      "/admin/%2fusers",
      "/control/%5cusers",
      "/admin/%252fusers",
    ]) {
      expect(sanitizeControlDestination(value)).toBe("/control");
    }
  });

  it("classifies dedicated and dual-gated routes", () => {
    expect(isControlPlaneOnlyPath("/control-login")).toBe(true);
    expect(isControlPlaneOnlyPath("/control")).toBe(true);
    expect(isControlPlaneOnlyPath("/control/operators")).toBe(true);
    expect(isControlPlaneOnlyPath("/admin")).toBe(false);
    expect(isAdminControlPlanePath("/admin")).toBe(true);
    expect(isAdminControlPlanePath("/admin/users")).toBe(true);
    expect(isAdminControlPlanePath("/dashboard")).toBe(false);
  });

  it("rejects malformed access payloads and accepts AAL2 Root Owner access", () => {
    expect(parseControlPlaneAccess(null)).toBeNull();
    expect(
      parseControlPlaneAccess({
        userReference: "CPU-ABCDEF123456",
        role: "owner",
        isRootOwner: true,
        sessionAssurance: "aal1",
        grants: [],
      }),
    ).toBeNull();
    expect(
      parseControlPlaneAccess({
        userReference: "invalid",
        role: "owner",
        isRootOwner: true,
        sessionAssurance: "aal2",
        grants: [],
      }),
    ).toBeNull();
    expect(
      parseControlPlaneAccess({
        userReference: "CPU-ABCDEF123456",
        role: "owner",
        isRootOwner: false,
        sessionAssurance: "aal2",
        grants: [],
      }),
    ).toBeNull();
    expect(
      parseControlPlaneAccess({
        userReference: "CPU-ABCDEF123456",
        role: "owner",
        isRootOwner: true,
        sessionAssurance: "aal2",
        grants: [{ ...validGrant, grantCode: "bad" }],
      }),
    ).toBeNull();

    expect(
      parseControlPlaneAccess({
        userReference: "CPU-ABCDEF123456",
        role: "owner",
        isRootOwner: true,
        sessionAssurance: "aal2",
        grants: [],
      }),
    ).toEqual({
      userReference: "CPU-ABCDEF123456",
      role: "owner",
      isRootOwner: true,
      sessionAssurance: "aal2",
      grants: [],
    });
  });

  it("fails closed instead of silently dropping malformed directory rows", () => {
    const validDirectory = {
      operators: [validOperator],
      pendingInvitations: [
        {
          invitationCode: "CPI-ABCDEF123456",
          maskedEmail: "o***@example.com",
          role: "admin",
          expiresAt: "2026-07-27T00:00:00.000Z",
        },
      ],
      activeGrants: [],
    };

    expect(parseControlPlaneDirectory(validDirectory)).toMatchObject({
      operators: [{ userReference: "CPU-ABCDEF123456", isRootOwner: true }],
      pendingInvitations: [{ invitationCode: "CPI-ABCDEF123456" }],
    });

    expect(
      parseControlPlaneDirectory({
        ...validDirectory,
        operators: [validOperator, { ...validOperator }],
      }),
    ).toBeNull();
    expect(
      parseControlPlaneDirectory({
        ...validDirectory,
        operators: [{ ...validOperator, userReference: "CPU-invalid" }],
      }),
    ).toBeNull();
    expect(
      parseControlPlaneDirectory({
        ...validDirectory,
        pendingInvitations: [
          { ...validDirectory.pendingInvitations[0], invitationCode: "bad" },
        ],
      }),
    ).toBeNull();
    expect(
      parseControlPlaneDirectory({
        ...validDirectory,
        activeGrants: [
          {
            ...validGrant,
            userReference: "CPU-FFFFFFFFFFFF",
          },
        ],
      }),
    ).toBeNull();
  });
});
