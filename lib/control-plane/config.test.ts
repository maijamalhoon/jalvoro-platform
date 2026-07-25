import { describe, expect, it } from "vitest";

import {
  CONTROL_PLANE_PROJECT_REF,
  isAdminControlPlanePath,
  isControlPlaneOnlyPath,
  parseControlPlaneAccess,
  sanitizeControlDestination,
} from "@/lib/control-plane/config";

describe("Control Plane configuration", () => {
  it("uses the isolated project and accepts only control destinations", () => {
    expect(CONTROL_PLANE_PROJECT_REF).toBe("zzvpovvuybfihwgjrder");
    expect(sanitizeControlDestination("/control")).toBe("/control");
    expect(sanitizeControlDestination("/admin/users?state=active")).toBe(
      "/admin/users?state=active",
    );
    expect(sanitizeControlDestination("https://evil.example/admin")).toBe(
      "/control",
    );
    expect(sanitizeControlDestination("//evil.example/admin")).toBe("/control");
    expect(sanitizeControlDestination("/dashboard")).toBe("/control");
    expect(sanitizeControlDestination("/control-login")).toBe("/control");
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

  it("rejects malformed access payloads and accepts AAL2 operator access", () => {
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
});
