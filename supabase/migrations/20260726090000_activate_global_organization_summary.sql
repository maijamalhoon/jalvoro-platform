-- The dedicated Organization Operations page and parser are now active.
-- Re-compose the already registered aggregate organization summary into the
-- Global Operations snapshot without exposing identities or direct table access.
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
      'globalOperations',
      private.get_command_center_global_operations_snapshot()
        || jsonb_build_object(
          'organizations', private.get_command_center_organization_summary()
        )
    );
$$;

revoke all on function private.get_platform_admin_snapshot() from public, anon, authenticated;
grant execute on function private.get_platform_admin_snapshot() to service_role;
