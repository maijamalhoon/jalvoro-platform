-- Keep the existing Global Operations response contract stable until the dedicated
-- organization-operations UI and parser are introduced in a separate release.
-- The private organization summary and foundation snapshot remain available.
create or replace function private.get_platform_admin_snapshot()
returns jsonb
language sql
security definer
set search_path = 'pg_catalog', 'private'
as $$
  select private.get_platform_admin_snapshot_base()
    || jsonb_build_object(
      'privacy', private.get_privacy_governance_snapshot()
    )
    || jsonb_build_object(
      'billingOperations', private.get_billing_operations_snapshot()
    )
    || jsonb_build_object(
      'globalOperations', private.get_command_center_global_operations_snapshot()
    );
$$;
