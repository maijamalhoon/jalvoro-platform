begin;

create index if not exists command_center_admin_grants_granted_by_idx
  on private.command_center_admin_grants (granted_by, granted_at desc);
create index if not exists command_center_admin_grants_revoked_by_idx
  on private.command_center_admin_grants (revoked_by, revoked_at desc)
  where revoked_by is not null;
create index if not exists command_center_approvals_approved_by_idx
  on private.command_center_approvals (approved_by, approved_at desc);
create index if not exists command_center_manifest_versions_submitted_by_idx
  on private.command_center_manifest_versions (submitted_by, submitted_at desc)
  where submitted_by is not null;
create index if not exists command_center_navigation_module_idx
  on private.command_center_navigation_entries (product_key, module_key);
create index if not exists command_center_product_environments_environment_idx
  on private.command_center_product_environments (environment_key, product_key);
create index if not exists command_center_product_families_created_by_idx
  on private.command_center_product_families (created_by)
  where created_by is not null;
create index if not exists command_center_product_families_updated_by_idx
  on private.command_center_product_families (updated_by)
  where updated_by is not null;
create index if not exists command_center_product_regions_region_idx
  on private.command_center_product_regions (region_key, product_key);
create index if not exists command_center_products_created_by_idx
  on private.command_center_products (created_by)
  where created_by is not null;
create index if not exists command_center_products_updated_by_idx
  on private.command_center_products (updated_by)
  where updated_by is not null;
create index if not exists command_center_registry_audit_approval_idx
  on private.command_center_registry_audit (approval_id, created_at desc)
  where approval_id is not null;
create index if not exists command_center_registry_audit_grant_idx
  on private.command_center_registry_audit (grant_id, created_at desc)
  where grant_id is not null;
create index if not exists command_center_registry_audit_manifest_idx
  on private.command_center_registry_audit (manifest_id, created_at desc)
  where manifest_id is not null;
create index if not exists command_center_registry_audit_subject_idx
  on private.command_center_registry_audit (subject_user_id, created_at desc)
  where subject_user_id is not null;
create index if not exists command_center_validation_results_manifest_idx
  on private.command_center_validation_results (manifest_id, validated_at desc);

commit;
