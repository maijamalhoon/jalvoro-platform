import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const foundationPath =
  "supabase/migrations/20260724133222_command_center_registry_control_plane.sql";
const indexesPath =
  "supabase/migrations/20260724133646_index_command_center_registry_foreign_keys.sql";

describe("Command Center registry database control plane", () => {
  it("creates normalized private registry entities with RLS and direct-access denial", () => {
    const migration = read(foundationPath);

    for (const table of [
      "command_center_product_families",
      "command_center_products",
      "command_center_applications",
      "command_center_modules",
      "command_center_services",
      "command_center_environments",
      "command_center_regions",
      "command_center_product_environments",
      "command_center_product_regions",
      "command_center_navigation_entries",
      "command_center_manifest_versions",
      "command_center_validation_results",
      "command_center_approvals",
      "command_center_role_permissions",
      "command_center_admin_grants",
      "command_center_registry_audit",
    ]) {
      expect(migration).toContain(`private.${table}`);
    }

    expect(migration).toContain("enable row level security");
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("using (false) with check (false)");
    expect(migration).toContain("to service_role");
  });

  it("requires validation, owner approval, digest integrity and active lifecycle before activation", () => {
    const migration = read(foundationPath);

    expect(migration).toContain("validate_command_center_manifest");
    expect(migration).toContain("submit_command_center_manifest");
    expect(migration).toContain("approve_command_center_manifest");
    expect(migration).toContain("activate_command_center_manifest");
    expect(migration).toContain("v_role <> 'owner'");
    expect(migration).toContain("command_center_manifest_digest_mismatch");
    expect(migration).toContain("command_center_manifest_validation_stale");
    expect(migration).toContain("expires_at <= approved_at + interval '24 hours'");
    expect(migration).toMatch(/status\s*=\s*'consumed'/);
  });

  it("keeps registry audit append-only and sensitive business data out of the schema", () => {
    const migration = read(foundationPath);

    expect(migration).toContain("command_center_registry_audit_append_only");
    expect(migration).toContain("reject_platform_audit_update");
    expect(migration).toContain(
      "expires_at timestamptz not null default (now() + interval '24 months')",
    );
    expect(migration).toContain("forbidden_sensitive_field");
    expect(migration).not.toMatch(/card_number\s+(text|jsonb|numeric)/i);
    expect(migration).not.toMatch(/cvv\s+(text|jsonb|numeric)/i);
    expect(migration).not.toMatch(/password\s+(text|jsonb)/i);
    expect(migration).not.toMatch(/raw_ip\s+(text|inet|jsonb)/i);
    expect(migration).not.toMatch(/finance_content\s+(text|jsonb|numeric)/i);
    expect(migration).not.toMatch(/payroll_content\s+(text|jsonb|numeric)/i);
  });

  it("enforces scoped grants and server-side navigation authorization", () => {
    const migration = read(foundationPath);
    const serverNavigation = read("components/admin/AdminSectionNav.tsx");
    const clientNavigation = read("components/admin/AdminSectionNavClient.tsx");

    expect(migration).toContain("command_center_admin_grants");
    expect(migration).toContain("organization_id uuid");
    expect(migration).toContain("data_classification text");
    expect(migration).toContain("environment_key text");
    expect(migration).toContain("region_key text");
    expect(migration).toContain("get_command_center_navigation");
    expect(migration).toContain("g.revoked_at is null");
    expect(migration).toMatch(
      /g\.expires_at\s+is\s+null\s+or\s+g\.expires_at\s*>\s*now\(\)/,
    );
    expect(serverNavigation).toContain('rpc("get_command_center_navigation"');
    expect(clientNavigation).not.toContain("createClient");
    expect(clientNavigation).not.toContain("supabase");
  });

  it("covers every new foreign key reported by the staging advisor", () => {
    const indexes = read(indexesPath);

    for (const index of [
      "command_center_admin_grants_granted_by_idx",
      "command_center_admin_grants_revoked_by_idx",
      "command_center_approvals_approved_by_idx",
      "command_center_manifest_versions_submitted_by_idx",
      "command_center_navigation_module_idx",
      "command_center_product_environments_environment_idx",
      "command_center_product_families_created_by_idx",
      "command_center_product_families_updated_by_idx",
      "command_center_product_regions_region_idx",
      "command_center_products_created_by_idx",
      "command_center_products_updated_by_idx",
      "command_center_registry_audit_approval_idx",
      "command_center_registry_audit_grant_idx",
      "command_center_registry_audit_manifest_idx",
      "command_center_registry_audit_subject_idx",
      "command_center_validation_results_manifest_idx",
    ]) {
      expect(indexes).toContain(index);
    }
  });
});
