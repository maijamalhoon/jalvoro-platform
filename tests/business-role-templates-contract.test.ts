import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  BUSINESS_PERMISSION_GROUPS,
  BUSINESS_TEAM_ASSIGNABLE_ROLES,
  isPrivilegedBusinessRole,
  isSensitiveBusinessPermission,
  suggestedBusinessPermissions,
} from "../lib/business/team-access";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const migration = read(
  "../supabase/migrations/20260726211500_business_role_templates_and_lifecycle.sql",
);
const manager = read("../components/business/BusinessTeamManager.tsx");
const inviteRoute = read("../app/api/business/team/invite/route.ts");
const regression = read("../supabase/tests/business_role_templates.sql");

const requiredRoles = [
  "admin",
  "it_admin",
  "hr_admin",
  "finance",
  "accountant",
  "operations_manager",
  "manager",
  "auditor",
  "branch_staff",
  "employee",
  "sales",
  "cashier",
  "inventory",
  "viewer",
];

const requiredPermissionPrefixes = [
  "team.",
  "notifications.",
  "accounting.",
  "banking.",
  "tax.",
  "budget.",
  "documents.",
  "branches.",
  "approvals.",
  "payroll.",
  "assets.",
  "fx.",
  "projects.",
  "contacts.",
  "sales.",
  "purchases.",
  "inventory.",
  "crm.",
  "reports.",
  "shop.",
];

describe("Business least-privilege role templates", () => {
  it("keeps legacy roles and adds the required organization roles", () => {
    const roles = BUSINESS_TEAM_ASSIGNABLE_ROLES.map((role) => role.value);
    expect(roles).toEqual(requiredRoles);

    for (const role of requiredRoles) {
      expect(migration).toContain(`'${role}'`);
    }
    expect(migration).toContain("business_members_role_check");
    expect(migration).toContain("business_invitations_role_check");
  });

  it("marks only owner-granted roles as privileged", () => {
    expect(isPrivilegedBusinessRole("admin")).toBe(true);
    expect(isPrivilegedBusinessRole("it_admin")).toBe(true);
    expect(isPrivilegedBusinessRole("hr_admin")).toBe(true);
    expect(isPrivilegedBusinessRole("finance")).toBe(true);
    expect(isPrivilegedBusinessRole("operations_manager")).toBe(false);
    expect(isPrivilegedBusinessRole("employee")).toBe(false);

    expect(migration).toContain(
      "select array['admin','it_admin','hr_admin','finance']::text[]",
    );
    expect(migration).toContain(
      "Only the primary owner can grant privileged organization access.",
    );
    expect(migration).toContain(
      "Only the primary owner can manage privileged organization access.",
    );
  });

  it("covers the complete current Business permission catalog", () => {
    const permissions = BUSINESS_PERMISSION_GROUPS.flatMap((group) =>
      group.permissions.map(([permission]) => permission),
    );

    for (const prefix of requiredPermissionPrefixes) {
      expect(permissions.some((permission) => permission.startsWith(prefix))).toBe(true);
    }

    for (const permission of permissions) {
      expect(migration).toContain(`'${permission}'`);
    }
  });

  it("keeps Auditor read-only and Employee least-privilege", () => {
    const auditor = suggestedBusinessPermissions("auditor", "advanced_company");
    const employee = suggestedBusinessPermissions("employee", "advanced_company");

    expect(auditor.length).toBeGreaterThan(10);
    expect(auditor.every((permission) => permission.endsWith(".view"))).toBe(true);
    expect(auditor.some(isSensitiveBusinessPermission)).toBe(false);

    expect(employee).toEqual([
      "notifications.view",
      "documents.view",
      "approvals.view",
      "approvals.request",
      "projects.view",
      "projects.time",
    ]);
    expect(employee.some(isSensitiveBusinessPermission)).toBe(false);
  });

  it("uses role templates in the UI and blocks sensitive toggles for non-owners", () => {
    expect(manager).toContain("BUSINESS_TEAM_ASSIGNABLE_ROLES");
    expect(manager).toContain("suggestedBusinessPermissions");
    expect(manager).toContain("isPrivilegedBusinessRole");
    expect(manager).toContain("isSensitiveBusinessPermission");
    expect(manager).toContain("canGrantSensitivePermissions={isPrimaryOwner}");
    expect(manager).toContain(
      "The least-privilege role template is preselected.",
    );
  });

  it("lets omitted API permissions resolve to the database template", () => {
    expect(inviteRoute).toContain(": null;");
    expect(migration).toContain("if p_permissions is null then");
    expect(migration).toContain("private.business_team_role_template");
    expect(migration).toContain("'permission_source'");
  });

  it("keeps suspended/revoked Business identities in the Business product realm", () => {
    expect(migration).toContain("default_workspace='business'");
    expect(migration).toContain("onboarding_choice='business'");
    expect(migration).toContain("replacement_business_id");
    expect(migration).not.toContain("default_workspace='personal'");
  });

  it("ships a rollback-only database privilege-escalation regression", () => {
    expect(regression).toContain("public.create_business_invitation");
    expect(regression).toContain("Auditor template unexpectedly contains a write permission");
    expect(regression).toContain("Administrator granted a privileged Finance role");
    expect(regression).toContain("employee_invitation");
    expect(regression).toContain("rollback;");
  });
});
