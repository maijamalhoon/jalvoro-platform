import { describe, expect, it } from "vitest";

import {
  appendOnboardingSession,
  getBusinessSetupDefaults,
  getBusinessWorkspaceHref,
  getMembershipRoleLabel,
  isBusinessExperience,
  isInternalWorkspacePath,
  isWorkspaceModuleKey,
  WORKSPACE_MODULE_KEYS,
} from "./domain";

describe("workspace domain model", () => {
  it("keeps experience, workspace, membership, and module concepts separate", () => {
    expect(isBusinessExperience("personal")).toBe(false);
    expect(isBusinessExperience("freelancer")).toBe(true);
    expect(getMembershipRoleLabel("owner")).toBe("Owner");
    expect(getMembershipRoleLabel("unknown")).toBe("Member");
  });

  it("provides focused defaults without creating separate authentication systems", () => {
    const freelancer = getBusinessSetupDefaults("freelancer");
    const retail = getBusinessSetupDefaults("retail-pos");
    const enterprise = getBusinessSetupDefaults("enterprise");

    expect(freelancer.workspaceMode).toBe("advanced_company");
    expect(freelancer.businessType).toBe("professional_services");
    expect(retail.workspaceMode).toBe("simple_shop");
    expect(retail.modules).toContain("pos");
    expect(enterprise.modules).toContain("approvals");
    expect(enterprise.modules).toContain("payroll");
  });

  it("maintains a controlled module vocabulary", () => {
    expect(new Set(WORKSPACE_MODULE_KEYS).size).toBe(WORKSPACE_MODULE_KEYS.length);
    expect(isWorkspaceModuleKey("accounting")).toBe(true);
    expect(isWorkspaceModuleKey("unknown-module")).toBe(false);
  });

  it("builds explicit workspace destinations", () => {
    expect(getBusinessWorkspaceHref("ali-shop", "simple_shop")).toBe(
      "/business/ali-shop/shop",
    );
    expect(getBusinessWorkspaceHref("ali-traders", "advanced_company")).toBe(
      "/business/ali-traders",
    );
  });

  it("preserves safe internal destinations while attaching resumable sessions", () => {
    expect(isInternalWorkspacePath("/business?setup=1")).toBe(true);
    expect(isInternalWorkspacePath("//evil.example")).toBe(false);
    expect(
      appendOnboardingSession(
        "/business?setup=1&experience=retail-pos",
        "3aeb8a4f-f701-44eb-a470-f5c02f7b0374",
      ),
    ).toBe(
      "/business?setup=1&experience=retail-pos&session=3aeb8a4f-f701-44eb-a470-f5c02f7b0374",
    );
  });
});
