import { describe, expect, it } from "vitest";

import {
  CONTROL_PLANE_HOME_PATH,
  CONTROL_PLANE_LOGIN_PATH,
  CONTROL_PLANE_PROJECT_REF,
  isAdminControlPlanePath,
  isControlPlaneOnlyPath,
  parseControlPlaneAccess,
  sanitizeControlDestination,
} from "@/lib/control-plane/config";

describe("Control Plane configuration", () => {
  it("uses one isolated /admin entry and only deployed destinations", () => {
    expect(CONTROL_PLANE_PROJECT_REF).toBe("zzvpovvuybfihwgjrder");
    expect(CONTROL_PLANE_LOGIN_PATH).toBe("/admin");
    expect(CONTROL_PLANE_HOME_PATH).toBe("/admin");
    expect(sanitizeControlDestination("/control")).toBe("/admin");
    expect(sanitizeControlDestination("/control/operators")).toBe("/admin");
    expect(
      sanitizeControlDestination("/admin/organizations?region=ap-south-1"),
    ).toBe("/admin/organizations?region=ap-south-1");
    expect(sanitizeControlDestination("/admin/users?state=active")).toBe(
      "/admin",
    );
    expect(sanitizeControlDestination("https://evil.example/admin")).toBe(
      "/admin",
    );
    expect(sanitizeControlDestination("//evil.example/admin")).toBe("/admin");
    expect(sanitizeControlDestination("/dashboard")).toBe("/admin");
    expect(sanitizeControlDestination("/control-login")).toBe("/admin");
  });

  it("classifies /admin as the isolated Command Center world", () => {
    expect(isControlPlaneOnlyPath("/control-login")).toBe(false);
    expect(isControlPlaneOnlyPath("/control")).toBe(false);
    expect(isControlPlaneOnlyPath("/admin")).toBe(true);
    expect(isControlPlaneOnlyPath("/admin/organizations")).toBe(true);
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
